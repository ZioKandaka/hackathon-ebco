# OpenAPI & Streaming Specification: Chat API (`/chat`)

Base URL: `/api/v1/chat`

---

## 1. `GET /api/v1/chat/history`

Retrieves the authenticated user's chronological chat history.

### Headers / Cookies
- Cookie: `access_token=<JWT>` or `Authorization: Bearer <JWT>`

### Responses

#### `200 OK`

```json
{
  "messages": [
    {
      "id": "c1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c",
      "sender": "user",
      "content": "Find coffee shops near Central Park",
      "createdAt": "2026-08-03T10:15:00.000Z"
    },
    {
      "id": "e9f8e7d6-c5b4-a3f2-1e0d-9c8b7a6f5e4d",
      "sender": "assistant",
      "content": "I found 12 coffee shops near Central Park...",
      "createdAt": "2026-08-03T10:15:03.000Z"
    }
  ]
}
```

#### `401 Unauthorized`
Unauthenticated visitor.

---

## 2. `POST /api/v1/chat/stream` (SSE Stream Endpoint)

Submits a user message and opens a Server-Sent Events (SSE) stream for real-time process status updates and final AI response.

### Request Body (`application/json`)

```json
{
  "message": "Find coffee shops near Central Park"
}
```

### Response Headers
- `Content-Type: text/event-stream`
- `Cache-Control: no-cache`
- `Connection: keep-alive`

### SSE Event Payload Sequence Examples

#### Step 1: Initial Processing Status Event
```text
event: status
data: {"type":"status","step":"Understanding your request...","timestamp":"2026-08-03T10:15:00.100Z"}
```

#### Step 2: Next Processing Action Status Event
```text
event: status
data: {"type":"status","step":"Determining the right action...","timestamp":"2026-08-03T10:15:00.800Z"}
```

#### Step 3: Data Fetching Status Event
```text
event: status
data: {"type":"status","step":"Fetching required data...","timestamp":"2026-08-03T10:15:01.500Z"}
```

#### Step 4: Final Assistant Response Event
```text
event: message
data: {"type":"message","content":"I found 12 coffee shops near Central Park. Here are the top locations...","timestamp":"2026-08-03T10:15:03.000Z"}
```

#### Step 5: Stream Complete Event
```text
event: done
data: {"type":"done","timestamp":"2026-08-03T10:15:03.100Z"}
```

#### Failure Event (if an error occurs)
```text
event: error
data: {"type":"error","error":"Couldn't find locations for that area — please check the address and try again.","timestamp":"2026-08-03T10:15:02.000Z"}
```
