Create principles for a location intelligence app with a Vue 3 frontend and NestJS backend, both deployed as separate Cloud Run services in a single monorepo, under GCP project ebc-cloud-dev-03. POI/geospatial analytics run on BigQuery, querying a dataset that lives in a separate GCP project (bni-geospatial-845e) via cross-project access — no data is copied or duplicated into ebc-cloud-dev-03. An existing Cloud SQL for PostgreSQL instance in ebc-cloud-dev-03 is used for transactional data and caching.

Code Quality:
- TypeScript strict mode on both frontend and backend, no `any` unless justified with a comment
- Consistent API contract: backend exposes typed DTOs/interfaces; frontend consumes matching types kept in sync manually or via a shared types folder
- Prefer simple, readable code over clever abstractions
- No premature optimization; correctness and demo-readiness take priority over performance tuning unless a specific feature requires it (e.g. BigQuery query cost/latency)

Testing Standards (moderate rigor):
- Core business logic (scoring calculations, BigQuery query builders, geocoding/agent tool logic) must have unit tests
- API endpoints must have at least a happy-path integration test
- UI components are not required to have automated tests — manual verification during development is acceptable
- No requirement for end-to-end test automation; a manual full run-through before each demo is the acceptance gate

User Experience Consistency:
- Every AI-driven action (Discover, Heatmap, Catchment Score, Accessibility, AI Site Visit, Add Business) must show a loading/progress state, since agent tool calls and BigQuery/external API calls can take several seconds
- Map-based results always render on a single shared map component, not separate map instances per feature
- Errors from external APIs (Geocoding, Routes, Places, Vertex AI) and from BigQuery must surface a user-readable message, never a raw stack trace or silent failure

Performance & Cost Requirements:
- BigQuery queries must use clustering/filtering (province_code, regency_code, or geography bounds) rather than full table scans, to control latency and query cost — this matters more with cross-project queries since job execution is billed to ebc-cloud-dev-03
- Cache expensive external API calls (Routes API isochrones, Street View + Gemini vision results) in Postgres to avoid redundant calls during repeated or live-demo use
- Where live freshness genuinely matters for a single specific location (e.g. confirming a candidate site's current business status before a user commits), a targeted Places API call may be used; Places API is not used for area-wide aggregation — BigQuery remains the aggregation engine for Discover, Heatmap, and Catchment Scoring

Technical Constraints:
- GCP project: ebc-cloud-dev-03, for all deployed resources (Cloud Run services, Cloud SQL instance, Vertex AI usage, and the project that submits BigQuery jobs)
- BigQuery Data Viewer (or equivalent read access) is granted on the bni-geospatial-845e dataset to the service account used by the backend; BigQuery Job User is granted on ebc-cloud-dev-03 so query jobs run and are billed there
- All BigQuery SQL references the POI table via its fully-qualified path (bni-geospatial-845e.dataset_name.poi_table); no assumption that the table lives in the same project as the app
- Frontend: Vue 3 (Composition API), deployed to Cloud Run as its own service
- Backend: NestJS, deployed to Cloud Run as its own service, separate Dockerfile from frontend
- Monorepo structure: /frontend and /backend folders, single .specify/ at root governing both
- The existing Cloud SQL for PostgreSQL instance in ebc-cloud-dev-03 is the system of record for transactional data: user_locations, business_type_config, and API response caches (isochrone_cache, site_visit_cache)
- Backend connects to Cloud SQL via the Cloud SQL Auth Proxy (or Unix socket connection from Cloud Run), not a public IP with password-only auth
- Database credentials are never committed to the repository: local development uses a gitignored .env file, deployed environments read credentials from Secret Manager
- Google Cloud auth via Application Default Credentials (ADC) for local dev; no hardcoded API keys committed to the repo

Scope Discipline:
- Favor shipping a working vertical slice of each feature over full edge-case coverage
- Optional enhancements (e.g. "compare radius vs drive-time score side by side") are stretch goals, not requirements, unless core features are already working