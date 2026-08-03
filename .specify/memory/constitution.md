<!--
Sync Impact Report:
- Version change: Unpopulated Template -> 1.0.0
- List of modified principles:
  - Initialized: I. Code Quality & Type Safety
  - Initialized: II. Testing Standards (Moderate Rigor)
  - Initialized: III. User Experience & AI Interactivity
  - Initialized: IV. Performance & Cost Optimization
  - Initialized: V. Scope Discipline & Delivery Focus
- Added sections:
  - Technical Constraints & Infrastructure
  - Governance
- Removed sections: None
- Follow-up TODOs: None
-->

# Location Intelligence Platform Constitution

## Core Principles

### I. Code Quality & Type Safety
- **Strict Mode**: TypeScript strict mode MUST be enabled across both frontend and backend codebases.
  The `any` type is strictly forbidden unless explicitly justified with an inline explanatory comment.
- **Contract Synchronization**: The backend NestJS services MUST expose strongly typed DTOs and interfaces.
  The Vue 3 frontend MUST consume matching types, kept synchronized via a shared types folder or schema.
- **Simplicity**: Code MUST prioritize clarity and straightforwardness over complex abstractions.
- **Deferred Optimization**: Premature optimization MUST NOT be performed. Correctness and demo-readiness
  take priority over performance tuning unless required by explicit latency or query budget limits.

### II. Testing Standards (Moderate Rigor)
- **Unit Testing**: Core business logic (scoring algorithms, BigQuery query builders, geocoding logic,
  and AI agent tools) MUST maintain automated unit tests.
- **Integration Testing**: All backend API endpoints MUST include at least one automated happy-path
  integration test.
- **UI Verification**: UI components are exempt from mandatory automated tests; manual verification
  during feature development is permitted.
- **Demo Gate**: End-to-end test automation is optional. A complete manual end-to-end run-through prior
  to every milestone demo serves as the formal acceptance gate.

### III. User Experience & AI Interactivity
- **Progress Visibility**: Every AI-driven action (Discover, Heatmap, Catchment Score, Accessibility,
  AI Site Visit, Add Business) MUST render a loading or progress indicator during execution.
- **Single Shared Map**: All map-based results MUST render on a single, shared map component instance across
  features, rather than creating distinct map components per feature.
- **Graceful Error Handling**: Failures from external APIs (Geocoding, Routes, Places, Vertex AI) or
  BigQuery MUST surface user-readable error messages. Raw stack traces or silent failures are forbidden.

### IV. Performance & Cost Optimization
- **Query Scoping**: BigQuery queries MUST enforce clustering and partition/bounds filtering (e.g.,
  `province_code`, `regency_code`, or geography bounding boxes) to prevent full table scans and control
  cross-project execution costs billed to `ebc-cloud-dev-03`.
- **Response Caching**: High-cost external API responses (Routes API isochrones, Street View images, Gemini
  vision analyses) MUST be cached in PostgreSQL (`isochrone_cache`, `site_visit_cache`) to avoid duplicate calls.
- **Targeted Freshness**: Places API calls MUST be restricted to single-location freshness checks
  (e.g., verifying a specific candidate site status). BigQuery remains the sole aggregation engine for
  Discover, Heatmap, and Catchment Scoring features.

### V. Scope Discipline & Delivery Focus
- **Vertical Slices**: Feature development MUST focus on delivering fully functional vertical slices
  over exhaustive edge-case coverage.
- **Deferred Enhancements**: Non-essential enhancements (e.g., side-by-side radius vs. drive-time scoring)
  MUST be classified as stretch goals and delayed until core feature slices are operational.

## Technical Constraints & Infrastructure

### Infrastructure & Deployment
- **GCP Project**: All deployed application resources (Cloud Run services, Cloud SQL PostgreSQL instance,
  Vertex AI API usage, and BigQuery job execution) MUST reside in project `ebc-cloud-dev-03`.
- **BigQuery Cross-Project Access**: BigQuery POI datasets reside in `bni-geospatial-845e`. The backend
  service account MUST hold BigQuery Data Viewer access on `bni-geospatial-845e` and BigQuery Job User access
  on `ebc-cloud-dev-03`.
- **SQL Path Qualification**: All BigQuery SQL queries MUST reference POI tables using fully-qualified
  table paths (`bni-geospatial-845e.dataset_name.poi_table`).
- **Monorepo Architecture**: The repository structure consists of `/frontend` (Vue 3 Composition API) and
  `/backend` (NestJS) governed by root `.specify/` configuration. Each application MUST deploy as a separate
  Cloud Run service with its own Dockerfile.

### Database & Secrets Management
- **System of Record**: Cloud SQL PostgreSQL in `ebc-cloud-dev-03` is the sole transactional store
  (`user_locations`, `business_type_config`) and caching layer (`isochrone_cache`, `site_visit_cache`).
- **Secure Connectivity**: Connections to Cloud SQL MUST use Cloud SQL Auth Proxy or Unix socket connections.
  Direct public IP access with password-only authentication is prohibited.
- **Secrets & Credentials**: Credentials MUST NEVER be committed to version control. Local development MUST
  use a gitignored `.env` file with Application Default Credentials (ADC). Deployed environments MUST read
  secrets directly from GCP Secret Manager.

## Governance

- **Supremacy**: This Constitution supersedes all informal team conventions and technical documentation.
- **Amendments**: Proposed changes to governance or principles MUST be documented, versioned according to
  semantic versioning standards, and approved with a recorded Sync Impact Report.
- **Compliance**: All code reviews and feature specifications MUST verify compliance against the active
  version of this Constitution.

**Version**: 1.0.0 | **Ratified**: 2026-08-03 | **Last Amended**: 2026-08-03
