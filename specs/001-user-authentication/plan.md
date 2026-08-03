# Implementation Plan: User Authentication

**Branch**: `001-user-authentication` | **Date**: 2026-08-03 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-user-authentication/spec.md`

## Summary

Build a secure, self-contained email and password user authentication system for the location intelligence app. The backend (NestJS) handles account registration, salted password hashing (`argon2`/`bcrypt`), credential validation, JWT token issuance via HttpOnly cookies, and endpoint protection using Passport JWT middleware. The frontend (Vue 3 Composition API) manages login and registration views, maintains reactive auth state with Pinia, and enforces protected route navigation via Vue Router guards. User data is persisted in PostgreSQL (`users` table) on Cloud SQL, with all user assets foreign-key bound to a unique `user_id`.

## Technical Context

**Language/Version**: TypeScript 5.x / Node.js 20+ (NestJS 10.x backend, Vue 3.4+ Composition API frontend)

**Primary Dependencies**:
- Backend: `@nestjs/passport`, `@nestjs/jwt`, `passport-jwt`, `bcrypt` (or `argon2`), `@nestjs/typeorm`, `typeorm`, `pg`, `class-validator`, `class-transformer`
- Frontend: `pinia`, `vue-router`, `axios`

**Storage**: Cloud SQL PostgreSQL (`users` table, indexed `email`, UUID `id`) in GCP project `ebc-cloud-dev-03`

**Testing**: Jest (`@nestjs/testing`) for unit tests and Supertest for NestJS E2E/integration tests

**Target Platform**: GCP Cloud Run services (`/backend` and `/frontend` containers)

**Project Type**: Monorepo Web Application (`/backend` NestJS + `/frontend` Vue 3)

**Performance Goals**: Authentication API endpoint latency < 200ms p95

**Constraints**: Strict TypeScript mode enabled; passwords salted & hashed (zero plain-text exposure); HttpOnly secure cookies for token delivery; generic login error messages to avoid user enumeration

**Scale/Scope**: Core user authentication slice for single-tenant multi-user data isolation

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Code Quality & Type Safety**: PASS — TypeScript strict mode enabled across both frontend and backend. NestJS DTOs decorated with `class-validator` and consumed/shared with Vue 3 frontend types.
- **II. Testing Standards**: PASS — Unit tests for `AuthService` password hashing and token generation; happy-path integration tests for `/auth/register`, `/auth/login`, `/auth/logout`, and `/auth/me`.
- **III. User Experience**: PASS — Loading indicators rendered during submit actions; user-friendly error messages without raw stack traces.
- **IV. Performance & Cost Optimization**: PASS — `users.email` column indexed for O(1) credential lookups; stateless JWT validation avoids per-request DB session reads.
- **V. Scope Discipline**: PASS — Delivers focused vertical slice (email/password reg, login, logout, user scoping); explicitly delays password reset, OAuth, MFA.
- **Infrastructure & Deployment**: PASS — Deploying as Cloud Run containers backed by Cloud SQL PostgreSQL in `ebc-cloud-dev-03`.

## Project Structure

### Documentation (this feature)

```text
specs/001-user-authentication/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── auth-api.md
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── dto/
│   │   │   │   ├── register.dto.ts
│   │   │   │   └── login.dto.ts
│   │   │   ├── strategies/
│   │   │   │   └── jwt.strategy.ts
│   │   │   ├── guards/
│   │   │   │   └── jwt-auth.guard.ts
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   └── auth.module.ts
│   │   └── users/
│   │       ├── entities/
│   │       │   └── user.entity.ts
│   │       ├── users.service.ts
│   │       └── users.module.ts
│   ├── config/
│   ├── main.ts
│   └── app.module.ts
└── test/
    ├── auth.e2e-spec.ts
    └── jest-e2e.json

frontend/
├── src/
│   ├── components/
│   │   └── auth/
│   │       ├── LoginForm.vue
│   │       └── RegisterForm.vue
│   ├── views/
│   │   ├── LoginView.vue
│   │   └── RegisterView.vue
│   ├── stores/
│   │   └── auth.store.ts
│   ├── router/
│   │   └── index.ts
│   ├── services/
│   │   └── api.service.ts
│   ├── App.vue
│   └── main.ts
```

**Structure Decision**: Monorepo Web Application with `/backend` (NestJS) and `/frontend` (Vue 3 Composition API).

## Complexity Tracking

> No constitution violations. Standard monorepo architecture with clean separation of concerns.
