---
title: "Phase 11: Host-Mode Fragment Path Fix Complete"
aliases: [phase-11-complete]
category: journal
tags: [host-mode, composition, symlinks, mcp-tools, env]
parents: [phase-11-host-mode-fragment-path-fix]
created: 2026-04-27
updated: 2026-04-27
---

# Phase 11: Host-Mode Fragment Path Fix Complete

## What Happened
- Fixed 5 cascading host-mode wiring bugs discovered through iterative live testing with Nana
- Each fix unlocked the next bug: symlink paths → bun path → idle worker check → env vars → fragment imports
- 3 planned tasks completed + 2 additional fixes discovered during live validation

## Fixes (in discovery order)
1. **Fragment symlink paths** — compose used Docker `/app/...` paths in host-mode (src/claude-md-compose.ts)
2. **MCP server bun path** — bare `bun` not on PATH, resolved via `~/.bun/bin/bun` (container/agent-runner/src/index.ts)
3. **Idle worker result check** — `checkWorkerResults()` only ran post-query, not during idle poll (container/agent-runner/src/poll-loop.ts)
4. **Agent-runner env vars** — `SEARXNG_URL`, `WHISPER_URL`, `NANOCLAW_LLAMA_URL` never injected from .env into spawned process (src/container-runner.ts)
5. **Memory + wiki fragment imports** — `memory-context.md` and `wiki-context.md` generated but never added to CLAUDE.md `@` imports (src/claude-md-compose.ts)

## Problems Solved
- Agent couldn't read skill instructions → used raw HTTP instead of dispatch_worker MCP tool
- Agent couldn't see registered wikis → reported "empty" despite 513 articles on disk
- Agent blocked during worker dispatch → couldn't respond to other messages
- Worker's web_search failed → SEARXNG_URL not in process env
- Agent had no memory context → MEMORY.md entries invisible

## Artifacts Changed
- `src/claude-md-compose.ts` (host-mode paths + external fragment preservation + imports)
- `src/claude-md-compose.test.ts` (+8 tests: host-mode resolution, readability, container regression)
- `src/container-runner.ts` (readEnvFile injection for runner-relevant vars)
- `container/agent-runner/src/index.ts` (resolveBunPath for MCP server)
- `container/agent-runner/src/poll-loop.ts` (idle worker result check)

## Health Delta
- Host tests: 358 → 366 (+8)
- Commits: 5 fix commits pushed

## Soft Observations / Phase N+1 Candidates
- Worker iteration burnout — Qwen uses 6/6 iterations on search/extract without wiki_write | Phase 12: Worker prompt tuning (increase max_iterations or add synthesis forcing) | Worker result wt-1777308339590
- Worker tool trace missing from result JSON — no "history" key showing tool calls | Phase 12: Add tool trace to agent-loop result | Result file inspection
- Verify memory/wiki visibility — fix 5 landed but not yet validated live | Phase 12: Pre-check or separate validation | Fragment import fix commit
- Episodic wiki consolidation — research loop produces episodic entries but nothing processes them | Phase 12+: Consolidation pipeline | Phase 6b exit criteria
