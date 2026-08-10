# Quickstart & End-To-End Validation Guide: AI Site Visit AI Skill

This guide documents runnable validation scenarios to verify that the AI Site Visit AI Skill functions end-to-end.

---

## Prerequisites

1. **Backend Running**: NestJS backend active on `http://localhost:3000`.
2. **Frontend Running**: Vue 3 frontend active on `http://localhost:5173`.
3. **Saved Location / Candidate**: User must have at least one registered location or discovery candidate available.

---

## Scenario 1: AI Site Visit for Saved Location (P1 MVP)

### Test Steps
1. Log into the application and navigate to the map view (`/my-locations` or `/discover`).
2. Open the AI Chat Assistant Panel on the right.
3. Type: `"Do an AI site visit on my Sudirman branch"` and press Enter.

### Expected Outcomes
1. Real-time status updates stream in chat:
   - `"Determining the right action (AI Site Visit)..."`
   - `"Fetching street-level imagery and satellite snapshot..."`
   - `"Analyzing the site visually with multimodal vision AI..."`
2. An AI response message appears with:
   - 4-heading Street View thumbnails (North, East, South, West) + 1 Satellite image.
   - An overall visual composite rating (0–100).
   - 5 structured qualitative criteria scores (Storefront Visibility, Road Access, Traffic, Building Types, Area Condition) with short justifications.
3. The shared Google Map automatically centers and zooms on the target location.

---

## Scenario 2: AI Site Visit for Discovery Candidate Spot (P1 MVP)

### Test Steps
1. Run a discovery search (`"Find coffee shop spots in Kediri"`).
2. Follow up in the same chat thread: `"What does spot 1 look like?"`.

### Expected Outcomes
1. The AI identifies candidate spot #1's coordinates.
2. The AI fetches site imagery and displays the visual assessment report alongside images in chat.

---

## Scenario 3: Satellite-Only Coverage Fallback (P2)

### Test Steps
1. Request a site visit for a coordinate location in a rural area lacking Street View coverage.

### Expected Outcomes
1. The AI chat panel displays a polite notice: `"No Street View coverage found at this location; performing satellite-only visual analysis."`
2. The response includes the satellite snapshot and a satellite-based visual assessment report without server errors or blank results.

---

## Scenario 4: Image Lightbox Expansion & Map Centering (P3)

### Test Steps
1. Click any Street View image thumbnail rendered in the AI chat panel.

### Expected Outcomes
1. A full-screen Lightbox modal expands displaying high-resolution imagery and heading information.
2. The shared Google Map pans/zooms to center on the property pin.

---

## Scenario 5: Automated Test Execution

Run the backend unit and integration test suites:
```bash
# Backend unit tests
npm --prefix backend test -- chat.service.spec.ts site-visit.spec.ts

# Frontend unit tests
npx --prefix frontend vitest run
```
