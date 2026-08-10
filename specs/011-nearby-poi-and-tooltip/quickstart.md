# Quickstart & End-To-End Validation Guide: Nearby POI Pins & Hover Tooltips

This guide documents runnable validation scenarios to verify that the Nearby POI Pins & Hover Tooltips feature functions end-to-end.

---

## Prerequisites

1. **Backend Running**: NestJS backend active on `http://localhost:3000`.
2. **Frontend Running**: Vue 3 frontend active on `http://localhost:5173`.
3. **Discovery Results Active**: Run a candidate discovery search (e.g. `"Find coffee shop candidates in Kediri"`).

---

## Scenario 1: Toggle Nearby POIs & 2km Boundary Circle (P1 MVP)

### Test Steps
1. Navigate to the `/discover` view with active candidate spots in the left panel.
2. On Candidate Spot #1, click the **"Show Nearby POI"** button.

### Expected Outcomes
1. A 2km-radius catchment circle (`#3182CE` stroke/fill) renders around Candidate Spot #1.
2. Cyan POI pins render on the map inside the 2km boundary circle.
3. The button label on Spot #1 changes to **"Hide Nearby POI"**.

---

## Scenario 2: Vertical Relevance Taxonomy Verification (P2)

### Test Steps
1. Perform a coffee shop discovery search.
2. Click "Show Nearby POI" on candidate spot #1.
3. Inspect returned POIs in the list / tooltips.

### Expected Outcomes
1. All displayed POIs match coffee shop, cafe, or bakery categories.
2. Irrelevant categories (pharmacies, hardware stores, laundries) are 0% present.

---

## Scenario 3: Hover Tooltip Verification (P3 / SC-003)

### Test Steps
1. Hover the mouse cursor over a cyan nearby POI pin (`mouseover`).
2. Move the mouse cursor away from the pin (`mouseout`).

### Expected Outcomes
1. Hovering opens an InfoWindow tooltip showing POI Name, Category, Rating, User Ratings Count, and Operating Status (`OPERATIONAL` / `CLOSED`).
2. Moving the mouse away immediately closes the tooltip.

---

## Scenario 4: Layer Switching & Cleanup (SC-004)

### Test Steps
1. Click "Show Nearby POI" on Candidate Spot #1 (Spot #1 POI pins + 2km circle active).
2. Click "Show Nearby POI" on Candidate Spot #2.

### Expected Outcomes
1. Spot #1's POI pins and 2km circle are completely cleared.
2. Spot #2's 2km circle + POI pins render cleanly with zero leftover/orphaned markers.

---

## Scenario 5: Automated Test Execution

Run backend and frontend unit test suites:
```bash
# Backend unit tests
npm --prefix backend test -- discovery.service.spec.ts bigquery-discovery.service.spec.ts

# Frontend unit tests
npx --prefix frontend vitest run
```
