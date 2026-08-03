# Phase 0 Research: User Authentication

## 1. Authentication Framework & Strategy

- **Decision**: NestJS backend utilizing `@nestjs/passport`, `@nestjs/jwt`, `passport`, and `passport-jwt` for authentication middleware, coupled with Vue 3 Pinia store and Vue Router navigation guards on the frontend.
- **Rationale**: Aligns directly with the project constitution requirement for NestJS backend and Vue 3 frontend. JWT-based stateless authentication allows smooth scaling on GCP Cloud Run without requiring server-side session state sticky routing.
- **Alternatives Considered**: 
  - Express-session with server-side redis/database session store: Rejected because sticky sessions or central session lookups on every request add unnecessary latency and deployment complexity on Cloud Run.
  - Third-party OAuth (Firebase Auth, Auth0, Supabase): Explicitly excluded by feature spec requirement for a self-contained, email/password system.

## 2. Password Security & Hashing

- **Decision**: `argon2` (or `bcrypt` with minimum 12 salt rounds) via Node.js native bindings for hashing passwords prior to database persistence.
- **Rationale**: Meets FR-007 requirement for modern, strong, salted hashing algorithms. Prevents plain-text storage and resists brute-force and GPU-based dictionary attacks.
- **Alternatives Considered**:
  - `crypto.pbkdf2`: Native to Node.js but slower and less resistant to GPU cracking than Argon2id/bcrypt.
  - Plain SHA-256 / MD5: Insecure and strictly forbidden by security constraints.

## 3. Database & Entity Persistence

- **Decision**: PostgreSQL on Cloud SQL (`ebc-cloud-dev-03`) accessed via NestJS TypeORM module with automatic database migrations.
- **Rationale**: TypeORM integrates natively with NestJS, supports strict TypeScript entity definitions and DTO validation (`class-validator`), and enforces relational integrity for user-scoped data (`users` table with primary key `id` UUID).
- **Alternatives Considered**:
  - Prisma: Strong typing, but adds extra CLI and schema maintenance step outside NestJS native decorator patterns.
  - Direct SQL / Knex: Lacks decorator-driven DTO mapping and automated validation.

## 4. Frontend State & Access Control

- **Decision**: Vue 3 Pinia `useAuthStore` combined with Vue Router global navigation guards (`router.beforeEach`).
- **Rationale**: Pinia provides reactive user session state (token, current user profile) across Vue components. Router guards intercept navigation to protected routes (`/discover`, `/heatmap`, `/my-locations`) and redirect unauthenticated users to `/login`.
- **Alternatives Considered**:
  - Component-level route checks: Fragile and error-prone, risks leaking protected views if a component check is missed.
  - Vuex: Deprecated in Vue 3 in favor of Pinia.

## 5. Token Expiration & Storage Strategy

- **Decision**: JWT access tokens stored in HttpOnly, Secure, SameSite cookies with a 24-hour expiration lifespan, supplemented by a `/auth/me` endpoint to restore state on browser reloads.
- **Rationale**: Storing JWT in HttpOnly cookies protects tokens from XSS script access while ensuring automatic transmission on API requests. The 24-hour expiration satisfies the non-indefinite session constraint (FR-009).
- **Alternatives Considered**:
  - Plain LocalStorage: Vulnerable to XSS token theft.
  - Short-lived 15-min access tokens with refresh tokens: Adds unnecessary complexity for v1 MVP scope; 24-hour HttpOnly token fulfills security requirements cleanly.
