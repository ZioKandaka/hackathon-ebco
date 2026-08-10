/speckit.specify Build the Agentic Orchestration layer for the AI Chat Assistant Panel — enabling the AI to freely combine multiple existing tools (Discover, Heatmap, Catchment Scoring, Accessibility Analysis, AI Site Visit, Add Business/Branch) in a single conversation turn, chosen dynamically based on user intent rather than a fixed predefined sequence.

Core behavior:
- All existing tools (Discover, Heatmap, Catchment Scoring, Accessibility, AI Site Visit, Add Business) are registered with the AI as callable functions/tools, each with a clear name, description, and input/output schema.
- Given a single user message, the AI reasons about which tool(s) are needed, in what order, and calls them autonomously — including using the output of one tool as input to a subsequent tool call, without requiring the user to manually trigger each step.
- The AI is not restricted to a fixed list of "known" multi-step flows — it can combine any subset of the available tools in whatever order the user's request implies, including single-tool requests (already-existing behavior) and requests that don't map to any tool at all (general conversation/clarification).
- Example: "Find me the best spot for a coffee shop in Gampengrejo, check how it looks, and tell me how far it is from my two existing branches" should result in the AI calling Discover, then AI Site Visit on top candidates, then Accessibility/Distance calculations against the user's saved locations — all within one conversational turn, without the user re-prompting between steps.

Status visibility during multi-step execution:
- The chat panel's existing live-status streaming (built for single-tool calls) is extended to reflect multi-step execution: each tool call in the sequence shows its own status update as it runs (e.g. "Searching candidate locations..." → "Checking street-level visuals..." → "Calculating distance from your branches...").
- The user can see, in real time, which step of a multi-step chain is currently executing — not just a single generic "processing" state for the whole chain.

Result synthesis:
- Once all necessary tool calls complete, the AI synthesizes their combined outputs into one coherent natural-language response — not a raw concatenation of each tool's individual output.
- All relevant map updates from the tools involved (pins, heatmap layers, isochrone polygons) render together on the shared map after the full chain completes, reflecting the combined result.

Error handling within a chain:
- If one tool call in a multi-step chain fails (e.g. a location can't be geocoded, no Street View coverage exists), the AI reports which specific step failed in the chat, and either continues with the remaining steps if they don't depend on the failed one, or explains what couldn't be completed and why — never fails silently or halts with a generic error.
- The AI avoids calling the same tool redundantly within a single chain if a prior result already satisfies the need (e.g. don't re-run Discover twice for the same region within one response).

What "done" looks like:
- A single, sufficiently complex user request can trigger 2 or more tools in one turn, with correct data flowing from one tool's output into a subsequent tool's input where relevant.
- A simple, single-tool request (e.g. "add a new branch at...") continues to work exactly as it did before — orchestration doesn't add unnecessary steps to requests that only need one tool.
- The user can follow along with what's happening at each step via the live status stream, for both single- and multi-step requests.
- The final response reads as one coherent answer, not a list of disconnected tool outputs.

Explicitly out of scope for this feature:
- Persisting or replaying a specific multi-step chain as a reusable saved "workflow"
- User-configurable tool permissions (e.g. disabling specific tools from being auto-invoked)
- Parallel execution of independent tool calls (sequential execution is acceptable for this version)