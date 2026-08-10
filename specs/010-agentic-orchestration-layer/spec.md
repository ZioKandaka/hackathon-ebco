# Feature Specification: Agentic Orchestration Layer

**Feature Branch**: `010-agentic-orchestration-layer`

**Created**: 2026-08-10

**Status**: Draft

**Input**: User description: "@original-prompt/orchestration.md"

## Clarifications

### Session 2026-08-10

- Q: How should candidate references in follow-up tool calls (e.g., "check how spot 1 looks") be resolved during multi-tool orchestration? → A: Require the user to view Discover candidate results in chat before prompting for a site visit or accessibility check on spot 1.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Dynamic Multi-Tool Intent Reasoning & Execution (Priority: P1) 🎯 MVP

As an authenticated user, I want to submit complex multi-intent requests in a single chat message (e.g., "Find me the best spot for a coffee shop in Gampengrejo, check how it looks, and calculate drive time from my Sudirman branch") so that the AI Assistant autonomously chains the relevant tools (Discover → AI Site Visit → Accessibility Analysis), passes output data from step to step, and returns a single unified response without requiring manual re-prompting.

**Why this priority**: Dynamic multi-tool orchestration elevates the AI Assistant from isolated single-function skills into a true end-to-end location intelligence partner.

**Independent Test**: Can be fully tested by submitting a multi-intent prompt in chat, verifying that the AI dynamically invokes multiple tool skills sequentially, streams live step-by-step status updates for each tool executed, updates the shared map canvas with combined pins/polygons/imagery, and synthesizes the outputs into one coherent answer.

**Acceptance Scenarios**:

1. **Given** an authenticated user submitting a multi-tool prompt (e.g., "Find coffee shop candidates in Kediri and show a heatmap for minimarket density"), **Then** the system analyzes intent, executes Discovery tool followed by Heatmap tool sequentially, streams status updates for each tool, renders candidate pins and heatmap overlay on the shared map, and presents a single synthesized response in chat.
2. **Given** a single-tool request (e.g., "Add my new coffee shop branch at Jl. Sudirman No. 10"), **Then** the system executes only the Add Branch tool without adding unnecessary orchestration overhead or extra steps.
3. **Given** a general conversational message without tool intent (e.g., "How does location catchment scoring work?"), **Then** the system responds directly in chat without invoking any tools.

---

### User Story 2 - Real-Time Multi-Step Progress Streaming & Error Resilience (Priority: P2)

As a user executing a multi-tool request, I want to see real-time status updates for each tool step in the chain as it executes and receive clear error explanations if an individual tool step fails so that I always understand progress and partial results.

**Why this priority**: Ensures transparency during longer multi-step execution chains and prevents silent failures.

**Independent Test**: Can be fully tested by submitting a 3-tool request where step 2 encounters missing data (e.g. no Street View coverage), verifying that status updates stream step 1 → step 2 → step 3, step 2 failure is reported gracefully in chat, independent step 3 executes, and the final response explains the partial result.

**Acceptance Scenarios**:

1. **Given** a multi-step tool execution chain, **When** each tool in the sequence starts executing, **Then** the AI Chat Panel live-status indicator updates in real time to display the current tool's step description (e.g., "Searching candidate locations..." → "Checking street-level imagery..." → "Calculating travel-time boundary...").
2. **Given** a 3-tool chain where one tool fails (e.g., Street View API unavailable for step 2), **Then** the system logs the specific failure, continues with non-dependent remaining tool calls (step 3), and notes what could and could not be completed in the final chat response.
3. **Given** a single conversational turn, **When** the AI plans execution, **Then** it avoids calling the exact same tool redundantly with identical parameters within the same turn.

---

### User Story 3 - Coherent Synthesis & Combined Map Overlay Rendering (Priority: P3)

As a user reviewing multi-tool results, I want the final AI chat response to read as a single well-structured narrative with all relevant map overlays (pins, heatmaps, isochrones, circles) rendered together on the shared Google Map so that I can inspect the complete analysis visually and textually.

**Why this priority**: Delivers a cohesive, high-quality user experience combining map graphics and natural-language analysis.

**Independent Test**: Can be fully tested by executing a Discover + Accessibility request in one turn, verifying that candidate pins and the isochrone polygon overlay render together on the map canvas, and confirming the chat message synthesizes candidate rankings and drive times into one narrative.

**Acceptance Scenarios**:

1. **Given** a multi-tool chain producing candidate locations and spatial boundaries, **When** all tool steps complete, **Then** the shared map canvas updates to display candidate pins alongside spatial overlays (heatmap, circle, or isochrone polygon) in a unified view.
2. **Given** completed tool outputs from multiple steps, **When** the AI generates the final response message, **Then** it synthesizes key findings into a single cohesive answer rather than appending raw concatenated outputs.

---

### Edge Cases

- What happens if the user prompt implies a circular dependency or infinite tool loop? The orchestration engine limits maximum sequential tool invocations to 5 tool calls per conversational turn, stopping and returning synthesized results up to that point.
- What happens if a tool in the chain requires user clarification (e.g., user asked to "Analyze catchment" but has 0 saved locations)? The AI halts the chain, explains the missing requirement in chat, and prompts the user for input.
- What happens if a tool returns 0 results mid-chain? The AI explains the 0-result outcome for that specific step and adjusts or skips subsequent dependent steps gracefully.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST register all 6 existing AI skills (Discover, Heatmap, Catchment Scoring, Accessibility Analysis, AI Site Visit, Add Business/Branch) as callable agentic functions with defined name, description, and input/output parameter schemas.
- **FR-002**: System MUST autonomously analyze user prompt intent, determine required tool invocations (0, 1, or multiple), plan execution order, and execute tools sequentially in a single conversation turn.
- **FR-003**: System MUST pass output data from prior tool invocations into subsequent tool inputs within the same execution chain (e.g. coordinates from saved locations or established candidate spots), requiring candidate spot references ("spot 1") to match candidates present in chat history or active discovery results.
- **FR-004**: System MUST stream real-time SSE status updates for each individual tool call in the sequence as it begins executing (e.g., "Searching candidate locations..." → "Checking street-level imagery...").
- **FR-005**: System MUST handle tool execution failures gracefully by reporting the specific failed step in chat, proceeding with non-dependent steps, and synthesizing partial or complete outcomes.
- **FR-006**: System MUST cap maximum sequential tool calls per conversational turn to 5 invocations to prevent infinite loops.
- **FR-007**: System MUST avoid redundant tool calls with identical arguments within a single conversation turn.
- **FR-008**: System MUST update the shared Google Map instance with all relevant visual artifacts (pins, heatmaps, circles, isochrone polygons) produced across the tool chain.
- **FR-009**: System MUST synthesize outputs from all executed tools into one cohesive, well-structured natural-language response.

### Key Entities

- **Orchestration Execution Plan**: Represents the agentic tool execution graph (`planId`, `userMessage`, `steps` [{ stepNumber, toolName, toolParams, status: 'pending'|'running'|'completed'|'failed' }]).
- **Tool Definition**: Schema registering an AI skill (`toolName`, `description`, `inputSchema`, `outputSchema`).
- **Synthesized Orchestration Result**: Final combined response payload (`userMessage`, `executedSteps` [{ toolName, status, resultData }], `combinedMapState` { pins, heatmapPoints, catchmentCircle, isochronePolygon }, `synthesizedContent`).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Complex multi-intent requests invoking 2 or 3 tools complete execution, map rendering, and response synthesis within 6 seconds.
- **SC-002**: Single-tool and general chat messages execute without additional orchestration latency penalty (< 3 seconds).
- **SC-003**: 100% of multi-tool execution chains stream real-time SSE status updates for every invoked tool step.
- **SC-004**: 100% of tool failures in a chain are reported specifically without crashing or failing silently.

## Assumptions

- **Sequential Execution**: Sequential tool execution within a turn is acceptable and preferred for deterministic data flow between tools.
- **Shared Map Canvas**: Reuses `GoogleMapService` layer management for coordinating pins, heatmaps, circles, and polygons on the single map instance.
- **Out of Scope**: Persisting multi-step chains as saved "workflows", user-configurable tool permission toggles, and parallel tool call execution are explicitly out of scope for this feature.
