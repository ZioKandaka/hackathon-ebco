# Implementation Plan: Location Discovery AI Skill

**Branch**: `005-location-discovery-skill` | **Date**: 2026-08-03 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/005-location-discovery-skill/spec.md`

## Summary

Build the "Discover" AI skill, invoked conversationally through the AI Chat Assistant Panel (`002-ai-chat-panel`). The NestJS backend integrates with BigQuery POI datasets in `bni-geospatial-845e` using parameterized SQL queries with exact canonical column names (`poi_id`, `poi_name`, `poi_type`, `latitude`, `longitude`, `regency_code`, `province_code`) and mandatory parenthesized `regency_code` / `province_code` / `regency` / `province` partition & region filters per Constitution Section IV. It calculates radius-based demand POI density vs. same-category competition, generates natural-language scoring justifications, and returns top candidate spots. Discovered candidates are rendered simultaneously in chat and as numbered candidate pins on the single shared Google Map (`003-base-map-component`), with support for candidate detail inspection on pin click.

## Technical Context

**Language/Version**: TypeScript 5.x / Node.js 20+ (NestJS 10.x backend, Vue 3.4+ Composition API frontend)

**Primary Dependencies**:
- Backend: `@google-cloud/bigquery`, `@nestjs/typeorm`, `rxjs`
- Frontend: `pinia`, `vue`, `axios`

**Storage**: BigQuery POI dataset (`bni-geospatial-845e.bni_geospatial_gold_zone.obt_poi_gold`) in GCP project `ebc-cloud-dev-03`

**Testing**: Jest (`@nestjs/testing`) for unit tests and Supertest for NestJS `/discovery` endpoints

**Target Platform**: GCP Cloud Run services (`/backend` and `/frontend` containers)

**Project Type**: Monorepo Web Application (`/backend` NestJS + `/frontend` Vue 3)

**Performance Goals**: Discovery query execution & streaming results < 3 seconds total

**Constraints**: Strict TypeScript mode; single shared Google Map instance; BigQuery SQL queries MUST reference exact canonical column names (`poi_type`, `latitude`, `longitude` — not `category` or `geom`) and enforce parenthesized `(regency_code / province_code / regency / province)` region filters; graceful plain-language error reporting; radius-based POI scoring only

**Scale/Scope**: Primary site discovery and demand analysis engine

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Code Quality & Type Safety**: PASS — Strict TypeScript mode; strongly typed `DiscoveryCandidate` DTOs and BigQuery query parameters.
- **II. Testing Standards**: PASS — Unit tests for `DiscoveryService` scoring algorithm and query builder; happy-path integration tests for `/discovery/search` endpoint.
- **III. User Experience & AI Interactivity**: PASS — Progress visibility via real-time SSE status streaming, candidate pins rendered on single shared Google Map instance, and plain-language clarifying prompts for vague queries.
- **IV. Performance & Cost Optimization**: PASS — Strictly complies with Section IV mandate: BigQuery SQL queries enforce `regency_code` / `province_code` partition/bounds filters with fully-qualified table paths (`bni-geospatial-845e.dataset_name.poi_table`).
- **V. Scope Discipline**: PASS — Delivers focused discovery vertical slice; drive-time/isochrone accessibility and multi-region comparisons are explicitly out of scope.
- **Infrastructure & Deployment**: PASS — Cloud Run services backed by BigQuery in GCP project `ebc-cloud-dev-03`.

## Project Structure

### Documentation (this feature)

```text
specs/005-location-discovery-skill/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── discovery-api.md
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── modules/
│   │   ├── discovery/
│   │   │   ├── dto/
│   │   │   │   └── discovery-search.dto.ts
│   │   │   ├── services/
│   │   │   │   ├── bigquery-discovery.service.ts
│   │   │   │   └── discovery.service.ts
│   │   │   ├── discovery.controller.ts
│   │   │   └── discovery.module.ts
│   │   ├── chat/
│   │   │   └── chat.service.ts (integrated with DiscoverSkill)
│   └── app.module.ts
└── test/
    └── discovery.e2e-spec.ts

frontend/
├── src/
│   ├── stores/
│   │   └── discovery.store.ts
│   ├── views/
│   │   └── DiscoverView.vue
│   └── components/
│       └── chat/
│           └── AiChatPanel.vue
```

**Structure Decision**: Monorepo Web Application with `/backend` (NestJS) and `/frontend` (Vue 3 Composition API).

## Complexity Tracking

> No constitution violations. Standard BigQuery query builder with spatial POI aggregation.
