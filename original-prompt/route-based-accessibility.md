Build the "Accessibility Analysis" AI skill, invoked through the AI Chat Assistant Panel, allowing a logged-in user to evaluate a location's catchment using real travel time instead of a simple radius.

User flow (within the chat panel):
- User requests an accessibility check on a saved location or a Discover candidate, e.g. "Check how accessible my Sudirman branch is within a 10 minute drive."
- User specifies (or the AI asks for) a travel mode (drive/walk/transit) and a time threshold.
- The panel shows live status: "Determining the right action..." → "Calculating travel-time boundary..." → "Analyzing reachable area..."
- The AI calls the Routes API to compute an isochrone (the actual reachable area within the time/mode constraint) around the location's coordinates.
- The isochrone polygon renders on the shared Google Map, replacing or alongside the simple radius circle if one was previously shown.
- The Catchment Scoring engine re-runs using this isochrone as the spatial boundary instead of a radius, producing a score using the same sub-score breakdown as the Catchment Scoring feature.
- The chat response presents the drive-time-based score and notes any meaningful difference from a radius-based score if one was previously calculated for the same location in the conversation.

What "done" looks like:
- A logged-in user can request a travel-time-based accessibility analysis and see both the isochrone shape and a resulting catchment score.
- The isochrone accurately reflects real road/transit network constraints (not a circle) for the chosen mode and time threshold.
- The scoring logic is shared/reused from the Catchment Scoring feature rather than duplicated.

Explicitly out of scope for this feature:
- Multi-modal comparison in a single request (one mode per analysis)
- Traffic-time-of-day scenario comparison (e.g. rush hour vs off-peak) — single current estimate only