# Phase 0 Research: Location Discovery AI Skill

## 1. BigQuery POI Dataset Querying

- **Decision**: `@google-cloud/bigquery` client in NestJS `BigQueryDiscoveryService`.
- **Rationale**: Executes SQL queries against fully-qualified tables in `bni-geospatial-845e.bni_geospatial_gold_zone.obt_poi_gold`. References exact canonical column names (`poi_type`, `latitude`, `longitude`) and enforces mandatory parenthesized `(regency_code / province_code / regency / province)` region filters to prevent full table scans and control execution costs billed to `ebc-cloud-dev-03` per Constitution Section IV.
- **Alternatives Considered**:
  - Unpartitioned spatial queries: Prohibited by Constitution Principle IV (Query Scoping).

## 2. Density & Competition Scoring Model

- **Decision**: Radius-based POI aggregation (`ST_DWITHIN` or grid-based spatial aggregation) calculating:
  - `Demand POI Density`: Count of complementary POIs (schools, offices, transport hubs) within 1km.
  - `Competitor POI Density`: Count of same-category POIs within 1km.
  - `Scoring Rationale`: Natural-language text generation summarizing top density factors (e.g., "High school density, zero same-type competitors within 1km").
- **Rationale**: Direct, explainable spatial scoring model matching user discovery expectations.
- **Alternatives Considered**:
  - Complex ML model: Over-engineered for v1 MVP; deterministic spatial SQL scoring provides immediate, explainable results.

## 3. Local Development Fallback Engine

- **Decision**: Heuristic mock discovery generator in `DiscoveryService` when BigQuery credentials or GCP ADC are unavailable.
- **Rationale**: Guarantees zero local development blockers when testing frontend map pin rendering and SSE streaming.

## 4. Map Pin Synchronization & Interaction

- **Decision**: Render numbered markers (`1`, `2`, `3`, `4`, `5`) on the single shared Google Map instance via `useGoogleMap().addMarker(...)`. Pin `onClick` triggers detailed metric cards.
- **Rationale**: Fulfills Constitution Section III (Single Shared Map) and FR-007 / FR-008.
