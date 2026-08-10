# Tasks: Catchment Score AI Skill

**Input**: Design documents from `/specs/007-catchment-score-skill/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/catchment-api.md, quickstart.md

**Tests**: Unit test tasks included for backend skill streaming, scoring calculations, and frontend map service circle layer management.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Web app**: `backend/src/`, `frontend/src/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and Google Maps Circle helper interface setup

- [X] T001 Register Google Maps circle overlay helper interface in `frontend/src/services/google-map.service.ts`
- [X] T002 [P] Verify LocationsModule and DiscoveryModule dependency wiring in `backend/src/modules/chat/chat.module.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core data structures and layer management that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T003 [P] Extend `ChatStreamEvent` interface and DTOs in `backend/src/modules/chat/chat.service.ts` to support `catchmentData` payload
- [X] T004 [P] Add `activeCatchmentCircle` singleton, `renderCatchmentCircle()`, and `removeCatchmentCircle()` to `frontend/src/services/google-map.service.ts`
- [X] T005 [P] Update SSE event handler and chat store in `frontend/src/stores/chat.store.ts` and `frontend/src/services/chat-sse.service.ts` to route `catchmentData` payloads to `googleMapService`

**Checkpoint**: Foundation ready — user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Location Catchment Score Calculation (Priority: P1) 🎯 MVP

**Goal**: Authenticated user submits a natural-language request for catchment analysis of a saved location (e.g. "Analyze the catchment for my Sudirman branch within 2km"). System streams SSE status updates, queries BigQuery POIs within the radius, calculates 6 sub-scores, and renders a radius circle overlay on the shared Google Map.

**Independent Test**: Submit a catchment score request for a registered location in chat, verify SSE status streaming ("Determining right action..." → "Gathering nearby location data..." → "Calculating catchment score..."), 6-factor sub-score breakdown in chat, and a 2km circular overlay rendered on Google Map centered around the location pin.

### Implementation for User Story 1

- [X] T006 [P] [US1] Implement BigQuery spatial radius query builder with `ST_DISTANCE`, 10km radius cap, and `regency_code`/`province_code` partition filters in `backend/src/modules/discovery/services/bigquery-discovery.service.ts`
- [X] T007 [P] [US1] Implement 6-factor catchment scoring algorithm (Demand, Traffic, Quality, Competition Penalty, Network Saturation, Operational Vitality) in `backend/src/modules/discovery/services/discovery.service.ts`
- [X] T008 [US1] Implement catchment score skill execution and step-by-step SSE status streaming in `backend/src/modules/chat/chat.service.ts`
- [X] T009 [US1] Connect chat store and map circle rendering in `frontend/src/components/chat/AiChatPanel.vue` to handle catchment stream responses
- [X] T010 [P] [US1] Add backend unit tests for catchment score skill stream in `backend/src/modules/chat/chat.service.spec.ts` and `backend/src/modules/discovery/services/discovery.service.spec.ts`

**Checkpoint**: At this point, User Story 1 (MVP) is fully functional and testable independently

---

## Phase 4: User Story 2 - Parameter Adjustment & Dynamic Recalculation (Priority: P2)

**Goal**: Enables dynamic scenario analysis by allowing users to adjust radius or sub-score weights in follow-up chat messages (e.g. "change radius to 3km" or "ignore competition density").

**Independent Test**: Submit a follow-up adjustment request in the same chat thread, verify that sub-score weights or radius update dynamically, the map circle resizes, and an updated composite score is delivered.

### Implementation for User Story 2

- [X] T011 [P] [US2] Implement follow-up radius change and sub-score weight adjustment parser in `backend/src/modules/chat/chat.service.ts`
- [X] T012 [US2] Integrate dynamic weight adjustment and radius recalculation into `executeCatchmentSkill()` in `backend/src/modules/chat/chat.service.ts`
- [X] T013 [P] [US2] Add unit tests for parameter adjustment parsing and recalculation in `backend/src/modules/chat/chat.service.spec.ts`

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - Visual Radius Lifecycle & Map Layer Integration (Priority: P3)

**Goal**: Fulfills Constitution Section III (Single Shared Map) and guarantees clean visual layer lifecycle management (new radius circles replace old ones while coexisting with location pins).

**Independent Test**: Calculate catchment score for Location A, then Location B; verify Location A's circle is destroyed and Location B's circle overlays smoothly over markers.

### Implementation for User Story 3

- [X] T014 [P] [US3] Enforce single catchment circle destruction (`activeCatchmentCircle.setMap(null)`) on render in `frontend/src/services/google-map.service.ts`
- [X] T015 [P] [US3] Verify semi-transparent circle rendering coexisting with map location markers in `frontend/src/services/google-map.service.ts`
- [X] T016 [US3] Add frontend unit tests for GoogleMapService catchment circle rendering and layer replacement in `frontend/src/composables/__tests__/useGoogleMap.spec.ts`

**Checkpoint**: All user stories are now independently functional and compliant with project governance rules

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Error resilience, zero-POI notifications, and end-to-end quickstart validation

- [X] T017 [P] Implement zero-POI fallback notifications and missing location alerts in `backend/src/modules/chat/chat.service.ts` and `frontend/src/stores/chat.store.ts`
- [X] T018 Run end-to-end quickstart validation scenarios in `specs/007-catchment-score-skill/quickstart.md`

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
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) — Operates on catchment skill context from US1
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) — Operates on frontend `GoogleMapService`

---

## Parallel Opportunities

- Setup tasks T001 and T002 can run in parallel
- Foundational tasks T003, T004, and T005 can run in parallel
- US1 tasks T006 and T007 can run in parallel
- US2 tasks T011 and T013 can run in parallel
- US3 tasks T014 and T015 can run in parallel

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Run Scenario 1 in `quickstart.md`
5. Deploy/demo MVP!
