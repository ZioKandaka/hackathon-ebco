# Data Model & Domain Entities: AI Site Visit AI Skill

## 1. Core Domain Entities

### SiteVisitRequest
Represents a visual site inspection request session.

| Field | Type | Required | Description / Constraints |
|---|---|---|---|
| `id` | `string` (UUID) | Yes | Unique request identifier |
| `userId` | `string` (UUID) | Yes | Authenticated user ID |
| `locationId` | `string` | Optional | Saved location ID (if inspecting a saved branch) |
| `locationName` | `string` | Yes | Target location name or candidate spot name |
| `latitude` | `number` | Yes | Valid latitude float (-90.0 to 90.0) |
| `longitude` | `number` | Yes | Valid longitude float (-180.0 to 180.0) |
| `createdAt` | `string` (ISO-8601) | Yes | Request creation timestamp |

---

### SiteVisitImageSet
Collection of static Street View and satellite imagery fetched for a location.

| Field | Type | Required | Description / Constraints |
|---|---|---|---|
| `hasStreetViewCoverage` | `boolean` | Yes | `true` if Street View metadata status is `OK` |
| `streetViewNorthUrl` | `string` | Optional | Static image URL for heading 0° (North) |
| `streetViewEastUrl` | `string` | Optional | Static image URL for heading 90° (East) |
| `streetViewSouthUrl` | `string` | Optional | Static image URL for heading 180° (South) |
| `streetViewWestUrl` | `string` | Optional | Static image URL for heading 270° (West) |
| `satelliteUrl` | `string` | Yes | Static Maps overhead satellite image URL |

---

### VisualCriterionScore
Qualitative score and rationale for one evaluated physical site factor.

| Field | Type | Required | Description / Range |
|---|---|---|---|
| `score` | `number` | Yes | Integer rating from 0 to 100 |
| `justification` | `string` | Yes | 1-2 sentence qualitative explanation |

---

### VisualAssessmentResultPayload
DTO delivered over the SSE stream when the AI site visit completes.

| Field | Type | Required | Description / Constraints |
|---|---|---|---|
| `visitId` | `string` | Yes | Unique session ID |
| `locationName` | `string` | Yes | Name of inspected location |
| `hasStreetViewCoverage` | `boolean` | Yes | `true` if Street View photos are available |
| `overallVisualScore` | `number` | Yes | Composite visual rating (0–100) |
| `images` | `SiteVisitImageSet` | Yes | Gallery image URLs |
| `criteria` | `object` | Yes | Object containing 5 `VisualCriterionScore` entries (storefrontVisibility, roadWidthAccess, trafficVisibility, buildingTypes, areaCondition) |
| `center` | `{ lat: number, lng: number }` | Yes | Target coordinates for map auto-centering |
| `summary` | `string` | Yes | Human-readable visual analysis summary |

---

## 2. Validation & Business Rules

1. **5-Factor Weighting (FR-005, Q1 Clarification)**: `overallVisualScore` MUST be calculated as:
   `0.30*storefront + 0.25*roadAccess + 0.20*traffic + 0.15*buildingTypes + 0.10*areaCondition`.
2. **Coverage Fallback (FR-006)**: If `hasStreetViewCoverage` is `false`, the system MUST return satellite imagery and score based on satellite building/road geometry.
3. **Map Centering (FR-008)**: Frontend MUST call `googleMapService.map.setCenter({ lat, lng })` and `map.setZoom(17)` upon receiving payload.
