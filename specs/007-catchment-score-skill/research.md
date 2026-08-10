# Research & Technical Decisions: Catchment Score AI Skill

## 1. Spatial Radius POI Querying & BigQuery Partition Enforcement

### Decision
Execute spatial radius queries against BigQuery dataset `bni-geospatial-845e.bni_geospatial_gold_zone.obt_poi_gold` using `ST_DISTANCE(ST_GEOGPOINT(longitude, latitude), ST_GEOGPOINT(@lng, @lat)) <= @radiusMeters` coupled with mandatory `regency_code` / `province_code` partition filters.

### Rationale
- **Spatial Precision**: BigQuery's native `ST_DISTANCE` function provides spherical geodesic distance calculations in meters, matching exact circular radii (e.g., 2,000m).
- **Cost & Partition Control (SC-004)**: Enforcing `regency_code = @regencyCode` or `province_code = @provinceCode` ensures that queries scan only relevant spatial partitions, satisfying project governance rules and keeping query costs bounded.

### Alternatives Considered
- **Client-Side Distance Slicing**: Downloading all POIs in a province and computing distances on Node.js/Vue. Rejected due to excessive network payload sizes and memory overhead.
- **Bounding Box Approximation**: Using simple `lat +/- delta` bounds without spherical distance. Rejected because corner POIs outside the requested radius circle would be falsely included.

---

## 2. 6-Factor Composite Catchment Scoring Algorithm

### Decision
Implement the 6-factor composite catchment score engine in NestJS `CatchmentService` with dynamic weighting configurable via chat messages.

### Scoring Breakdown
1. **Demand Density Score (0-100)**: Evaluates count of target demand POIs (schools, offices, residential, transit stations). Formula: `min(100, demandPoiCount * 5)`.
2. **Traffic Proxy Score (0-100)**: Aggregates total rating counts across nearby POIs (`SUM(user_ratings_total)`). Formula: `min(100, log10(totalRatings + 1) * 25)`.
3. **Area Quality Score (0-100)**: Average star rating of nearby POIs (`AVG(rating)`). Formula: `(avgRating / 5.0) * 100`.
4. **Competition Density Penalty (0-100)**: Deducts points based on same-type competitor count within radius. Formula: `min(100, competitorCount * 15)`.
5. **Network Saturation Penalty (0-100)**: Progressive penalty when same-brand or same-category branches exceed 2 within radius. Formula: `max(0, (sameBrandCount - 2) * 20)`.
6. **Operational Vitality Score (0-100)**: Percentage of POIs with operational status. Formula: `(operationalPois / totalPois) * 100`.

### Weighted Composite Formula
```text
Composite = (w_demand * Demand) + (w_traffic * Traffic) + (w_quality * Quality)
            - (w_comp * CompPenalty) - (w_sat * SatPenalty) + (w_vitality * Vitality)
```
Normalized to a 0–100 integer score. Default weights: `w_demand=0.30, w_traffic=0.20, w_quality=0.20, w_comp=0.15, w_sat=0.10, w_vitality=0.05`.

### Alternatives Considered
- **Equal Unweighted Average**: Treating all 6 factors equally without penalties. Rejected because competition and saturation are negative drag factors that must penalize overall location attractiveness.

---

## 3. Google Map Radius Circle Overlay & Lifecycle

### Decision
Manage radius boundary visualization using `google.maps.Circle` encapsulated as a singleton layer inside `GoogleMapService` (`frontend/src/services/google-map.service.ts`).

### Rationale
- **Single Active Layer Policy (FR-009, SC-003)**: `GoogleMapService` tracks `activeCatchmentCircle: google.maps.Circle | null`. Calling `renderCatchmentCircle(center, radiusMeters)` automatically calls `activeCatchmentCircle.setMap(null)` on the previous circle.
- **Marker Coexistence (FR-007)**: The circle renders with `#3182CE` stroke and semi-transparent fill (`fillOpacity: 0.15`), allowing underlying location pins to remain visible and interactive.

### Alternatives Considered
- **Static Polygon Approximation**: Drawing a 32-sided polygon manually. Rejected because `google.maps.Circle` is natively built into Google Maps API and provides smooth vector circle rendering.
