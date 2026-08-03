# Implementation Plan: Add Business/Branch AI Skill

**Branch**: `004-add-business-branch` | **Date**: 2026-08-03 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/004-add-business-branch/spec.md`

## Summary

Build the "Add Business/Branch" AI skill, invoked conversationally through the existing AI Chat Assistant Panel (`002-ai-chat-panel`). The NestJS backend integrates with the Google Geocoding API to resolve address strings into geographic coordinates and structured administrative components (province, regency, sub-district, postal code), prompts for missing details or ambiguous address candidates, detects duplicate locations, and persists records in the `user_locations` PostgreSQL table. On creation, the location is immediately rendered as a pin on the single shared Google Map (`003-base-map-component`) and updated in the "My Locations" list view (`MyLocationsView.vue`).

## Technical Context

**Language/Version**: TypeScript 5.x / Node.js 20+ (NestJS 10.x backend, Vue 3.4+ Composition API frontend)

**Primary Dependencies**:
- Backend: `@nestjs/axios`, `axios` (Google Geocoding API REST client), `@nestjs/typeorm`, `typeorm`, `class-validator`
- Frontend: `pinia`, `vue`, `axios`

**Storage**: Cloud SQL PostgreSQL (`user_locations` table, FK `user_id` -> `users.id`) in GCP project `ebc-cloud-dev-03`

**Testing**: Jest (`@nestjs/testing`) for unit tests and Supertest for NestJS `/locations` endpoints

**Target Platform**: GCP Cloud Run services (`/backend` and `/frontend` containers)

**Project Type**: Monorepo Web Application (`/backend` NestJS + `/frontend` Vue 3)

**Performance Goals**: Natural-language branch creation < 2 seconds total execution time

**Constraints**: Strict TypeScript mode; single shared Google Map instance; user-scoped location data isolation; user-readable error messages in plain language; no manual form or pin-drop entry required

**Scale/Scope**: Foundational location ingestion skill for all analytics features

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Code Quality & Type Safety**: PASS — Strict TypeScript mode across frontend and backend; strongly typed `UserLocation` entity and `CreateLocationDto`.
- **II. Testing Standards**: PASS — Unit tests for `LocationsService` and Geocoding API parser; happy-path integration tests for `/locations` endpoints.
- **III. User Experience & AI Interactivity**: PASS — Progress visibility via real-time SSE status streaming, new locations rendered on single shared Google Map instance, and plain-language clarifying prompts.
- **IV. Performance & Cost Optimization**: PASS — Geocoding responses parsed efficiently; `user_locations.user_id` indexed for fast query scoping.
- **V. Scope Discipline**: PASS — Delivers focused branch creation vertical slice; editing/deletion and bulk CSV import are explicitly out of scope.
- **Infrastructure & Deployment**: PASS — Cloud Run services backed by Cloud SQL PostgreSQL in `ebc-cloud-dev-03`.

## Project Structure

### Documentation (this feature)

```text
specs/004-add-business-branch/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── locations-api.md
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── modules/
│   │   ├── locations/
│   │   │   ├── dto/
│   │   │   │   └── create-location.dto.ts
│   │   │   ├── entities/
│   │   │   │   └── user-location.entity.ts
│   │   │   ├── services/
│   │   │   │   ├── geocoding.service.ts
│   │   │   │   └── locations.service.ts
│   │   │   ├── locations.controller.ts
│   │   │   └── locations.module.ts
│   │   ├── chat/
│   │   │   └── chat.service.ts (integrated with AddBranchSkill)
│   └── app.module.ts
└── test/
    └── locations.e2e-spec.ts

frontend/
├── src/
│   ├── stores/
│   │   └── locations.store.ts
│   ├── views/
│   │   └── MyLocationsView.vue
│   └── components/
│       └── chat/
│           └── AiChatPanel.vue
```

**Structure Decision**: Monorepo Web Application with `/backend` (NestJS) and `/frontend` (Vue 3 Composition API).

## Complexity Tracking

> No constitution violations. Standard NestJS module with Google Geocoding REST integration.
