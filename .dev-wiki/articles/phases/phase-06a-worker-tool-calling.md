---
title: "Phase 6a: Worker Tool-Calling Runtime"
aliases: [phase-6a, worker-tool-calling, worker-agent-loop]
category: phases
tags: [local-worker, tool-calling, agent-loop, experiments]
parents: [phase-03b-dispatch-module, phase-03c-dispatch-iteration]
created: 2026-04-26
updated: 2026-04-26
source: plan
status: completed
scope: ["container/agent-runner/src/mcp-tools/local-worker/**", "scripts/tool-call-bench.ts", "docs/tool-call-experiment-log.md", "container/skills/local-worker/SKILL.md"]
entry_criteria: "Phase 3c complete (dispatch module + routing + semaphore), Qwen model running via llama-cpp"
exit_criteria: "Experiments documented with pass rates, worker agent loop executes multi-turn, tool registry gates access, single-shot unchanged, E2E dispatch→tools→result→auto-pickup"
---

# Phase 6a: Worker Tool-Calling Runtime

## Objective

Give workers multi-turn tool access via a reliable agent loop. Extends the existing single-shot dispatch module to support tool-calling workers that can execute web_search, web_extract, wiki_write, and other MCP tools autonomously — while the orchestrator remains free to handle other messages.

## Scope

Files and modules affected:
- `container/agent-runner/src/mcp-tools/local-worker/**` — agent loop, tool registry, contract extension
- `scripts/tool-call-bench.ts` — experiment harness
- `docs/tool-call-experiment-log.md` — experiment results
- `container/skills/local-worker/SKILL.md` — skill documentation update

## Exit Criteria

- [ ] Qwen tool-calling experiments documented with pass rates and format recommendations
- [ ] Worker agent loop executes multi-turn tool-calling tasks correctly
- [ ] Tool registry gates which tools each worker can access
- [ ] Single-shot workers still work unchanged (backward compat)
- [ ] E2E: dispatch_worker with tools field → worker uses tools → result surfaces via auto-pickup

## Notes

- Two-part structure: experiments first (validate Qwen tool-calling), then implementation
- Go/no-go gate after experiments: if pass rate <60%, pivot to regex-parsed XML tags
- Semaphore changes from per-loop to per-inference-call (workers make multiple llama-cpp calls)
- Prerequisite for Phase 6b (Research Loop + Episodic Integration)
