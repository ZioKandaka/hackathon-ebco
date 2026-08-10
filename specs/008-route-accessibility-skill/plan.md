# Implementation Plan: Route-Based Accessibility AI Skill

**Branch**: `008-route-accessibility-skill` | **Date**: 2026-08-10 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/008-route-accessibility-skill/spec.md`

## Summary

Build the Route-Based Accessibility AI Skill — an advanced location intelligence feature enabling authenticated users to evaluate a location's catchment using real travel time (`drive`, `walk`, `transit`; 1–30 minutes) instead of a simple Euclidean radius through the AI Chat Assistant Panel. The NestJS backend computes non-circular travel-time isochrone polygon boundaries via Google Routes API / network sampling, streams real-time SSE status updates ("Determining action...", "Calculating travel-time boundary...", "Analyzing reachable area..."), executes partitioned BigQuery spatial queries filtering POIs bounded inside the WKT polygon (`ST_CONTAINS`), reuses 100% of the canonical 6-factor Catchment Scoring engine (`DiscoveryService.calculateCatchmentScore`), and delivers a chat response comparing drive-time scores against Euclidean radius scores. The Vue 3 frontend uses `GoogleMapService` (`google.maps.Polygon`) to render a semi-transparent purple polygon overlay on the single shared Google Map, ensuring single-overlay replacement (0 or 1 active spatial boundary), marker pin coexistence, and dynamic travel-mode execution.

## Technical Context

**Language/Version**: TypeScript 5.x / Node.js 20+ (NestJS 10.x backend, Vue 3.4+ Composition API frontend)

**Primary Dependencies**:
- Backend: `@nestjs/common` (RxJS `@Sse()`), `@nestjs/typeorm`, `@google-cloud/bigquery`, `rxjs`
- Frontend: `vue`, `pinia`, `@googlemaps/js-api-loader`, `@types/google.maps` (`google.maps.Polygon`)

**Storage**: Cloud SQL PostgreSQL (`chat_messages` table, `user_locations` table) and GCP BigQuery (`bni-geospatial-845e.bni_geospatial_gold_zone.obt_poi_gold`)

**Testing**: Jest (`@nestjs/testing`) for NestJS backend unit/integration tests; Vitest (`frontend`) for frontend map service tests

**Target Platform**: GCP Cloud Run services (`/backend` and `/frontend` containers)

**Project Type**: Monorepo Web Application (`/backend` NestJS + `/frontend` Vue 3)

**Performance Goals**: Isochrone computation, BigQuery polygon POI filtering, and map polygon overlay rendering < 4 seconds (SC-001)

**Constraints**: Single shared Google Maps instance (must NOT resize or replace map canvas); marker pin coexistence without hiding or obscuring map markers; single active spatial boundary overlay policy (0 or 1 active circle/polygon at all times); mandatory BigQuery partition filters (`regency_code` or `province_code`); max travel time 30.0 minutes cap; 100% reuse of canonical 6-factor catchment scoring engine without code duplication (SC-003)

**Scale/Scope**: Route-Based Accessibility AI Skill for travel-time location intelligence analysis of registered business branches and discovery candidates

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Code Quality & Type Safety**: PASS — TypeScript strict mode across frontend and backend; strongly typed DTOs and SSE event interfaces (`RouteCatchmentResultPayload`, `IsochronePolygonOptions`).
- **II. Testing Standards**: PASS — Unit tests for `ChatService` stream generation and `DiscoveryService` isochrone polygon query building; Vitest tests for `GoogleMapService.renderIsochronePolygon()`.
- **III. User Experience & AI Interactivity**: PASS — Directly satisfies Progress Visibility via SSE live status streaming ("Determining action...", "Calculating travel-time boundary...", "Analyzing reachable area..."), Single Shared Map by overlaying `google.maps.Polygon` without container resizing, and Graceful Error Handling by rendering step failure messages.
- **IV. Performance & Cost Optimization**: PASS — BigQuery queries strictly enforce `regency_code` / `province_code` partition filters (SC-004) and cap travel time at 30 mins (FR-004, SC-001).
- **V. Scope Discipline**: PASS — Focused travel-time location accessibility AI skill; reuses 100% of 6-factor catchment scoring logic (SC-003); does not alter underlying map base or user auth system.

## Project Structure

### Documentation (this feature)

```text
specs/008-route-accessibility-skill/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── accessibility-api.md
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
    └── accessibility.e2e-spec.ts

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

> No constitution violations. Standard NestJS SSE + BigQuery spatial polygon POI aggregation + Google Maps Polygon overlay implementation.
