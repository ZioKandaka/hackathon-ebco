# Quickstart & Manual Validation Guide: Add Business/Branch AI Skill

This guide describes manual verification scenarios for the "Add Business/Branch" AI skill.

## Prerequisites

1. Backend NestJS running on `http://localhost:3000`.
2. Frontend Vue 3 running on `http://localhost:5173`.
3. Valid `VITE_GOOGLE_MAPS_API_KEY` set in frontend `.env` and `GOOGLE_MAPS_API_KEY` set in backend `.env`.
4. Logged in as an authenticated user.

---

## Scenario 1: Natural-Language Branch Creation via Chat Panel

**Goal**: Verify adding a branch using a complete chat message.

1. Open `http://localhost:5173/discover` in browser.
2. In the AI Chat Assistant Panel on the right, type:
   `"Add my new coffee shop branch at Jl. Sudirman No. 10, Kota Jakarta Pusat called Sudirman Coffee"`
3. Click **Send** or press Enter.
4. **Expected Outcome**:
   - Status updates stream sequentially:
     1. `"Determining the right action..."`
     2. `"Looking up address via Google Geocoding..."`
     3. `"Creating your new branch..."`
   - AI responds: `"Successfully created 'Sudirman Coffee' at Jl. Jend. Sudirman No.10, Kota Jakarta Pusat."`
   - A new location pin appears immediately on the Google Map, centered on the resolved coordinate.
   - Navigating to **My Locations** view displays the new branch in the saved locations list.

---

## Scenario 2: Missing Attribute Prompt (Business Name or Type Missing)

**Goal**: Verify that the AI asks a short follow-up question when required attributes are missing.

1. In the AI Chat Assistant Panel, type:
   `"Add a branch at Jl. Gatot Subroto No. 5"`
2. Click **Send**.
3. **Expected Outcome**:
   - The AI responds asking for the missing business name or type:
     `"Got the address! What is the name and business type of this branch?"`
4. Reply in chat: `"Call it Central Hub, it's a co-working space."`
5. **Expected Outcome**:
   - AI completes geocoding and creation, confirms in chat, and adds the map pin.

---

## Scenario 3: Address Ambiguity Candidates

**Goal**: Verify candidate address presentation when geocoding returns multiple matches.

1. Type a vague address in chat: `"Add my store on Jalan Sudirman"`.
2. Click **Send**.
3. **Expected Outcome**:
   - The AI identifies multiple matching addresses and lists top candidate options in chat:
     `"I found multiple matching addresses for 'Jalan Sudirman': 1) Jl. Jend. Sudirman, Jakarta Pusat; 2) Jl. Sudirman, Bandung. Which one is correct?"`
4. Type `1` or select option 1.
5. **Expected Outcome**:
   - AI completes registration using candidate 1 coordinates and places the map pin.
