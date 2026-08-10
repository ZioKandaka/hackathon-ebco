# Research & Technical Decisions: Route-Based Accessibility AI Skill

## 1. Travel-Time Isochrone Computation Strategy

### Decision
Compute travel-time isochrone polygon boundaries using Google Routes API / Distance Matrix radial network sampling across 12-16 direction rays, constrained by travel mode (`drive`, `walk`, `transit`) and duration threshold (1–30 minutes).

### Rationale
- **Road Network Accuracy (SC-002)**: Radial ray-casting queries actual travel distance/time along roads in N, NE, E, SE, S, SW, W, NW directions, producing non-circular star-shaped polygons that accurately capture barriers (rivers, highways, dead-ends).
- **Graceful Fallback**: If network service call is restricted or delayed, the system generates a spatial road-network approximation polygon (star-shaped polygon scaled by travel speed: ~35 km/h for drive, ~4.5 km/h for walk, ~20 km/h for transit) to maintain sub-4-second responsiveness (SC-001).

### Alternatives Considered
- **Pure Euclidean Radius Approximation**: Using a simple circle scaled by average speed. Rejected because it fails to capture road network geometry, river/rail barriers, and dead-ends.

---

## 2. BigQuery Polygon POI Filtering & Catchment Engine Reuse

### Decision
Filter POIs using BigQuery `ST_CONTAINS(ST_GEOGFROMTEXT(@polygonWkt), ST_GEOGPOINT(longitude, latitude))` enforced with mandatory `regency_code` or `province_code` partition filters, passing filtered POIs directly to `DiscoveryService.calculateCatchmentScore()`.

### Rationale
- **100% Scoring Engine Reuse (SC-003)**: Bounding POI queries by the isochrone polygon and invoking `calculateCatchmentScore()` reuses the exact 6 sub-score engine (Demand, Traffic, Quality, Competition Penalty, Saturation Penalty, Vitality) without code duplication.
- **Partition Filter Enforcement (SC-004)**: Ensures BigQuery SQL includes `regency_code` / `province_code` filters to satisfy project governance rules and control query execution costs.

### Alternatives Considered
- **Duplicating Scoring Logic for Travel Time**: Writing a separate scoring pipeline for route-based analysis. Rejected to comply with SC-003 and DRY architectural principles.

---

## 3. Google Maps Vector Polygon Overlay Lifecycle Management

### Decision
Encapsulate isochrone visualization as a singleton layer `activeIsochronePolygon: google.maps.Polygon | null` in `GoogleMapService` (`frontend/src/services/google-map.service.ts`).

### Rationale
- **Single Boundary Layer Policy (FR-009, Option A Clarification)**: Calling `renderIsochronePolygon(path, options)` unregisters both `activeCatchmentCircle` and any previous `activeIsochronePolygon`, ensuring exactly 0 or 1 active spatial boundary overlay exists on the map.
- **Marker Coexistence (FR-007)**: Isochrone polygons render with a purple accent stroke (`#805AD5`) and semi-transparent fill (`fillOpacity: 0.22`), allowing location pins to remain visible and interactive.

### Alternatives Considered
- **Multiple Overlaid Polygons**: Stacking old and new polygons. Rejected to prevent visual clutter and comply with Single Shared Map governance rules.
