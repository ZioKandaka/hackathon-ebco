# Quickstart & Manual Validation Guide: Location Discovery AI Skill

This guide describes manual verification procedures for the "Discover" AI skill.

## Prerequisites

1. Backend NestJS running on `http://localhost:3000`.
2. Frontend Vue 3 running on `http://localhost:5173`.
3. Logged in as an authenticated user.

---

## Scenario 1: Natural-Language Location Discovery via Chat Panel

**Goal**: Verify discovering candidate business locations through chat prompt.

1. Open `http://localhost:5173/discover` in browser.
2. In the AI Chat Assistant Panel on the right, type:
   `"Find me the top 5 spots to open a coffee shop in Kediri"`
3. Click **Send** or press Enter.
4. **Expected Outcome**:
   - Status updates stream sequentially in chat:
     1. `"Determining the right action..."`
     2. `"Querying BigQuery POI datasets for Kediri..."`
     3. `"Ranking top candidate spots by demand density..."`
   - AI responds in chat with a numbered list of top 5 candidate spots and scoring rationale.
   - Numbered candidate pins (`1`, `2`, `3`, `4`, `5`) render immediately on the Google Map in the remaining 75% viewport.

---

## Scenario 2: Clarifying Prompt on Vague Request

**Goal**: Verify that the AI asks a clarifying question when the region or business type is missing.

1. In the AI Chat Assistant Panel, type: `"Find me good spots"`
2. Click **Send**.
3. **Expected Outcome**:
   - The AI responds in chat asking for missing details:
     `"I'd love to help you discover location candidates! Which business type (e.g. coffee shop, minimarket) and region or city are you looking in?"`

---

## Scenario 3: Candidate Pin Click & Detail Inspection

**Goal**: Verify candidate detail inspection on pin click.

1. Execute a valid discovery search (Scenario 1).
2. Click on **Candidate Pin #1** on the Google Map.
3. **Expected Outcome**:
   - Map pans and centers on Pin #1.
   - A detail card or popup displays candidate metrics (demand score, competitor count, full address).
