# OpenAPI & SSE Specification: Location Discovery API (`/discovery`)

Base URL: `/api/v1/discovery`

---

## 1. `POST /api/v1/discovery/search`

Direct endpoint to execute a location discovery search for a given business type and region.

### Request Body (`application/json`)

```json
{
  "businessType": "coffee_shop",
  "region": "Kediri",
  "limit": 5
}
```

### Responses

#### `200 OK`

```json
{
  "query": {
    "businessType": "coffee_shop",
    "region": "Kediri"
  },
  "candidates": [
    {
      "rank": 1,
      "name": "Kediri Town Square Area",
      "latitude": -7.8167,
      "longitude": 112.0117,
      "demandScore": 88,
      "competitionCount": 0,
      "rationale": "High student and office POI density; 0 direct coffee shop competitors within 1km radius.",
      "regencyCode": "3506"
    },
    {
      "rank": 2,
      "name": "Gampengrejo Commercial Corridor",
      "latitude": -7.7833,
      "longitude": 112.0333,
      "demandScore": 81,
      "competitionCount": 1,
      "rationale": "Moderate retail density and growing residential traffic; 1 competitor within 1.5km.",
      "regencyCode": "3506"
    }
  ]
}
```

#### `400 Bad Request`
Missing required parameters.

---

## 2. Conversational Chat Stream Integration (`POST /api/v1/chat/stream`)

When a user submits a discovery request in the chat panel (e.g., `"Find me the top 5 spots to open a coffee shop in Kediri"`), the SSE stream emits progress updates and candidate items:

### SSE Event Stream Sequence

```text
event: status
data: {"type":"status","step":"Determining the right action (Location Discovery)...","timestamp":"2026-08-03T11:30:00.100Z"}

event: status
data: {"type":"status","step":"Querying BigQuery POI datasets for Kediri...","timestamp":"2026-08-03T11:30:00.800Z"}

event: status
data: {"type":"status","step":"Ranking top candidate spots by demand density...","timestamp":"2026-08-03T11:30:01.500Z"}

event: message
data: {"type":"message","content":"Top 5 Candidate Spots for Coffee Shop in Kediri:\n1. Spot 1: Kediri Town Square Area (Score: 88) - High student/office density, 0 competitors within 1km\n2. Spot 2: Gampengrejo Corridor (Score: 81) - Growing residential traffic\n\nPins have been rendered on your map. Click any pin for details.","timestamp":"2026-08-03T11:30:02.000Z"}

event: done
data: {"type":"done","timestamp":"2026-08-03T11:30:02.100Z"}
```
