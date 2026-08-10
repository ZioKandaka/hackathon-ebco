# Implementation Plan: Catchment Score AI Skill

**Branch**: `007-catchment-score-skill` | **Date**: 2026-08-10 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/007-catchment-score-skill/spec.md`

## Summary

Build the Catchment Score AI Skill — an interactive location evaluation feature enabling authenticated users to request a composite performance score (0-100) and 6-factor sub-score breakdown (Demand Density, Traffic Proxy, Area Quality, Competition Penalty, Network Saturation, Operational Vitality) for their registered business branches through the AI Chat Assistant Panel. The NestJS backend matches saved locations, streams real-time SSE status updates ("Determining action...", "Gathering nearby location data...", "Calculating catchment score..."), queries partitioned BigQuery POI datasets within the specified radius (0.1–10.0km; default 2km), computes the 6 sub-scores, and delivers a chat summary with a `catchmentData` payload. The Vue 3 frontend uses `GoogleMapService` (`google.maps.Circle`) to render a semi-transparent circular overlay on the single shared Google Map, ensuring single-circle replacement (0 or 1 active circle), marker pin coexistence, and dynamic parameter recalculation within the chat thread.

## Technical Context

**Language/Version**: TypeScript 5.x / Node.js 20+ (NestJS 10.x backend, Vue 3.4+ Composition API frontend)

**Primary Dependencies**:
- Backend: `@nestjs/common` (RxJS `@Sse()`), `@nestjs/typeorm`, `@google-cloud/bigquery`, `rxjs`
- Frontend: `vue`, `pinia`, `@googlemaps/js-api-loader`, `@types/google.maps` (`google.maps.Circle`)

**Storage**: Cloud SQL PostgreSQL (`chat_messages` table, `user_locations` table) and GCP BigQuery (`bni-geospatial-845e.bni_geospatial_gold_zone.obt_poi_gold`)

**Testing**: Jest (`@nestjs/testing`) for NestJS backend unit/integration tests; Vitest (`frontend`) for frontend map service tests

**Target Platform**: GCP Cloud Run services (`/backend` and `/frontend` containers)

**Project Type**: Monorepo Web Application (`/backend` NestJS + `/frontend` Vue 3)

**Performance Goals**: Catchment score calculation and map circle rendering < 3 seconds (SC-001)

**Constraints**: Single shared Google Maps instance (must NOT resize or replace map canvas); marker pin coexistence without hiding or obscuring map markers; single active catchment circle overlay policy (0 or 1 active circle at all times); mandatory BigQuery partition filters (`regency_code` or `province_code`); max radius 10.0km cap

**Scale/Scope**: Catchment Score AI Skill for location intelligence analysis of registered business branches

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Code Quality & Type Safety**: PASS — TypeScript strict mode across frontend and backend; strongly typed DTOs and SSE event interfaces (`CatchmentSubScores`, `CatchmentScoreResultPayload`).
- **II. Testing Standards**: PASS — Unit tests for `CatchmentService` / `ChatService` stream generation and BigQuery radius query building; Vitest tests for `GoogleMapService.renderCatchmentCircle()`.
- **III. User Experience & AI Interactivity**: PASS — Directly satisfies Progress Visibility via SSE live status streaming ("Determining action...", "Gathering nearby location data...", "Calculating catchment score..."), Single Shared Map by overlaying `google.maps.Circle` without container resizing, and Graceful Error Handling by rendering step failure messages.
- **IV. Performance & Cost Optimization**: PASS — BigQuery queries strictly enforce `regency_code` / `province_code` partition filters (SC-004) and cap radius at 10km (FR-004, SC-001).
- **V. Scope Discipline**: PASS — Focused location performance catchment score evaluation; does not alter underlying map base or user auth system.

## Project Structure

### Documentation (this feature)

```text
specs/007-catchment-score-skill/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── catchment-api.md
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
    └── catchment.e2e-spec.ts

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
│       └── MyLocationsView.vue
```

**Structure Decision**: Monorepo Web Application with `/backend` (NestJS) and `/frontend` (Vue 3 Composition API).

## Complexity Tracking

> No constitution violations. Standard NestJS SSE + BigQuery radius POI aggregation + Google Maps Circle overlay implementation.
