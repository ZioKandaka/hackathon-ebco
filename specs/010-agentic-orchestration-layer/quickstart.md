# Quickstart & End-To-End Validation Guide: Agentic Orchestration Layer

This guide documents runnable validation scenarios to verify that the Agentic Orchestration Layer functions end-to-end.

---

## Prerequisites

1. **Backend Running**: NestJS backend active on `http://localhost:3000`.
2. **Frontend Running**: Vue 3 frontend active on `http://localhost:5173`.

---

## Scenario 1: Multi-Tool Chain (Discover + Heatmap)

### Test Steps
1. Log into the application and navigate to the map view (`/discover`).
2. Open the AI Chat Assistant Panel.
3. Type: `"Find coffee shop candidates in Kediri and show a heatmap for minimarket density"` and press Enter.

### Expected Outcomes
1. Real-time status updates stream sequentially:
   - `"Orchestrating AI tools (Discover → Heatmap)..."`
   - `"Step 1/2: Searching candidate locations in Kediri..."`
   - `"Step 2/2: Aggregating minimarket density heatmap..."`
2. The shared map displays BOTH candidate location pins AND the weighted spatial heatmap density layer simultaneously.
3. The AI chat message presents a unified response narrative synthesizing discovery candidate rankings and heatmap insights.

---

## Scenario 2: Single-Tool Pass Through (P1 MVP / SC-002)

### Test Steps
1. In the AI Chat Assistant Panel, type: `"Add my coffee shop branch at Jl. Sudirman No. 10 called Sudirman Coffee"`.

### Expected Outcomes
1. The orchestrator detects a single tool intent (`AddBranch`).
2. Streams `"Determining the right action (Add Business/Branch)..."` directly without multi-tool execution delay.
3. Successfully registers the location pin on the map.

---

## Scenario 3: Error Resilience & Step Failure Recovery (P2 / SC-004)

### Test Steps
1. Submit a 3-tool request where 1 tool encounters a remote data condition (e.g. site visit on remote area lacking photos).

### Expected Outcomes
1. The status stream indicates execution progress for all steps.
2. The AI notes the specific step notice in chat (*"No Street View coverage found at this location; performing satellite-only visual analysis"*).
3. Independent tool steps in the chain complete successfully without generic server crashes.

---

## Scenario 4: Automated Test Execution

Run the backend unit and integration test suites:
```bash
# Backend unit & orchestration tests
npm --prefix backend test -- chat.service.spec.ts discovery.service.spec.ts

# Frontend unit tests
npx --prefix frontend vitest run
```
