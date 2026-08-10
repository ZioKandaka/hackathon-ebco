# Interface Contracts: Catchment Score AI Skill

## 1. SSE Stream Interface (`POST /api/v1/chat/stream`)

Catchment AI skill requests are processed through the existing chat streaming endpoint.

### Request
- **HTTP Method**: `POST`
- **URL**: `/api/v1/chat/stream`
- **Headers**:
  - `Content-Type: application/json`
  - `Authorization: Bearer <jwt_token>`
  - `Accept: text/event-stream`

```json
{
  "message": "Analyze the catchment for my Sudirman branch within 2km"
}
```

---

### Streamed SSE Response Events

#### Event 1: Initial Action Determination Status
```text
event: message
data: {"type":"status","step":"Determining the right action (Catchment Score)...","timestamp":"2026-08-10T14:00:00.000Z"}
```

#### Event 2: POI Data Gathering Status
```text
event: message
data: {"type":"status","step":"Gathering nearby location data within 2km...","timestamp":"2026-08-10T14:00:00.500Z"}
```

#### Event 3: Score Calculation Status
```text
event: message
data: {"type":"status","step":"Calculating catchment score...","timestamp":"2026-08-10T14:00:01.000Z"}
```

#### Event 4: Final Message with Catchment Payload
```text
event: message
data: {
  "type": "message",
  "content": "Catchment analysis for Sudirman branch within 2km:\n\n• Overall Composite Score: 82 / 100\n\nSub-score Breakdown:\n- Demand Density: 88/100 (High residential & office concentration)\n- Traffic Proxy: 75/100 (Strong aggregate review volume)\n- Area Quality: 84/100 (4.2 average star rating)\n- Competition Penalty: -15/100 (2 direct competitors)\n- Network Saturation: 0/100 (No same-brand saturation)\n- Operational Vitality: 95/100 (95% active operating POIs)",
  "catchmentData": {
    "analysisId": "cs-7a8b9c",
    "locationId": "loc-uuid-123",
    "locationName": "Sudirman branch",
    "radiusKm": 2.0,
    "compositeScore": 82,
    "subScores": {
      "demandDensity": 88,
      "trafficProxy": 75,
      "areaQuality": 84,
      "competitionPenalty": 15,
      "networkSaturation": 0,
      "operationalVitality": 95
    },
    "poiCount": 142,
    "center": { "lat": -6.2088, "lng": 106.8456 },
    "summary": "Catchment analysis for Sudirman branch within 2km: Composite Score 82/100."
  },
  "timestamp": "2026-08-10T14:00:01.800Z"
}
```

#### Event 5: Completion
```text
event: message
data: {"type":"done","timestamp":"2026-08-10T14:00:01.850Z"}
```

---

## 2. Frontend Map Service Contract (`google-map.service.ts`)

```typescript
export interface CatchmentCircleOptions {
  strokeColor?: string;
  fillColor?: string;
  fillOpacity?: number;
  fitBounds?: boolean;
}

export interface IGoogleMapService {
  /**
   * Renders a circular catchment radius boundary around center coordinates.
   * Unregisters and destroys any existing active catchment circle overlay (FR-009, SC-003).
   * Automatically pans/zooms map to fit the circular boundary if fitBounds is true.
   */
  renderCatchmentCircle(
    center: { lat: number; lng: number },
    radiusMeters: number,
    options?: CatchmentCircleOptions,
  ): void;

  /**
   * Destroys the active catchment circle overlay if present.
   */
  removeCatchmentCircle(): void;
}
```
