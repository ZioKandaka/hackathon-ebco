Build the "Add Business/Branch" AI skill, invoked through the existing AI Chat Assistant Panel, allowing a logged-in user to register a new business or branch location conversationally.

User flow (within the chat panel):
- User types a request like "Create new shop on Jl. Sudirman No. 10, Kota Bekasi" or "Add my branch at [address], call it [name], it's a coffee shop."
- The panel shows live status as the backend works: e.g. "Determining the right action..." → "Looking up that address..." → "Creating your new branch..."
- The AI extracts the address from the message and calls the Google Geocoding API to resolve it into latitude/longitude and normalized address components (province, city/regency, sub-district, postal code).
- If the business name or business type is missing from the message, the AI asks one short follow-up question in the chat, rather than guessing silently.
- Once resolved, the AI creates a new location record scoped to the logged-in user's account (name, business type, full address, lat/lng, geocoding confidence).
- The panel confirms with a short summary message, and the new location appears as a pin on the Google Map, centered on the resolved coordinate.
- The new location immediately appears in a "My Locations" list/view, available for other features (Catchment Scoring, Accessibility) without further setup.

Edge cases to handle:
- Address not found or too ambiguous to geocode confidently: the AI presents the top matching candidates from the Geocoding API in the chat and asks the user to confirm which one is correct.
- Duplicate location: if a very similar address is already registered to this user, the AI notes this in the chat and asks whether to proceed anyway or treat it as an update to the existing one.

What "done" looks like:
- A logged-in user can add a new location purely through a natural-language chat message in the panel, with no separate "Add Location" form anywhere in the app.
- The live status updates in the panel accurately reflect what's happening on the backend at each step.
- The created location is correctly scoped to that user only.
- The new location appears both in a list view and as a pin on the shared Google Map.
- Ambiguous or failed geocoding is handled gracefully with a clarifying question in the chat, never a silent wrong guess.

Explicitly out of scope for this feature:
- Editing or deleting an existing location
- Bulk import of multiple locations at once
- Manual pin-drop-on-map location entry