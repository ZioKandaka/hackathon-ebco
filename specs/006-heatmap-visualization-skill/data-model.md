# Data Model & Domain Entities: Heatmap Visualization AI Skill

## 1. Core Domain Entities

### HeatmapQuery
Represents a natural-language heatmap request submitted by a user in the chat panel.

| Field | Type | Required | Description / Constraints |
|---|---|---|---|
| `id` | `string` (UUID) | Yes | Unique identifier for the query execution |
| `userId` | `string` (UUID) | Yes | ID of authenticated user submitting request |
| `mode` | `enum` | Yes | `'business_based'` (Mode A) or `'custom_prompt'` (Mode B) |
| `businessType` | `string` | Optional | E.g. `'minimarket'`, `'coffee_shop'`, `'preschool'` |
| `region` | `string` | Yes | Target regency or province (e.g. `'Kediri'`, `'Bandung'`) |
| `regencyCode` | `string` | Optional | Canonical regency code for BigQuery partition filter |
| `provinceCode` | `string` | Optional | Canonical province code for BigQuery partition filter |
| `customFilter` | `object` | Optional | Key-value attribute filters (e.g., `{ maxRating: 4.0, status: 'operational' }`) |
| `createdAt` | `string` (ISO-8601) | Yes | Timestamp of request creation |

---

### HeatmapPoint
Represents a single weighted spatial location rendered as a density point on the Google Map HeatmapLayer.

| Field | Type | Required | Description / Constraints |
|---|---|---|---|
| `latitude` | `number` | Yes | Valid latitude float between -90.0 and 90.0 |
| `longitude` | `number` | Yes | Valid longitude float between -180.0 and 180.0 |
| `weight` | `number` | Yes | Non-negative weight float (0.0 to 10.0+); determines color intensity |

---

### HeatmapResponsePayload
DTO embedded within the final SSE `message` event sent to the Vue 3 frontend.

| Field | Type | Required | Description / Constraints |
|---|---|---|---|
| `queryId` | `string` | Yes | Foreign key to `HeatmapQuery.id` |
| `mode` | `enum` | Yes | `'business_based'` or `'custom_prompt'` |
| `region` | `string` | Yes | Target geographic area name |
| `pointCount` | `number` | Yes | Total points returned (strictly `<= 5000` per FR-010) |
| `points` | `HeatmapPoint[]` | Yes | Array of weighted lat/lng points |
| `summary` | `string` | Yes | AI explanation of heatmap color representation |

---

## 2. Heatmap Layer State Lifecycle (Frontend)

```text
[No Active Heatmap] (0 layers)
        │
        ▼ User submits heatmap prompt in AI Chat Panel
[SSE Stream Active] ──► Status updates: "Determining action..." ──► "Aggregating location data..."
        │
        ▼ Final SSE message received with heatmapData
[Layer Replacement] ──► Call activeHeatmapLayer.setMap(null) (destroys existing layer)
        │
        ▼ Instantiate new HeatmapLayer(data) & fitBounds(points)
[1 Active Heatmap Layer] ──► Rendered on shared Google Map alongside existing markers
```

---

## 3. Data Validation Rules

1. **Point Limit (FR-010)**: `points.length` MUST NOT exceed 5,000. BigQuery SQL queries MUST append `LIMIT 5000`.
2. **Partition Filter Enforcement (SC-003)**: Every BigQuery SQL query generated MUST include `WHERE regency_code = @regencyCode` or `WHERE province_code = @provinceCode` or matching `LIKE` expression.
3. **Coordinate Sanity**: Coordinates outside valid geographic range (`lat` -90..90, `lng` -180..180) MUST be filtered out prior to emitting response payloads.
