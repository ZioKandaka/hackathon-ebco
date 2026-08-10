# Data Model & Domain Entities: Nearby POI Pins & Hover Tooltips

## 1. Core Domain Entities

### NearbyPoiLayerState
Represents the active nearby POI inspection state in `discovery.store.ts`.

| Field | Type | Required | Description / Constraints |
|---|---|---|---|
| `activePoiCandidateRank` | `number \| null` | Yes | Candidate rank (1-5) currently showing nearby POIs; `null` if none |
| `activeCandidate` | `DiscoveryCandidate \| null` | Yes | Selected candidate entity |
| `nearbyPois` | `RadiusPoiItem[]` | Yes | Array of relevant nearby POIs fetched within 2km |
| `loading` | `boolean` | Yes | `true` while fetching nearby POIs |

---

### RelevantDisplayTaxonomy
Vertical-to-category mapping rules enforced in `BigQueryDiscoveryService`.

| Vertical (`businessType`) | Relevant Display Categories (`relevantCategories[]`) |
|---|---|
| `coffee_shop` | `['coffee_shop', 'cafe', 'bakery']` |
| `restaurant` / `food` | `['restaurant', 'cafe', 'food_court', 'bakery']` |
| `minimarket` / `retail` | `['minimarket', 'convenience_store', 'supermarket']` |
| `laundry` | `['laundry', 'dry_cleaning']` |
| Unmapped verticals | `[businessType.toLowerCase()]` (same-category fallback) |

---

### RadiusPoiItem (Existing Entity)
Schema for nearby POI items returned by `BigQueryDiscoveryService.queryPoisWithinRadius`.

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | `string` | Yes | POI unique identifier |
| `name` | `string` | Yes | POI business name |
| `category` | `string` | Yes | POI category (e.g. `'cafe'`, `'bakery'`) |
| `latitude` | `number` | Yes | Latitude coordinate |
| `longitude` | `number` | Yes | Longitude coordinate |
| `distanceMeters` | `number` | Yes | Geodesic distance in meters from candidate spot |
| `rating` | `number` | Optional | Star rating (e.g. `4.5`) |
| `userRatingsTotal` | `number` | Optional | Total user reviews count |
| `businessStatus` | `string` | Optional | Operating status (`'OPERATIONAL'` / `'CLOSED_PERMANENTLY'`) |

---

## 2. Nearby POI Map Layer Lifecycle (Frontend)

```text
[No Nearby POI Layer] (0 nearby markers, 0 circles)
        │
        ▼ User clicks "Show Nearby POI" on Candidate Spot #1
[Fetch Nearby POIs] ──► Query BigQuery with poi_type IN UNNEST(relevantCategories)
        │
        ▼ Query completes
[Render Map Layer] ──► Call googleMapService.renderCatchmentCircle(spot1, 2000)
                   ──► Render Cyan POI Pins with mouseover/mouseout tooltips
        │
        ▼ User clicks "Show Nearby POI" on Candidate Spot #2 OR "Hide Nearby POI"
[Clean Layer] ──► Remove Candidate Spot #1's cyan POI pins & 2km circle
              ──► Render Candidate Spot #2's 2km circle + cyan POI pins (or hide if toggled off)
```

---

## 3. Validation & Business Rules

1. **Fixed 2km Radius**: Nearby POI query distance MUST be 2,000 meters.
2. **Server-Side SQL Filtering (FR-008)**: BigQuery queries MUST append `AND poi_type IN UNNEST(@relevantCategories)`.
3. **Single POI Layer Policy (FR-005, SC-004)**: Toggling or candidate switching MUST unregister 100% of previous POI pins and boundary circles before rendering new ones.
