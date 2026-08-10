# Feature Specification: Route-Based Accessibility AI Skill

**Feature Branch**: `008-route-accessibility-skill`

**Created**: 2026-08-10

**Status**: Draft

**Input**: User description: "@original-prompt/route-based-accessibility.md"

## Clarifications

### Session 2026-08-10

- Q: How should the isochrone polygon overlay interact with an existing catchment radius circle overlay if both were generated for the same location? → A: Replace the existing radius circle overlay so only 1 spatial boundary layer (the isochrone polygon) is active on the map at a time.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Travel-Time Isochrone Catchment Score (Priority: P1) 🎯 MVP

As an authenticated user, I want to request travel-time accessibility analysis for a saved location or discovery candidate in the AI Chat Assistant Panel (e.g. "Check how accessible my Sudirman branch is within a 10 minute drive") so that I can view a realistic road network isochrone polygon on the map and receive a catchment score based on actual reachable area.

**Why this priority**: Travel-time accessibility analysis using real road networks provides much higher real-world location intelligence than simple Euclidean radius bounds.

**Independent Test**: Can be fully tested by submitting a travel-time accessibility request in chat, observing real-time status updates ("Determining the right action..." → "Calculating travel-time boundary..." → "Analyzing reachable area..."), receiving an AI chat summary with travel-mode isochrone catchment score breakdown, and verifying that a non-circular isochrone polygon renders around the location pin on the shared Google Map.

**Acceptance Scenarios**:

1. **Given** an authenticated user requesting accessibility analysis specifying a location, travel mode, and time threshold (e.g., "Check how accessible my Sudirman branch is within a 10 minute drive"), **Then** the system computes an isochrone boundary using Google Routes API, streams status updates, renders the isochrone polygon overlay on the shared map, and calculates a catchment score using POIs bounded by the polygon.
2. **Given** a user request specifying a location and time threshold but omitting travel mode (e.g., "Check accessibility for Sudirman branch within 10 minutes"), **When** the system processes the request, **Then** it defaults to driving mode (`drive`), explicitly states the `drive` assumption in chat, and completes the calculation and isochrone polygon overlay.
3. **Given** a user request omitting both travel mode and time threshold, **When** the system processes the request, **Then** it defaults to a 10-minute drive (`drive`, `10 minutes`), states these assumptions in chat, and completes the analysis.

---

### User Story 2 - Comparative Radius vs. Isochrone Analysis (Priority: P2)

As a user evaluating site selection quality, I want the AI response to compare the travel-time isochrone score against any previously calculated radius-based score for the same location so that I can understand how road networks and physical barriers impact actual customer reachability.

**Why this priority**: Directly highlights the value of true route-based analysis over simple Euclidean radius bounds for strategic business planning.

**Independent Test**: Can be fully tested by calculating a 2km radius score for Location A, then calculating a 10-minute drive accessibility score for Location A in the same conversation, and verifying that the chat summary explicitly highlights the score difference and variance factors.

**Acceptance Scenarios**:

1. **Given** a location with a previously calculated radius catchment score in the chat thread, **When** the user requests a travel-time accessibility check for the same location, **Then** the AI chat summary highlights the score delta (e.g., "Drive-time score: 76 vs. Radius score: 82") and notes physical network constraints causing the variance.

---

### User Story 3 - Polygon Overlay Lifecycle & Map Integration (Priority: P3)

As a user navigating the map, I want the isochrone polygon overlay to replace or coexist cleanly with radius circles and automatically clear when analyzing a new location so that my map canvas remains uncluttered.

**Why this priority**: Fulfills Constitution Section III (Single Shared Map) and guarantees clean visual overlay lifecycle management.

**Independent Test**: Can be fully tested by generating an isochrone polygon for Location A, then generating an isochrone polygon for Location B, and confirming that Location A's polygon is removed before rendering Location B's polygon.

**Acceptance Scenarios**:

1. **Given** an active isochrone polygon overlay on the map, **When** the user executes a new accessibility analysis for a different location, **Then** the previous polygon is unregistered and removed, ensuring exactly 1 active isochrone polygon overlay exists at a time.
2. **Given** an active isochrone polygon overlay, **When** location markers exist on the map, **Then** the polygon renders as a semi-transparent overlay beneath markers without hiding or removing map pins.

---

### Edge Cases

- What happens if the Google Routes API or isochrone service is temporarily unavailable or returns an error? The system falls back to a travel-time spatial approximation boundary (e.g. 10-minute drive ≈ 5km), notifies the user in chat ("Using estimated travel boundary fallback due to route service response"), and renders the fallback polygon overlay.
- What happens if an extreme travel time threshold is requested (e.g., "within a 120 minute drive")? The system caps the travel time threshold to a maximum of 30 minutes to maintain performance and query cost bounds, explicitly noting the 30-minute cap in chat.
- What happens if no POIs exist inside the computed isochrone polygon? The system displays a baseline score and explicitly advises the user in chat (e.g., "No POIs reachable within a 5-minute walk. Try increasing time to 10 or 15 minutes.").

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST process natural-language route-based accessibility requests referencing a saved location or discovery candidate in the AI Chat Assistant Panel.
- **FR-002**: System MUST stream real-time, human-readable status updates over SSE during execution ("Determining the right action...", "Calculating travel-time boundary...", "Analyzing reachable area...").
- **FR-003**: System MUST support three travel modes: driving (`drive`), walking (`walk`), and public transit (`transit`), defaulting to `drive` if unspecified.
- **FR-004**: System MUST apply a 10-minute default time threshold if unspecified, and cap maximum allowed travel time thresholds to 30 minutes.
- **FR-005**: System MUST compute a non-circular isochrone polygon representing the actual reachable boundary for the specified travel mode and duration around the location's coordinates.
- **FR-006**: System MUST reuse the canonical 6-factor Catchment Scoring engine (Demand Density, Traffic Proxy, Area Quality, Competition Penalty, Network Saturation, Operational Vitality), restricting BigQuery POI queries spatially inside the computed isochrone polygon while enforcing `regency_code` / `province_code` partition filters.
- **FR-007**: System MUST render the computed isochrone polygon as a semi-transparent vector overlay on the single shared Google Map instance.
- **FR-008**: System MUST compare the resulting travel-time score against any previously calculated radius catchment score for the same location in the chat session, noting meaningful variances.
- **FR-009**: System MUST replace any previously active radius circle or isochrone polygon overlay when a new accessibility analysis is executed, strictly maintaining 0 or 1 active spatial boundary overlay on the map.

### Key Entities

- **Accessibility Analysis Request**: Represents a travel-time session (`id`, `locationId`, `travelMode` ['drive'|'walk'|'transit'], `timeMinutes` [1..30], `createdAt`).
- **Isochrone Polygon**: Represents the calculated spatial boundary (`polygonId`, `locationId`, `coordinates` [{lat, lng}...], `travelMode`, `timeMinutes`).
- **Route Catchment Score Result**: Represents the catchment evaluation bounded by the isochrone polygon (`compositeScore`, `subScores`, `poiCount`, `radiusScoreDelta`, `summary`).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Isochrone calculation, BigQuery spatial polygon POI filtering, and map polygon overlay rendering complete within 4 seconds of request submission.
- **SC-002**: 100% of rendered isochrone overlays accurately reflect actual road/network constraints for the selected travel mode.
- **SC-003**: 100% of route-based accessibility analyses reuse the canonical 6-factor catchment scoring logic without duplicating scoring code.
- **SC-004**: 100% of BigQuery spatial queries enforce `regency_code` / `province_code` partition filters to control query execution costs.

## Assumptions

- **Shared Catchment Scoring Engine**: Route-based accessibility reuses the 6-factor catchment scoring service developed in Feature 007 (`DiscoveryService.calculateCatchmentScore`).
- **Map Polygon Overlay**: Rendered using the official Google Maps JS API (`google.maps.Polygon` in `google-map.service.ts`).
- **Out of Scope**: Multi-modal comparisons in a single prompt (e.g. "compare drive vs walk at same time") and time-of-day traffic scenario comparisons (rush hour vs off-peak) are explicitly out of scope for this feature.
