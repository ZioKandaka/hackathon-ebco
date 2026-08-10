# Implementation Plan: Nearby POI Pins & Hover Tooltips

**Branch**: `011-nearby-poi-and-tooltip` | **Date**: 2026-08-10 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/011-nearby-poi-and-tooltip/spec.md`

## Summary

Build the Nearby POI Pins & Hover Tooltips feature for discovery candidate spots in `DiscoverView.vue`. Adds an interactive "Show Nearby POI" / "Hide Nearby POI" toggle button to candidate cards in the left panel list. When activated, the system queries BigQuery for POIs within 2,000 meters enforcing a vertical relevance taxonomy (`getRelevantDisplayCategoriesForType`), renders a 2km catchment boundary circle (reusing `googleMapService.renderCatchmentCircle`), and displays cyan nearby POI pins on the map. Hovering any nearby POI pin (`mouseover` / `mouseout`) displays a Google Maps `InfoWindow` tooltip with POI name, category, rating, review count, and operating status without interfering with candidate pin click selection.

## Technical Context

**Language/Version**: TypeScript 5.x / Node.js 20+ (NestJS 10.x backend, Vue 3.4+ Composition API frontend)

**Primary Dependencies**:
- Backend: `@nestjs/common`, `@nestjs/typeorm`, `@google-cloud/bigquery`, `rxjs`
- Frontend: `vue`, `pinia`, `@googlemaps/js-api-loader`

**Storage**: GCP BigQuery (`bni-geospatial-845e.bni_geospatial_gold_zone.obt_poi_gold`)

**Testing**: Jest (`@nestjs/testing`) for NestJS backend unit tests; Vitest (`frontend`) for frontend map service tests

**Target Platform**: GCP Cloud Run services (`/backend` and `/frontend` containers)

**Project Type**: Monorepo Web Application (`/backend` NestJS + `/frontend` Vue 3)

**Performance Goals**: Nearby POI query, 2km circle rendering, and cyan POI pin placement < 2 seconds (SC-001); hover tooltip display < 100ms (SC-003)

**Constraints**: Single shared Google Maps instance; distinct cyan POI pin styling (FR-004); single active candidate POI layer policy (FR-005); vertical relevance taxonomy filtering inside BigQuery SQL `poi_type IN UNNEST(@relevantCategories)` (FR-007, FR-008); fixed 2km radius

**Scale/Scope**: Nearby POI inspection & vertical taxonomy filtering for discovery candidate spots in `DiscoverView.vue`

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Code Quality & Type Safety**: PASS — TypeScript strict mode across frontend and backend; strongly typed DTOs and state interfaces (`NearbyPoiLayerState`, `RadiusPoiItem`).
- **II. Testing Standards**: PASS — Unit tests for `getRelevantDisplayCategoriesForType` and BigQuery `poi_type` UNNEST filtering; Vitest tests for `renderNearbyPoiMarkers` and hover tooltips.
- **III. User Experience & AI Interactivity**: PASS — Directly satisfies Progress Visibility via inline loading states, Single Shared Map by reusing `googleMapService.renderCatchmentCircle` without container resizing, and Non-Intrusive Hover Tooltips without breaking candidate selection clicks.
- **IV. Performance & Cost Optimization**: PASS — Enforces BigQuery `UNNEST(@relevantCategories)` filtering on server side and caps radius at 2,000 meters.
- **V. Scope Discipline**: PASS — Focused nearby POI inspection feature; reuses 2km catchment circle without altering primary discovery ranking logic.

## Project Structure

### Documentation (this feature)

```text
specs/011-nearby-poi-and-tooltip/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── nearby-poi-api.md
└── checklists/
    └── requirements.md
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── modules/
│   │   └── discovery/
│   │       ├── discovery.controller.ts
│   │       └── services/
│   │           ├── bigquery-discovery.service.ts
│   │           └── discovery.service.ts
│   └── app.module.ts
└── test/
    └── nearby-poi.e2e-spec.ts

frontend/
├── src/
│   ├── components/
│   │   └── map/
│   │       └── BaseMap.vue
│   ├── services/
│   │   └── google-map.service.ts
│   ├── stores/
│   │   └── discovery.store.ts
│   └── views/
│       └── DiscoverView.vue
```

**Structure Decision**: Monorepo Web Application with `/backend` (NestJS) and `/frontend` (Vue 3 Composition API).

## Complexity Tracking

> No constitution violations. Standard NestJS REST endpoint + BigQuery vertical relevance taxonomy + Google Maps cyan POI markers with InfoWindow hover tooltips.
