# Implementation Plan: Base Map Component

**Branch**: `003-base-map-component` | **Date**: 2026-08-03 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-base-map-component/spec.md`

## Summary

Implement the persistent, single shared Google Map component (`BaseMap.vue`) and composable service (`useGoogleMap.ts`) using `@googlemaps/js-api-loader`. The component renders full-screen across all authenticated views as the primary visual canvas, handles browser geolocation centering with a fallback to Greater Jakarta (`-6.2088, 106.8456`), exposes a clean layer management interface for downstream feature overlays (pins, heatmaps, polygons), and renders a user-readable error card on Google Maps API loading failures.

## Technical Context

**Language/Version**: TypeScript 5.x / Vue 3.4+ Composition API

**Primary Dependencies**:
- Frontend: `@googlemaps/js-api-loader`, `vue`, `pinia`, `vue-router`

**Storage**: Local state / Singleton service in-memory registry for map overlays

**Testing**: Vitest / `@vue/test-utils` for component rendering tests

**Target Platform**: GCP Cloud Run frontend service (`http://localhost:5173`)

**Project Type**: Monorepo Web Application (`/frontend` Vue 3)

**Performance Goals**: Initial map render < 1 sec; route transitions reuse single instance with 0ms map re-initialization

**Constraints**: Strict TypeScript mode; Google Maps JavaScript API MUST be the sole base map library per Constitution Section III; single shared map instance across all routes; graceful error handling on API failure

**Scale/Scope**: Primary visual canvas and shared layer management service for all geospatial features

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Code Quality & Type Safety**: PASS — Strict TypeScript mode; strongly typed `useGoogleMap` service contract and layer interfaces (`MarkerOptions`, `PolygonOptions`, `HeatmapOptions`).
- **II. Testing Standards**: PASS — Unit testing for map composable and error state component rendering.
- **III. User Experience & AI Interactivity**: PASS — Directly implements Section III mandates: Single Shared Map instance across features, Google Maps JavaScript API as sole base map, and Graceful Error Handling on API load failure.
- **IV. Performance & Cost Optimization**: PASS — Single map instance avoids duplicate Google Maps API script injection and tile fetch billing.
- **V. Scope Discipline**: PASS — Delivers base map component and layer interface; specific data layers (pins, heatmaps, routes) are left to downstream feature specs.
- **Infrastructure & Deployment**: PASS — Frontend Vue 3 application deployed on Cloud Run.

## Project Structure

### Documentation (this feature)

```text
specs/003-base-map-component/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── map-interface.md
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
frontend/
├── src/
│   ├── components/
│   │   └── map/
│   │       ├── BaseMap.vue
│   │       └── MapErrorCard.vue
│   ├── composables/
│   │   └── useGoogleMap.ts
│   ├── services/
│   │   └── google-map.service.ts
│   ├── views/
│   │   ├── DiscoverView.vue
│   │   ├── HeatmapView.vue
│   │   └── MyLocationsView.vue
│   └── App.vue
```

**Structure Decision**: Frontend Vue 3 component & composable structure in `/frontend`.

## Complexity Tracking

> No constitution violations. Follows standard Vue 3 singleton service pattern.
