# Feature Specification: Base Map Component

**Feature Branch**: `003-base-map-component`

**Created**: 2026-08-03

**Status**: Draft

**Input**: User description: "@original-prompt/base-map.md"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Full-Viewport Interactive Base Map (Priority: P1) 🎯 MVP

As an authenticated user navigating any view in the location intelligence app, I want to see a responsive Google Map occupying the full main viewport so that I can visually interact with geospatial data.

**Why this priority**: The map component is the primary visual surface and foundational canvas for all spatial features (pins, heatmaps, catchment scores, routes) in the application.

**Independent Test**: Can be fully tested by logging into the app, observing the full-screen Google Map render immediately, and verifying that standard navigation controls (pan, zoom, map/satellite toggle) function smoothly.

**Acceptance Scenarios**:

1. **Given** an authenticated user loading any main page in the app, **When** the page renders, **Then** an interactive Google Map initializes and occupies the full main content viewport (100% width and height).
2. **Given** the active map, **When** the user pans, zooms, or toggles map controls, **Then** the map smoothly updates its viewport bounds and zoom level.
3. **Given** a change in browser window dimensions or floating panel toggles, **When** the window is resized, **Then** the map canvas automatically triggers a resize update and maintains smooth viewport rendering.

---

### User Story 2 - Default Location & Geolocation Centering (Priority: P2)

As a user opening the application, I want the base map to center intelligently on a sensible default region or my current location so that I immediately see a relevant geographic perspective.

**Why this priority**: Improves initial user orientation and context upon opening the location intelligence platform.

**Independent Test**: Can be fully tested by opening the app with browser geolocation enabled (observing map center on user location), or with geolocation denied/unavailable (observing map center on default region, e.g. Greater Jakarta / West Java).

**Acceptance Scenarios**:

1. **Given** a user granting browser geolocation permission, **When** the base map initializes, **Then** the map automatically centers on the user's current geographic coordinates.
2. **Given** a user denying geolocation permission or profile region unset, **When** the base map initializes, **Then** the map defaults its center to the primary target region (e.g., Greater Jakarta / West Java bounds) at an appropriate default zoom level.

---

### User Story 3 - Shared Map Layer Contract & Resilience (Priority: P3)

As a developer and system component, I want a single shared map instance with a clean layer management interface so that downstream features (location pins, heatmap layers, isochrone polygons) can add and remove visual elements without initializing separate map instances.

**Why this priority**: Fulfills Constitution Principle III (Single Shared Map) ensuring all spatial features coexist on a single canvas without conflicting instances.

**Independent Test**: Can be fully tested by verifying that external layer management methods (add/remove marker, add/remove polygon layer) interact cleanly with the single map instance without creating duplicate map initializations.

**Acceptance Scenarios**:

1. **Given** downstream feature components (e.g., Discover, Heatmap, My Locations), **When** they render spatial data, **Then** they register their visual overlays (markers, polygons, heatmap layers) directly onto the single shared base map instance.
2. **Given** a failure during Google Maps API loading (invalid API key, network disconnect, or quota exhaustion), **When** initialization fails, **Then** the application replaces the map canvas with a clear, user-readable error message explaining the connectivity issue instead of rendering a blank screen or silent failure.

---

### Edge Cases

- What happens if the Google Maps JavaScript API fails to load due to network timeout? The component catches the script load error and renders a friendly retry error card with a refresh button.
- How does the map handle rapid consecutive window resize events? The component debounces resize event handlers to prevent performance degradation or tile flickering.
- What happens if a user navigates between different routes (`/discover`, `/heatmap`, `/my-locations`)? The map component instance persists across route transitions without re-mounting or re-fetching base map tiles unnecessarily.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST render a persistent Google Map using the Google Maps JavaScript API as the base visual surface on every authenticated application route.
- **FR-002**: System MUST configure the map container to occupy 100% of the main content area, allowing floating overlays (such as the AI Chat Assistant Panel) to layer above it without resizing the map canvas.
- **FR-003**: System MUST provide standard interactive map controls including panning, zooming, and map type toggles (Roadmap vs. Satellite).
- **FR-004**: System MUST center the map on the user's browser geolocation if granted, or fallback to the primary business region (e.g., Greater Jakarta: `-6.2088, 106.8456`, zoom level 11).
- **FR-005**: System MUST maintain a single, shared Google Map component instance across all features in the application frontend, strictly preventing duplicate map instances.
- **FR-006**: System MUST expose a clean layer management interface allowing downstream feature modules to programmatically add, update, and clear map markers, polygons, and heatmap overlays.
- **FR-007**: System MUST detect Google Maps API loading failures (network errors, invalid keys, quota errors) and display a user-friendly error message card with a retry option.
- **FR-008**: System MUST listen for window resize events and trigger map resize recalculations smoothly.

### Key Entities

- **Base Map Instance**: Represents the single active Google Maps JavaScript API canvas object (`google.maps.Map`) managed by the global map service.
- **Map Layer Overlay**: Represents a registered visual data layer (markers, polygons, isochrone overlays, heatmaps) attached to the shared base map instance.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Base map initializes and renders visible map tiles within 1 second of page load on standard 4G/broadband connections.
- **SC-002**: 100% of spatial feature routes (`/discover`, `/heatmap`, `/my-locations`) reuse the single shared map instance without re-initializing duplicate map objects.
- **SC-003**: 100% of Google Maps API script load failures render a clear, user-readable error message within 2 seconds of detection.
- **SC-004**: Window resize and panel expand/collapse events adapt map rendering without visual tile distortion or memory leaks.

## Assumptions

- **Map Library Constraint**: Per Constitution Section III, Google Maps JavaScript API is the sole base map library used across the application frontend.
- **API Key Configuration**: The Google Maps API key is supplied via environment variables (`VITE_GOOGLE_MAPS_API_KEY`) during build and runtime.
- **Default Center Bounds**: Default center coordinates fallback to Greater Jakarta / West Java (`-6.2088, 106.8456`) at zoom level 11 when browser geolocation is unavailable.
- **Out of Scope**: Custom map styling/theming beyond standard Google Maps controls, specific feature data overlays (pins, heatmaps, drive-time polygons are defined in separate feature specs), and offline tile caching are explicitly out of scope for this spec.
