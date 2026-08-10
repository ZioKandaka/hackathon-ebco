# Feature Specification: AI Site Visit AI Skill

**Feature Branch**: `009-ai-site-visit-skill`

**Created**: 2026-08-10

**Status**: Draft

**Input**: User description: "@original-prompt/ai-site-visit.md"

## Clarifications

### Session 2026-08-10

- Q: How should the 5 qualitative site visit criteria be represented in the overall visual score? → A: Weighted 0-100 composite score prioritizing commercial viability factors (Storefront Visibility 30%, Access 25%, Traffic 20%, Buildings 15%, Condition 10%).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Multimodal Street View & Satellite Visual Assessment (Priority: P1) 🎯 MVP

As an authenticated user, I want to request an AI site visit for a saved location or discovery candidate in the AI Chat Assistant Panel (e.g. "Do an AI site visit on my Sudirman branch" or "What does spot 1 look like?") so that I can see street-level and satellite imagery alongside a qualitative visual assessment scored across key physical criteria.

**Why this priority**: Qualitatively inspecting site visibility, road access, traffic, and surrounding buildings without physical travel provides critical ground-truth context for location selection.

**Independent Test**: Can be fully tested by submitting an AI site visit request for a location in chat, observing live status updates ("Determining the right action..." → "Fetching street-level imagery..." → "Analyzing the site visually..."), viewing 4-heading Street View images (0°, 90°, 180°, 270°) and 1 satellite image in chat, and reviewing structured qualitative scores (Storefront Visibility, Traffic Visibility, Road Width, Building Types, General Area Condition).

**Acceptance Scenarios**:

1. **Given** an authenticated user requesting a visual check for a saved location or candidate spot, **Then** the system fetches 4 Street View static images (headings 0°, 90°, 180°, 270°) and 1 satellite image, streams progress updates, analyzes them via multimodal vision AI, and renders the image gallery alongside a structured score breakdown in chat.
2. **Given** a location with an existing numeric Catchment Score, **When** an AI site visit is completed, **Then** the visual assessment results associate with the location card as a complementary qualitative report alongside the numeric score.

---

### User Story 2 - Satellite-Only Coverage Fallback (Priority: P2)

As a user inspecting a location in an area without Street View coverage, I want the system to gracefully inform me in chat and fall back to a satellite-imagery-only visual assessment so that I still receive valuable visual insights without errors or blank output.

**Why this priority**: Guarantees resilience and smooth user experience across remote or newly developed regions lacking Street View metadata.

**Independent Test**: Can be fully tested by requesting a site visit for coordinates lacking Street View coverage, verifying a polite chat notice ("No Street View coverage found at this location; performing satellite-only visual analysis"), and confirming a satellite-based visual assessment is delivered with satellite imagery.

**Acceptance Scenarios**:

1. **Given** a location without Street View coverage, **When** the AI site visit is requested, **Then** the system detects missing coverage, notifies the user in chat, fetches the satellite image snapshot, and returns a satellite-focused visual assessment report.

---

### User Story 3 - Interactive Image Gallery & Map Pin Center (Priority: P3)

As a user reviewing site visit imagery, I want to click or expand the Street View and satellite images in the chat panel and see the map view center on the analyzed location so that I can visually inspect the location in full context.

**Why this priority**: Enhances map-chat synergy and user inspection experience.

**Independent Test**: Can be fully tested by clicking a Street View thumbnail in chat, verifying image lightbox/modal expansion, and confirming the shared Google Map pans/zooms to center on the target location pin.

**Acceptance Scenarios**:

1. **Given** an AI site visit response in chat with image thumbnails, **When** the user clicks an image thumbnail, **Then** a lightbox modal opens displaying high-resolution imagery and heading details.
2. **Given** an active AI site visit response, **When** rendered, **Then** the shared map centers and zooms on the target location's coordinates.

---

### Edge Cases

- What happens if Gemini vision API fails or times out? The system displays the fetched Street View and satellite images in chat with a fallback notice: "Imagery fetched successfully, but AI visual analysis timed out. Displaying raw site photos."
- What happens if the user references an ambiguous location name ("What does spot look like?")? The AI chat panel asks the user to specify which location or candidate spot number they want to inspect.
- What happens if both Street View AND satellite imagery fail to load? The system displays a polite error message in chat advising the user to check coordinates or try another location.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST process natural-language AI site visit requests referencing a saved location name or discovery candidate spot number in the AI Chat Assistant Panel.
- **FR-002**: System MUST stream real-time, human-readable status updates over SSE during execution ("Determining the right action...", "Fetching street-level imagery...", "Analyzing the site visually...").
- **FR-003**: System MUST fetch 4 Street View static images corresponding to cardinal headings (0° North, 90° East, 180° South, 270° West) plus 1 overhead satellite snapshot around the target location's coordinates.
- **FR-004**: System MUST perform multimodal vision analysis on the fetched images assessing 5 qualitative criteria: Storefront Visibility, Foot/Vehicle Traffic Visibility, Road Width & Access, Surrounding Building Types, and General Area Condition.
- **FR-005**: System MUST return structured qualitative output including a 0-100 overall visual rating (weighted: Storefront Visibility 30%, Road Access 25%, Traffic 20%, Buildings 15%, Condition 10%) and short justification for each evaluated criterion alongside image thumbnails in chat.
- **FR-006**: System MUST detect when Street View coverage is unavailable at target coordinates, inform the user in chat, and fall back to performing a satellite-imagery-only visual assessment.
- **FR-007**: System MUST associate the visual assessment with the same location card as any existing numeric Catchment Score, presenting it as a complementary report.
- **FR-008**: System MUST center and zoom the shared Google Map instance on the analyzed location's coordinates upon rendering the site visit response.

### Key Entities

- **Site Visit Request**: Represents a visual inspection session (`id`, `locationId` / `candidateName`, `latitude`, `longitude`, `createdAt`).
- **Site Visit Image Set**: Represents fetched imagery (`streetViewNorthUrl`, `streetViewEastUrl`, `streetViewSouthUrl`, `streetViewWestUrl`, `satelliteUrl`, `hasStreetViewCoverage`).
- **Visual Assessment Report**: Represents multimodal vision analysis (`overallVisualScore` [0-100], `storefrontVisibility`, `trafficVisibility`, `roadWidthAccess`, `buildingTypes`, `areaCondition`, `summary`).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Image fetching, multimodal vision analysis, and chat rendering complete within 5 seconds of request submission.
- **SC-002**: 100% of locations lacking Street View coverage deliver a satellite-only visual assessment without blank outputs or server errors.
- **SC-003**: 100% of successful AI site visit reports display 4-heading Street View thumbnails (when available) plus 1 satellite image alongside structured criteria justification scores.
- **SC-004**: Visual assessments present as a complementary companion to numeric Catchment Scores without overwriting numeric metrics.

## Assumptions

- **Multimodal Vision Model**: Reuses Vertex AI Gemini 1.5 Flash multimodal vision capabilities or static fallback vision analyzer for analyzing image buffers.
- **Static Map & Street View APIs**: Uses official Google Maps Street View Static API and Static Maps API endpoints or static image proxies.
- **Out of Scope**: Video walkthroughs, 360° interactive panorama controls, multi-site visual side-by-side comparisons in a single prompt, and automatic caching/reusing prior site visit results without re-requesting are explicitly out of scope for this feature.
