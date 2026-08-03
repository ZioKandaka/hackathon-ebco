# OpenAPI Specification: Locations API (`/locations`)

Base URL: `/api/v1/locations`

---

## 1. `GET /api/v1/locations`

Retrieves all saved business locations belonging to the authenticated user.

### Headers / Cookies
- Cookie: `access_token=<JWT>` or `Authorization: Bearer <JWT>`

### Responses

#### `200 OK`

```json
{
  "locations": [
    {
      "id": "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
      "name": "Sudirman Coffee",
      "businessType": "coffee_shop",
      "fullAddress": "Jl. Jend. Sudirman No.10, RT.1/RW.3, Karet Tengsin, Tanah Abang, Kota Jakarta Pusat",
      "province": "DKI Jakarta",
      "regency": "Kota Jakarta Pusat",
      "subDistrict": "Tanah Abang",
      "postalCode": "10220",
      "latitude": -6.2088,
      "longitude": 106.8456,
      "confidence": 1.0,
      "createdAt": "2026-08-03T11:00:00.000Z"
    }
  ]
}
```

#### `401 Unauthorized`

---

## 2. `POST /api/v1/locations`

Direct creation endpoint for a new location record.

### Request Body (`application/json`)

```json
{
  "name": "Sudirman Coffee",
  "businessType": "coffee_shop",
  "fullAddress": "Jl. Jend. Sudirman No.10, Kota Jakarta Pusat",
  "latitude": -6.2088,
  "longitude": 106.8456,
  "province": "DKI Jakarta",
  "regency": "Kota Jakarta Pusat",
  "subDistrict": "Tanah Abang",
  "postalCode": "10220"
}
```

### Responses

#### `201 Created`

```json
{
  "location": {
    "id": "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
    "name": "Sudirman Coffee",
    "businessType": "coffee_shop",
    "fullAddress": "Jl. Jend. Sudirman No.10, Kota Jakarta Pusat",
    "latitude": -6.2088,
    "longitude": 106.8456,
    "createdAt": "2026-08-03T11:00:00.000Z"
  }
}
```

---

## 3. Conversational AI Integration (`POST /api/v1/chat/stream`)

When a user submits a branch creation request in the AI Chat Assistant Panel (e.g. `"Add my branch at Jl. Sudirman No. 10, call it Sudirman Coffee, it's a coffee shop"`), the existing SSE endpoint processes the skill step-by-step:

### SSE Event Stream Sequence

```text
event: status
data: {"type":"status","step":"Determining the right action...","timestamp":"2026-08-03T11:00:00.100Z"}

event: status
data: {"type":"status","step":"Looking up address via Google Geocoding...","timestamp":"2026-08-03T11:00:00.800Z"}

event: status
data: {"type":"status","step":"Creating your new branch...","timestamp":"2026-08-03T11:00:01.500Z"}

event: message
data: {"type":"message","content":"Successfully created 'Sudirman Coffee' at Jl. Jend. Sudirman No.10, Kota Jakarta Pusat. A pin has been added to your map.","timestamp":"2026-08-03T11:00:02.000Z"}

event: done
data: {"type":"done","timestamp":"2026-08-03T11:00:02.100Z"}
```
