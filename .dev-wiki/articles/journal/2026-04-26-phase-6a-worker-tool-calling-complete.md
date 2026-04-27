---
title: "Phase 6a: Worker Tool-Calling Runtime Complete"
aliases: []
category: journal
tags: [local-worker, tool-calling, agent-loop, experiments]
parents: [phase-06a-worker-tool-calling]
created: 2026-04-26
updated: 2026-04-26
source: debrief
---

# Phase 6a: Worker Tool-Calling Runtime Complete

## What Happened
- Ran 12 tool-calling experiments against Qwen3.6-35B-A3B via llama-cpp — 100% adjusted pass rate
- OpenAI function_call format works perfectly; no pivot to XML tags needed
- Implemented worker tool registry (buildToolDefinitions, executeTool), agent loop (multi-turn inference→tool-exec cycle), and dispatch integration
- All 9 tasks completed in a single session. Phase split from original Phase 6 into 6a (this) + 6b (research loop)
- Key discovery: model retries on tool errors (good for resilience) and skips tools when it knows the answer (good for efficiency)

## Decisions Made
- [[phase-6a-worker-tool-calling-approach|Worker Tool-Calling via Multi-Turn Agent Loop]] — workers get tool access via agent loop in dispatch module

## Problems Solved
- Qwen tool-calling format unknown → experiments confirmed OpenAI function_call works perfectly with llama-cpp
- Semaphore contention concern → per-inference-call acquire/release (not per-loop) prevents starvation

## Artifacts Changed
- `container/agent-runner/src/mcp-tools/local-worker/tool-registry.ts` (new: tool lookup + OpenAI format builder)
- `container/agent-runner/src/mcp-tools/local-worker/agent-loop.ts` (new: multi-turn execution loop)
- `container/agent-runner/src/mcp-tools/local-worker/dispatch.ts` (extended: branches on tools field)
- `container/agent-runner/src/mcp-tools/local-worker/contract.ts` (extended: optional tools field)
- `container/agent-runner/src/mcp-tools/server.ts` (added: getRegisteredTool export)
- `container/skills/local-worker/SKILL.md` (added: Tool-Calling Workers section)
- `scripts/tool-call-bench.ts` (new: experiment harness)
- `docs/tool-call-experiment-log.md` (new: 12 experiments documented)

### Review Gate
Score: 7/10, verdict: accept. Two MEDIUM issues for follow-up: (1) duplicated semaphore pool between agent-loop.ts and dispatch.ts — should be consolidated, (2) tool trace dropped from TaskState — SKILL.md promises it but it's not persisted.

### Activation Quality
Active knowledge: 4 entries, 3 referenced (~75% approximate hit rate, literal match). Healthy activation.

## Related
- [[phase-06a-worker-tool-calling|Phase 6a: Worker Tool-Calling Runtime]]
