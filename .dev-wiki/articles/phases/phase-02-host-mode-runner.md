---
title: "Phase 2: Host-Mode Agent Runner"
aliases: [phase-2, host-mode]
category: phases
tags: [host-mode, provider, deep-work, claude-sdk, agent-runner]
parents: [phase-01b-memory-module]
created: 2026-04-25
updated: 2026-04-26
source: plan
status: active (8/8 tasks done, pending smoke test)
scope: ["container/agent-runner/src/config.ts", "container/agent-runner/src/db/connection.ts", "container/agent-runner/src/mcp-tools/**", "container/agent-runner/src/poll-loop.ts", "container/agent-runner/src/providers/claude.ts", "container/skills/deep-work/**", "src/providers/host/**", "src/providers/index.ts", "src/container-runner.ts", "src/host-sweep.ts"]
entry_criteria: "Phase 1b complete, Bun runtime available on host"
exit_criteria: "Host provider registers, container-mode unchanged, host-mode smoke test passes, deep work continuation works, post-session digest runs"
---

# Phase 2: Host-Mode Agent Runner

## Objective

Add host-mode execution that runs the existing Bun agent-runner directly on macOS without Docker containers. Enable deep work sessions (time-bounded autonomous execution) and post-session memory extraction. Deep work works in both host and container mode.

## Scope

New files:
- `src/providers/host/index.ts` — host provider registration
- `container/agent-runner/src/mcp-tools/deep-work.ts` — deep work MCP tools
- `container/skills/deep-work/SKILL.md` — deep work skill

Modified files:
- `container/agent-runner/src/config.ts`, `container/agent-runner/src/db/connection.ts` — path configurability
- `container/agent-runner/src/mcp-tools/server.ts` — register deep work tools
- `container/agent-runner/src/poll-loop.ts` — auto-continuation hook
- `container/agent-runner/src/providers/claude.ts` — conversation archive hook
- `src/container-runner.ts` — host-mode branch, lifecycle
- `src/host-sweep.ts` — host-mode kill path
- `src/providers/index.ts` — barrel update

## Exit Criteria

- [ ] Host provider registers, pnpm test passes, container-mode unaffected
- [ ] Host-mode: send message via CLI → receive response
- [ ] Two-DB pattern works for host-mode sessions
- [ ] Deep work: 5-min deadline → auto-continuation fires
- [ ] Post-session digest produces memory extraction

## Notes

Revised approach: spawn existing Bun agent-runner natively instead of reimplementing in Node. Path configurability via env vars (NANOCLAW_SESSION_DIR, NANOCLAW_AGENT_DIR). Deep work is cross-cutting — works in both host and container mode. V1 reference: nanaclaw-archive/src/host-agent-runner.ts.
