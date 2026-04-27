---
title: "Phase 2 Host-Mode Approach"
aliases: [host-mode-approach, bun-on-host]
category: decisions
tags: [host-mode, provider, deep-work, agent-runner]
parents: [phase-02-host-mode-runner]
created: 2026-04-26
updated: 2026-04-26
source: plan
confidence: high
---

## Context

Phase 2 needs host-mode execution (Claude Agent SDK without Docker). Two approaches considered: (A) reimplement the agent loop in Node on the host side (`src/providers/host/host-runner.ts`), or (B) make the existing Bun agent-runner path-configurable and spawn it natively.

Approach A was reviewed and scored 7/10 — reimplementing the poll loop duplicates ~400 LOC of battle-tested code (DB polling, SDK integration, message streaming, MCP server, hooks). The hardcoded container paths (`/workspace/inbound.db` etc.) are just 3 constants solvable with env vars.

## Decision

Approach B: spawn the existing Bun agent-runner natively on macOS with env-var path overrides. Deep work MCP tools and auto-continuation go into the existing container agent-runner — they work in both host and container mode. No new host dependencies needed (SDK stays in Bun tree). V1 reference (`nanaclaw-archive/src/host-agent-runner.ts`) confirmed the deep work pattern: agent manages `deep_work.json` via MCP tools, runner checks it after each query for auto-continuation with rich urgency-scaled prompts.

## Consequences

- Zero code duplication — host mode reuses 100% of agent-runner, poll loop, provider, MCP tools
- Deep work is a cross-cutting feature available in both host and container mode
- Bun runtime dependency on host (already present for `bun test`)
- `killContainer()` needs mode branching (SIGTERM for host, docker stop for container)
- Post-session memory extraction is skill-driven (agent saves memories at wrap-up) + conversation archive hook, not a separate API call
