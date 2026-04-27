---
title: "Phase 8 Operational Deployment Approach"
aliases: [phase-8-approach, operational-deployment]
category: decisions
tags: [host-mode, deployment, e2e-testing, telegram, local-worker]
parents: [phase-08-operational-deployment]
created: 2026-04-26
updated: 2026-04-26
source: plan
confidence: medium
---

## Context

Phases 0-7 delivered 35 source files and 31 test files — the full feature set (host-mode spawn, memory, wiki bridge, local worker dispatch with agent loop, web search, voice I/O, research loop). But nothing has been validated end-to-end with a real message flow. The host-mode spawn path exists in container-runner.ts (80+ lines) but has never processed a real message. Telegram adapter is installed with a bot token but never received a real message in this fork. The system is "code complete" but not "operational."

## Decision

Validation-first, fix-forward deployment in a single phase. Exercise the real system components in dependency order: agent group config → host-mode CLI E2E → Telegram E2E → local worker → memory → research loop. Fix whatever breaks at each step inline rather than pre-predicting failures.

Order rationale: CLI before Telegram (isolates host-mode issues from channel issues). Worker before research loop (research loop depends on working dispatch). Memory validated separately before research loop writes episodic entries.

Alternative considered: Container-mode deployment first (skip host-mode, deploy with Docker as upstream intended). Rejected: host-mode is the daily operating model for this fork — running Claude Agent SDK directly on M1 Max without Docker overhead. Container-mode is already well-tested by upstream; host-mode is the novel path that needs validation.

## Consequences

- Phase is validation/deployment, not feature development — new code only where E2E testing reveals bugs
- Fix-forward means task scope is partially unknown until each step runs — some tasks may be trivial (it just works), others may uncover multi-file fixes
- SearXNG needs to be set up as a prerequisite for the research loop (not currently in .env)
- After this phase, the system is a daily driver — not a prototype
