# Phase 0 Research: Add Business/Branch AI Skill

## 1. Natural Language Intent & Multi-Turn Dialogue Management

- **Decision**: Multi-turn dialogue state machine within NestJS `AddBranchSkillService`.
- **Rationale**: User registration via chat requires maintaining conversational context across status turns (e.g., state `IDLE` -> `PARSED` -> `WAITING_FOR_NAME` -> `CONFIRMING_GELEOCATING_CANDIDATE` -> `COMPLETED`).
- Alternatives Considered:
  - Single-shot prompt parser: Fails when user prompt is missing business type or name (FR-004).

## 2. Address Geocoding & Administrative Breakdown

- **Decision**: NestJS backend service calling Google Geocoding API (`https://maps.googleapis.com/maps/api/geocode/json`).
- **Rationale**: Resolves input address string to precise latitude/longitude coordinates and extracts normalized administrative components (`administrative_area_level_1` as province, `administrative_area_level_2` as regency/city, `administrative_area_level_3` as sub-district, `postal_code`).
- **Alternatives Considered**:
  - Frontend client-side geocoding: Risks exposing server API keys and fails to validate data prior to database insertion.

## 3. Database Schema & System of Record Alignment

- **Decision**: TypeORM `UserLocation` entity mapped to the `user_locations` table in Cloud SQL PostgreSQL (`ebc-cloud-dev-03`).
- **Rationale**: Directly aligns with Constitution Section IV (System of Record). Indexed on `user_id` to guarantee multi-tenant data isolation and O(1) query lookups for "My Locations".
- **Alternatives Considered**:
  - Document/NoSQL store: Violates Constitution mandate identifying PostgreSQL as the transactional system of record.

## 4. Shared Map Pin Placement & Real-Time Sync

- **Decision**: Pinia `useLocationsStore` holding user locations; calls `useGoogleMap().addMarker(location.id, { position: { lat, lng }, title: name })` upon successful creation.
- **Rationale**: Immediately renders the new branch as a pin on the single shared Google Map instance (`003-base-map-component`) and updates the "My Locations" list view (`MyLocationsView.vue`) without page reloads.
- **Alternatives Considered**:
  - Full page reload: Disruptive to user chat context and violates SPA responsiveness goals.
