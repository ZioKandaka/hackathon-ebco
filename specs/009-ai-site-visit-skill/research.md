# Research & Technical Decisions: AI Site Visit AI Skill

## 1. Street View Metadata Check & Imagery Acquisition Pipeline

### Decision
Implement a 2-stage imagery acquisition pipeline in NestJS `SiteVisitService`:
1. Query Google Maps Street View Metadata API (`https://maps.googleapis.com/maps/api/streetview/metadata?location=lat,lng&key=API_KEY`).
2. **If metadata status is `OK`**: Fetch 4 cardinal heading static images (0° North, 90° East, 180° South, 270° West; size `600x400`, pitch `0`) + 1 overhead satellite snapshot (`maptype=satellite`, zoom `18`).
3. **If metadata status is `ZERO_RESULTS`**: Mark `hasStreetViewCoverage = false`, log notification, and fetch 1 overhead satellite snapshot only (`FR-006`).

### Rationale
- **Resilience & Coverage Fallback (SC-002)**: Checking metadata first prevents broken image links or 404 image errors when Street View imagery is absent for rural/newly constructed roads.
- **Full 360° Perspective**: Capturing 4 cardinal headings gives a complete ground-level perspective around the property.

### Alternatives Considered
- **Blind Image Fetching**: Requesting 4 Street View URLs without checking metadata. Rejected because missing coverage produces broken grey default image tiles.

---

## 2. Vertex AI Gemini Multimodal Vision Analysis Engine

### Decision
Utilize `@google-cloud/vertexai` (Gemini 1.5 Flash multimodal model) with structured JSON output instructions to score the fetched site imagery.

### Prompt & Scoring Criteria (Q1 Clarification)
Pass image URLs/buffers to Gemini with instructions to return structured JSON:
```typescript
{
  overallVisualScore: number, // 0-100 weighted composite
  criteria: {
    storefrontVisibility: { score: number, justification: string }, // 30%
    roadWidthAccess: { score: number, justification: string },       // 25%
    trafficVisibility: { score: number, justification: string },     // 20%
    buildingTypes: { score: number, justification: string },         // 15%
    areaCondition: { score: number, justification: string }          // 10%
  },
  summary: string
}
```

### Fallback Heuristics
If Vertex AI call times out (> 3 seconds) or GCP credentials are unconfigured, NestJS backend returns structured qualitative fallback scores derived from POI category density and satellite image heuristics, keeping response latency under 5 seconds (SC-001).

---

## 3. UI Image Gallery Lightbox & Map View Sync

### Decision
Render a responsive 5-tile thumbnail grid (4 Street View + 1 Satellite) in Vue 3 chat messages with a click-to-expand Lightbox modal and automatic map centering (`googleMapService.map.setCenter({ lat, lng })`).

### Rationale
- **Map-Chat Synergy (FR-008)**: Centering the map on the target location pin when rendering the site visit response connects the visual report to spatial map context.
- **Interactive Lightbox (US3)**: Clicking any thumbnail opens a full-screen image viewer with cardinal direction labels.
