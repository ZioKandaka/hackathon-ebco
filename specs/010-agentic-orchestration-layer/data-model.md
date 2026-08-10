# Data Model & Domain Entities: Agentic Orchestration Layer

## 1. Core Domain Entities

### ToolDefinition
Schema defining a registered callable skill in the orchestration registry.

| Field | Type | Required | Description / Constraints |
|---|---|---|---|
| `toolName` | `string` | Yes | Unique tool key (`'discover'`, `'heatmap'`, `'catchment'`, `'accessibility'`, `'site_visit'`, `'add_branch'`) |
| `description` | `string` | Yes | Human-readable explanation of tool capability |
| `inputParams` | `object` | Yes | Expected parameter key-value schema |
| `outputType` | `string` | Yes | Returned payload data structure |

---

### OrchestrationExecutionStep
Represents a single tool invocation step within a multi-tool execution plan.

| Field | Type | Required | Description / Constraints |
|---|---|---|---|
| `stepNumber` | `number` | Yes | Sequential step order (1 to 5) |
| `toolName` | `string` | Yes | Target tool name |
| `status` | `enum` | Yes | `'pending'`, `'running'`, `'completed'`, or `'failed'` |
| `statusMessage` | `string` | Yes | Human-readable status update text streamed over SSE |
| `outputData` | `object` | Optional | Result data emitted by tool |

---

### OrchestrationResultPayload
Combined DTO transmitted over SSE in the final `message` event when orchestration completes.

| Field | Type | Required | Description / Constraints |
|---|---|---|---|
| `planId` | `string` | Yes | Unique execution session ID |
| `totalSteps` | `number` | Yes | Total tool calls executed (1 to 5) |
| `executedSteps` | `OrchestrationExecutionStep[]` | Yes | Array of step execution logs |
| `combinedMapState` | `object` | Yes | Unified map artifacts containing candidates, heatmap points, radius circle, isochrone polygon, and site visit coordinates |
| `synthesizedContent` | `string` | Yes | Unified natural-language response narrative synthesizing all tool findings |

---

## 2. Validation & Execution Rules

1. **Max Tool Call Cap (FR-006)**: An orchestration chain MUST NOT exceed 5 tool calls in a single turn.
2. **Redundancy Prevention (FR-007)**: The orchestrator MUST NOT invoke the exact same tool with identical arguments twice in a single conversation turn.
3. **Graceful Failure Recovery (FR-005)**: If Step N fails, the orchestrator logs the step failure, proceeds with independent remaining steps (if any), and synthesizes a partial report noting the failure.
4. **Single-Tool Pass Through (SC-002)**: Requests requiring only 1 tool execute directly without multi-step overhead or latency penalty.
