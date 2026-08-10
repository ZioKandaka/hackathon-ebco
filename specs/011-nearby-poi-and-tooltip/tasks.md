# Tasks: Nearby POI Pins & Hover Tooltips

**Input**: Design documents from `/specs/011-nearby-poi-and-tooltip/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/nearby-poi-api.md, quickstart.md

**Tests**: Unit test tasks included for vertical relevance taxonomy filtering, nearby POI REST endpoint, and frontend map marker/tooltip service layer management.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Web app**: `backend/src/`, `frontend/src/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and helper interface registration

- [X] T001 Register renderNearbyPoiMarkers and clearNearbyPoiMarkers helper interfaces in `frontend/src/services/google-map.service.ts`
- [X] T002 [P] Verify getRelevantDisplayCategoriesForType taxonomy helper in `backend/src/modules/discovery/services/bigquery-discovery.service.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core data structures and layer management that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T003 [P] Implement `getRelevantDisplayCategoriesForType(businessType)` taxonomy and update `queryPoisWithinRadius` in `backend/src/modules/discovery/services/bigquery-discovery.service.ts` to accept `relevantCategories` and filter `poi_type IN UNNEST(@relevantCategories)`
- [X] T004 [P] Extend `DiscoveryController` and `DiscoveryService` in `backend/src/modules/discovery/discovery.controller.ts` and `backend/src/modules/discovery/services/discovery.service.ts` with a nearby POIs endpoint
- [X] T005 [P] Implement `renderNearbyPoiMarkers(pois)` and `clearNearbyPoiMarkers()` in `frontend/src/services/google-map.service.ts` using cyan dot icons and `mouseover`/`mouseout` InfoWindow tooltips

**Checkpoint**: Foundation ready — user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Toggle Nearby POI Pins & 2km Boundary Circle (Priority: P1) 🎯 MVP

**Goal**: Enable "Show Nearby POI" / "Hide Nearby POI" toggle button on candidate cards in `DiscoverView.vue`. Renders a 2km catchment boundary circle (reusing `googleMapService.renderCatchmentCircle`) and cyan POI pins on the map.

**Independent Test**: Click "Show Nearby POI" on candidate spot #1 in Discover panel; verify 2km circle renders around spot #1, cyan nearby POI pins appear, and clicking again or switching candidates cleanly clears previous layer.

### Implementation for User Story 1

- [X] T006 [P] [US1] Add `activePoiCandidateRank`, `toggleNearbyPois(candidate)`, and `clearNearbyPois()` state methods to `frontend/src/stores/discovery.store.ts`
- [X] T007 [US1] Add "Show Nearby POI" / "Hide Nearby POI" toggle button and inline loading state to candidate cards in `frontend/src/views/DiscoverView.vue`
- [X] T008 [US1] Connect candidate toggle state to `googleMapService.renderCatchmentCircle` and `googleMapService.renderNearbyPoiMarkers` in `frontend/src/stores/discovery.store.ts`
- [X] T009 [P] [US1] Add frontend store unit tests for nearby POI toggling and single-layer cleanup in `frontend/src/composables/__tests__/useGoogleMap.spec.ts`

**Checkpoint**: At this point, User Story 1 (MVP) is fully functional and testable independently

---

## Phase 4: User Story 2 - Relevant Business Vertical Taxonomy Filtering (Priority: P2)

**Goal**: Ensure nearby POIs returned from BigQuery / mock queries are strictly filtered by vertical relevance (`poi_type IN UNNEST(@relevantCategories)`), preventing category leaks.

**Independent Test**: Trigger "Show Nearby POI" on a coffee shop candidate; verify returned POIs match coffee shop, cafe, or bakery categories only.

### Implementation for User Story 2

- [X] T010 [P] [US2] Add unit tests for `getRelevantDisplayCategoriesForType` and BigQuery `poi_type` UNNEST filtering in `backend/src/modules/discovery/services/bigquery-discovery.service.spec.ts`
- [X] T011 [US2] Verify vertical category fallback handling for unmapped business types in `backend/src/modules/discovery/services/bigquery-discovery.service.ts`

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - POI Hover Tooltips (Priority: P3)

**Goal**: Display a non-intrusive Google Maps InfoWindow tooltip on `mouseover` and close on `mouseout` showing POI name, category, rating, user review count, and operating status.

**Independent Test**: Hover over a cyan nearby POI pin; verify InfoWindow tooltip opens within 100ms showing POI details; move mouse away, verify tooltip closes.

### Implementation for User Story 3

- [X] T012 [P] [US3] Attach `mouseover` / `mouseout` event listeners to cyan nearby POI markers in `frontend/src/services/google-map.service.ts`
- [X] T013 [P] [US3] Add unit tests for InfoWindow hover tooltip creation and cleanup in `frontend/src/composables/__tests__/useGoogleMap.spec.ts`

**Checkpoint**: All user stories are now independently functional and compliant with project governance rules

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Error resilience, zero-nearby-POI notifications, and end-to-end quickstart validation

- [X] T014 [P] Implement zero-nearby-POI inline card notification ("No relevant nearby POIs found within 2km") in `frontend/src/views/DiscoverView.vue`
- [X] T015 Run end-to-end quickstart validation scenarios in `specs/011-nearby-poi-and-tooltip/quickstart.md`

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
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) — Operates on `BigQueryDiscoveryService` taxonomy from US1
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) — Operates on frontend `GoogleMapService`

---

## Parallel Opportunities

- Setup tasks T001 and T002 can run in parallel
- Foundational tasks T003, T004, and T005 can run in parallel
- US1 tasks T006 and T009 can run in parallel
- US2 tasks T010 and T011 can run in parallel
- US3 tasks T012 and T013 can run in parallel

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Run Scenario 1 in `quickstart.md`
5. Deploy/demo MVP!
