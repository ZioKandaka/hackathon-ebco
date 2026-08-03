# Phase 0 Research: AI Chat Assistant Panel

## 1. Real-Time Streaming Architecture (Server-Sent Events)

- **Decision**: NestJS `@Sse()` controller route exposing `POST /api/v1/chat/stream` returning an RxJS `Observable<MessageEvent>`.
- **Rationale**: NestJS natively supports Server-Sent Events via RxJS streams. SSE operates over standard HTTP, eliminating WebSocket handshake and connection state overhead on GCP Cloud Run.
- **Alternatives Considered**: 
  - WebSockets (Socket.io / `@nestjs/websockets`): Rejected because persistent bidirectional connections complicate stateless scaling and connection idle timeouts on Cloud Run.
  - Long Polling: Higher request overhead and latency compared to streaming SSE.

## 2. Frontend SSE Consumption & Message Submission

- **Decision**: Fetch-based streaming client (`fetch` with `ReadableStream` reader or `@microsoft/fetch-event-source`) in Vue 3 `useChatStore`.
- **Rationale**: Standard browser `EventSource` only supports `GET` requests without custom request bodies. Fetch with `ReadableStream` allows submitting user chat message payloads via `POST` with credentials while processing SSE status events (`status`, `message`, `error`, `done`) in real time.
- **Alternatives Considered**:
  - URL Query Parameter GET with native `EventSource`: Insecure (exposes user query in server logs) and subject to URL length limits.

## 3. Persistent Storage & Relational Schema

- **Decision**: PostgreSQL `chat_messages` table with columns `id` (UUID), `user_id` (UUID FK to `users.id`), `sender` (`user`, `assistant`, `system_status`), `content` (TEXT), and `created_at` (TIMESTAMPTZ).
- **Rationale**: Enables simple, indexed O(1) query lookups on `(user_id, created_at ASC)` for user history restoration on page reloads (FR-004, FR-005).
- **Alternatives Considered**:
  - In-memory session array: Lost on server restart or page refresh; violates persistence requirement.
  - Single JSON array column on `users` table: Hard to paginate and scale as chat history grows.

## 4. UI Docked Layout & Map Interactivity

- **Decision**: Fixed right-aligned overlay component (`position: fixed; top: 0; right: 0; width: 25vw; height: 100vh; z-index: 1000;`) rendering over the shared Google Map container (`width: 100vw; height: 100vh;`).
- **Rationale**: Satisfies FR-001 and FR-002 requirements: the chat panel floats over the right 25% of the viewport, leaving the remaining 75% map viewport completely interactive without resizing or re-rendering the underlying Google Map instance.
- **Alternatives Considered**:
  - Resizing map container width to 75vw: Causes Google Map tile re-renders and map container resizing, violating the explicit constraint that the map remains un-resized.
