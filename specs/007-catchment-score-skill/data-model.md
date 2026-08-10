# Data Model & Domain Entities: Catchment Score AI Skill

## 1. Core Domain Entities

### RegisteredLocation (Reference Entity)
Represents a user's saved business branch location.

| Field | Type | Required | Description / Constraints |
|---|---|---|---|
| `id` | `string` (UUID) | Yes | Unique location identifier |
| `userId` | `string` (UUID) | Yes | Owner user ID |
| `name` | `string` | Yes | Location branch name (e.g. `'Sudirman Branch'`) |
| `businessType` | `string` | Yes | Category (e.g. `'coffee_shop'`, `'retail'`, `'restaurant'`) |
| `latitude` | `number` | Yes | Valid latitude float (-90.0 to 90.0) |
| `longitude` | `number` | Yes | Valid longitude float (-180.0 to 180.0) |
| `fullAddress` | `string` | Yes | Street address |
| `regencyCode` | `string` | Optional | Regency partition code for BigQuery |
| `provinceCode` | `string` | Optional | Province partition code for BigQuery |

---

### CatchmentSubScores
Breakdown of the 6 performance factors contributing to the catchment evaluation.

| Field | Type | Required | Description / Range |
|---|---|---|---|
| `demandDensity` | `number` | Yes | 0 to 100 (density of target demand POIs) |
| `trafficProxy` | `number` | Yes | 0 to 100 (aggregate rating count volume) |
| `areaQuality` | `number` | Yes | 0 to 100 (average rating of nearby POIs) |
| `competitionPenalty` | `number` | Yes | 0 to 100 (penalty for direct competitors) |
| `networkSaturation` | `number` | Yes | 0 to 100 (penalty for same-brand saturation >2 branches) |
| `operationalVitality` | `number` | Yes | 0 to 100 (% of nearby POIs operating) |

---

### CatchmentScoreResultPayload
DTO delivered over the SSE stream when catchment analysis finishes.

| Field | Type | Required | Description / Constraints |
|---|---|---|---|
| `analysisId` | `string` | Yes | Unique ID for catchment session |
| `locationId` | `string` | Yes | Referenced `RegisteredLocation.id` |
| `locationName` | `string` | Yes | Name of analyzed branch |
| `radiusKm` | `number` | Yes | Analyzed radius in km (0.1 to 10.0; default 2.0) |
| `compositeScore` | `number` | Yes | Final integer score between 0 and 100 |
| `subScores` | `CatchmentSubScores` | Yes | Itemized sub-scores |
| `poiCount` | `number` | Yes | Total nearby POIs analyzed within radius |
| `center` | `{ lat: number, lng: number }` | Yes | Center coordinates for map circle overlay |
| `summary` | `string` | Yes | Human-readable score explanation |

---

## 2. Catchment Circle State Lifecycle (Frontend)

```text
[No Active Circle] (0 overlays)
        │
        ▼ User submits catchment score prompt in AI Chat Panel
[SSE Stream Active] ──► Status updates: "Determining action..." ──► "Gathering POI data..." ──► "Calculating catchment score..."
        │
        ▼ Final SSE event received with CatchmentScoreResultPayload
[Circle Replacement] ──► Call activeCatchmentCircle.setMap(null) (destroys existing circle)
        │
        ▼ Instantiate new google.maps.Circle({ center, radius: radiusKm * 1000 })
[1 Active Circle Overlay] ──► Rendered on shared Google Map around location pin
```

---

## 3. Validation & Business Rules

1. **Radius Cap (FR-004)**: `radiusKm` MUST NOT exceed 10.0km. If a user requests > 10km, the backend caps `radiusKm = 10.0` and states the cap in the chat summary.
2. **Default Radius (FR-003)**: If no radius is stated in prompt, `radiusKm = 2.0` default is applied and explicitly stated in chat response.
3. **Partition Enforcement (SC-004)**: BigQuery POI spatial queries MUST include `regency_code` or `province_code` SQL filters.
4. **Single Circle Enforcement (FR-009)**: `GoogleMapService` MUST maintain strictly 0 or 1 active catchment radius circle on the map canvas.
