# Implementation Plan: Heatmap Visualization AI Skill

**Branch**: `006-heatmap-visualization-skill` | **Date**: 2026-08-10 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/006-heatmap-visualization-skill/spec.md`

## Summary

Build the Heatmap Visualization AI Skill — a spatial market analysis feature enabling users to request natural-language heatmaps (Mode A business-based opportunity density and Mode B custom exploratory attribute heatmaps) through the AI Chat Assistant Panel. The NestJS backend processes queries, streams real-time SSE status updates ("Determining the right action...", "Aggregating location data...", "Rendering heatmap..."), executes partitioned BigQuery aggregations on `bni-geospatial-845e.bni_geospatial_gold_zone.obt_poi_gold` capped at 5,000 weighted spatial points, and returns an AI chat summary with a `heatmapData` payload. The Vue 3 frontend utilizes `GoogleMapService` (`google.maps.visualization.HeatmapLayer`) to overlay a weighted heatmap layer on the single shared Google Map instance, ensuring single-layer replacement (0 or 1 active heatmap), marker pin coexistence, and automatic viewport centering (`fitBounds`).

## Technical Context

**Language/Version**: TypeScript 5.x / Node.js 20+ (NestJS 10.x backend, Vue 3.4+ Composition API frontend)

**Primary Dependencies**:
- Backend: `@nestjs/common` (RxJS `@Sse()`), `@nestjs/typeorm`, `@google-cloud/bigquery`, `rxjs`
- Frontend: `vue`, `pinia`, `@googlemaps/js-api-loader`, `@types/google.maps` (`google.maps.visualization.HeatmapLayer`)

**Storage**: Cloud SQL PostgreSQL (`chat_messages` table for chat history) and GCP BigQuery (`bni-geospatial-845e.bni_geospatial_gold_zone.obt_poi_gold`)

**Testing**: Jest (`@nestjs/testing`) for NestJS backend unit/integration tests; Vitest (`frontend`) for frontend map service tests

**Target Platform**: GCP Cloud Run services (`/backend` and `/frontend` containers)

**Project Type**: Monorepo Web Application (`/backend` NestJS + `/frontend` Vue 3)

**Performance Goals**: Query execution and map density layer rendering < 3 seconds (SC-001); point dataset capped at max 5,000 weighted spatial points (FR-010)

**Constraints**: Single shared Google Maps instance (must NOT resize or replace map canvas); marker pin coexistence without hiding or obscuring map markers; single active heatmap layer policy (0 or 1 active layer at all times); mandatory BigQuery partition filters (`regency_code` or `province_code`); automatic map viewport adjustment (`fitBounds`)

**Scale/Scope**: Heatmap Visualization AI Skill for spatial density analysis across Indonesian regencies/provinces

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Code Quality & Type Safety**: PASS — TypeScript strict mode across frontend and backend; strongly typed DTOs and SSE event interfaces (`HeatmapPoint`, `HeatmapResponsePayload`).
- **II. Testing Standards**: PASS — Unit tests for `HeatmapService` / `ChatService` stream generation and BigQuery query building; Vitest tests for `GoogleMapService.renderHeatmap()`.
- **III. User Experience & AI Interactivity**: PASS — Directly satisfies Progress Visibility via SSE live status streaming ("Determining action...", "Aggregating location data...", "Rendering heatmap..."), Single Shared Map by overlaying `HeatmapLayer` without container resizing, and Graceful Error Handling by rendering step failure messages.
- **IV. Performance & Cost Optimization**: PASS — BigQuery queries strictly enforce `regency_code` / `province_code` partition filters (SC-003) and cap spatial points to <= 5,000 (FR-010, SC-001).
- **V. Scope Discipline**: PASS — Focused spatial density heatmap AI skill; does not alter underlying map base or user auth system.

## Project Structure

### Documentation (this feature)

```text
specs/006-heatmap-visualization-skill/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── heatmap-api.md
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
│   │           └── discovery.service.ts
│   └── app.module.ts
└── test/
    └── heatmap.e2e-spec.ts

frontend/
├── src/
│   ├── components/
│   │   ├── chat/
│   │   │   └── AiChatPanel.vue
│   │   └── map/
│   │       └── BaseMap.vue
│   ├── services/
│   │   ├── google-map.service.ts
│   │   └── chat-sse.service.ts
│   ├── stores/
│   │   └── chat.store.ts
│   └── views/
│       └── HeatmapView.vue
```

**Structure Decision**: Monorepo Web Application with `/backend` (NestJS) and `/frontend` (Vue 3 Composition API).

## Complexity Tracking

> No constitution violations. Standard NestJS SSE + BigQuery POI aggregation + Google Maps Visualization HeatmapLayer implementation.
