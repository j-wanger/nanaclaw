---
title: "Phase 2 Planning and Scaffold"
aliases: []
category: journal
tags: [host-mode, planning, provider, deep-work]
parents: [phase-02-host-mode-runner]
created: 2026-04-26
updated: 2026-04-26
source: debrief
---

# Phase 2 Planning and Scaffold

## What Happened
- Planned Phase 2 (Host-Mode Agent Runner) via full /dev-plan flow with standard ceremony
- Cloned v1 archive (nanaclaw-archive) to study deep work reference implementation — key insight: deep_work.json state file + runner-driven auto-continuation + MCP tools with guardrails (refusal to end early, premature-completion warnings)
- Original approach (reimplement agent loop in Node) scored 7/10 from both approach and plan reviewers — primary criticism: duplicates ~400 LOC of battle-tested agent-runner code when 3 env vars would make it reusable
- Revised to Bun-on-host: make agent-runner paths env-var configurable, spawn natively without Docker. Deep work tools go in existing MCP server (cross-cutting, both modes). No new host dependencies
- Completed Tasks 1-2: agent-runner path configurability (SESSION_DIR, AGENT_DIR) and host provider scaffold
- Installed Bun 1.3.13 on host (was missing — phase entry criterion)

## Decisions Made
- [[phase-2-host-mode-approach|Phase 2 Host-Mode Approach]] — spawn Bun agent-runner natively instead of reimplementing in Node

## Problems Solved
- Approach reviewer caught major duplication risk — pivoted from Node reimplementation to Bun-on-host. Saved ~400 LOC and eliminated SDK integration divergence risk
- Bun not installed on host — installed via curl, added to PATH
- pnpm not in default PATH — located at `~/.hermes/node/lib/node_modules/corepack/shims/`

## Artifacts Changed
- `container/agent-runner/src/config.ts` (added SESSION_DIR, AGENT_DIR env var exports)
- `container/agent-runner/src/db/connection.ts` (paths now derived from config)
- `container/agent-runner/src/index.ts` (CWD and extraBase from config)
- `container/agent-runner/src/providers/claude.ts` (conversationsDir from config)
- `container/agent-runner/src/mcp-tools/core.ts` (file resolution and outboxDir from config)
- `src/providers/host/index.ts` (new — host provider registration)
- `src/providers/index.ts` (added host import)

### Review Gate
Skipped — 2 S-tasks completed, all under 10 LOC each. No meaningful code to review.

### Activation Quality
Active knowledge: 4 entries, 3 referenced (~75% approximate hit rate, literal match). Healthy activation.

## Related
- [[phase-02-host-mode-runner|Phase 2: Host-Mode Agent Runner]] — parent phase
