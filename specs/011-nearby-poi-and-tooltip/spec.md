# Feature Specification: Nearby POI Pins & Hover Tooltips for Discovery Candidates

**Feature Branch**: `011-nearby-poi-and-tooltip`

**Created**: 2026-08-10

**Status**: Draft

**Input**: User description: "@original-prompt/revision/005-nearby-poi-and-tooltip.md"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Toggle Nearby POI Pins & 2km Boundary Circle (Priority: P1) 🎯 MVP

As a user evaluating discovery candidate spots in `DiscoverView.vue`, I want to click a "Show Nearby POI" toggle button on a candidate card in the left panel list so that a 2km-radius catchment boundary circle and relevant nearby POI pins (styled distinctly from candidate pins) render on the map.

**Why this priority**: Core MVP value enabling instant visual inspection of nearby relevant business peers within a candidate's 2km catchment zone.

**Independent Test**: Can be fully tested by clicking "Show Nearby POI" on candidate spot #1 in the Discover panel, verifying that a 2km radius circle renders around spot #1, and confirming relevant POI pins (styled distinctly in color/icon from candidate pins) appear on the map.

**Acceptance Scenarios**:

1. **Given** a discovery candidate card in the left panel list, **When** the user clicks "Show Nearby POI", **Then** a 2km-radius circle overlay centers on that candidate's coordinates (reusing `googleMapService.renderCatchmentCircle`), and relevant POI pins render on the map.
2. **Given** a candidate with active nearby POI pins and boundary circle, **When** the user clicks "Hide Nearby POI" on that candidate card, **Then** the 2km circle and POI pins are unregistered and removed from the map.
3. **Given** a candidate with active nearby POI pins, **When** the user selects "Show Nearby POI" on a different candidate card, **Then** the previous candidate's circle and POI pins are completely cleared before rendering the new candidate's circle and POI pins (ensuring strictly 1 candidate's nearby POI layer is active at a time).

---

### User Story 2 - Relevant Business Vertical Taxonomy Filtering (Priority: P2)

As a market analyst inspecting candidate spots, I want the nearby POIs shown on the map to be strictly filtered by relevance to the candidate's business vertical (e.g., coffee shop → coffee shops, cafes, bakeries; laundry → laundries, dry cleaning) so that irrelevant POIs (such as pharmacies for a laundry spot) are never shown.

**Why this priority**: Guarantees high-precision site selection insights without visual noise or irrelevant POI clutter.

**Independent Test**: Can be fully tested by triggering "Show Nearby POI" on a coffee shop candidate, verifying that BigQuery / mock radius queries filter `poi_type` against `getRelevantDisplayCategoriesForType('coffee_shop')` returning only coffee shops, cafes, and bakeries.

**Acceptance Scenarios**:

1. **Given** a coffee shop or restaurant candidate spot, **When** "Show Nearby POI" is triggered, **Then** the system queries BigQuery filtering `poi_type IN UNNEST(@relevantCategories)` matching food & beverage peers, never returning unrelated categories (such as pharmacies or hardware stores).
2. **Given** an unmapped custom business type, **When** "Show Nearby POI" is triggered, **Then** the system falls back to querying same-category POI peers matching the requested business type itself.

---

### User Story 3 - POI Hover Tooltips (Priority: P3)

As a user exploring nearby POI pins on the map, I want to hover my mouse over a nearby POI pin to view a tooltip (InfoWindow/overlay on mouseover/mouseout) displaying the POI's name, rating, user review count, category, and operating status so that I can inspect nearby peers without clicking or interfering with candidate pin click handlers.

**Why this priority**: Enhances interactive map exploration without conflicting with candidate selection click events.

**Independent Test**: Can be fully tested by hovering the mouse over a nearby POI pin, verifying a tooltip opens showing name, star rating, category, and operating status, and moving the mouse away to verify the tooltip closes cleanly.

**Acceptance Scenarios**:

1. **Given** nearby POI pins rendered on the map, **When** the user hovers over a POI pin (`mouseover`), **Then** a tooltip opens showing the POI's name, category, rating, user review count, and business status (`OPERATIONAL` / `CLOSED`).
2. **Given** an open POI hover tooltip, **When** the user moves the mouse away (`mouseout`), **Then** the tooltip closes immediately.

---

### Edge Cases

- What happens if zero relevant POIs exist within 2km of the candidate? The 2km boundary circle renders on the map, and an inline notice appears under the candidate card: "No relevant nearby POIs found within 2km."
- What happens if a candidate card is selected/clicked while another candidate's nearby POIs are active? Selecting candidate spot #2 centers the map on spot #2 and automatically clears candidate spot #1's nearby POI pins and 2km circle.
- What happens if the user leaves the Discover view? All active nearby POI pins and 2km circles are automatically cleaned up and unregistered from `googleMapService`.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST add an interactive "Show Nearby POI" / "Hide Nearby POI" toggle button to each candidate card in the left-panel discovery list (`DiscoverView.vue`).
- **FR-002**: System MUST render a 2km-radius boundary circle around the candidate's coordinates when "Show Nearby POI" is activated, reusing `googleMapService.renderCatchmentCircle`.
- **FR-003**: System MUST query BigQuery POI datasets within 2,000 meters enforcing `poi_type IN UNNEST(@relevantCategories)` via `BigQueryDiscoveryService.queryPoisWithinRadius` and `getRelevantDisplayCategoriesForType(businessType)`.
- **FR-004**: System MUST render relevant nearby POI pins using a distinct visual style/color (e.g. teal/cyan marker) to differentiate them from numbered primary candidate pins.
- **FR-005**: System MUST enforce a single active candidate POI layer policy, clearing previous POI pins and boundary circles when toggling off or switching to a new candidate.
- **FR-006**: System MUST show a hover tooltip (`mouseover` / `mouseout` InfoWindow or overlay) on nearby POI pins displaying POI name, category, rating, user ratings count, distance in meters, and business operating status.
- **FR-007**: System MUST implement a vertical relevance mapping taxonomy `getRelevantDisplayCategoriesForType(businessType)` mapping verticals to adjacent peer categories:
  - `coffee_shop` → `coffee_shop`, `cafe`, `bakery`
  - `restaurant` / `food` → `restaurant`, `cafe`, `food_court`, `bakery`
  - `minimarket` / `retail` → `minimarket`, `convenience_store`, `supermarket`
  - `laundry` → `laundry`, `dry_cleaning`
  - Fallback for unmapped types → same-category peer matching `businessType`.
- **FR-008**: System MUST perform `poi_type` filtering directly inside BigQuery SQL / mock query logic rather than fetching all POIs and filtering client-side.

### Key Entities

- **Nearby POI Layer State**: Represents the active nearby POI toggle in `discovery.store.ts` (`activePoiCandidateRank` [number|null], `nearbyPois` [RadiusPoiItem[]], `isCircleVisible` [boolean]).
- **Relevant Category Taxonomy**: Vertical category mapping in `BigQueryDiscoveryService` (`businessType` → `relevantCategories[]`).
- **RadiusPoiItem (Existing Entity)**: Nearby POI payload (`id`, `name`, `category`, `latitude`, `longitude`, `distanceMeters`, `rating`, `userRatingsTotal`, `businessStatus`).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Clicking "Show Nearby POI" queries relevant POIs and renders the 2km boundary circle + POI pins on the map within 2 seconds.
- **SC-002**: 100% of nearby POI pins rendered match the candidate's business vertical taxonomy (0% mismatched category leaks such as pharmacies for a laundry spot).
- **SC-003**: Hovering a nearby POI pin displays a tooltip within 100ms with name, rating, and status without requiring mouse click events.
- **SC-004**: Switching candidates or toggling off removes 100% of previous POI pins and boundary circles with zero orphaned markers remaining on the map.

## Assumptions

- **Fixed 2km Radius**: The analysis radius for nearby POI inspection is fixed at 2,000 meters for this feature revision.
- **Shared Circle & Map Service**: Reuses `googleMapService.renderCatchmentCircle` and `removeCatchmentCircle` from Feature 007 without building a redundant circle renderer.
- **Out of Scope**: Configurable radius sliders for nearby POI inspection, persisting toggle state across browser reloads, and changing primary candidate discovery/ranking algorithms are explicitly out of scope for this feature.
