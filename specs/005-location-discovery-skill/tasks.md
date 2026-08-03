# Tasks: Location Discovery AI Skill

**Input**: Design documents from `/specs/005-location-discovery-skill/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/discovery-api.md, quickstart.md

**Tests**: Includes unit tests for `DiscoveryService` and `BigQueryDiscoveryService`, plus integration tests for NestJS `/discovery` endpoints.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Includes exact file paths in descriptions

## Path Conventions

- **Web app**: `backend/src/`, `frontend/src/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Discovery module directory layout and store scaffold.

- [x] T001 Create discovery module directory structure in backend/src/modules/discovery/
- [x] T002 [P] Create discovery store in frontend/src/stores/discovery.store.ts

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core BigQuery POI query service and scoring algorithm that ALL discovery user stories depend on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T003 Implement BigQuery POI query service with regency/province partition filtering in backend/src/modules/discovery/services/bigquery-discovery.service.ts
- [x] T004 Implement DiscoveryService demand vs competition scoring algorithm in backend/src/modules/discovery/services/discovery.service.ts
- [x] T005 [P] Create DiscoverySearchDto validation class in backend/src/modules/discovery/dto/discovery-search.dto.ts
- [x] T006 Create DiscoveryModule in backend/src/modules/discovery/discovery.module.ts

**Checkpoint**: Foundation ready - user story implementation can now begin.

---

## Phase 3: User Story 1 - Conversational Candidate Spot Discovery (Priority: P1) 🎯 MVP

**Goal**: Execute location discovery search, rank top candidate spots, stream SSE status updates, and render numbered candidate pins on the shared Google Map.

**Independent Test**: Type a discovery request in the AI chat panel (e.g., "Find top 5 spots for a coffee shop in Kediri"), verify real-time status updates stream, receive ranked candidates in chat, and confirm numbered pins appear on the Google Map.

### Tests for User Story 1

- [x] T007 [P] [US1] Unit test for DiscoveryService scoring and candidate ranking in backend/src/modules/discovery/services/discovery.service.spec.ts
- [x] T008 [P] [US1] Integration test for POST /api/v1/discovery/search in backend/test/discovery.e2e-spec.ts

### Implementation for User Story 1

- [x] T009 [US1] Expose POST /api/v1/discovery/search route in backend/src/modules/discovery/discovery.controller.ts
- [x] T010 [US1] Integrate Discover AI skill execution handler into backend/src/modules/chat/chat.service.ts
- [x] T011 [P] [US1] Implement renderCandidatePins action in Pinia store frontend/src/stores/discovery.store.ts
- [x] T012 [US1] Render candidate discovery results and map pins in frontend/src/views/DiscoverView.vue

**Checkpoint**: At this point, User Story 1 (MVP) conversational location discovery is complete and testable independently.

---

## Phase 4: User Story 2 - Interactive Candidate Inspection & Detail Querying (Priority: P2)

**Goal**: Support candidate pin click inspection on the map and follow-up chat queries (e.g., "tell me more about spot 2").

**Independent Test**: Click candidate pin #1 on the map, verify map centers and displays candidate metrics popup, then type "tell me more about spot 2" in chat and confirm detailed metric breakdown.

### Tests for User Story 2

- [x] T013 [P] [US2] Unit test for candidate spot detail extraction in backend/src/modules/discovery/services/discovery.service.spec.ts

### Implementation for User Story 2

- [x] T014 [US2] Implement candidate pin click listener and detail modal in frontend/src/views/DiscoverView.vue
- [x] T015 [US2] Handle follow-up detail questions in backend/src/modules/chat/chat.service.ts

**Checkpoint**: User Story 2 candidate inspection and detail queries are functional.

---

## Phase 5: User Story 3 - Radius-Based Demand & Competition Analysis (Priority: P3)

**Goal**: Dynamically map POI categories per business type to ensure objective radius-based scoring.

**Independent Test**: Submit discovery queries for different business types (e.g., coffee shop vs. minimarket) and verify that demand POIs adapt appropriately.

### Tests for User Story 3

- [x] T016 [P] [US3] Unit test for POI category demand mapping in backend/src/modules/discovery/services/bigquery-discovery.service.spec.ts

### Implementation for User Story 3

- [x] T017 [US3] Implement dynamic POI category mapping per business type in backend/src/modules/discovery/services/bigquery-discovery.service.ts

**Checkpoint**: All 3 user stories are complete, persistent, and testable.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Map bounds auto-fit and quickstart validation walkthrough.

- [x] T018 [P] Add auto-fit map bounds adjustment for candidate spot pins in frontend/src/stores/discovery.store.ts
- [x] T019 Execute quickstart.md validation walkthrough in specs/005-location-discovery-skill/quickstart.md

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately.
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories.
- **User Stories (Phase 3+)**: All depend on Foundational phase completion.
  - User Story 1 (P1) → User Story 2 (P2) → User Story 3 (P3)
- **Polish (Phase 6)**: Depends on completion of user stories.

### User Story Dependencies

- **User Story 1 (P1)**: Starts after Foundational (Phase 2).
- **User Story 2 (P2)**: Extends `DiscoverView.vue` and `ChatService` from US1.
- **User Story 3 (P3)**: Extends `BigQueryDiscoveryService` category mapping from US1.

### Parallel Opportunities

- T002 in Setup can run in parallel with T001.
- T005 in Foundational can run in parallel.
- T007, T008 (tests) and T011 in User Story 1 can run in parallel.
- T013 (test) in User Story 2 can run in parallel.
- T016 (test) in User Story 3 can run in parallel.

---

## Parallel Example: User Story 1

```bash
# Tests & Frontend Store in parallel:
Task: "Unit test for DiscoveryService scoring and candidate ranking in backend/src/modules/discovery/services/discovery.service.spec.ts"
Task: "Implement renderCandidatePins action in Pinia store frontend/src/stores/discovery.store.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001 - T002)
2. Complete Phase 2: Foundational (T003 - T006)
3. Complete Phase 3: User Story 1 (T007 - T012)
4. **STOP and VALIDATE**: Test conversational location discovery via AI chat panel and candidate pin rendering on map.

### Incremental Delivery

1. Setup + Foundational -> BigQuery POI query engine ready.
2. Add User Story 1 -> Conversational site discovery active! (MVP)
3. Add User Story 2 -> Candidate pin inspection and follow-up detail queries active.
4. Add User Story 3 -> Dynamic POI demand category mapping active -> Feature complete.
