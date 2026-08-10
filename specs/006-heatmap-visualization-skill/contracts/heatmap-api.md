# Interface Contracts: Heatmap Visualization AI Skill

## 1. SSE Stream Interface (`POST /api/v1/chat/stream`)

Heatmap AI skill requests are submitted through the existing chat streaming endpoint.

### Request
- **HTTP Method**: `POST`
- **URL**: `/api/v1/chat/stream`
- **Headers**:
  - `Content-Type: application/json`
  - `Authorization: Bearer <jwt_token>`
  - `Accept: text/event-stream`

```json
{
  "message": "Show me a heatmap for my minimarket business in Kediri"
}
```

---

### Streamed SSE Response Events

#### Event 1: Initial Action Determination Status
```text
event: message
data: {"type":"status","step":"Determining the right action (Heatmap Visualization)...","timestamp":"2026-08-10T12:00:00.000Z"}
```

#### Event 2: Data Aggregation Status
```text
event: message
data: {"type":"status","step":"Aggregating BigQuery POI location data for Kediri...","timestamp":"2026-08-10T12:00:00.500Z"}
```

#### Event 3: Heatmap Rendering Status
```text
event: message
data: {"type":"status","step":"Rendering weighted heatmap layer...","timestamp":"2026-08-10T12:00:01.100Z"}
```

#### Event 4: Final Message with Heatmap Payload
```text
event: message
data: {
  "type": "message",
  "content": "Here is the opportunity density heatmap for minimarket in Kediri. Darker red areas indicate high demand density with low direct competition.",
  "heatmapData": {
    "queryId": "hm-9f8a2b3c",
    "mode": "business_based",
    "region": "Kediri",
    "pointCount": 184,
    "points": [
      { "lat": -7.8167, "lng": 112.0117, "weight": 8.5 },
      { "lat": -7.8200, "lng": 112.0150, "weight": 6.2 },
      { "lat": -7.8100, "lng": 112.0080, "weight": 9.1 }
    ],
    "summary": "Darker red areas indicate high minimarket demand with low direct competition."
  },
  "timestamp": "2026-08-10T12:00:01.800Z"
}
```

#### Event 5: Completion
```text
event: message
data: {"type":"done","timestamp":"2026-08-10T12:00:01.850Z"}
```

---

## 2. Frontend Map Service Contract (`google-map.service.ts`)

```typescript
export interface HeatmapPoint {
  lat: number;
  lng: number;
  weight: number;
}

export interface RenderHeatmapOptions {
  radius?: number;
  opacity?: number;
  fitBounds?: boolean;
}

export interface IGoogleMapService {
  /**
   * Renders a weighted heatmap layer on the map.
   * Destroys any previously rendered active heatmap layer (SC-002, FR-007).
   * Automatically fits map bounds to point dataset if fitBounds is true (FR-009).
   */
  renderHeatmap(points: HeatmapPoint[], options?: RenderHeatmapOptions): void;

  /**
   * Destroys the currently active heatmap layer if present.
   */
  removeHeatmap(): void;
}
```
