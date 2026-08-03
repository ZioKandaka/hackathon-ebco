Build the base map component — the persistent Google Map that serves as the primary visual surface of the app, on top of which all other features (location pins, heatmap layers, isochrone polygons, route overlays) render.

Core behavior:
- The map uses the Google Maps JavaScript API as the base map, per project constitution — no alternative map libraries.
- The map is the main content area of the app, visible on every authenticated page/view, occupying the full page area except where the AI Chat Assistant Panel floats on top of it (right ~25% of the screen).
- On load, the map centers on a sensible default view (e.g. the user's primary business region if set in their profile, otherwise a default region such as Jakarta/West Java, or the user's browser geolocation if permission is granted).
- Standard map interactions are available: pan, zoom, and standard Google Maps controls (zoom buttons, map type if desired).

Shared map instance:
- There is a single shared map instance/component used across the app — features do not each create their own separate map. This ensures pins, heatmaps, and overlays from different features can coexist on the same view rather than conflicting or duplicating map instances.
- The map component exposes a way for other features to add/remove layers (pins, heatmap data, polygons) without needing to manage the underlying Google Maps API directly — a clean interface other feature specs can build against.

State handling:
- If the Google Maps API fails to load (network issue, invalid API key, quota exceeded), the app shows a clear error state instead of a blank page or silent failure.
- The map component handles window resize gracefully (e.g. when the chat panel opens/closes or the window is resized).

What "done" looks like:
- A logged-in user sees a functioning, interactive Google Map as the main view immediately after login.
- The map loads correctly with proper error handling if the API key or connection fails.
- The map component is built as reusable shared infrastructure that other features (pins, heatmap, routes) can plug into without re-initializing their own map instance.

Explicitly out of scope for this feature:
- Any actual data layers (pins, heatmaps, routes) — those come from later feature specs
- Custom map styling/theming beyond default Google Maps appearance (can be a later polish pass)
- Offline map support