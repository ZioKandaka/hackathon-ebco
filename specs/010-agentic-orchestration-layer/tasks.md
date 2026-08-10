# Tasks: Agentic Orchestration Layer

**Input**: Design documents from `/specs/010-agentic-orchestration-layer/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/orchestration-api.md, quickstart.md

**Tests**: Unit test tasks included for orchestrator service planning, inter-tool data chaining, status streaming, and frontend map artifact sync.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Web app**: `backend/src/`, `frontend/src/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and OrchestratorService provider wiring

- [X] T001 Register OrchestratorService provider in `backend/src/modules/chat/chat.module.ts`
- [X] T002 [P] Verify tool registration mapping for all 6 AI skills in `backend/src/modules/chat/chat.module.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core data structures and layer management that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T003 [P] Implement `OrchestratorService` with tool definition registry and intent decomposition planner in `backend/src/modules/chat/orchestrator.service.ts`
- [X] T004 [P] Define `OrchestrationContext` and inter-tool data pipeline chaining structures in `backend/src/modules/chat/orchestrator.service.ts`
- [X] T005 [P] Update `ChatService` and `chatStore` in `backend/src/modules/chat/chat.service.ts` and `frontend/src/stores/chat.store.ts` to route orchestrated multi-tool streams

**Checkpoint**: Foundation ready — user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Dynamic Multi-Tool Intent Reasoning & Execution (Priority: P1) 🎯 MVP

**Goal**: Authenticated user submits a multi-intent prompt in chat (e.g. "Find coffee shop candidates in Kediri and show a heatmap for minimarket density"). Orchestration engine plans execution, runs tools sequentially, passes intermediate context, and returns a unified synthesized report.

**Independent Test**: Submit "Find coffee shop candidates in Kediri and show a heatmap for minimarket density" in chat; verify multi-step status updates stream, candidate pins and heatmap render on map, and synthesized narrative returns in chat.

### Implementation for User Story 1

- [X] T006 [P] [US1] Implement multi-intent prompt parser and tool chain planner in `backend/src/modules/chat/orchestrator.service.ts`
- [X] T007 [P] [US1] Implement inter-tool data context propagation (passing discovery candidates to site visit/accessibility tools) in `backend/src/modules/chat/orchestrator.service.ts`
- [X] T008 [US1] Integrate `OrchestratorService` into `ChatService.streamChatResponse()` to execute multi-tool chains with single-tool pass-through in `backend/src/modules/chat/chat.service.ts`
- [X] T009 [US1] Connect multi-tool stream event processing in `frontend/src/stores/chat.store.ts` and `frontend/src/components/chat/AiChatPanel.vue`
- [X] T010 [P] [US1] Add backend unit tests for multi-tool intent decomposition and data chaining in `backend/src/modules/chat/orchestrator.service.spec.ts` and `backend/src/modules/chat/chat.service.spec.ts`

**Checkpoint**: At this point, User Story 1 (MVP) is fully functional and testable independently

---

## Phase 4: User Story 2 - Real-Time Multi-Step Progress Streaming & Error Resilience (Priority: P2)

**Goal**: Stream live step-by-step SSE status updates ("Step 1/2..." → "Step 2/2...") and handle step failures gracefully without halting non-dependent steps or failing silently.

**Independent Test**: Execute a 3-tool chain where step 2 encounters missing data; verify status updates stream for each step, step 2 notice is reported, and step 3 completes.

### Implementation for User Story 2

- [X] T011 [P] [US2] Implement multi-step real-time status streaming ("Step X/N: ...") in `backend/src/modules/chat/orchestrator.service.ts`
- [X] T012 [P] [US2] Implement step execution failure isolation and redundant tool call suppression in `backend/src/modules/chat/orchestrator.service.ts`
- [X] T013 [P] [US2] Add unit tests for status streaming and step failure resilience in `backend/src/modules/chat/orchestrator.service.spec.ts`

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - Coherent Synthesis & Combined Map Overlay Rendering (Priority: P3)

**Goal**: Synthesize completed tool outputs into one readable narrative and render all combined map visual artifacts (pins, heatmaps, circles, polygons) on the shared map canvas.

**Independent Test**: Execute a multi-tool request; verify candidate pins and spatial overlays render together on the map and chat presents a synthesized summary.

### Implementation for User Story 3

- [X] T014 [P] [US3] Implement narrative response synthesis combining multi-tool findings into one cohesive answer in `backend/src/modules/chat/orchestrator.service.ts`
- [X] T015 [P] [US3] Coordinate combined map visual artifact sync (pins + heatmaps + circles + polygons) in `frontend/src/stores/chat.store.ts` and `frontend/src/services/google-map.service.ts`
- [X] T016 [US3] Add frontend unit tests for multi-artifact map rendering sync in `frontend/src/composables/__tests__/useGoogleMap.spec.ts`

**Checkpoint**: All user stories are now independently functional and compliant with project governance rules

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Error resilience, 5-call max execution cap enforcement, and end-to-end quickstart validation

- [X] T017 [P] Implement maximum 5-call execution cap enforcement and infinite loop protection in `backend/src/modules/chat/orchestrator.service.ts`
- [X] T018 Run end-to-end quickstart validation scenarios in `specs/010-agentic-orchestration-layer/quickstart.md`

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
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) — Operates on `OrchestratorService` execution loop from US1
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) — Operates on frontend `chatStore` and `GoogleMapService`

---

## Parallel Opportunities

- Setup tasks T001 and T002 can run in parallel
- Foundational tasks T003, T004, and T005 can run in parallel
- US1 tasks T006 and T007 can run in parallel
- US2 tasks T011 and T012 can run in parallel
- US3 tasks T014 and T015 can run in parallel

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Run Scenario 1 in `quickstart.md`
5. Deploy/demo MVP!
