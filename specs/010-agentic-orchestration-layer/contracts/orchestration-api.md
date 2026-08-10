# Interface Contracts: Agentic Orchestration Layer

## 1. SSE Stream Interface (`POST /api/v1/chat/stream`)

Multi-tool orchestrated requests are processed seamlessly through the existing chat streaming endpoint.

### Request
- **HTTP Method**: `POST`
- **URL**: `/api/v1/chat/stream`
- **Headers**:
  - `Content-Type: application/json`
  - `Authorization: Bearer <jwt_token>`
  - `Accept: text/event-stream`

```json
{
  "message": "Find coffee shop candidates in Kediri and show a heatmap for minimarket density"
}
```

---

### Streamed SSE Response Events (Multi-Tool Example: Discover + Heatmap)

#### Event 1: Initial Intent Analysis Status
```text
event: message
data: {"type":"status","step":"Orchestrating AI tools (Discover → Heatmap)...","timestamp":"2026-08-10T17:00:00.000Z"}
```

#### Event 2: Step 1 Execution Status (Discover)
```text
event: message
data: {"type":"status","step":"Step 1/2: Searching candidate locations in Kediri...","timestamp":"2026-08-10T17:00:00.500Z"}
```

#### Event 3: Step 2 Execution Status (Heatmap)
```text
event: message
data: {"type":"status","step":"Step 2/2: Aggregating minimarket density heatmap...","timestamp":"2026-08-10T17:00:01.200Z"}
```

#### Event 4: Final Synthesized Message Payload
```text
event: message
data: {
  "type": "message",
  "content": "Here is the combined location analysis for Kediri:\n\n1. Candidate Discovery:\n- Spot #1: Kediri Commercial Corridor (Score 88/100)\n- Spot #2: University District Crossing (Score 82/100)\n\n2. Spatial Heatmap Density:\n- Overlaid minimarket opportunity density heatmap across Kediri. Warm red tones indicate high demand zones with low competition.",
  "candidates": [
    { "rank": 1, "name": "Kediri Commercial Corridor", "latitude": -7.8167, "longitude": 112.0117, "demandScore": 88 }
  ],
  "heatmapData": {
    "queryId": "hm-kediri",
    "mode": "business_based",
    "region": "Kediri",
    "pointCount": 150,
    "points": [{ "lat": -7.8167, "lng": 112.0117, "weight": 8.5 }],
    "summary": "Minimarket density heatmap"
  },
  "timestamp": "2026-08-10T17:00:02.100Z"
}
```

#### Event 5: Completion
```text
event: message
data: {"type":"done","timestamp":"2026-08-10T17:00:02.150Z"}
```
