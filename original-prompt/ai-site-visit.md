Build the "AI Site Visit" AI skill, invoked through the AI Chat Assistant Panel, allowing a logged-in user to get a qualitative visual assessment of a candidate or existing location using Street View imagery and Gemini vision.

User flow (within the chat panel):
- User requests a visual check on a location, e.g. "What does spot 2 look like?" (referring to a prior Discover result) or "Do an AI site visit on my Sudirman branch."
- The panel shows live status: "Determining the right action..." → "Fetching street-level imagery..." → "Analyzing the site visually..."
- The AI fetches Street View Static API images at four headings (0°/90°/180°/270°) around the location's coordinates, plus a satellite snapshot.
- Images are sent to Gemini multimodal (Vertex AI) with a structured prompt assessing storefront visibility, foot/vehicle traffic visible, road width, surrounding building type, and general area condition, returned as structured data (score + short justification per criterion).
- The chat response shows the fetched images alongside the visual assessment, and this visual score is associated with the same location card as any existing numeric Catchment Score for that point.
- If no Street View coverage exists for that coordinate, the AI informs the user in the chat and falls back to a satellite-imagery-only assessment.

What "done" looks like:
- A logged-in user can request and receive a Street View-based visual assessment of any candidate or saved location, combining images and a structured qualitative score.
- The assessment is clearly presented as a companion to (not a replacement for) any numeric catchment score already available for that location.
- Missing Street View coverage is handled gracefully with a clear fallback, not an error or blank result.

Explicitly out of scope for this feature:
- Video or 360° panorama walkthroughs
- Comparing visual scores across multiple sites in a single response
- Caching/reusing a prior Street View assessment automatically without the user re-requesting it (can be a later optimization)