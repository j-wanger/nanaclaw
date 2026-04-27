---
title: "Phase 3b: Dispatch Module Implementation"
aliases: [phase-3b, dispatch-module, local-worker]
category: phases
tags: [local-worker, dispatch, contract, qwen]
parents: [phase-03a-qwen-experiments]
created: 2026-04-25
updated: 2026-04-26
source: plan
status: completed
scope: ["container/agent-runner/src/mcp-tools/local-worker/**", "container/agent-runner/src/poll-loop.ts", "container/agent-runner/src/mcp-tools/index.ts", "container/skills/local-worker/**"]
entry_criteria: "Phase 3a complete, llama-cpp running, Phase 2 host-mode available"
exit_criteria: "Module builds + bun test passes, dispatch returns valid JSON, T0 verification works, timeout terminates cleanly, E2E Claude→Qwen→Claude cycle works"
---

# Phase 3b: Dispatch Module Implementation

## Objective

Build async local worker dispatch: container-side MCP tools with fire-and-forget execution, task contracts with T0 postconditions, prompt builder from 4-primitive format, result parser with fence stripping, poll-loop auto-pickup of completed results.

## Scope

- `container/agent-runner/src/mcp-tools/local-worker/` — contract, prompt-builder, result-parser, verification, dispatch, tools, index
- `container/agent-runner/src/poll-loop.ts` — checkWorkerResults integration
- `container/agent-runner/src/mcp-tools/index.ts` — barrel import
- `container/skills/local-worker/SKILL.md`

## Exit Criteria

- [x] Module builds, bun test passes
- [x] Simple task dispatched to local model returns valid JSON
- [x] T0 postcondition verification works
- [x] Timeout handling terminates cleanly
- [x] End-to-end: Claude dispatches → Qwen executes → Claude reviews → accepts

## Notes

Scope changed from original plan (host-side `src/modules/local-worker/`) to container-side MCP tools. See [[phase-3b-async-dispatch-approach]] decision. Informed by Phase 3a findings: 4K-8K context budget, standard mode, strip fences, JSON reliable.
