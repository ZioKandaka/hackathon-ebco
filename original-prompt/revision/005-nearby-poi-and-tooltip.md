Extend the Location Discovery skill (005-location-discovery-skill). Candidate spots already render as numbered pins on the map and as a clickable list in the left panel (DiscoverView.vue / discovery.store.ts), and clicking a list item centers the map on that spot. This is working and should not be changed.

Add a "Show Nearby POI" action to each candidate in the left panel, plus a hover tooltip for the POI pins it reveals.

User flow:
- Each candidate card in the left-panel list gets a button, e.g. "Show Nearby POI" / "Hide Nearby POI" (toggle).
- Clicking it for a candidate:
  1. Draws a 2km-radius boundary circle on the map centered on that candidate's lat/lng (reuse the existing catchment-circle rendering used by the 007-catchment-score-skill — `googleMapService.renderCatchmentCircle` / `removeCatchmentCircle` in google-map.service.ts — do not build a second circle renderer).
  2. Queries POIs within that 2km radius (reuse `BigQueryDiscoveryService.queryPoisWithinRadius(lat, lng, radiusMeters, regencyOrProvince)`, which already supports radius search and is capped 100m–10000m, so 2000m fits with no backend cap change needed) and renders them as pins distinct in style/color from the numbered candidate pins.
  3. Only one candidate's POI layer + boundary circle is active at a time — selecting "Show Nearby POI" on another candidate, or re-clicking the active one, clears the previous POI pins and circle before drawing the new ones (or hides them, for the toggle-off case).
- Hovering a POI pin shows a tooltip (InfoWindow or equivalent, mouseover/mouseout — not click, so it doesn't conflict with the candidate pin's click handler) with the POI's name, rating, category/type, and business status if available. Reuse the fields already returned by `queryPoisWithinRadius` (`RadiusPoiItem`: name, category, rating, userRatingsTotal, businessStatus, distanceMeters) rather than adding a second POI fetch.

Relevance filtering (this is the core requirement, not just "show everything in 2km"):
- The POIs shown MUST be relevant to the candidate's business type. A laundry spot's nearby-POI pins must not include pharmacies; a restaurant spot's should surface restaurants/food-and-beverage places, not unrelated categories.
- The existing `getDemandCategoriesForType(businessType)` in BigQueryDiscoveryService returns *demand-driver* categories (e.g. coffee_shop → school/university/office/bank/transit_station) — these describe what generates footfall near a spot, not what's relevant to show as "nearby POI of the same/related business". Do NOT reuse that mapping as-is for this feature.
- Add a separate, explicit relevance taxonomy for this feature, e.g. a `getRelevantDisplayCategoriesForType(businessType)` mapping business type → the POI categories that should be surfaced/pinned for that vertical (same-category peers plus closely adjacent categories only). Examples:
  - coffee_shop → coffee_shop, cafe, bakery
  - restaurant / food → restaurant, cafe, food_court, bakery
  - minimarket / retail → minimarket, convenience_store, supermarket
  - laundry → laundry, dry_cleaning
  - (fallback for unmapped types → same-category only, i.e. the requested business type itself)
- The BigQuery/mock radius query must filter `poi_type` against this relevance list (`poi_type IN UNNEST(@relevantCategories)`), the same parenthesized-filter pattern already used elsewhere in this service — not filter client-side after fetching everything.

What "done" looks like:
- From the left panel, a user can click "Show Nearby POI" on any candidate and see a 2km circle plus relevant POI pins appear on the shared map within a couple seconds.
- The POIs shown are always plausibly related to that candidate's business type — never obviously mismatched categories (laundry spot showing pharmacies, etc).
- Hovering any POI pin shows a tooltip with at least name and rating.
- Toggling off, or switching to another candidate's "Show Nearby POI", cleanly removes the previous circle and pins — no leftover markers.

Explicitly out of scope for this revision:
- Changing how candidate spots themselves are discovered, ranked, or rendered (that's 005 as already implemented).
- Letting the user customize the 2km radius (fixed at 2km for this feature; a configurable radius is a future enhancement).
- Persisting the "show nearby POI" toggle state across sessions.
