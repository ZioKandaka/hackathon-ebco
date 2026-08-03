# Feature Specification: Location Discovery AI Skill

**Feature Branch**: `005-location-discovery-skill`

**Created**: 2026-08-03

**Status**: Draft

**Input**: User description: "@original-prompt/location-discovery.md"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Conversational Candidate Spot Discovery (Priority: P1) 🎯 MVP

As an authenticated user, I want to ask the AI assistant for candidate business locations in a target region (e.g., "Find top 5 spots for a coffee shop in Kediri") so that I can discover optimal spots based on demand density and low competition.

**Why this priority**: "Discover" is a core value-driver of the location intelligence platform, enabling data-backed site selection without manual geographic analysis.

**Independent Test**: Can be fully tested by submitting a location discovery prompt in the AI chat panel, observing live status updates, receiving a ranked list of candidate spots with natural-language scoring justifications, and confirming candidate pins appear on the shared Google Map.

**Acceptance Scenarios**:

1. **Given** an authenticated user in the chat panel, **When** they request candidate locations specifying business type and region (e.g., "Find top 5 spots to open a coffee shop in Kediri"), **Then** the system queries POI datasets, streams real-time status updates, and returns a ranked list of candidate locations in chat with scoring rationale.
2. **Given** a generated discovery response, **When** the candidate spots render, **Then** distinct numbered candidate pins appear on the single shared Google Map corresponding to the ranked chat results.
3. **Given** a discovery prompt missing business type or target region (e.g., "Find me good spots"), **When** the AI receives the request, **Then** the AI asks a short clarifying question in chat to gather the missing business type or region instead of guessing.

---

### User Story 2 - Interactive Candidate Inspection & Detail Querying (Priority: P2)

As a user reviewing discovery results, I want to click a candidate pin on the map or ask about a specific spot in chat so that I can inspect its underlying demand and competition metrics in detail.

**Why this priority**: Allows users to drill down into specific candidate locations for deeper spatial analysis.

**Independent Test**: Can be fully tested by clicking a candidate pin on the map (or typing "tell me more about spot 2" in chat) and verifying that a detailed metrics breakdown (surrounding POI counts, competition distance, demand score) appears in the chat or pin popup.

**Acceptance Scenarios**:

1. **Given** candidate pins rendered on the map, **When** the user clicks on a candidate pin, **Then** the map centers on the spot and displays an info window or triggers a detailed summary in the chat panel.
2. **Given** candidate spots listed in chat, **When** the user types a follow-up query referencing a candidate (e.g., "Tell me more about spot 2"), **Then** the AI provides detailed spatial metrics for that candidate.

---

### User Story 3 - Radius-Based Demand & Competition Analysis (Priority: P3)

As a business analyst, I want candidate rankings to be computed strictly based on surrounding demand POIs and same-type competition within a radius so that discovery results reflect true local market dynamics.

**Why this priority**: Guarantees that discovery recommendations rely on objective geospatial POI density scoring.

**Independent Test**: Can be fully tested by submitting requests for different business types (e.g., coffee shop vs. minimarket) in the same region, confirming that demand POI categories adapt appropriately (e.g., schools/offices for coffee shops vs. residential for minimarkets).

**Acceptance Scenarios**:

1. **Given** a target business type, **When** the discovery query executes against BigQuery POI datasets, **Then** the scoring algorithm evaluates high-demand POIs and penalizes nearby same-category competitor POIs within the search radius.
2. **Given** a target region query, **When** BigQuery is executed, **Then** the query enforces region bounding/partition filters (e.g., regency code or province code) to optimize query execution and control cloud costs.

---

### Edge Cases

- What happens if no valid candidates meet the minimum viability score threshold in a region? The AI informs the user in plain language (e.g., "No strong candidate spots found matching low-competition criteria in [Region]. Try broadening the target area.") rather than returning empty pins.
- How does the system handle vague or non-existent region names? The AI asks for clarification (e.g., "Could you specify the city or regency name for your search?") without failing silently.
- What happens if the BigQuery query execution times out or fails? The system catches the error and streams a plain-language error message in chat (e.g., "Couldn't fetch location data for that region — please try again.") without crashing the application.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST process natural-language location discovery prompts through the AI Chat Assistant Panel.
- **FR-002**: System MUST stream real-time, human-readable status updates (e.g., "Determining the right action...", "Analyzing candidate areas...", "Ranking results...") over the SSE stream during discovery processing.
- **FR-003**: System MUST prompt for missing business type or target region parameters via a short clarifying question in chat.
- **FR-004**: System MUST query BigQuery POI datasets in `bni-geospatial-845e` using fully-qualified table paths and region partition/bounding filters (`regency_code` or `province_code`) per Constitution Section IV.
- **FR-005**: System MUST evaluate candidate spots using radius-based demand POI density, same-category competition density, and operational vitality.
- **FR-006**: System MUST return a ranked list (default top 5) of candidate locations in chat, accompanied by a natural-language explanation of why each spot scored well.
- **FR-007**: System MUST render candidate spots as distinct numbered pins on the single shared Google Map instance without re-initializing duplicate map instances.
- **FR-008**: System MUST support candidate detail inspection when a user clicks a candidate pin on the map or references a spot by rank in chat (e.g., "tell me more about spot 2").
- **FR-009**: System MUST display user-readable error messages for region lookups with no viable candidates or query timeouts.

### Key Entities

- **Discovery Query**: Represents a user's location search request. Attributes include user ID, target business type, target region/regency, search radius, and timestamp.
- **Candidate Location Spot**: Represents a ranked potential business spot. Attributes include rank position, latitude, longitude, demand score, competition density, and natural-language rationale text.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Discovery queries execute and stream ranked results with map pins rendered within 3 seconds of user submission.
- **SC-002**: 100% of BigQuery queries enforce regency/province code partition filters to control query execution costs billed to `ebc-cloud-dev-03`.
- **SC-003**: 100% of candidate spots render simultaneously in chat and as distinct pins on the single shared Google Map instance.
- **SC-004**: 100% of vague or incomplete prompts trigger clarifying questions instead of silent failures or arbitrary guesses.

## Assumptions

- **BigQuery Data Access**: The backend service account holds BigQuery Data Viewer permissions on dataset `bni-geospatial-845e` and Job User access on `ebc-cloud-dev-03`.
- **Search Radius Strategy**: Radius-based POI density scoring is used for site discovery (drive-time/isochrone accessibility is a separate feature).
- **Default Result Count**: Top 5 candidate spots are returned per discovery request unless specified otherwise.
- **Out of Scope**: Automatically saving a discovered candidate as a registered branch (follow-up action using Add Branch skill), multi-region comparison in a single query, and drive-time/route-based discovery are explicitly out of scope for this spec.
