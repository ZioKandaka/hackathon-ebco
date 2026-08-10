The current chat orchestration in chat.service.ts and orchestrator.service.ts does not use AI at all — it relies on hardcoded keyword matching (lowerMsg.includes()) and regex (extractAddress, extractBusinessName, extractBusinessType, extractRegionFromMessage, extractRadiusFromMessage, extractTravelMode, extractTimeMinutes, extractMaxRating, extractCustomCategory, extractCustomWeights, findMatchingLocation, planExecution). This does not match the specs, which require genuine AI-based intent detection and structured data extraction using Gemini via Vertex AI. Replace this entire approach with real function calling.

GOAL
Every user message should be sent to Gemini (via @google-cloud/vertexai, using the existing ADC-based Vertex AI setup already configured for this project) with a defined set of tools. Gemini decides which tool(s) to call and extracts the structured arguments itself — no regex, no .includes() keyword matching anywhere in this flow.

STEP 1 — Define tool schemas
Create a FunctionDeclaration for each skill, matching Vertex AI's function-calling schema format (name, description, parameters as a JSON schema with required fields):

- add_business: { businessName: string, businessType: string, address: string } — required: businessName, businessType, address
- discover_locations: { businessType: string, region: string, count?: number } — required: businessType, region
- generate_heatmap: { region: string, businessType?: string, customCategory?: string, maxRating?: number } — required: region
- catchment_score: { locationNameOrId: string, radiusKm?: number, ignoreCompetition?: boolean, ignoreSaturation?: boolean } — required: locationNameOrId
- accessibility_analysis: { locationNameOrId: string, travelMode?: 'drive'|'walk'|'transit', timeMinutes?: number } — required: locationNameOrId
- ai_site_visit: { locationNameOrId: string } — required: locationNameOrId

STEP 2 — Build a VertexAiOrchestratorService
Create a new service that:
1. Accepts the user's message plus recent chat history (for conversational context, e.g. resolving "it" or "that spot" from prior turns).
2. Calls the Gemini model (use the same model already configured for this project in Vertex) with the tool schemas above and the conversation as input.
3. Runs an agentic loop: if Gemini's response includes one or more function calls, execute the corresponding skill(s) with the AI-extracted arguments, feed the tool result(s) back to Gemini as a function response, and call Gemini again — repeat until Gemini returns a final plain-text response with no further function calls.
   - This loop is what naturally handles BOTH single-tool requests and multi-tool orchestration (e.g. "find a spot, check how it looks, and tell me the distance from my branch") — Gemini decides how many tool calls it needs and in what order, so this loop replaces both the current regex intent-detection AND orchestratorService.planExecution/executeChain's separate multi-tool logic.
4. If Gemini's function call is missing a required argument, it should naturally respond with a clarifying question in plain text instead of calling the tool — surface that text directly to the user via the existing SSE status/message stream, exactly as the specs require (no silent defaults).
5. Emit SSE status events at each loop iteration reflecting what's actually happening (e.g. "Calling add_business..." when a function call is dispatched, "Processing result..." after it returns) — replace the current hardcoded status strings with ones derived from which tool is actually executing.

STEP 3 — Rewire the six existing skill execution methods
Keep executeSiteVisitSkill, executeAccessibilitySkill, executeCatchmentSkill, executeHeatmapSkill, executeDiscoverySkill, executeAddBranchSkill's core logic (the actual BigQuery/Geocoding/Street View calls), but change their signatures to accept the already-extracted structured arguments from Gemini's function call, instead of the raw userMessage string. Remove all internal regex/keyword extraction from within them.

STEP 4 — Location matching
Replace findMatchingLocation's keyword-based matching with passing the user's actual list of saved location names to Gemini as context when relevant tools are available (catchment_score, accessibility_analysis, ai_site_visit all take locationNameOrId) — let Gemini itself resolve which saved location the user means from natural phrasing, rather than substring matching.

STEP 5 — Remove dead code
Delete: extractAddress, extractBusinessName, extractBusinessType, extractRegionFromMessage, extractRadiusFromMessage, extractTravelMode, extractTimeMinutes, extractMaxRating, extractCustomCategory, extractCustomWeights, findMatchingLocation, and the entire isX/lowerMsg.includes() intent-detection block in streamChatResponse, along with orchestratorService.planExecution's keyword-based planning. These should no longer be reachable once the Gemini function-calling loop replaces them.

STEP 6 — Also remove the demo/fallback location injection
executeSiteVisitSkill, executeAccessibilitySkill, and executeCatchmentSkill currently push a hardcoded "Sudirman Branch" demo location into userLocations if the user has none saved. This silently fabricates data and isn't in any spec — if a user has no saved locations, the AI should say so and suggest adding one via add_business, not substitute fake data.

Confirm the Vertex AI client is authenticated via the existing ADC setup (GOOGLE_CLOUD_PROJECT=ebco-aidev-ziok) already used elsewhere in this project — no new credentials needed.