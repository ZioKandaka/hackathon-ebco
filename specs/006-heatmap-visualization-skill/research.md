# Research & Technical Decisions: Heatmap Visualization AI Skill

## 1. Google Maps Heatmap Layer Integration & Lifecycle Management

### Decision
Utilize the official Google Maps Visualization library (`google.maps.visualization.HeatmapLayer`) managed as a single active layer singleton within `GoogleMapService` (`frontend/src/services/google-map.service.ts`).

### Rationale
- **Single Active Layer Policy (FR-007, SC-002)**: Maintaining `private activeHeatmapLayer: google.maps.visualization.HeatmapLayer | null` in `GoogleMapService` ensures that calling `renderHeatmap(points)` immediately calls `activeHeatmapLayer.setMap(null)` on the previous heatmap layer before instantiating a new `google.maps.visualization.HeatmapLayer`.
- **Pin Coexistence (FR-006, SC-004)**: `HeatmapLayer` renders directly onto the map's overlay canvas, below SVG/HTML markers (`google.maps.Marker`), preserving pin visibility and click interactions.
- **Viewport Auto-fit (FR-009)**: Upon rendering, `GoogleMapService` constructs a `google.maps.LatLngBounds` containing all returned spatial points and invokes `map.fitBounds(bounds)` to automatically pan/zoom to the target dataset region.
- **Dynamic Styling**: Color gradient (blue -> green -> yellow -> red) and radius/opacity are configurable on `HeatmapLayer` to maintain visual contrast across map zoom levels.

### Alternatives Considered
- **Multiple Stacked Heatmap Layers**: Stacking layers causes dark visual clutter and obscures underneath map features. Rejected to comply with Constitution Section III & SC-002.
- **Custom Canvas / Deck.gl / Leaflet Overlay**: Replacing or wrapping Google Maps canvas with external renderer. Rejected because it violates the Single Shared Google Map architecture.

---

## 2. BigQuery Spatial Density Aggregation & Performance Capping

### Decision
Perform spatial query filtering, demand vs. competitor density weighting, and dataset volume capping (max 5,000 points) inside NestJS `HeatmapService` / BigQuery backend SQL before emitting data over SSE.

### Rationale
- **Performance Capping (FR-010)**: Query aggregations in BigQuery use SQL `LIMIT 5000` or spatial cluster binning, guaranteeing browser client rendering stays smooth (< 3s total latency per SC-001).
- **Cost Control (SC-003)**: All BigQuery queries strictly enforce partition filters (`regency_code` or `province_code`) per Constitution Section IV.
- **Opportunity Weighting (FR-004)**:
  - **Mode A (Business-Based)**: `weight = demand_poi_density - (competitor_poi_density * 1.5)`. Points with positive net demand score high weights (rendered in warm red tones).
  - **Mode B (Custom Exploratory Prompt)**: `weight = 1.0` (or weighted by attribute such as `5.0 - rating` for low-rating preschools).

### Alternatives Considered
- **Unbounded Raw Point Streaming**: Streaming tens of thousands of raw POIs to the client frontend. Rejected due to browser DOM/memory overhead and violation of 3-second render target (SC-001).
- **Client-Side Heavy Weight Calculations**: Downloading all raw POIs and computing demand-minus-competition on the browser thread. Rejected due to excessive network bandwidth and CPU usage on client devices.

---

## 3. SSE Transport & Chat Panel Integration

### Decision
Extend the existing SSE event payload (`ChatStreamEvent`) in `ChatService` and `chat-sse.service.ts` to include a structured `heatmapData` field when a heatmap AI skill execution finishes.

### Rationale
- **Progress Visibility (FR-002)**: Streams step-by-step status messages ("Determining the right action...", "Aggregating location data...", "Rendering heatmap...") over the existing `POST /api/v1/chat/stream` SSE channel.
- **Unified Payload**: When the final AI response message is emitted, `heatmapData` contains:
  ```typescript
  heatmapData: {
    queryId: string;
    mode: 'business_based' | 'custom_prompt';
    region: string;
    points: Array<{ lat: number; lng: number; weight: number }>;
    summary: string;
  }
  ```
- **Store & Map Bridge**: `useChatStore` receives the SSE `message` event containing `heatmapData`, triggers `googleMapService.renderHeatmap(points)`, and displays the AI summary in the chat panel.

### Alternatives Considered
- **Separate REST Endpoint for Heatmap Data**: Splitting chat message text and map heatmap data into two HTTP requests. Rejected because SSE allows streaming status updates and delivering the rendered data payload atomically in a single reactive event sequence.
