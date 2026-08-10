The catchment_score, accessibility_analysis, and ai_site_visit tools currently only work on the user's saved business locations, resolved via resolveLocation(args.locationNameOrId, userLocations). This is too restrictive — these tools must also work on ad hoc locations: candidate spots returned by a prior discover_locations call, or a freeform address the user mentions that isn't saved anywhere.

1. Update each tool's schema (in the Vertex AI function declarations) to accept a more flexible location reference, one of:
   - locationNameOrId: string (matches a saved business location by name/id), OR
   - latitude: number + longitude: number (explicit coordinates, e.g. from a previously discovered candidate), OR
   - address: string (a freeform address to geocode on the fly)
   Only one of these should be required to be present per call; the model should pick whichever it has enough information for based on context.

2. Update executeCatchmentSkill, executeAccessibilitySkill, and executeSiteVisitSkill's resolution logic to a priority order:
   a. If latitude/longitude are provided directly in args, use them as-is.
   b. Else if locationNameOrId is provided, resolve against the user's saved userLocations (existing behavior).
   c. Else if address is provided, call geocodingService.geocodeAddress() to resolve it on the fly (reuse the existing geocoding logic from add_business, but don't save it as a new location — this is a one-off lookup for analysis, not registration).
   d. If none resolve, ask a clarifying question rather than defaulting.

3. Ensure discover_locations' result (candidate name, latitude, longitude, rationale) is included in the assistant's saved chat history message in a way that's actually readable as text — not just attached as structured accumulatedPayloads data that never gets sent back to Gemini as context. Gemini only "remembers" what's in the text of prior turns, so if a user later says "check catchment for spot 2," the coordinates for spot 2 need to be visible in the conversation history text for Gemini to extract and pass them as latitude/longitude arguments to catchment_score.

4. Update the systemContext prompt in processUserMessage to explicitly state: "When the user refers to a previously discovered candidate spot (e.g. 'spot 2'), use its latitude/longitude from the earlier conversation turn directly as the latitude/longitude arguments — do not assume it is a saved business location."