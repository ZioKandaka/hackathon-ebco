# Quickstart & End-To-End Validation Guide: Catchment Score AI Skill

This guide documents runnable validation scenarios to verify that the Catchment Score AI Skill functions end-to-end.

---

## Prerequisites

1. **Backend Running**: NestJS backend active on `http://localhost:3000`.
2. **Frontend Running**: Vue 3 frontend active on `http://localhost:5173`.
3. **Saved Location**: User must have at least one registered location (e.g. `"Sudirman branch"`) saved in their account.

---

## Scenario 1: Catchment Score Calculation with Explicit Radius (P1 MVP)

### Test Steps
1. Log into the application and navigate to the map view (`/discover` or `/my-locations`).
2. Open the AI Chat Assistant Panel on the right.
3. Type: `"Analyze the catchment for my Sudirman branch within 2km"` and press Enter.

### Expected Outcomes
1. Real-time status updates stream in chat:
   - `"Determining the right action (Catchment Score)..."`
   - `"Gathering nearby location data within 2km..."`
   - `"Calculating catchment score..."`
2. An AI response message appears detailing the overall composite score (0-100) and 6 sub-scores: Demand Density, Traffic Proxy, Area Quality, Competition Penalty, Network Saturation, and Operational Vitality.
3. A semi-transparent 2km radius circular overlay (`#3182CE`) renders on the shared map centered around the location's pin.

---

## Scenario 2: Default Radius Stated Assumption (P1 MVP)

### Test Steps
1. In the AI Chat Assistant Panel, type: `"Analyze catchment for my Sudirman branch"`.
2. Observe status updates and AI response message.

### Expected Outcomes
1. The AI response explicitly states applying the **2km default radius assumption**.
2. A 2km radius circle renders around the location pin on the map.

---

## Scenario 3: Parameter Adjustment & Dynamic Recalculation (P2)

### Test Steps
1. In the same chat thread, type: `"change radius to 3km"`.
2. Wait for response, then type: `"ignore competition density"`.

### Expected Outcomes
1. The AI recalculates the POI metrics for 3km and resizes the map circle to 3,000 meters.
2. The AI recalculates the composite score excluding the competition penalty factor and presents the updated score breakdown in chat.

---

## Scenario 4: Single Circle Replacement & Marker Coexistence (P3 / SC-003)

### Test Steps
1. Submit a catchment analysis for Location A.
2. Submit a catchment analysis for Location B.

### Expected Outcomes
1. **Single Circle Policy (FR-009)**: Location A's circle is destroyed (`activeCatchmentCircle.setMap(null)`); only Location B's circle remains visible.
2. **Marker Coexistence (FR-007)**: Location pins remain visible and clickable over the semi-transparent circle.

---

## Scenario 5: Automated Test Execution

Run the backend unit and integration test suites:
```bash
# Backend unit tests
npm --prefix backend test -- chat.service.spec.ts discovery.service.spec.ts

# Frontend unit tests
npx --prefix frontend vitest run
```
