# Tasks: AI Chat Assistant Panel

**Input**: Design documents from `/specs/002-ai-chat-panel/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/chat-api.md, quickstart.md

**Tests**: Includes unit tests for `ChatService` and integration tests for NestJS `/chat` endpoints per project testing standards.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Includes exact file paths in descriptions

## Path Conventions

- **Web app**: `backend/src/`, `frontend/src/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Directory initialization and chat feature module scaffold.

- [x] T001 Create chat feature module structure in backend/src/modules/chat/
- [x] T002 [P] Create chat frontend component directory in frontend/src/components/chat/

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core chat entity, database service, and SSE client service that ALL user stories depend on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T003 Create TypeORM ChatMessage entity and migration script in backend/src/modules/chat/entities/chat-message.entity.ts
- [x] T004 Implement ChatModule and ChatService in backend/src/modules/chat/chat.service.ts and backend/src/modules/chat/chat.module.ts
- [x] T005 [P] Create SendMessageDto validation class in backend/src/modules/chat/dto/send-message.dto.ts
- [x] T006 [P] Create chat SSE client streaming service in frontend/src/services/chat-sse.service.ts

**Checkpoint**: Foundation ready - user story implementation can now begin.

---

## Phase 3: User Story 1 - Global Floating Chat Panel & Interaction UI (Priority: P1) 🎯 MVP

**Goal**: Display a right-docked floating AI chat panel covering 25% of the screen overlaying the interactive Google Map.

**Independent Test**: Log in, observe the 25% right-docked floating panel overlaying the Google Map on any route, submit a test message, and confirm the map remains fully interactive in the remaining 75% viewport.

### Tests for User Story 1

- [x] T007 [P] [US1] Unit test for AiChatPanel layout and visibility in frontend/src/components/chat/__tests__/AiChatPanel.spec.ts

### Implementation for User Story 1

- [x] T008 [P] [US1] Create ChatInput.vue component with send action and whitespace validation in frontend/src/components/chat/ChatInput.vue
- [x] T009 [P] [US1] Create ChatMessageList.vue component for message rendering in frontend/src/components/chat/ChatMessageList.vue
- [x] T010 [US1] Create right-docked floating AiChatPanel.vue overlay in frontend/src/components/chat/AiChatPanel.vue
- [x] T011 [US1] Mount AiChatPanel.vue globally in frontend/src/App.vue for authenticated users

**Checkpoint**: At this point, User Story 1 (MVP) UI layout is complete and testable independently.

---

## Phase 4: User Story 2 - Real-time SSE Process Streaming & Status Updates (Priority: P2)

**Goal**: Stream real-time, human-readable process status updates from backend to frontend over SSE during AI processing.

**Independent Test**: Submit a message, observe real-time status update cards stream into the chat panel sequentially, and verify final assistant response card.

### Tests for User Story 2

- [x] T012 [P] [US2] Unit test for ChatService SSE stream generation in backend/src/modules/chat/chat.service.spec.ts
- [x] T013 [P] [US2] Integration test for POST /api/v1/chat/stream SSE endpoint in backend/test/chat-stream.e2e-spec.ts

### Implementation for User Story 2

- [x] T014 [US2] Implement SSE stream generator in backend/src/modules/chat/chat.service.ts
- [x] T015 [US2] Expose POST /api/v1/chat/stream SSE controller handler in backend/src/modules/chat/chat.controller.ts
- [x] T016 [P] [US2] Create ChatStatusCard.vue component for live status indicators in frontend/src/components/chat/ChatStatusCard.vue
- [x] T017 [US2] Implement sendStreamMessage action in Pinia store frontend/src/stores/chat.store.ts

**Checkpoint**: User Story 2 live streaming is functional and integrated with the chat panel.

---

## Phase 5: User Story 3 - User-Scoped Chat History Persistence Across Reloads (Priority: P3)

**Goal**: Save user messages and AI responses to PostgreSQL and restore history on page reloads.

**Independent Test**: Submit messages, refresh the browser window, and confirm that past conversation history is restored chronologically.

### Tests for User Story 3

- [x] T018 [P] [US3] Integration test for GET /api/v1/chat/history in backend/test/chat-history.e2e-spec.ts

### Implementation for User Story 3

- [x] T019 [US3] Implement getHistory and message persistence methods in backend/src/modules/chat/chat.service.ts
- [x] T020 [US3] Expose GET /api/v1/chat/history route in backend/src/modules/chat/chat.controller.ts
- [x] T021 [P] [US3] Implement fetchHistory action in Pinia store frontend/src/stores/chat.store.ts
- [x] T022 [US3] Restore chat history on component mount in frontend/src/components/chat/AiChatPanel.vue

**Checkpoint**: All 3 user stories are complete, persistent, and testable independently.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Auto-scroll behavior and quickstart validation walkthrough.

- [x] T023 [P] Add auto-scroll container logic to newest message in frontend/src/components/chat/ChatMessageList.vue
- [x] T024 Execute quickstart.md validation walkthrough in specs/002-ai-chat-panel/quickstart.md

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
- **User Story 2 (P2)**: Starts after Foundational (Phase 2) + US1 UI components.
- **User Story 3 (P3)**: Starts after Foundational (Phase 2). Integrates with US1 and US2 components.

### Parallel Opportunities

- T002 in Setup can run in parallel with T001.
- T005, T006 in Foundational can run in parallel once T003 & T004 are done.
- T007, T008, T009 in User Story 1 can run in parallel.
- T012, T013 (tests) and T016 in User Story 2 can run in parallel.
- T018 (test) and T021 in User Story 3 can run in parallel.

---

## Parallel Example: User Story 1

```bash
# Frontend component tasks in parallel:
Task: "Create ChatInput.vue component with send action and whitespace validation in frontend/src/components/chat/ChatInput.vue"
Task: "Create ChatMessageList.vue component for message rendering in frontend/src/components/chat/ChatMessageList.vue"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001 - T002)
2. Complete Phase 2: Foundational (T003 - T006)
3. Complete Phase 3: User Story 1 (T007 - T011)
4. **STOP and VALIDATE**: Verify floating panel layout over Google Map.

### Incremental Delivery

1. Setup + Foundational -> Infrastructure ready.
2. Add User Story 1 -> Test UI panel & layout -> MVP UI release!
3. Add User Story 2 -> Test SSE streaming -> Real-time status active.
4. Add User Story 3 -> Test database persistence & restore on reload -> Feature complete.
