# Feature Specification: Catchment Score AI Skill

**Feature Branch**: `007-catchment-score-skill`

**Created**: 2026-08-10

**Status**: Draft

**Input**: User description: "@original-prompt/catchment-scoring.md"

## Clarifications

### Session 2026-08-10

- Q: How should the system determine Network Saturation when calculating the catchment sub-score for a user's location? → A: Apply a progressive penalty if same-brand or same-category POIs exceed a threshold within the radius (e.g. >2 branches within 2km).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Location Catchment Score Calculation (Priority: P1) 🎯 MVP

As an authenticated user, I want to request a catchment score analysis for one of my saved business locations in the AI Chat Assistant Panel (e.g. "Analyze the catchment for my Sudirman branch within 2km") so that I can see an overall composite score (0-100) and sub-score breakdown based on spatial POI data within a circular radius overlay on the map.

**Why this priority**: Catchment score calculation for a saved business branch is the primary location performance evaluation flow for location intelligence users.

**Independent Test**: Can be fully tested by submitting a catchment score request for a registered location in chat, observing real-time status updates, receiving an AI chat summary with overall score (0-100) and sub-scores, and verifying that a circular radius overlay renders around the location pin on the shared Google Map.

**Acceptance Scenarios**:

1. **Given** an authenticated user with registered locations in the chat panel, **When** they type a request for catchment analysis by location name and radius (e.g., "Analyze the catchment for my Sudirman branch within 2km"), **Then** the system queries BigQuery POIs within 2km, streams status updates ("Determining the right action..." → "Gathering nearby location data..." → "Calculating catchment score..."), displays the composite score and sub-score breakdown in chat, and overlays a 2km radius circle around the location pin on the shared map.
2. **Given** an authenticated user requesting catchment analysis without specifying a radius (e.g., "Analyze catchment for my Sudirman branch"), **When** the system processes the request, **Then** it applies a default 2km radius, explicitly states the 2km assumption in the chat response, and renders a 2km radius circle overlay on the map.
3. **Given** an authenticated user submitting a catchment request for a location name that does not exist in their saved locations list, **When** the system evaluates the request, **Then** it returns a helpful notification in chat listing their available registered location names.

---

### User Story 2 - Parameter Adjustment & Dynamic Recalculation (Priority: P2)

As a user evaluating location performance under custom scenarios, I want to request adjustments to the analysis radius or sub-score weights in the same chat conversation (e.g. "ignore competition density" or "change radius to 3km") so that I can immediately receive a recalculated score and updated map circle without starting over.

**Why this priority**: Enables flexible scenario planning and sensitivity analysis for strategic site evaluation.

**Independent Test**: Can be fully tested by submitting a follow-up parameter adjustment request in the same chat thread, verifying that sub-score weights or radius update dynamically, the map circle resizes to match the new radius, and an updated composite score is delivered.

**Acceptance Scenarios**:

1. **Given** an active catchment score result in chat, **When** the user requests a radius change (e.g., "change radius to 3km"), **Then** the system recalculates POI aggregations for 3km, updates the composite score and sub-scores in chat, and resizes the circular overlay on the map to 3km.
2. **Given** an active catchment score result, **When** the user requests a sub-score weight adjustment (e.g., "ignore competition density" or "weight demand density higher"), **Then** the system recalculates the composite score based on the adjusted weighting rules and presents the updated score breakdown in chat.

---

### User Story 3 - Visual Radius Lifecycle & Map Layer Integration (Priority: P3)

As a user navigating the map, I want the catchment radius circle overlay to coexist cleanly with existing location markers and automatically update or clear when switching locations so that my map view stays uncluttered.

**Why this priority**: Fulfills Constitution Section III (Single Shared Map) and guarantees clean visual layer lifecycle management.

**Independent Test**: Can be fully tested by generating catchment scores for two consecutive locations, confirming that the first radius circle is removed before rendering the second circle, and verifying that location pins remain interactive and visible.

**Acceptance Scenarios**:

1. **Given** an active catchment radius circle overlay on the map, **When** the user executes a catchment analysis for a different location, **Then** the previous radius circle is unregistered and removed, ensuring exactly one active catchment radius circle exists at a time.
2. **Given** an active catchment radius circle, **When** location markers exist on the map, **Then** the circle renders as a semi-transparent overlay beneath markers without hiding or removing map pins.

---

### Edge Cases

- What happens if zero POIs exist within the specified radius around the location? The system displays a composite score based on baseline defaults and explicitly notifies the user in chat (e.g., "No POIs found within 2km of this location. Try expanding the radius to 3km or 5km.") without throwing exceptions or rendering an invalid overlay.
- What happens if a user provides an extremely large radius (e.g., "within 50km")? The system caps the maximum radius to 10km to maintain performance and query cost bounds, explicitly stating the 10km cap in the chat response.
- What happens if a user submits a catchment score request while not logged in or with no saved locations? The chat panel prompts the user to register or save at least one business location first.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST process natural-language catchment score requests referencing a user's saved location name through the AI Chat Assistant Panel.
- **FR-002**: System MUST stream real-time, human-readable status updates over SSE during execution ("Determining the right action...", "Gathering nearby location data...", "Calculating catchment score...").
- **FR-003**: System MUST apply a 2km default radius if no radius is specified by the user and explicitly state this assumption in the chat response message.
- **FR-004**: System MUST query BigQuery POI datasets around the location's coordinates (`latitude`, `longitude`) up to a maximum radius of 10km, enforcing mandatory `regency_code` / `province_code` partition filters.
- **FR-005**: System MUST calculate an overall composite score (0-100) from 6 weighted sub-scores: Demand Density, Traffic Proxy (aggregate rating counts), Area Quality (average rating), Competition Density (penalty), Network Saturation (progressive penalty when >2 same-brand/category branches exist within radius), and Operational Vitality (% operating POIs).
- **FR-006**: System MUST return a chat response detailing the overall composite score (0-100) and an itemized breakdown for each of the 6 sub-scores.
- **FR-007**: System MUST render a circular overlay on the single shared Google Map instance centered at the location's coordinates with a radius matching the analyzed distance.
- **FR-008**: System MUST allow users to adjust radius or sub-score weights in follow-up chat messages within the same conversation and return recalculated scores and updated map overlays.
- **FR-009**: System MUST replace any previously rendered catchment circle overlay upon generating a new catchment request, strictly maintaining 0 or 1 active catchment circle overlay on the map at all times.

### Key Entities

- **Registered Location**: Represents a user's saved business branch. Key attributes include `id`, `userId`, `name`, `businessType`, `latitude`, `longitude`, `fullAddress`, `regencyCode`, `provinceCode`.
- **Catchment Analysis Request**: Represents a user's catchment score session. Key attributes include `id`, `locationId`, `radiusKm` (0.1 to 10.0), `subScoreWeights` (object mapping 6 sub-scores to weights), `createdAt`.
- **Catchment Score Result**: Represents the calculated composite score and sub-scores. Key attributes include `compositeScore` (0-100), `demandDensityScore`, `trafficProxyScore`, `areaQualityScore`, `competitionPenaltyScore`, `networkSaturationScore`, `operationalVitalityScore`, `poiCount`, `summaryText`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Catchment score queries execute, calculate 6 sub-scores, and render the map radius circle within 3 seconds of submission.
- **SC-002**: 100% of catchment requests display a complete breakdown of all 6 sub-scores alongside the overall composite score.
- **SC-003**: 100% of catchment circle overlays accurately reflect the requested radius in meters centered on the target location pin.
- **SC-004**: 100% of BigQuery spatial queries enforce `regency_code` / `province_code` partition filters to control query execution costs billed to `ebc-cloud-dev-03`.

## Assumptions

- **Registered Location Prerequisites**: Catchment analysis requires the user to have at least one registered location saved in their profile.
- **Map Overlay Renderer**: Uses the official Google Maps JS API (`google.maps.Circle` or `google-map.service.ts` layer manager) for rendering radius boundaries on the shared map.
- **Out of Scope**: Comparing catchment scores across multiple locations side by side in one view, historical score tracking over time, and route-based (drive-time/isochrone) catchment boundaries are explicitly out of scope for this feature.
