# Quickstart & Manual Validation Guide: AI Chat Assistant Panel

This guide describes step-by-step verification procedures for the AI Chat Assistant Panel.

## Prerequisites

1. Backend NestJS running on `http://localhost:3000`.
2. Frontend Vue 3 running on `http://localhost:5173`.
3. Logged in as a valid registered user.

---

## Scenario 1: Persistent Right-Docked Floating Panel Visibility

**Goal**: Verify that the AI Chat Assistant Panel is visible as a right-docked floating overlay over the Google Map without blocking map interaction.

1. Log into the application at `http://localhost:5173`.
2. Navigate to `/discover` (or any authenticated map view).
3. Observe the chat assistant panel docked to the right edge of the screen (~25% width).
4. Pan, zoom, and click on the Google Map in the remaining 75% left area.
5. **Expected Outcome**:
   - The panel floats over the right side of the screen.
   - Google Map remains fully visible and interactive in the remaining viewport.
   - Panning/zooming the map works smoothly without resizing the map canvas.

---

## Scenario 2: Sending a Message & Real-Time SSE Status Stream

**Goal**: Verify live process status streaming over SSE upon message submission.

1. Type `"Hello AI, analyze this location"` in the chat input at the bottom of the chat panel.
2. Click **Send** or press Enter.
3. Observe the chat area.
4. **Expected Outcome**:
   - The user message appears immediately in the chat history.
   - Real-time status cards stream sequentially into the chat area:
     1. `"Understanding your request..."`
     2. `"Determining the right action..."`
     3. `"Fetching required data..."`
   - A final assistant response card replaces or follows the status cards.

---

## Scenario 3: Chat History Persistence Across Page Reloads

**Goal**: Verify that chat messages persist in PostgreSQL and restore on page refresh.

1. Send 2-3 messages in the chat panel.
2. Refresh the browser (`F5` or `Cmd+R`).
3. **Expected Outcome**:
   - The page reloads and re-authenticates.
   - Previous user and assistant messages are fetched from `GET /api/v1/chat/history` and restored in chronological order in the chat panel.

---

## Scenario 4: Error Handling in Processing Stream

**Goal**: Verify human-readable error reporting during processing failure.

1. Send a query that triggers an intentional failure or disconnect network.
2. **Expected Outcome**:
   - The stream emits a plain-language error card (e.g. `"Couldn't process your request — please try again."`).
   - The chat panel stops loading and returns to interactive state without getting stuck or showing raw stack traces.
