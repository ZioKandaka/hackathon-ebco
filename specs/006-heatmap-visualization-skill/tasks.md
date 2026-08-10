# Tasks: Heatmap Visualization AI Skill

**Input**: Design documents from `/specs/006-heatmap-visualization-skill/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/heatmap-api.md, quickstart.md

**Tests**: Unit test tasks included for backend skill streaming and frontend map service layer management.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Web app**: `backend/src/`, `frontend/src/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and Google Maps Visualization library registration

- [X] T001 Register Google Maps visualization library in `frontend/src/services/google-map.service.ts`
- [X] T002 [P] Verify ChatModule and DiscoveryModule dependency wiring in `backend/src/modules/chat/chat.module.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core data structures and layer management that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T003 [P] Extend `ChatStreamEvent` interface and DTOs in `backend/src/modules/chat/chat.service.ts` to support `heatmapData` payload
- [X] T004 [P] Add `activeHeatmapLayer` singleton, `renderHeatmap()`, `removeHeatmap()`, and auto-fit viewport `fitBounds` to `frontend/src/services/google-map.service.ts`
- [X] T005 [P] Update SSE event handler and chat store in `frontend/src/stores/chat.store.ts` and `frontend/src/services/chat-sse.service.ts` to route `heatmapData` payloads to `googleMapService`

**Checkpoint**: Foundation ready — user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Business-Based Opportunity Density Heatmap (Priority: P1) 🎯 MVP

**Goal**: Authenticated user submits a natural-language request for a business-based heatmap (e.g. "Show me a heatmap for my minimarket business in Kediri"). System streams SSE status updates, queries BigQuery POI datasets, computes net opportunity density, and renders a color-coded heatmap layer on the shared Google Map centered with fitBounds.

**Independent Test**: Submit a business-based heatmap request in the chat panel, verify SSE status streaming ("Determining action...", "Aggregating location data...", "Rendering heatmap..."), AI summary explanation in chat, and a weighted HeatmapLayer rendered on Google Map with viewport centered on dataset bounds.

### Implementation for User Story 1

- [X] T006 [P] [US1] Implement BigQuery heatmap query builder with `regency_code`/`province_code` partition filters and 5,000 point cap in `backend/src/modules/discovery/services/bigquery-discovery.service.ts`
- [X] T007 [P] [US1] Implement Mode A net demand minus competition opportunity weighting algorithm in `backend/src/modules/discovery/services/discovery.service.ts`
- [X] T008 [US1] Implement Mode A heatmap skill execution and step-by-step SSE status streaming in `backend/src/modules/chat/chat.service.ts`
- [X] T009 [US1] Connect chat store and map rendering in `frontend/src/components/chat/AiChatPanel.vue` to handle Mode A heatmap stream responses
- [X] T010 [P] [US1] Add backend unit tests for Mode A heatmap skill stream in `backend/src/modules/chat/chat.service.spec.ts` and `backend/src/modules/discovery/services/bigquery-discovery.service.spec.ts`

**Checkpoint**: At this point, User Story 1 (MVP) is fully functional and testable independently

---

## Phase 4: User Story 2 - Exploratory Custom Prompt Heatmap (Priority: P2)

**Goal**: Enables flexible, ad-hoc spatial data exploration for specialized market research queries (e.g. "Show me a heatmap of preschools with rating below 4.0 in Bandung").

**Independent Test**: Submit a custom exploratory prompt (e.g. rating-filtered POIs), verify BigQuery SQL aggregation filtering, confirm 5,000 point cap enforcement, and verify custom heatmap layer overlays target area with an explanatory chat summary.

### Implementation for User Story 2

- [X] T011 [P] [US2] Implement Mode B custom prompt intent detection and attribute filter parser (rating, status) in `backend/src/modules/chat/chat.service.ts`
- [X] T012 [US2] Extend BigQuery query builder for Mode B attribute filters in `backend/src/modules/discovery/services/bigquery-discovery.service.ts`
- [X] T013 [US2] Integrate Mode B custom exploratory heatmap execution into `executeHeatmapSkill()` in `backend/src/modules/chat/chat.service.ts`
- [X] T014 [P] [US2] Add unit tests for Mode B custom prompt parsing and stream generation in `backend/src/modules/chat/chat.service.spec.ts`

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - Layer Coexistence & Single-Layer Replacement (Priority: P3)

**Goal**: Fulfills Constitution Section III (Single Shared Map) and guarantees clean visual layer lifecycle management (new heatmaps replace old ones while coexisting with location pins).

**Independent Test**: Generate two consecutive heatmaps, confirm that only the latest heatmap layer is rendered (0 or 1 active heatmap layer), and verify that location pins remain interactive and visible on top of the heatmap layer.

### Implementation for User Story 3

- [X] T015 [P] [US3] Enforce single-layer destruction (`activeHeatmapLayer.setMap(null)`) on render in `frontend/src/services/google-map.service.ts`
- [X] T016 [P] [US3] Verify marker pin visibility and clickability coexisting with active HeatmapLayer in `frontend/src/services/google-map.service.ts`
- [X] T017 [US3] Add frontend unit tests for GoogleMapService heatmap rendering and layer replacement in `frontend/src/composables/__tests__/useGoogleMap.spec.ts`

**Checkpoint**: All user stories are now independently functional and compliant with project governance rules

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Error resilience, zero-result notifications, and end-to-end quickstart validation

- [X] T018 [P] Implement zero-result and database error notifications in `backend/src/modules/chat/chat.service.ts` and `frontend/src/stores/chat.store.ts`
- [X] T019 Run end-to-end quickstart validation scenarios in `specs/006-heatmap-visualization-skill/quickstart.md`

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
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) — Shares `executeHeatmapSkill()` structure with US1
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) — Operates on frontend `GoogleMapService`

---

## Parallel Opportunities

- Setup tasks T001 and T002 can run in parallel
- Foundational tasks T003, T004, and T005 can run in parallel
- US1 tasks T006 and T007 can run in parallel
- US2 tasks T011 and T014 can run in parallel
- US3 tasks T015 and T016 can run in parallel

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Run Scenario 1 in `quickstart.md`
5. Deploy/demo MVP!
