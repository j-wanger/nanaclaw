# Local Worker Dispatch

Dispatch tasks to the local Qwen worker for parallel execution. You continue working while the worker runs — results auto-surface when complete.

## Tools

- `dispatch_worker` — fire-and-forget dispatch. Returns immediately with a task ID.
- `get_worker_status` — check one or all tasks (manual check only — results auto-surface).
- `cancel_worker` — cancel a pending task.

## When to Dispatch

Use the worker for bounded, well-specified tasks where the output can be verified:
- **Code implementation** from a clear spec (function signature + behavior description)
- **Structured output** (JSON extraction, data transformation)
- **Research synthesis** (summarize a document, compare approaches)
- **File operations** (generate a file from spec, extract data, modify a section)

Do NOT dispatch when:
- The output depends on information only you have in context
- The task is too small to justify dispatch overhead (~5s minimum)
- You need the result before you can continue (use the worker for parallel work)

## How to Dispatch

```
dispatch_worker({
  objective: "Implement a CSV parser that handles quoted fields",
  outputFormat: "code",
  type: "code-impl",
  context: "<relevant code or specs — keep under 8K tokens>",
  boundaries: ["Do not add external dependencies"],
  postconditions: [
    { type: "contains", params: { substring: "parseCsv" } }
  ],
  context_budget_tokens: 4096
})
```

### Output Format Guide

| Format | System prompt | Post-processing |
|--------|-------------|-----------------|
| `json` | "Output ONLY valid JSON" | Auto-validated; implicit T0 check |
| `code` | "Output ONLY the code" | Markdown fences auto-stripped |
| `markdown` | Plain response | Passed through as-is |

### Context Budget

Target **4K-8K tokens** per dispatch. The worker performs best with focused context — don't dump your full conversation. Include only what's needed: the spec, relevant code, and constraints.

## Results Auto-Surface

You do NOT need to poll or call `get_worker_status`. When a worker completes (or fails/times out), the result is automatically injected into your next turn with:
- Task ID and status (completed/failed/timeout)
- T0 verification result (PASSED/FAILED with details)
- The worker's output

Review the result and decide: accept, retry with adjustments, or handle the failure.

## Model Routing

Tasks are routed to different model endpoints by type. The host injects routing config from `models.json` at spawn. If no routing config exists, all tasks go to the default llama-cpp endpoint.

| Task Type | Best Model For | Why |
|-----------|---------------|-----|
| `code-impl` | Large (35B) | Code quality scales with model size |
| `file-op` | Large (35B) | Structural accuracy matters |
| `research` | Small (7B) | Summarization doesn't need large models |
| `structured-output` | Small (7B) | JSON extraction is mechanical |

You don't need to specify a model — routing happens automatically based on `type`. A per-endpoint concurrency semaphore prevents overwhelming any single model server (per-session).

## Tool-Calling Workers

Workers can use MCP tools autonomously via multi-turn agent loops. Add a `tools` field to the dispatch contract to enable this:

```
dispatch_worker({
  objective: "Research graph RAG approaches: search the web, extract key articles, and write a synthesis",
  outputFormat: "markdown",
  type: "research",
  context: "Focus on Microsoft GraphRAG and LightRAG",
  tools: ["web_search", "web_extract", "wiki_write"],
  timeout_ms: 180000,
  context_budget_tokens: 6000,
  postconditions: [
    { type: "contains", params: { substring: "## Key Findings" } }
  ]
})
```

### How it works

1. Worker receives the contract + tool definitions
2. Runs an agent loop: inference → tool call → execute → inject result → repeat
3. Terminates when: model produces final text (no tool call), reaches max iterations (10), or hits timeout
4. Result surfaces via auto-pickup with tool trace included

### Available tools for workers

Any registered MCP tool can be given to a worker. Common combinations:
- **Research:** `["web_search", "web_extract", "wiki_write"]`
- **Data collection:** `["web_search", "web_extract"]`
- **Knowledge capture:** `["wiki_write"]`

### When to use tool-calling workers

- Multi-step research that you'd otherwise do yourself (search → extract → synthesize)
- Autonomous data collection tasks
- Any task where the worker needs to interact with external systems

### Important constraints

- Each tool call in the loop acquires and releases the semaphore independently (other workers can interleave)
- The worker's 4K-8K context budget fills fast with tool results — plan for 3-5 useful iterations
- Workers naturally retry on tool errors (bounded by max iterations, not infinite)
- If no tools are needed, omit the `tools` field — single-shot mode is unchanged

## Multi-Worker Coordination

You can dispatch multiple workers in parallel. Each runs independently against the local model (requests queue at the llama-cpp server level with per-endpoint concurrency limits). Tips:
- Dispatch independent tasks together — they queue automatically
- Keep each task self-contained (no shared state between workers)
- Review results as they arrive; don't wait for all to complete
