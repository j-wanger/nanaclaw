---
title: "Phase 6a: Worker Tool-Calling via Multi-Turn Agent Loop"
aliases: [worker-tool-calling-approach, worker-agent-loop-decision]
category: decisions
tags: [local-worker, tool-calling, agent-loop, architecture]
parents: [phase-06a-worker-tool-calling]
created: 2026-04-26
updated: 2026-04-26
source: plan
confidence: medium
---

## Context

Phase 6 (Scheduling + Autonomous Loops) requires workers to execute research loops autonomously — searching the web, extracting content, and writing to wiki episodic/. Current workers are single-shot (one inference call, no tool access). The orchestrator would be blocked for the entire research duration if it ran the loop itself. User requirement: orchestrator must remain free to handle other messages while research runs.

Evaluated: (A) Orchestrator pre-fetches + workers synthesize (blocks orchestrator during fetch), (B) Workers get tool access via multi-turn agent loop (workers independent), (C) Hybrid batch-fetch + parallel dispatch (partial blocking). User chose B.

## Decision

**Workers get multi-turn tool access via an agent loop in the dispatch module.** The existing `executeWorkerTask` branches: if contract has `tools: string[]` field, it runs an agent loop (inference → parse tool calls → execute → re-query → repeat until done or limit). If no tools field, existing single-shot path unchanged.

Key design choices:
- **Tool registry:** Per-contract allowlist — not all tools exposed to every worker
- **Semaphore:** Acquire/release per-inference-call (not per-loop) — prevents one long worker from starving others
- **Termination:** max_iterations + timeout_ms + model produces text (no tool call)
- **Experiments first:** Qwen tool-calling reliability unknown — test before implementing. Go/no-go gate: if <60% pass rate, pivot to structured XML tags with regex parsing

## Consequences

- Workers become capable of autonomous multi-step tasks (research, data collection, complex synthesis)
- Orchestrator fully non-blocking after dispatch — handles user messages while workers run
- Increased llama-cpp load per worker task (5-10 inference calls vs 1)
- Semaphore granularity change may affect concurrent dispatch behavior
- Phase 6b (Research Loop) becomes straightforward once workers can use tools
- Original Phase 6 (Scheduling + Autonomous Loops) split into 6a (this) + 6b (research loop + episodic)
