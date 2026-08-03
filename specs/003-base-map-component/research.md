# Phase 0 Research: Base Map Component

## 1. Google Maps API Script Loader

- **Decision**: `@googlemaps/js-api-loader` (`Loader` class) for dynamic promise-based loading of Google Maps JavaScript API.
- **Rationale**: Official Google Maps loader library that manages script injection, handles load promises/rejects cleanly, and prevents duplicate `<script>` tag insertions across route navigations.
- **Alternatives Considered**:
  - Raw `<script>` tag in `index.html`: Harder to handle script load failures gracefully and inject dynamic API keys from environment variables.
  - `vue3-google-map` wrapper library: Adds third-party abstraction overhead; direct Google Maps API wrapper provides cleaner low-level control for custom heatmap and polygon layers.

## 2. Single Shared Map Instance Architecture

- **Decision**: Singleton `GoogleMapService` class combined with Vue 3 Composable `useGoogleMap()`.
- **Rationale**: Direct compliance with Constitution Section III (Single Shared Map). The map instance `google.maps.Map` is initialized once and stored in global service state. Route transitions (`/discover`, `/heatmap`, `/my-locations`) bind the existing map canvas to the visible container without re-fetching tiles or destroying the map instance.
- **Alternatives Considered**:
  - Component-scoped `new google.maps.Map()` in each view: Violates Constitution Section III and leads to duplicated tile requests and memory leaks.

## 3. Layer Management Abstraction Interface

- **Decision**: Programmatic layer registration contract exposing `addMarker(id, markerOptions)`, `removeMarker(id)`, `addPolygon(id, polygonOptions)`, `removePolygon(id)`, `addHeatmap(id, dataPoints)`, and `clearAllLayers()`.
- **Rationale**: Downstream feature specs (Discover pins, Heatmap layers, Isochrone polygons) can manage visual layers through a standardized interface without needing to touch low-level Google Maps API event listeners directly.
- **Alternatives Considered**:
  - Exposing raw `google.maps.Map` object directly to all components: Risks external code modifying map settings or destroying instances uncontrollably.

## 4. Error Handling & Resilient Fallbacks

- **Decision**: Catch script load rejections or API key authentication errors (`gm_authFailure` window event) and surface a user-friendly error card (`MapErrorCard.vue`) with a retry button.
- **Rationale**: Guarantees zero unhandled blank screens or silent failures when Google Maps API key or network connection is unavailable (FR-007).
