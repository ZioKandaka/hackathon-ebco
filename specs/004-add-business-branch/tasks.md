# Tasks: Add Business/Branch AI Skill

**Input**: Design documents from `/specs/004-add-business-branch/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/locations-api.md, quickstart.md

**Tests**: Includes unit tests for `GeocodingService` and `LocationsService`, plus integration tests for NestJS `/locations` endpoints.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Includes exact file paths in descriptions

## Path Conventions

- **Web app**: `backend/src/`, `frontend/src/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Locations module structure and frontend store scaffold.

- [x] T001 Create locations module directory structure in backend/src/modules/locations/
- [x] T002 [P] Create locations store in frontend/src/stores/locations.store.ts

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core UserLocation entity, GeocodingService, and LocationsService that ALL user stories depend on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T003 Create TypeORM UserLocation entity and migration script in backend/src/modules/locations/entities/user-location.entity.ts
- [x] T004 Implement GeocodingService with Google Geocoding REST API client in backend/src/modules/locations/services/geocoding.service.ts
- [x] T005 Implement LocationsService and LocationsModule in backend/src/modules/locations/services/locations.service.ts and backend/src/modules/locations/locations.module.ts
- [x] T006 [P] Create CreateLocationDto validation class in backend/src/modules/locations/dto/create-location.dto.ts

**Checkpoint**: Foundation ready - user story implementation can now begin.

---

## Phase 3: User Story 1 - Conversational Branch Registration (Priority: P1) 🎯 MVP

**Goal**: Register a new branch location conversationally via AI chat panel, persist in PostgreSQL, and render a pin on the shared Google Map.

**Independent Test**: Type a complete location creation request in the AI chat panel, observe status streaming, receive AI confirmation, and verify that a pin appears on the Google Map and in "My Locations" list.

### Tests for User Story 1

- [x] T007 [P] [US1] Unit test for GeocodingService address parsing in backend/src/modules/locations/services/geocoding.service.spec.ts
- [x] T008 [P] [US1] Integration test for GET /api/v1/locations and POST /api/v1/locations in backend/test/locations.e2e-spec.ts

### Implementation for User Story 1

- [x] T009 [US1] Expose GET /api/v1/locations and POST /api/v1/locations routes in backend/src/modules/locations/locations.controller.ts
- [x] T010 [US1] Integrate Add Business/Branch skill execution handler into backend/src/modules/chat/chat.service.ts
- [x] T011 [P] [US1] Implement fetchLocations and map pin actions in frontend/src/stores/locations.store.ts
- [x] T012 [US1] Render user location list and pins in frontend/src/views/MyLocationsView.vue

**Checkpoint**: At this point, User Story 1 (MVP) conversational branch creation is complete and testable independently.

---

## Phase 4: User Story 2 - Geocoding Ambiguity & Candidate Confirmation (Priority: P2)

**Goal**: Present candidate address options in chat when geocoding returns multiple matches and await user selection.

**Independent Test**: Type a vague address in chat, verify the AI lists candidate address options, reply with selection, and confirm creation.

### Tests for User Story 2

- [x] T013 [P] [US2] Unit test for multi-candidate geocoding parsing in backend/src/modules/locations/services/geocoding.service.spec.ts

### Implementation for User Story 2

- [x] T014 [US2] Implement multi-candidate address selection flow in backend/src/modules/chat/chat.service.ts

**Checkpoint**: User Story 2 candidate selection is functional and integrated.

---

## Phase 5: User Story 3 - Duplicate Address Detection & User Choice (Priority: P3)

**Goal**: Warn user if a similar address is already registered in their account and prompt for confirmation.

**Independent Test**: Submit an address matching an existing location, observe AI duplicate warning prompt in chat, and select whether to proceed.

### Tests for User Story 3

- [x] T015 [P] [US3] Unit test for duplicate location detection in backend/src/modules/locations/services/locations.service.spec.ts

### Implementation for User Story 3

- [x] T016 [US3] Implement duplicate address lookup and confirmation prompt in backend/src/modules/chat/chat.service.ts

**Checkpoint**: All 3 user stories are complete, persistent, and testable.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Map bounds auto-fit and quickstart validation walkthrough.

- [x] T017 [P] Add auto-fit map bounds adjustment when location pins render in frontend/src/stores/locations.store.ts
- [x] T018 Execute quickstart.md validation walkthrough in specs/004-add-business-branch/quickstart.md

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
- **User Story 2 (P2)**: Extends `GeocodingService` and `ChatService` skill handler in US1.
- **User Story 3 (P3)**: Extends `LocationsService` and `ChatService` skill handler in US1.

### Parallel Opportunities

- T002 in Setup can run in parallel with T001.
- T006 in Foundational can run in parallel.
- T007, T008 (tests) and T011 in User Story 1 can run in parallel.
- T013 (test) in User Story 2 can run in parallel.
- T015 (test) in User Story 3 can run in parallel.

---

## Parallel Example: User Story 1

```bash
# Tests & Frontend Store in parallel:
Task: "Unit test for GeocodingService address parsing in backend/src/modules/locations/services/geocoding.service.spec.ts"
Task: "Implement fetchLocations and map pin actions in frontend/src/stores/locations.store.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001 - T002)
2. Complete Phase 2: Foundational (T003 - T006)
3. Complete Phase 3: User Story 1 (T007 - T012)
4. **STOP and VALIDATE**: Test conversational branch creation via AI chat panel and map pin rendering.

### Incremental Delivery

1. Setup + Foundational -> Geocoding & Location infrastructure ready.
2. Add User Story 1 -> Conversational branch creation active! (MVP)
3. Add User Story 2 -> Multi-candidate address selection active.
4. Add User Story 3 -> Duplicate address detection active -> Feature complete.
