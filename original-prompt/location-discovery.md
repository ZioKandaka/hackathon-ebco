Build the "Discover" AI skill, invoked through the AI Chat Assistant Panel, allowing a logged-in user to find candidate locations for a new business.

User flow (within the chat panel):
- User types a request such as "Find me the top 5 spots to open a coffee shop in Kediri" or "Where should I open a minimarket near Gampengrejo?"
- The panel shows live status: "Determining the right action..." → "Analyzing candidate areas..." → "Ranking results..."
- The AI extracts business type and target region from the message. If either is missing or too vague to search, it asks one short clarifying question in the chat.
- The AI queries BigQuery (POI dataset in bni-geospatial-845e) to identify areas with strong demand density (relevant POI types for the business), low competition density (same-type POIs nearby), and reasonable operational vitality, within the target region.
- Results are returned as a ranked list (e.g. top 5) of candidate points, each with a short natural-language explanation of why it scored well (e.g. "High school density, no existing coffee shops within 1km").
- Each candidate renders as a distinct pin on the shared Google Map, and the chat response includes a summary list matching the pins.
- Clicking a candidate pin (or referencing it in a follow-up chat message, e.g. "tell me more about spot 2") shows more detail about that specific point.

What "done" looks like:
- A logged-in user can get a ranked list of real candidate locations from a natural-language prompt, without manually specifying coordinates or search radius.
- Results appear both in the chat as text and as pins on the map simultaneously.
- Vague or incomplete prompts trigger a clarifying question rather than a wrong guess or generic error.

Explicitly out of scope for this feature:
- Saving a discovered candidate as a registered business location (that's a follow-up action, potentially reusing the Add Business skill)
- Comparing multiple regions in one request
- Drive-time-based discovery (radius-based only here; route-based accessibility is a separate feature)