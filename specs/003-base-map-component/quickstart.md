# Quickstart & Manual Validation Guide: Base Map Component

This guide describes manual verification procedures for the Base Map Component.

## Prerequisites

1. Frontend Vue 3 running on `http://localhost:5173`.
2. Valid or mock `VITE_GOOGLE_MAPS_API_KEY` set in `.env`.
3. Logged in as an authenticated user.

---

## Scenario 1: Full-Viewport Interactive Base Map Render

**Goal**: Verify that the Google Map renders full-screen on all authenticated routes.

1. Open browser to `http://localhost:5173/discover`.
2. Observe the full-screen Google Map background.
3. Pan (click & drag), zoom (scroll wheel / zoom buttons), and toggle Map/Satellite view.
4. **Expected Outcome**:
   - Google Map renders cleanly without tile gaps.
   - Panning and zooming respond smoothly.
   - AI Chat Assistant Panel floats on top of the right 25% of the screen without resizing or breaking map canvas.

---

## Scenario 2: Single Shared Instance Across Route Transitions

**Goal**: Verify that navigating between pages reuses the single map instance.

1. Navigate to `/discover`.
2. Pan map to a distinct location (e.g. zoom in on a specific landmark).
3. Click navigation links in header to switch to `/heatmap` or `/my-locations`.
4. **Expected Outcome**:
   - Map position and zoom level are preserved during route navigation.
   - No duplicate map canvas elements or re-initialization logs occur.

---

## Scenario 3: Graceful API Error Handling

**Goal**: Verify error fallback rendering on API load failures.

1. Temporarily set an invalid `VITE_GOOGLE_MAPS_API_KEY=invalid_key` or block `maps.googleapis.com` in network developer tools.
2. Refresh the browser page.
3. **Expected Outcome**:
   - Application catches the API failure.
   - A clear error message card is displayed with a retry button instead of a blank screen or unhandled exception.
