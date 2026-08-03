Build the "Heatmap" AI skill, invoked through the AI Chat Assistant Panel, allowing a logged-in user to visualize location/opportunity density on the shared Google Map.

User flow (within the chat panel):
- Mode A — business-based: user has a business type set in their profile (or provides one in the prompt, e.g. "show me a heatmap for my minimarket business"). The AI generates a heatmap layer showing density of relevant demand POIs minus competitor density across the user's default or specified region.
- Mode B — custom prompt: user asks an exploratory question not tied to any business type, e.g. "Show me a heatmap of preschools with rating below 4.0 that are still operational." The AI interprets the intent directly and builds the corresponding BigQuery aggregation.
- The panel shows live status: "Determining the right action..." → "Aggregating location data..." → "Rendering heatmap..."
- The resulting heatmap renders as a layer on the shared Google Map (using the Google Maps visualization library), without removing or replacing any existing pins already on the map.
- The chat responds with a short summary of what the heatmap shows (e.g. "Darker areas indicate higher preschool density with lower ratings").

What "done" looks like:
- A logged-in user can generate a heatmap either from their saved business type with one simple request, or from an arbitrary custom prompt.
- The heatmap renders correctly on the shared map component (reusing the map's layer interface built in the Base Map spec) without conflicting with other visible layers.
- A new heatmap request replaces the previous heatmap layer rather than stacking indefinitely.

Explicitly out of scope for this feature:
- Time-based/historical heatmaps (current snapshot only)
- Exporting heatmap data
- Combining multiple heatmap criteria in a single layer