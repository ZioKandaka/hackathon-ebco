# Feature Specification: Heatmap Visualization AI Skill

**Feature Branch**: `006-heatmap-visualization-skill`

**Created**: 2026-08-03

**Status**: Draft

**Input**: User description: "@original-prompt/heatmap-visualization.md"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Business-Based Opportunity Density Heatmap (Priority: P1) 🎯 MVP

As an authenticated user, I want to request a heatmap for my business type in the AI Chat Assistant Panel (e.g., "Show me a heatmap for my minimarket business") so that I can visually identify high-demand, low-competition regions on the map.

**Why this priority**: Business-based heatmap density visualization is the primary spatial market analysis flow for registered location intelligence users.

**Independent Test**: Can be fully tested by submitting a business-based heatmap request in the chat panel, observing real-time status updates, receiving an AI summary in chat, and verifying that a color-coded heatmap density layer renders on the shared Google Map.

**Acceptance Scenarios**:

1. **Given** an authenticated user in the chat panel, **When** they type a request for a business-based heatmap (e.g., "Show me a heatmap for my minimarket business in Kediri"), **Then** the system queries POI datasets, streams status updates ("Determining the right action..." → "Aggregating location data..." → "Rendering heatmap..."), and overlays a weighted heatmap layer on the shared Google Map.
2. **Given** an active heatmap layer rendering on the map, **When** location pins (from saved branches or discovery results) are already present, **Then** the heatmap renders underneath/alongside pins without hiding, moving, or removing existing map pins.
3. **Given** a generated heatmap layer, **When** the AI responds in chat, **Then** the message provides a concise explanation of what the color intensity represents (e.g., "Darker red areas indicate high minimarket demand with low direct competition").

---

### User Story 2 - Exploratory Custom Prompt Heatmap (Priority: P2)

As a user exploring market dynamics, I want to request a custom exploratory heatmap (e.g., "Show me a heatmap of preschools with rating below 4.0") so that I can analyze arbitrary spatial attributes beyond standard business categories.

**Why this priority**: Enables flexible, ad-hoc spatial data exploration for specialized market research queries.

**Independent Test**: Can be fully tested by submitting a custom exploratory prompt (e.g. rating-filtered POIs), verifying BigQuery SQL aggregation, and confirming the custom heatmap layer overlays the target geographic area with an explanatory chat summary.

**Acceptance Scenarios**:

1. **Given** an authenticated user submitting a custom exploratory prompt (e.g., "Show me a heatmap of preschools with rating below 4.0 that are still operational"), **When** the backend interprets the intent, **Then** it executes a filtered BigQuery POI aggregation and renders the resulting weighted heatmap data on the shared map instance.
2. **Given** an existing active heatmap layer on the map, **When** the user submits a new heatmap request, **Then** the previous heatmap layer is completely removed and replaced by the new heatmap layer instead of stacking layers indefinitely.

---

### User Story 3 - Layer Coexistence & Single-Layer Replacement (Priority: P3)

As a user navigating the map, I want new heatmap requests to automatically replace previous heatmaps while coexisting cleanly with location markers so that my map view remains clear and un-cluttered.

**Why this priority**: Fulfills Constitution Section III (Single Shared Map) and guarantees clean visual layer lifecycle management.

**Independent Test**: Can be fully tested by generating two consecutive heatmaps, confirming that only the latest heatmap layer is rendered, and verifying that location pins remain interactive and visible on top of the heatmap layer.

**Acceptance Scenarios**:

1. **Given** an active heatmap layer on the map, **When** the user executes a second heatmap request, **Then** the first heatmap layer is unregistered and destroyed, ensuring exactly one active heatmap layer exists at a time.
2. **Given** an active heatmap layer, **When** the user toggles views or pans/zooms the map, **Then** the heatmap layer adapts its gradient and intensity dynamically across the viewport.

---

### Edge Cases

- What happens if a heatmap query returns zero matching data points in BigQuery? The system displays a plain-language notification in chat (e.g., "No POI data points found matching criteria in [Region]. Try broadening your filter.") without throwing exceptions or rendering a blank layer.
- How does the heatmap handle extreme data point density variations? The heatmap layer uses automatic intensity scaling and a standardized color gradient (e.g. blue to red) to maintain clear visual contrast at all zoom levels.
- What happens if a user submits a heatmap request while offline or during database disconnect? The chat streams a user-friendly error message detailing the connectivity failure.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST process natural-language heatmap requests (both Mode A business-based and Mode B custom exploratory prompts) through the AI Chat Assistant Panel.
- **FR-002**: System MUST stream real-time, human-readable status updates ("Determining the right action...", "Aggregating location data...", "Rendering heatmap...") over the SSE connection during execution.
- **FR-003**: System MUST execute BigQuery POI dataset aggregations using exact canonical column names (`poi_type`, `latitude`, `longitude`, `rating`, `business_status`, `regency_code`, `province_code`) and mandatory region partition filters per Constitution Section IV.
- **FR-004**: System MUST calculate weighted geographic data points for Mode A business-based heatmaps (demand POI density minus direct competitor density) and Mode B custom prompts.
- **FR-005**: System MUST render the heatmap as a layer on the single shared Google Map instance using the Google Maps Visualization library (`google.maps.visualization.HeatmapLayer`).
- **FR-006**: System MUST ensure heatmap layers render coexistent with existing location pins without removing, replacing, or obscuring map markers.
- **FR-007**: System MUST replace any previously active heatmap layer upon generating a new heatmap request, strictly preventing multiple heatmap layers from stacking indefinitely.
- **FR-008**: System MUST return a concise summary message in chat explaining the color intensity and criteria represented by the generated heatmap.

### Key Entities

- **Heatmap Query**: Represents a user's heatmap request. Attributes include mode (`business_based` or `custom_prompt`), business type, target region, attribute filters (e.g., rating, operational status), and timestamp.
- **Heatmap Data Point**: Represents a weighted geographic coordinate (`latitude`, `longitude`, `weight`) emitted to the Google Maps Visualization layer.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Heatmap queries execute and render visual density layers on the map within 3 seconds of user submission.
- **SC-002**: 100% of new heatmap requests successfully replace any previously active heatmap layer, maintaining exactly 0 or 1 active heatmap layer on the map at all times.
- **SC-003**: 100% of BigQuery heatmap aggregations enforce `regency_code` / `province_code` partition filters to control query execution costs billed to `ebc-cloud-dev-03`.
- **SC-004**: Heatmap layer rendering preserves 100% visibility and clickability of existing location pins on the shared Google Map.

## Assumptions

- **Map Visualization Library**: Uses the official Google Maps Visualization library (`visualization` library in Google Maps JS API) for client-side heatmap rendering.
- **BigQuery Schema**: Queries reference exact canonical column names (`poi_type`, `latitude`, `longitude`, `rating`, `business_status`, `regency_code`) in dataset `bni-geospatial-845e.bni_geospatial_gold_zone.obt_poi_gold`.
- **Out of Scope**: Time-based/historical heatmaps (current snapshot only), exporting raw heatmap point data, and combining multiple distinct heatmap criteria into a single stacked layer are explicitly out of scope for this spec.
