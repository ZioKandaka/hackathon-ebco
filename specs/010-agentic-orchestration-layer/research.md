# Research & Technical Decisions: Agentic Orchestration Layer

## 1. Agentic Intent Decomposition & Tool Execution Planner

### Decision
Implement `OrchestratorService` (`backend/src/modules/chat/orchestrator.service.ts`) using multi-intent rule & keyword parsing to decompose complex user prompts into an ordered tool execution plan `[Step 1, Step 2, ... Step N]`.

### Registered Tool Registry (FR-001)
1. `discover_tool`: Search location candidate spots based on business type and region.
2. `heatmap_tool`: Generate spatial density heatmap points and visual color gradient.
3. `catchment_tool`: Compute 6-factor composite catchment performance score for a saved location.
4. `accessibility_tool`: Compute travel-time (`drive`, `walk`, `transit`) isochrone catchment score.
5. `site_visit_tool`: Fetch 4-heading Street View + satellite imagery and evaluate visual criteria.
6. `add_branch_tool`: Register a new business branch location in the user's account.

### Rationale
- **Deterministic & High-Speed (SC-001, SC-002)**: Intent decomposition runs in < 50ms, allowing multi-tool execution chains (e.g., Discover → Heatmap) to complete within 6 seconds without LLM latency overhead for plan generation.
- **Safety Cap (FR-006)**: Sequential execution is capped at a maximum of 5 tool calls per turn to prevent infinite loops.

---

## 2. Inter-Tool Data Context Propagation

### Decision
Maintain a shared `OrchestrationContext` state during each multi-tool execution chain.

```typescript
export interface OrchestrationContext {
  userId: string;
  originalPrompt: string;
  matchedLocations: UserLocation[];
  discoveredCandidates: DiscoveryCandidate[];
  activeHeatmapPoints?: WeightedHeatmapPoint[];
  catchmentResult?: CatchmentCalculationResult;
  accessibilityResult?: AccessibilityCalculationResult;
  siteVisitResult?: SiteVisitResult;
  executedSteps: Array<{ toolName: string; status: 'completed' | 'failed'; summary: string }>;
}
```

### Rationale
- **Seamless Data Chaining (FR-003)**: Output from Step 1 (e.g., top candidate coordinates from `Discover`) is automatically passed into Step 2 (e.g., `SiteVisit` or `Accessibility`) without requiring manual re-prompting.

---

## 3. SSE Progress Streaming & Multi-Tool Response Synthesis

### Decision
Extend `ChatService` and `ChatSseService` to emit step-by-step SSE `status` events as each tool begins execution, culminating in a single atomic SSE `message` event containing the combined visual map state and synthesized natural-language report.

### Rationale
- **Progress Visibility (FR-004, SC-003)**: The user sees the live status update change dynamically for each step in the chain.
- **Cohesive Synthesis (FR-009)**: The final message synthesizes all completed step findings into one readable narrative, passing combined map artifacts (pins + spatial overlays) to the frontend in a single payload.
