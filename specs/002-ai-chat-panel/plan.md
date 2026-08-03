# Implementation Plan: AI Chat Assistant Panel

**Branch**: `002-ai-chat-panel` | **Date**: 2026-08-03 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-ai-chat-panel/spec.md`

## Summary

Build the AI Chat Assistant Panel — the persistent, global floating UI surface and SSE transport layer through which users interact with AI capabilities. The NestJS backend provides a `chat_messages` PostgreSQL table for user-scoped chat history persistence, a `GET /api/v1/chat/history` retrieval endpoint, and a `POST /api/v1/chat/stream` Server-Sent Events (SSE) route emitting RxJS status and response streams. The Vue 3 frontend renders a right-docked floating panel (`AiChatPanel.vue`) overlaying 25% of the Google Map view without resizing the map, uses Pinia (`useChatStore`) to manage chat state, and streams real-time step-by-step progress updates.

## Technical Context

**Language/Version**: TypeScript 5.x / Node.js 20+ (NestJS 10.x backend, Vue 3.4+ Composition API frontend)

**Primary Dependencies**:
- Backend: `@nestjs/common` (RxJS `@Sse()`), `@nestjs/typeorm`, `typeorm`, `rxjs`
- Frontend: `pinia`, `vue`, `axios` (for history), native `fetch` / `ReadableStream` (for SSE streaming)

**Storage**: Cloud SQL PostgreSQL (`chat_messages` table, FK `user_id` -> `users.id`, indexed `(user_id, created_at)`) in GCP project `ebc-cloud-dev-03`

**Testing**: Jest (`@nestjs/testing`) for unit tests and Supertest for NestJS `/chat` endpoints

**Target Platform**: GCP Cloud Run services (`/backend` and `/frontend` containers)

**Project Type**: Monorepo Web Application (`/backend` NestJS + `/frontend` Vue 3)

**Performance Goals**: SSE status stream initial event latency < 200ms; panel load & history render < 500ms

**Constraints**: Strict TypeScript mode; single shared Google Maps instance (must NOT resize or replace map canvas); user-scoped data access; human-readable status updates (no generic loading spinners or raw stack traces)

**Scale/Scope**: Transport and UI layer for all present and future AI capabilities

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Code Quality & Type Safety**: PASS — TypeScript strict mode across frontend and backend; strongly typed DTOs and SSE event interfaces (`ChatStreamEvent`).
- **II. Testing Standards**: PASS — Unit tests for `ChatService` stream generation and message persistence; happy-path integration tests for `GET /chat/history` and `POST /chat/stream`.
- **III. User Experience & AI Interactivity**: PASS — Directly satisfies Progress Visibility via SSE live status streaming, Single Shared Map by floating over the map without container resizing, and Graceful Error Handling by rendering step failure messages.
- **IV. Performance & Cost Optimization**: PASS — Chat history lookups indexed on `(user_id, created_at)`; SSE streams fit Cloud Run request/response lifecycle without persistent connection costs.
- **V. Scope Discipline**: PASS — Delivers focused UI & transport vertical slice; AI skills are separate specs plugged into this panel interface.
- **Infrastructure & Deployment**: PASS — Cloud Run services backed by Cloud SQL PostgreSQL in `ebc-cloud-dev-03`.

## Project Structure

### Documentation (this feature)

```text
specs/002-ai-chat-panel/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── chat-api.md
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── modules/
│   │   ├── chat/
│   │   │   ├── dto/
│   │   │   │   └── send-message.dto.ts
│   │   │   ├── entities/
│   │   │   │   └── chat-message.entity.ts
│   │   │   ├── chat.controller.ts
│   │   │   ├── chat.service.ts
│   │   │   └── chat.module.ts
│   │   └── auth/
│   └── app.module.ts
└── test/
    └── chat.e2e-spec.ts

frontend/
├── src/
│   ├── components/
│   │   └── chat/
│   │       ├── AiChatPanel.vue
│   │       ├── ChatMessageList.vue
│   │       ├── ChatStatusCard.vue
│   │       └── ChatInput.vue
│   ├── stores/
│   │   └── chat.store.ts
│   ├── services/
│   │   └── chat-sse.service.ts
│   └── App.vue
```

**Structure Decision**: Monorepo Web Application with `/backend` (NestJS) and `/frontend` (Vue 3 Composition API).

## Complexity Tracking

> No constitution violations. Standard NestJS SSE + Vue 3 floating panel implementation.
