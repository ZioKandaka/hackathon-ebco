Build the "Catchment Score" AI skill, invoked through the AI Chat Assistant Panel, allowing a logged-in user to get a composite performance score for one of their registered business locations.

User flow (within the chat panel):
- User selects a saved location (from their "My Locations" list) or references it by name in a chat message, e.g. "Analyze the catchment for my Sudirman branch within 2km."
- If no radius is given, the AI asks for one or applies a sensible default (e.g. 2km) and states the assumption in its response.
- The panel shows live status: "Determining the right action..." → "Gathering nearby location data..." → "Calculating catchment score..."
- The AI queries BigQuery for POIs within the specified radius of the location's coordinates and computes a composite score (0-100) from these weighted sub-scores: Demand Density, Traffic Proxy (aggregate rating counts), Area Quality (average rating), Competition Density (penalty), Network Saturation (if relevant to business type), and Operational Vitality (% of nearby POIs still operating).
- The chat response includes the overall score plus a breakdown of each sub-score, and the analyzed radius renders as a circle overlay on the shared map around the location's pin.
- User can ask to adjust the radius or re-weight specific sub-scores (e.g. "ignore competition density") and get a recalculated score in the same conversation.

What "done" looks like:
- A logged-in user can get a catchment score for any of their registered locations through a chat request, with a clear breakdown of what contributed to the score.
- The radius used for the analysis is visibly represented on the map.
- Recalculating with adjusted parameters works within the same chat context without needing to restart the request.

Explicitly out of scope for this feature:
- Comparing catchment scores across multiple locations side by side in one view
- Historical score tracking over time
- Route-based (drive-time) catchment boundaries — that's the separate Accessibility feature