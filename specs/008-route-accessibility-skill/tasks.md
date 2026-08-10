# Tasks: Route-Based Accessibility AI Skill

**Input**: Design documents from `/specs/008-route-accessibility-skill/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/accessibility-api.md, quickstart.md

**Tests**: Unit test tasks included for backend skill streaming, isochrone polygon generation, and frontend map service polygon layer management.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Web app**: `backend/src/`, `frontend/src/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and Google Maps Polygon helper interface setup

- [X] T001 Register Google Maps polygon overlay helper interface in `frontend/src/services/google-map.service.ts`
- [X] T002 [P] Verify LocationsModule and DiscoveryModule dependency wiring in `backend/src/modules/chat/chat.module.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core data structures and layer management that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T003 [P] Extend `ChatStreamEvent` interface and DTOs in `backend/src/modules/chat/chat.service.ts` to support `accessibilityData` payload
- [X] T004 [P] Add `activeIsochronePolygon` singleton, `renderIsochronePolygon()`, and `removeIsochronePolygon()` to `frontend/src/services/google-map.service.ts`
- [X] T005 [P] Update SSE event handler and chat store in `frontend/src/stores/chat.store.ts` and `frontend/src/services/chat-sse.service.ts` to route `accessibilityData` payloads to `googleMapService`

**Checkpoint**: Foundation ready — user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Travel-Time Isochrone Catchment Score (Priority: P1) 🎯 MVP

**Goal**: Authenticated user submits a natural-language request for travel-time accessibility analysis (e.g. "Check how accessible my Sudirman branch is within a 10 minute drive"). Backend streams SSE status updates, computes a non-circular isochrone polygon boundary, filters BigQuery POIs inside the polygon (`ST_CONTAINS`), reuses the 6-factor catchment scoring engine, and renders the purple isochrone polygon overlay on Google Map.

**Independent Test**: Submit a travel-time accessibility request in chat, verify SSE status streaming ("Determining right action..." → "Calculating travel-time boundary..." → "Analyzing reachable area..."), 6-subscore breakdown in chat, and a non-circular purple vector polygon rendered on Google Map centered around the location pin.

### Implementation for User Story 1

- [X] T006 [P] [US1] Implement travel-time isochrone polygon boundary generator (`drive`, `walk`, `transit`; 1–30 min) in `backend/src/modules/discovery/services/bigquery-discovery.service.ts`
- [X] T007 [P] [US1] Implement BigQuery spatial polygon POI query builder (`ST_CONTAINS`) with `regency_code`/`province_code` partition filters in `backend/src/modules/discovery/services/bigquery-discovery.service.ts`
- [X] T008 [US1] Implement accessibility score skill execution and step-by-step SSE status streaming in `backend/src/modules/chat/chat.service.ts`
- [X] T009 [US1] Connect chat store and map polygon rendering in `frontend/src/components/chat/AiChatPanel.vue` to handle accessibility stream responses
- [X] T010 [P] [US1] Add backend unit tests for isochrone generation and accessibility skill stream in `backend/src/modules/chat/chat.service.spec.ts` and `backend/src/modules/discovery/services/bigquery-discovery.service.spec.ts`

**Checkpoint**: At this point, User Story 1 (MVP) is fully functional and testable independently

---

## Phase 4: User Story 2 - Comparative Radius vs. Isochrone Analysis (Priority: P2)

**Goal**: Enables comparative site selection intelligence by highlighting score variances between travel-time reachability and Euclidean radius bounds in the chat summary response.

**Independent Test**: Execute a radius catchment score followed by an accessibility analysis for the same location; verify that the AI summary explicitly highlights the score delta (e.g., "Drive-time score: 78 vs. Radius score: 82") and notes physical road network constraints.

### Implementation for User Story 2

- [X] T011 [P] [US2] Implement radius vs. isochrone score comparison and variance explanation logic in `backend/src/modules/chat/chat.service.ts`
- [X] T012 [P] [US2] Add unit tests for radius vs. isochrone score comparison in `backend/src/modules/chat/chat.service.spec.ts`

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - Polygon Overlay Lifecycle & Map Integration (Priority: P3)

**Goal**: Fulfills Constitution Section III (Single Shared Map) and guarantees clean visual layer lifecycle management (new isochrone polygons replace previous radius circles or polygons while coexisting with location pins).

**Independent Test**: Generate an isochrone polygon for Location A, then Location B; verify Location A's boundary overlay is destroyed and Location B's polygon renders beneath location markers.

### Implementation for User Story 3

- [X] T013 [P] [US3] Enforce single spatial boundary destruction (`activeCatchmentCircle.setMap(null)` and `activeIsochronePolygon.setMap(null)`) on render in `frontend/src/services/google-map.service.ts`
- [X] T014 [P] [US3] Verify semi-transparent purple polygon rendering coexisting with map location markers in `frontend/src/services/google-map.service.ts`
- [X] T015 [US3] Add frontend unit tests for GoogleMapService isochrone polygon rendering and layer replacement in `frontend/src/composables/__tests__/useGoogleMap.spec.ts`

**Checkpoint**: All user stories are now independently functional and compliant with project governance rules

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Error resilience, route service fallbacks, zero-POI notifications, and end-to-end quickstart validation

- [X] T016 [P] Implement route service fallback approximation polygon and zero-POI notification handlers in `backend/src/modules/chat/chat.service.ts` and `frontend/src/stores/chat.store.ts`
- [X] T017 Run end-to-end quickstart validation scenarios in `specs/008-route-accessibility-skill/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - User stories proceed sequentially in priority order (P1 → P2 → P3) or in parallel if staffed
- **Polish (Final Phase)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1 MVP)**: Can start after Foundational (Phase 2) — No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) — Reuses accessibility result from US1
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) — Operates on frontend `GoogleMapService`

---

## Parallel Opportunities

- Setup tasks T001 and T002 can run in parallel
- Foundational tasks T003, T004, and T005 can run in parallel
- US1 tasks T006 and T007 can run in parallel
- US2 tasks T011 and T012 can run in parallel
- US3 tasks T013 and T014 can run in parallel

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Run Scenario 1 in `quickstart.md`
5. Deploy/demo MVP!
