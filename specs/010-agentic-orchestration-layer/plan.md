# Implementation Plan: Agentic Orchestration Layer

**Branch**: `010-agentic-orchestration-layer` | **Date**: 2026-08-10 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/010-agentic-orchestration-layer/spec.md`

## Summary

Build the Agentic Orchestration Layer for the AI Chat Assistant Panel — enabling the AI to freely combine and chain multiple existing location intelligence skills (Discover, Heatmap, Catchment Scoring, Accessibility Analysis, AI Site Visit, Add Business/Branch) in a single conversation turn, chosen dynamically based on multi-intent user prompts rather than a fixed predefined sequence. The NestJS backend implements `OrchestratorService` (`backend/src/modules/chat/orchestrator.service.ts`) to register all 6 skills as callable tools, decompose user prompts into sequential execution steps, pass intermediate data outputs between tools via a shared `OrchestrationContext`, stream live SSE status updates for each step as it runs ("Step 1/2..." → "Step 2/2..."), handle tool failures gracefully without crashing, and synthesize a single unified natural-language report. The Vue 3 frontend updates `chatStore` and `GoogleMapService` to render all combined visual artifacts (pins, heatmaps, circles, isochrone polygons, site visit galleries) on the shared map canvas.

## Technical Context

**Language/Version**: TypeScript 5.x / Node.js 20+ (NestJS 10.x backend, Vue 3.4+ Composition API frontend)

**Primary Dependencies**:
- Backend: `@nestjs/common` (RxJS `@Sse()`), `@nestjs/typeorm`, `@google-cloud/bigquery`, `rxjs`
- Frontend: `vue`, `pinia`, `@googlemaps/js-api-loader`

**Storage**: Cloud SQL PostgreSQL (`chat_messages` table, `user_locations` table) and GCP BigQuery (`bni-geospatial-845e.bni_geospatial_gold_zone.obt_poi_gold`)

**Testing**: Jest (`@nestjs/testing`) for NestJS backend unit/integration tests; Vitest (`frontend`) for frontend map service tests

**Target Platform**: GCP Cloud Run services (`/backend` and `/frontend` containers)

**Project Type**: Monorepo Web Application (`/backend` NestJS + `/frontend` Vue 3)

**Performance Goals**: Multi-tool chain execution (2-3 tools), map artifact rendering, and narrative synthesis < 6 seconds (SC-001); single-tool pass-through < 3 seconds (SC-002)

**Constraints**: Single shared Google Maps instance (must NOT resize or replace map canvas); max 5 sequential tool calls cap per conversational turn (FR-006); no redundant tool executions (FR-007); 100% SSE status streaming visibility for every step (SC-003); graceful error recovery for step failures (SC-004)

**Scale/Scope**: Agentic Orchestration Layer for multi-tool intent reasoning across all 6 location intelligence AI skills

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Code Quality & Type Safety**: PASS — TypeScript strict mode across frontend and backend; strongly typed DTOs, `OrchestrationContext`, and SSE event interfaces (`ChatStreamEvent`).
- **II. Testing Standards**: PASS — Unit tests for `OrchestratorService` multi-intent planner, inter-tool data chaining, and fallback synthesis; Vitest tests for map layer synchronization.
- **III. User Experience & AI Interactivity**: PASS — Directly satisfies Progress Visibility via SSE live status streaming ("Step 1/2: Searching candidate locations..." → "Step 2/2: Checking street-level imagery..."), Single Shared Map by updating `googleMapService` with combined artifacts, and Graceful Error Handling by logging specific failed steps.
- **IV. Performance & Cost Optimization**: PASS — Avoids redundant tool calls within a single turn (FR-007) and caps maximum tool calls to 5 per turn (FR-006).
- **V. Scope Discipline**: PASS — Focused agentic orchestration layer; coordinates existing skills without altering core database schemas or map canvas structure.

## Project Structure

### Documentation (this feature)

```text
specs/010-agentic-orchestration-layer/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── orchestration-api.md
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
│   │   │   ├── orchestrator.service.ts
│   │   │   └── chat.module.ts
│   │   └── discovery/
│   │       └── services/
│   │           ├── bigquery-discovery.service.ts
│   │           ├── discovery.service.ts
│   │           └── site-visit.service.ts
│   └── app.module.ts
└── test/
    └── orchestration.e2e-spec.ts

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

> No constitution violations. Standard NestJS SSE + agentic multi-tool execution planner + Google Maps artifact sync implementation.
