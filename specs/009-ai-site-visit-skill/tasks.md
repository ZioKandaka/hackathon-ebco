# Tasks: AI Site Visit AI Skill

**Input**: Design documents from `/specs/009-ai-site-visit-skill/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/site-visit-api.md, quickstart.md

**Tests**: Unit test tasks included for backend skill streaming, image fetching pipeline, Gemini vision analysis, and frontend gallery components.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Web app**: `backend/src/`, `frontend/src/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and SiteVisitModule wiring

- [X] T001 Register SiteVisitService provider in `backend/src/modules/discovery/discovery.module.ts`
- [X] T002 [P] Verify DiscoveryModule and ChatModule dependency wiring in `backend/src/modules/chat/chat.module.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core data structures and layer management that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T003 [P] Extend `ChatStreamEvent` interface and DTOs in `backend/src/modules/chat/chat.service.ts` to support `siteVisitData` payload
- [X] T004 [P] Create `SiteVisitService` with Street View metadata pre-check (`OK` vs `ZERO_RESULTS`) and static image URL constructor in `backend/src/modules/discovery/services/site-visit.service.ts`
- [X] T005 [P] Update SSE event handler and chat store in `frontend/src/stores/chat.store.ts` and `frontend/src/services/chat-sse.service.ts` to route `siteVisitData` payloads and center map view

**Checkpoint**: Foundation ready — user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Multimodal Street View & Satellite Visual Assessment (Priority: P1) 🎯 MVP

**Goal**: Authenticated user submits a natural-language request for an AI site visit (e.g. "Do an AI site visit on my Sudirman branch" or "What does spot 1 look like?"). System streams SSE status updates, fetches 4 cardinal Street View images (0°, 90°, 180°, 270°) + 1 satellite snapshot, processes images with Gemini vision AI, evaluates 5 qualitative physical criteria (Storefront 30%, Road Access 25%, Traffic 20%, Buildings 15%, Condition 10%), and renders image gallery + structured score report in chat.

**Independent Test**: Submit "Do an AI site visit on my Sudirman branch" in AI Chat Assistant Panel; verify SSE status streaming ("Determining right action..." → "Fetching street-level imagery..." → "Analyzing site visually..."), 5-tile image gallery in chat, and 5-criteria weighted visual rating report.

### Implementation for User Story 1

- [X] T006 [P] [US1] Implement 4-heading Street View (0°, 90°, 180°, 270°) and satellite static imagery fetcher in `backend/src/modules/discovery/services/site-visit.service.ts`
- [X] T007 [P] [US1] Implement Gemini 1.5 Flash multimodal vision analysis engine evaluating 5 qualitative criteria with weighted 0-100 score in `backend/src/modules/discovery/services/site-visit.service.ts`
- [X] T008 [US1] Implement AI site visit skill execution and step-by-step SSE status streaming in `backend/src/modules/chat/chat.service.ts`
- [X] T009 [US1] Build responsive 5-tile thumbnail image gallery component in `frontend/src/components/chat/AiChatPanel.vue`
- [X] T010 [P] [US1] Add backend unit tests for SiteVisitService image metadata pipeline and Gemini vision analysis in `backend/src/modules/discovery/services/site-visit.service.spec.ts` and `backend/src/modules/chat/chat.service.spec.ts`

**Checkpoint**: At this point, User Story 1 (MVP) is fully functional and testable independently

---

## Phase 4: User Story 2 - Satellite-Only Coverage Fallback (Priority: P2)

**Goal**: Handles missing Street View coverage gracefully by informing user in chat and performing a satellite-imagery-only visual assessment.

**Independent Test**: Request a site visit for coordinates lacking Street View coverage; verify polite chat notice ("No Street View coverage found at this location; performing satellite-only visual analysis") and satellite-based visual assessment report.

### Implementation for User Story 2

- [X] T011 [P] [US2] Implement zero Street View coverage detection (`ZERO_RESULTS`) and satellite-only visual analysis fallback in `backend/src/modules/discovery/services/site-visit.service.ts`
- [X] T012 [P] [US2] Add unit tests for satellite-only coverage fallback handling in `backend/src/modules/discovery/services/site-visit.service.spec.ts`

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - Interactive Image Gallery & Map Pin Center (Priority: P3)

**Goal**: Enables Lightbox modal expansion for Street View thumbnails in chat and automatically centers shared Google Map instance on target location pin.

**Independent Test**: Click a Street View thumbnail in chat; verify high-resolution Lightbox modal expansion with cardinal direction labels, and confirm map pans/zooms to center on target coordinates.

### Implementation for User Story 3

- [X] T013 [P] [US3] Implement Lightbox image modal component for high-resolution thumbnail viewing in `frontend/src/components/chat/AiChatPanel.vue`
- [X] T014 [P] [US3] Implement map view auto-centering and zoom (`setCenter`, `setZoom(17)`) on target location coordinates in `frontend/src/services/google-map.service.ts`
- [X] T015 [US3] Add frontend unit tests for gallery Lightbox expansion and map centering in `frontend/src/composables/__tests__/useGoogleMap.spec.ts`

**Checkpoint**: All user stories are now independently functional and compliant with project governance rules

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Error resilience, Gemini vision timeout fallbacks, and end-to-end quickstart validation

- [X] T016 [P] Implement Gemini vision timeout fallback notice and raw photo rendering handler in `backend/src/modules/chat/chat.service.ts` and `frontend/src/stores/chat.store.ts`
- [X] T017 Run end-to-end quickstart validation scenarios in `specs/009-ai-site-visit-skill/quickstart.md`

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
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) — Operates on SiteVisitService metadata check from US1
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) — Operates on frontend UI and `GoogleMapService`

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
