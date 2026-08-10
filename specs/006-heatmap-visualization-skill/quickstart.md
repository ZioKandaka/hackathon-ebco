# Quickstart & End-To-End Validation Guide: Heatmap Visualization AI Skill

This guide documents runnable validation scenarios to verify that the Heatmap Visualization AI Skill functions end-to-end.

---

## Prerequisites

1. **Backend Running**: NestJS backend active on `http://localhost:3000` with valid GCP credentials or local fallback enabled.
2. **Frontend Running**: Vue 3 frontend active on `http://localhost:5173`.
3. **Google Maps API**: Configured with `VITE_GOOGLE_MAPS_API_KEY` including the `visualization` library.

---

## Scenario 1: Mode A Business-Based Opportunity Heatmap (P1 MVP)

### Test Steps
1. Log into the application and navigate to the map view (`/discover` or `/heatmap`).
2. Open the AI Chat Assistant Panel on the right side.
3. Type: `"Show me a heatmap for my minimarket business in Kediri"` and press Enter.

### Expected Outcomes
1. Real-time status updates stream in chat:
   - `"Determining the right action (Heatmap Visualization)..."`
   - `"Aggregating BigQuery POI location data for Kediri..."`
   - `"Rendering weighted heatmap layer..."`
2. An AI summary message appears in chat explaining the visual gradient (e.g. `"Darker red areas indicate high minimarket demand with low direct competition"`).
3. The shared Google Map automatically pans/zooms to fit Kediri (`fitBounds`).
4. A color-coded weighted heatmap density overlay renders on the map canvas.

---

## Scenario 2: Mode B Custom Exploratory Prompt (P2)

### Test Steps
1. In the AI Chat Assistant Panel, type: `"Show me a heatmap of preschools with rating below 4.0 in Bandung"`.
2. Observe status updates and chat response.

### Expected Outcomes
1. Backend interprets the custom intent and executes a filtered BigQuery aggregation.
2. A new weighted heatmap renders over Bandung.
3. Chat response displays an explanatory summary of the filtered preschool density.

---

## Scenario 3: Single-Layer Replacement & Marker Coexistence (P3 / Constitution III)

### Test Steps
1. Ensure a location marker pin exists on the map (e.g. a saved branch or discovery candidate pin).
2. Submit a heatmap request (`"Show me a heatmap for coffee shops in Kediri"`).
3. Submit a second heatmap request (`"Show me a heatmap for restaurants in Kediri"`).

### Expected Outcomes
1. **Single Active Layer (SC-002)**: The first coffee shop heatmap layer is destroyed (`activeHeatmapLayer.setMap(null)`); only the restaurant heatmap layer remains visible.
2. **Marker Coexistence (FR-006, SC-004)**: Map marker pins remain visible, unhidden, and fully interactive/clickable on top of the heatmap layer.

---

## Scenario 4: Automated Backend & Frontend Tests

Run the backend unit and integration test suites:
```bash
# Backend unit & skill tests
npm --prefix backend test -- discovery.service.spec.ts chat.service.spec.ts

# Frontend unit & service tests
npm --prefix frontend test
```
