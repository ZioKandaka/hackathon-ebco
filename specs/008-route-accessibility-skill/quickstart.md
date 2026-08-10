# Quickstart & End-To-End Validation Guide: Route-Based Accessibility AI Skill

This guide documents runnable validation scenarios to verify that the Route-Based Accessibility AI Skill functions end-to-end.

---

## Prerequisites

1. **Backend Running**: NestJS backend active on `http://localhost:3000`.
2. **Frontend Running**: Vue 3 frontend active on `http://localhost:5173`.
3. **Saved Location**: User must have at least one registered location saved in their account.

---

## Scenario 1: Drive-Time Isochrone Accessibility Check (P1 MVP)

### Test Steps
1. Log into the application and navigate to the map view (`/discover` or `/my-locations`).
2. Open the AI Chat Assistant Panel on the right.
3. Type: `"Check how accessible my Sudirman branch is within a 10 minute drive"` and press Enter.

### Expected Outcomes
1. Real-time status updates stream in chat:
   - `"Determining the right action (Accessibility Analysis)..."`
   - `"Calculating 10-minute drive travel-time boundary..."`
   - `"Analyzing reachable area POI density..."`
2. An AI response message appears detailing the 10-minute drive composite score (0-100) and 6 sub-scores.
3. A semi-transparent purple isochrone polygon overlay (`#805AD5`) renders on the shared map centered around the location pin.

---

## Scenario 2: Default Drive Mode Stated Assumption (P1 MVP)

### Test Steps
1. In the AI Chat Assistant Panel, type: `"Check accessibility for Sudirman branch within 10 minutes"`.
2. Observe status updates and AI response message.

### Expected Outcomes
1. The AI response explicitly states applying the **driving mode assumption (`drive`)**.
2. A 10-minute driving isochrone polygon renders around the location pin on the map.

---

## Scenario 3: Comparative Radius vs. Isochrone Analysis (P2)

### Test Steps
1. In the chat thread, execute a radius catchment analysis (`"Analyze catchment for Sudirman branch within 2km"`).
2. Follow up with an accessibility analysis (`"Now check accessibility within a 10 minute drive"`).

### Expected Outcomes
1. The AI response explicitly compares the drive-time score against the previous radius score (e.g. `"Drive-time score: 78 vs. Radius score: 82"`).
2. The AI summary notes physical road network constraints causing the score variance.

---

## Scenario 4: Single Boundary Layer Replacement (P3 / FR-009)

### Test Steps
1. Execute a radius catchment analysis (radius circle renders).
2. Execute a drive-time accessibility analysis.

### Expected Outcomes
1. **Single Boundary Layer Policy (FR-009)**: The radius circle overlay is destroyed (`activeCatchmentCircle.setMap(null)`); only the new purple isochrone polygon remains visible.
2. **Marker Coexistence (FR-007)**: Location pins remain visible and clickable over the polygon overlay.

---

## Scenario 5: Automated Test Execution

Run the backend unit and integration test suites:
```bash
# Backend unit tests
npm --prefix backend test -- chat.service.spec.ts discovery.service.spec.ts

# Frontend unit tests
npx --prefix frontend vitest run
```
