# Tasks: User Authentication

**Input**: Design documents from `/specs/001-user-authentication/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/auth-api.md, quickstart.md

**Tests**: Includes unit tests for `AuthService` logic and integration tests for NestJS `/auth` endpoints per project testing standards.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Includes exact file paths in descriptions

## Path Conventions

- **Web app**: `backend/src/`, `frontend/src/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Monorepo directory initialization, project dependencies, and compiler setup.

- [x] T001 Initialize monorepo directory layout for backend/ and frontend/ per implementation plan
- [x] T002 [P] Initialize NestJS project in backend/package.json with dependencies (@nestjs/passport, @nestjs/jwt, passport-jwt, bcrypt, @nestjs/typeorm, typeorm, pg, class-validator)
- [x] T003 [P] Initialize Vue 3 project in frontend/package.json with dependencies (pinia, vue-router, axios)
- [x] T004 [P] Configure TypeScript strict mode in backend/tsconfig.json and frontend/tsconfig.json

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core user entity, database access, and authentication guards that ALL user stories depend on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T005 Create TypeORM User entity and migration script in backend/src/modules/users/entities/user.entity.ts
- [x] T006 Implement UsersModule and UsersService with email lookup and user creation in backend/src/modules/users/users.service.ts
- [x] T007 [P] Configure Passport JWT strategy and AuthGuard in backend/src/modules/auth/strategies/jwt.strategy.ts and backend/src/modules/auth/guards/jwt-auth.guard.ts
- [x] T008 [P] Setup API client instance with credentials and base configuration in frontend/src/services/api.service.ts

**Checkpoint**: Foundation ready - user story implementation can now begin.

---

## Phase 3: User Story 1 - Account Registration & Automatic Login (Priority: P1) 🎯 MVP

**Goal**: Allow a new visitor to create an account with email and password and be logged in immediately.

**Independent Test**: Submit valid registration details on frontend form, verify user record created in PostgreSQL, and confirm user is automatically signed in with session token.

### Tests for User Story 1

- [x] T009 [P] [US1] Unit test for password hashing and registration logic in backend/src/modules/auth/auth.service.spec.ts
- [x] T010 [P] [US1] Integration test for POST /api/v1/auth/register in backend/test/auth-register.e2e-spec.ts

### Implementation for User Story 1

- [x] T011 [P] [US1] Create RegisterDto with class-validator validation rules in backend/src/modules/auth/dto/register.dto.ts
- [x] T012 [US1] Implement registration logic with password hashing and auto-login token issuance in backend/src/modules/auth/auth.service.ts
- [x] T013 [US1] Expose POST /api/v1/auth/register route in backend/src/modules/auth/auth.controller.ts
- [x] T014 [P] [US1] Implement Pinia auth store register action in frontend/src/stores/auth.store.ts
- [x] T015 [P] [US1] Create RegisterForm.vue component with validation error messaging in frontend/src/components/auth/RegisterForm.vue
- [x] T016 [US1] Create RegisterView.vue page and configure route in frontend/src/views/RegisterView.vue

**Checkpoint**: At this point, User Story 1 (MVP) is fully functional and testable independently.

---

## Phase 4: User Story 2 - User Login & Session Persistence (Priority: P2)

**Goal**: Authenticate an existing user with email and password, maintaining session state across page refreshes.

**Independent Test**: Log in with valid credentials, verify access token issuance, reload page, and confirm session remains active via `/auth/me`.

### Tests for User Story 2

- [x] T017 [P] [US2] Integration test for POST /api/v1/auth/login and GET /api/v1/auth/me in backend/test/auth-login.e2e-spec.ts

### Implementation for User Story 2

- [x] T018 [P] [US2] Create LoginDto with email and password validation in backend/src/modules/auth/dto/login.dto.ts
- [x] T019 [US2] Implement credential validation method in backend/src/modules/auth/auth.service.ts
- [x] T020 [US2] Expose POST /api/v1/auth/login and GET /api/v1/auth/me routes in backend/src/modules/auth/auth.controller.ts
- [x] T021 [P] [US2] Implement Pinia auth store login and fetchCurrentUser actions in frontend/src/stores/auth.store.ts
- [x] T022 [P] [US2] Create LoginForm.vue component with generic credential error handling in frontend/src/components/auth/LoginForm.vue
- [x] T023 [US2] Create LoginView.vue page and configure route in frontend/src/views/LoginView.vue
- [x] T024 [US2] Restore auth session on application startup in frontend/src/App.vue

**Checkpoint**: User Stories 1 AND 2 work independently and seamlessly together.

---

## Phase 5: User Story 3 - Logout & Protected Navigation Access (Priority: P3)

**Goal**: Enable user logout and enforce route protection so unauthenticated visitors are redirected to login.

**Independent Test**: Click "Log out" in navigation bar, confirm token cleared, attempt direct navigation to `/discover`, and verify automatic redirect to `/login`.

### Tests for User Story 3

- [x] T025 [P] [US3] Integration test for POST /api/v1/auth/logout and route access control in backend/test/auth-logout.e2e-spec.ts

### Implementation for User Story 3

- [x] T026 [US3] Expose POST /api/v1/auth/logout route clearing session cookie in backend/src/modules/auth/auth.controller.ts
- [x] T027 [US3] Implement Pinia auth store logout action in frontend/src/stores/auth.store.ts
- [x] T028 [P] [US3] Implement Vue Router global navigation guard (router.beforeEach) for protected routes in frontend/src/router/index.ts
- [x] T029 [US3] Add Log out action button and user session indicator in frontend/src/components/navigation/NavBar.vue

**Checkpoint**: All 3 user stories are complete, independently functional, and protected.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Helper decorators for user data scoping and feature validation.

- [x] T030 [P] Add @CurrentUser parameter decorator for user ID extraction in backend/src/modules/auth/decorators/current-user.decorator.ts
- [x] T031 Execute quickstart.md validation walkthrough in specs/001-user-authentication/quickstart.md

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
- **User Story 2 (P2)**: Starts after Foundational (Phase 2). Shares `AuthService` and `AuthStore`.
- **User Story 3 (P3)**: Starts after Foundational (Phase 2). Depends on router and navigation layout.

### Parallel Opportunities

- T002, T003, T004 in Setup can run in parallel.
- T007, T008 in Foundational can run in parallel once T005 & T006 are done.
- T009, T010 (tests) and T011, T014, T015 in User Story 1 can run in parallel.
- T017 (test) and T018, T021, T022 in User Story 2 can run in parallel.
- T025 (test) and T028 in User Story 3 can run in parallel.

---

## Parallel Example: User Story 1

```bash
# Backend DTO & test setup in parallel:
Task: "Create RegisterDto with class-validator validation rules in backend/src/modules/auth/dto/register.dto.ts"
Task: "Unit test for password hashing and registration logic in backend/src/modules/auth/auth.service.spec.ts"

# Frontend Store & Form component in parallel:
Task: "Implement Pinia auth store register action in frontend/src/stores/auth.store.ts"
Task: "Create RegisterForm.vue component with validation error messaging in frontend/src/components/auth/RegisterForm.vue"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001 - T004)
2. Complete Phase 2: Foundational (T005 - T008)
3. Complete Phase 3: User Story 1 (T009 - T016)
4. **STOP and VALIDATE**: Verify registration & auto-login flow independently.

### Incremental Delivery

1. Setup + Foundational -> Infrastructure ready.
2. Add User Story 1 -> Test registration -> MVP release!
3. Add User Story 2 -> Test login & persistence -> Return user flow active.
4. Add User Story 3 -> Test logout & router guard -> Security enforcement complete.
