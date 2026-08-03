# Tasks: Base Map Component

**Input**: Design documents from `/specs/003-base-map-component/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/map-interface.md, quickstart.md

**Tests**: Includes unit tests for `useGoogleMap` composable and error state component rendering.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Includes exact file paths in descriptions

## Path Conventions

- **Web app**: `frontend/src/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Dependency installation and map component directory initialization.

- [x] T001 Install @googlemaps/js-api-loader dependency in frontend/package.json
- [x] T002 [P] Create map component directory structure in frontend/src/components/map/

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Google Maps singleton service and composable interface that ALL map user stories depend on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T003 Implement GoogleMapService singleton in frontend/src/services/google-map.service.ts
- [x] T004 Implement useGoogleMap composable with layer management contract in frontend/src/composables/useGoogleMap.ts

**Checkpoint**: Foundation ready - user story implementation can now begin.

---

## Phase 3: User Story 1 - Full-Viewport Interactive Base Map (Priority: P1) 🎯 MVP

**Goal**: Render a full-screen, interactive Google Map on all authenticated views.

**Independent Test**: Log into the application, navigate to `/discover`, and confirm that an interactive Google Map renders full-screen with pan, zoom, and satellite toggle controls.

### Implementation for User Story 1

- [x] T005 [P] [US1] Create BaseMap.vue full-viewport component in frontend/src/components/map/BaseMap.vue
- [x] T006 [US1] Bind BaseMap.vue as persistent background canvas in frontend/src/views/DiscoverView.vue, frontend/src/views/HeatmapView.vue, and frontend/src/views/MyLocationsView.vue

**Checkpoint**: At this point, User Story 1 (MVP) full-viewport base map is complete and testable independently.

---

## Phase 4: User Story 2 - Default Location & Geolocation Centering (Priority: P2)

**Goal**: Center map on user browser geolocation if granted, or fallback to Greater Jakarta / West Java coordinates.

**Independent Test**: Load map with geolocation enabled (verify map centers on current location) and with geolocation disabled (verify map centers on Greater Jakarta coordinates `-6.2088, 106.8456`).

### Implementation for User Story 2

- [x] T007 [US2] Implement browser geolocation detection and default fallback centering in frontend/src/composables/useGoogleMap.ts

**Checkpoint**: User Story 2 intelligent map centering is functional.

---

## Phase 5: User Story 3 - Shared Map Layer Contract & Resilience (Priority: P3)

**Goal**: Expose a clean layer management interface for downstream features and handle API loading failures gracefully.

**Independent Test**: Trigger an API loading error and verify that a clear error message card renders with a retry button instead of a blank screen.

### Tests for User Story 3

- [x] T008 [P] [US3] Unit test for useGoogleMap composable layer registry in frontend/src/composables/__tests__/useGoogleMap.spec.ts

### Implementation for User Story 3

- [x] T009 [P] [US3] Create MapErrorCard.vue component in frontend/src/components/map/MapErrorCard.vue
- [x] T010 [US3] Add script load error catching and fallback error card rendering in frontend/src/components/map/BaseMap.vue

**Checkpoint**: All 3 user stories are complete, resilient, and testable independently.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Window resize listener and validation walkthrough.

- [x] T011 [P] Add window resize listener and debounced map resize trigger in frontend/src/components/map/BaseMap.vue
- [x] T012 Execute quickstart.md validation walkthrough in specs/003-base-map-component/quickstart.md

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
- **User Story 2 (P2)**: Extends `useGoogleMap` composable centering logic in US1.
- **User Story 3 (P3)**: Adds error card handling to `BaseMap.vue`.

### Parallel Opportunities

- T002 in Setup can run in parallel with T001.
- T005 in User Story 1 can run in parallel.
- T008 (test) and T009 in User Story 3 can run in parallel.

---

## Parallel Example: User Story 3

```bash
# Composable test and Error component in parallel:
Task: "Unit test for useGoogleMap composable layer registry in frontend/src/composables/__tests__/useGoogleMap.spec.ts"
Task: "Create MapErrorCard.vue component in frontend/src/components/map/MapErrorCard.vue"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001 - T002)
2. Complete Phase 2: Foundational (T003 - T004)
3. Complete Phase 3: User Story 1 (T005 - T006)
4. **STOP and VALIDATE**: Verify full-viewport Google Map renders on `/discover`.

### Incremental Delivery

1. Setup + Foundational -> Infrastructure ready.
2. Add User Story 1 -> Full-viewport Google Map active!
3. Add User Story 2 -> Geolocation / default centering active.
4. Add User Story 3 -> Layer contract & error fallback active -> Feature complete.
