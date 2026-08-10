# Interface Contracts: AI Site Visit AI Skill

## 1. SSE Stream Interface (`POST /api/v1/chat/stream`)

AI Site Visit skill requests are processed through the existing chat streaming endpoint.

### Request
- **HTTP Method**: `POST`
- **URL**: `/api/v1/chat/stream`
- **Headers**:
  - `Content-Type: application/json`
  - `Authorization: Bearer <jwt_token>`
  - `Accept: text/event-stream`

```json
{
  "message": "Do an AI site visit on my Sudirman branch"
}
```

---

### Streamed SSE Response Events

#### Event 1: Initial Action Determination Status
```text
event: message
data: {"type":"status","step":"Determining the right action (AI Site Visit)...","timestamp":"2026-08-10T16:00:00.000Z"}
```

#### Event 2: Imagery Fetching Status
```text
event: message
data: {"type":"status","step":"Fetching street-level imagery and satellite snapshot...","timestamp":"2026-08-10T16:00:00.600Z"}
```

#### Event 3: Multimodal Vision Analysis Status
```text
event: message
data: {"type":"status","step":"Analyzing the site visually with multimodal vision AI...","timestamp":"2026-08-10T16:00:01.200Z"}
```

#### Event 4: Final Message with Site Visit Payload
```text
event: message
data: {
  "type": "message",
  "content": "AI Site Visit Report for Sudirman branch:\n\n• Overall Visual Rating: 85 / 100\n\nVisual Criteria Assessment:\n- Storefront Visibility: 90/100 (Unobstructed main road frontage with high signage visibility)\n- Road Width & Access: 85/100 (Wide 4-lane arterial road with dedicated turning lane)\n- Foot/Vehicle Traffic: 80/100 (Steady vehicle flow and visible pedestrian sidewalk traffic)\n- Surrounding Building Types: 85/100 (Modern commercial offices and high-density retail)\n- General Area Condition: 85/100 (Clean, well-maintained pavement and street lighting)",
  "siteVisitData": {
    "visitId": "sv-8f7e6d",
    "locationName": "Sudirman branch",
    "hasStreetViewCoverage": true,
    "overallVisualScore": 85,
    "images": {
      "hasStreetViewCoverage": true,
      "streetViewNorthUrl": "https://maps.googleapis.com/maps/api/streetview?size=600x400&location=-6.2088,106.8456&heading=0",
      "streetViewEastUrl": "https://maps.googleapis.com/maps/api/streetview?size=600x400&location=-6.2088,106.8456&heading=90",
      "streetViewSouthUrl": "https://maps.googleapis.com/maps/api/streetview?size=600x400&location=-6.2088,106.8456&heading=180",
      "streetViewWestUrl": "https://maps.googleapis.com/maps/api/streetview?size=600x400&location=-6.2088,106.8456&heading=270",
      "satelliteUrl": "https://maps.googleapis.com/maps/api/staticmap?size=600x400&center=-6.2088,106.8456&zoom=18&maptype=satellite"
    },
    "criteria": {
      "storefrontVisibility": { "score": 90, "justification": "Unobstructed main road frontage with high signage visibility" },
      "roadWidthAccess": { "score": 85, "justification": "Wide 4-lane arterial road with dedicated turning lane" },
      "trafficVisibility": { "score": 80, "justification": "Steady vehicle flow and visible pedestrian sidewalk traffic" },
      "buildingTypes": { "score": 85, "justification": "Modern commercial offices and high-density retail" },
      "areaCondition": { "score": 85, "justification": "Clean, well-maintained pavement and street lighting" }
    },
    "center": { "lat": -6.2088, "lng": 106.8456 },
    "summary": "AI Site Visit for Sudirman branch: Visual Score 85/100."
  },
  "timestamp": "2026-08-10T16:00:02.500Z"
}
```

#### Event 5: Completion
```text
event: message
data: {"type":"done","timestamp":"2026-08-10T16:00:02.550Z"}
```
