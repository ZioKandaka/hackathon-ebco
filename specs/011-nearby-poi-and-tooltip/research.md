# Research & Technical Decisions: Nearby POI Pins & Hover Tooltips

## 1. Business Vertical Relevance Mapping Taxonomy

### Decision
Implement `getRelevantDisplayCategoriesForType(businessType: string): string[]` in `BigQueryDiscoveryService` to return vertical-specific peer categories:

- **coffee_shop**: `['coffee_shop', 'cafe', 'bakery']`
- **restaurant / food**: `['restaurant', 'cafe', 'food_court', 'bakery']`
- **minimarket / retail**: `['minimarket', 'convenience_store', 'supermarket']`
- **laundry**: `['laundry', 'dry_cleaning']`
- **Fallback for unmapped types**: `[businessType.toLowerCase()]` (same-category peer).

### Rationale
- **Core Requirement (FR-007)**: The existing `getDemandCategoriesForType()` function returns footfall generator demand categories (e.g. schools, universities, offices, transit stations) which describe what generates customer traffic, NOT what nearby peer businesses should be displayed.
- **Precision Filtering**: Creating a separate display relevance mapping prevents category leaks (e.g. pharmacies appearing for a laundry spot).

### Alternatives Considered
- **Reusing `getDemandCategoriesForType()`**: Rejected because demand drivers (schools/transit) are not peer business competitors/allies.
- **Client-Side Filtering**: Fetching all nearby POIs within 2km and filtering in Vue 3. Rejected per FR-008 to minimize network bandwidth and enforce BigQuery server-side query filtering.

---

## 2. Shared 2km Boundary Circle & Map Layer Management

### Decision
Reuse `googleMapService.renderCatchmentCircle(center, 2000)` and `googleMapService.removeCatchmentCircle()` in `GoogleMapService`.

### Rationale
- **Single Active POI Layer Policy (FR-005, SC-004)**: Toggling "Show Nearby POI" on Candidate B automatically unregisters Candidate A's POI markers and 2km circle before rendering Candidate B's markers and circle.
- **Zero Code Duplication**: Reuses the tested vector circle renderer built in Feature 007.

---

## 3. Distinct POI Marker Styling & Hover Tooltips (`mouseover` / `mouseout`)

### Decision
1. **Marker Styling (FR-004)**: Render nearby POI pins using a cyan/teal marker icon (`http://maps.google.com/mapfiles/ms/icons/cyan-dot.png` or custom cyan SVG dot) to visually differentiate them from numbered primary candidate pins.
2. **Hover Tooltip (FR-006, SC-003)**: Attach `mouseover` and `mouseout` event handlers to nearby POI markers on `googleMapService`.
   - `mouseover`: Opens a shared `google.maps.InfoWindow` displaying POI Name, Category, Rating, User Ratings Count, Distance in meters, and Business Operating Status (`OPERATIONAL` / `CLOSED_PERMANENTLY`).
   - `mouseout`: Instantly closes the InfoWindow.

### Rationale
- **Non-Intrusive Inspection**: Hover tooltips do not interfere with candidate pin `click` selection handlers or modal popups.
