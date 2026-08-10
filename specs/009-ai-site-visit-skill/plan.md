# Implementation Plan: AI Site Visit AI Skill

**Branch**: `009-ai-site-visit-skill` | **Date**: 2026-08-10 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/009-ai-site-visit-skill/spec.md`

## Summary

Build the AI Site Visit AI Skill — a qualitative visual inspection feature enabling authenticated users to evaluate a saved location or discovery candidate spot ("What does spot 1 look like?") using street-level and satellite imagery through the AI Chat Assistant Panel. The NestJS backend checks Google Street View metadata, fetches 4 cardinal heading images (0°, 90°, 180°, 270°) + 1 satellite snapshot, streams real-time SSE status updates ("Determining action...", "Fetching street-level imagery...", "Analyzing the site visually..."), processes imagery with Gemini multimodal vision AI to evaluate 5 physical criteria (Storefront 30%, Road Access 25%, Traffic 20%, Buildings 15%, Condition 10%), handles zero Street View coverage via a satellite-only fallback, and returns structured ratings alongside an interactive image gallery in chat. The Vue 3 frontend renders the thumbnail gallery with Lightbox expansion and automatically centers the shared Google Map instance on the analyzed location.

## Technical Context

**Language/Version**: TypeScript 5.x / Node.js 20+ (NestJS 10.x backend, Vue 3.4+ Composition API frontend)

**Primary Dependencies**:
- Backend: `@nestjs/common` (RxJS `@Sse()`), `@nestjs/typeorm`, `@google-cloud/vertexai` (Gemini 1.5 Flash), `axios`, `rxjs`
- Frontend: `vue`, `pinia`, `@googlemaps/js-api-loader`

**Storage**: Cloud SQL PostgreSQL (`chat_messages` table, `user_locations` table)

**Testing**: Jest (`@nestjs/testing`) for NestJS backend unit/integration tests; Vitest (`frontend`) for frontend Vue components

**Target Platform**: GCP Cloud Run services (`/backend` and `/frontend` containers)

**Project Type**: Monorepo Web Application (`/backend` NestJS + `/frontend` Vue 3)

**Performance Goals**: Image metadata check, 5 static images fetch, multimodal vision scoring, and chat gallery rendering < 5 seconds (SC-001)

**Constraints**: Single shared Google Maps instance (must NOT resize or replace map canvas); graceful fallback for missing Street View coverage without blank outputs or errors (SC-002); complementary companion to numeric Catchment Scores (SC-004)

**Scale/Scope**: AI Site Visit AI Skill for qualitative ground-truth inspection of saved business branches and discovery candidate spots

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Code Quality & Type Safety**: PASS — TypeScript strict mode across frontend and backend; strongly typed DTOs and SSE event interfaces (`VisualAssessmentResultPayload`, `SiteVisitImageSet`).
- **II. Testing Standards**: PASS — Unit tests for `ChatService` stream generation and `SiteVisitService` image metadata/scoring pipeline; Vitest tests for gallery components.
- **III. User Experience & AI Interactivity**: PASS — Directly satisfies Progress Visibility via SSE live status streaming ("Determining action...", "Fetching street-level imagery...", "Analyzing site visually..."), Single Shared Map by centering `googleMapService.map` on target coordinates without container resizing, and Graceful Error Handling by detecting zero Street View coverage.
- **IV. Performance & Cost Optimization**: PASS — Street View metadata check prevents redundant full-image payload calls; caching image URLs per request.
- **V. Scope Discipline**: PASS — Focused qualitative site inspection AI skill; complements numeric catchment score without overwriting metrics.

## Project Structure

### Documentation (this feature)

```text
specs/009-ai-site-visit-skill/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── site-visit-api.md
└── checklists/
    └── requirements.md
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── modules/
│   │   ├── chat/
│   │   │   ├── chat.controller.ts
│   │   │   ├── chat.service.ts
│   │   │   └── chat.module.ts
│   │   └── discovery/
│   │       └── services/
│   │           ├── bigquery-discovery.service.ts
│   │           ├── discovery.service.ts
│   │           └── site-visit.service.ts
│   └── app.module.ts
└── test/
    └── site-visit.e2e-spec.ts

frontend/
├── src/
│   ├── components/
│   │   ├── chat/
│   │   │   ├── AiChatPanel.vue
│   │   │   └── SiteVisitGallery.vue
│   │   └── map/
│   │       └── BaseMap.vue
│   ├── services/
│   │   ├── google-map.service.ts
│   │   └── chat-sse.service.ts
│   ├── stores/
│   │   └── chat.store.ts
│   └── views/
│       └── MyLocationsView.vue
```

**Structure Decision**: Monorepo Web Application with `/backend` (NestJS) and `/frontend` (Vue 3 Composition API).

## Complexity Tracking

> No constitution violations. Standard NestJS SSE + Google Street View/Static Maps API + Gemini multimodal vision analysis implementation.
