---
title: "Phase 12: Worker Research Reliability"
aliases: [phase-12-approach, worker-research-fix, research-loop-reliability]
category: decisions
tags: [local-worker, prompt-tuning, research-loop, debugging]
parents: [phase-12-worker-research-reliability]
created: 2026-04-27
updated: 2026-04-27
source: plan
confidence: medium
---

## Context

Live testing after Phase 11 revealed that research loop workers (Qwen 3 30B via llama-cpp) burn all 6 iterations on web_search/web_extract without ever calling wiki_write — producing no wiki output. Three contributing factors:

1. **Tight iteration budget:** `maxIterations` hardcoded to 6 in `dispatch.ts:59`. A research pipeline needs 5+ iterations minimum (search, extract x2, synthesize, wiki_write). No margin for retries or exploration.
2. **No iteration-aware prompting:** The worker system prompt (`prompt-builder.ts`) contains zero guidance about iteration budgets or tool sequencing. Qwen doesn't know it should prioritize reaching wiki_write.
3. **Blind debugging:** `AgentLoopResult.toolTrace` is computed but silently discarded when writing `TaskState` result JSON. Cannot diagnose which iterations are wasted without manually inspecting logs.

Additionally, SKILL.md files contradict each other: research-loop says "≤6", local-worker says "10", experiments recommend 10.

## Decision

**Three-track fix: observability → prompt tuning → iteration budget.**

### Track 1: Tool Trace Persistence
Add `toolTrace` to `TaskState` so result JSON includes the full tool call history. This makes worker behavior inspectable from the orchestrator's `checkWorkerResults` path.

### Track 2: Iteration-Aware System Prompt
When tools are present and task type is `research`, inject tool-usage budget guidance into the system prompt: sequence guidance (search → extract → synthesize → wiki_write) and an explicit reservation ("save your last 2 iterations for synthesis and wiki_write").

### Track 3: Configurable max_iterations
Add optional `max_iterations` field to `TaskContract` and `dispatch_worker` MCP tool schema. Default 10 (matching experiment baseline). Orchestrator can tune per-dispatch.

**Rejected alternatives:**
- *Bump hardcoded default only (no schema change):* Simpler but removes orchestrator control. The orchestrator already shapes `context_budget_tokens` and `timeout_ms` per-task — `max_iterations` is the same kind of knob.
- *Per-iteration countdown injection:* Inject "iteration N of M" into each user message. Rejected — bloats context per turn and experiments show Qwen handles budget guidance in system prompt adequately.
- *Force wiki_write via postcondition penalty:* Add T0 check for "Written to" substring. Rejected — verification runs after completion; it can detect failure but not prevent it.

## Consequences

- Worker results become debuggable (tool trace visible to orchestrator and status queries)
- Research workers prioritize reaching wiki_write within budget
- Orchestrator can tune iteration budget per-task (6 for simple, 10 for research)
- SKILL.md contradictions resolved
