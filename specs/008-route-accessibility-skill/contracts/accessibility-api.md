# Interface Contracts: Route-Based Accessibility AI Skill

## 1. SSE Stream Interface (`POST /api/v1/chat/stream`)

Accessibility AI skill requests are processed through the existing chat streaming endpoint.

### Request
- **HTTP Method**: `POST`
- **URL**: `/api/v1/chat/stream`
- **Headers**:
  - `Content-Type: application/json`
  - `Authorization: Bearer <jwt_token>`
  - `Accept: text/event-stream`

```json
{
  "message": "Check how accessible my Sudirman branch is within a 10 minute drive"
}
```

---

### Streamed SSE Response Events

#### Event 1: Initial Action Determination Status
```text
event: message
data: {"type":"status","step":"Determining the right action (Accessibility Analysis)...","timestamp":"2026-08-10T15:00:00.000Z"}
```

#### Event 2: Travel-Time Boundary Status
```text
event: message
data: {"type":"status","step":"Calculating 10-minute drive travel-time boundary...","timestamp":"2026-08-10T15:00:00.600Z"}
```

#### Event 3: Reachable Area Scoring Status
```text
event: message
data: {"type":"status","step":"Analyzing reachable area POI density...","timestamp":"2026-08-10T15:00:01.200Z"}
```

#### Event 4: Final Message with Accessibility Payload
```text
event: message
data: {
  "type": "message",
  "content": "Accessibility analysis for Sudirman branch (10-minute drive):\n\n• Drive-Time Composite Score: 78 / 100\n• Comparison vs 2km Radius: -4 points (78 drive-time vs 82 radius, due to Sudirman highway congestion and river barrier constraints)\n\nSub-score Breakdown:\n- Demand Density: 82/100 (112 reachable demand POIs)\n- Traffic Proxy: 72/100 (Strong review counts along arterial corridors)\n- Area Quality: 84/100 (4.2 average star rating)\n- Competition Penalty: -12/100 (1 competitor inside isochrone)\n- Network Saturation: 0/100 (No brand saturation)\n- Operational Vitality: 94/100 (94% active operating POIs)",
  "accessibilityData": {
    "analysisId": "acc-9b8c7a",
    "locationId": "loc-uuid-123",
    "locationName": "Sudirman branch",
    "travelMode": "drive",
    "timeMinutes": 10,
    "compositeScore": 78,
    "subScores": {
      "demandDensity": 82,
      "trafficProxy": 72,
      "areaQuality": 84,
      "competitionPenalty": 12,
      "networkSaturation": 0,
      "operationalVitality": 94
    },
    "poiCount": 112,
    "polygonCoordinates": [
      { "lat": -6.1950, "lng": 106.8400 },
      { "lat": -6.2000, "lng": 106.8550 },
      { "lat": -6.2200, "lng": 106.8500 },
      { "lat": -6.2250, "lng": 106.8350 },
      { "lat": -6.2050, "lng": 106.8300 }
    ],
    "radiusScoreDelta": -4,
    "summary": "10-minute drive accessibility score: 78/100."
  },
  "timestamp": "2026-08-10T15:00:02.100Z"
}
```

#### Event 5: Completion
```text
event: message
data: {"type":"done","timestamp":"2026-08-10T15:00:02.150Z"}
```

---

## 2. Frontend Map Service Contract (`google-map.service.ts`)

```typescript
export interface IsochronePolygonOptions {
  strokeColor?: string;
  fillColor?: string;
  fillOpacity?: number;
  fitBounds?: boolean;
}

export interface IGoogleMapService {
  /**
   * Renders an isochrone polygon boundary on the map.
   * Unregisters and destroys any active radius circle or previous isochrone polygon (FR-009).
   * Automatically fits map bounds to the polygon path vertices if fitBounds is true.
   */
  renderIsochronePolygon(
    path: Array<{ lat: number; lng: number }>,
    options?: IsochronePolygonOptions,
  ): void;

  /**
   * Destroys the active isochrone polygon overlay if present.
   */
  removeIsochronePolygon(): void;
}
```
