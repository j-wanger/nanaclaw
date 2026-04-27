---
title: "Phase 8: Operational Deployment + E2E Validation Complete"
aliases: []
category: journal
tags: [host-mode, deployment, e2e-testing, telegram, local-worker, memory]
parents: [phase-08-operational-deployment]
created: 2026-04-27
updated: 2026-04-27
source: debrief
---

# Phase 8: Operational Deployment + E2E Validation Complete

## What Happened
- Planned Phase 8 (6 tasks, 2S+4M) targeting operational deployment — validate host-mode E2E, wire Telegram, connect llama-cpp, run research pipeline
- Found and fixed 4 host-mode bugs during E2E validation: bun binary not in launchd PATH, Claude Code binary at host path not /pnpm/claude, agent-runner didn't recognize "host" provider, skill symlinks pointed to /app/skills/ container paths
- Fixed 5th bug found by reviewer: stale symlinks from prior container-mode sessions not replaced when switching to host mode
- Validated full pipeline: CLI → host-mode spawn → Claude response (~3s), Telegram → host-mode → response (~9s), llama-cpp dispatch 10/10 pass, memory fragment generation + recall, SearXNG installed and research dispatch completes
- Discovered memory write behavioral gap: agent uses Write tool for explicit file operations but doesn't write to memory/MEMORY.md due to prompt conflict between base CLAUDE.md (CLAUDE.local.md) and memory skill (memory/MEMORY.md)

## Decisions Made
- [[phase-8-operational-deployment-approach|Phase 8 Operational Deployment Approach]] — validation-first, fix-forward, single phase

## Problems Solved
- `spawn bun ENOENT` — launchd PATH doesn't include ~/.bun/bin → `resolveBunPath()` checks BUN_INSTALL env, ~/.bun/bin/bun, fallback
- `Claude Code not found at /pnpm/claude` — container path hardcoded → `resolveClaudeCodePath()` checks /pnpm/claude, CLAUDE_CODE_BIN env, ~/.local/bin/claude, fallback
- `Unknown provider: host` — runner only knew claude/mock → alias "host" → "claude" in getProviderFactory()
- Skills not loading (broken symlinks) — syncSkillSymlinks used /app/skills/ for all modes → added skillsBase parameter, host-mode passes real path
- Stale symlinks not replaced — if (!exists) guard skipped re-creation → replaced with readlinkSync comparison

## Open Questions
- Memory skill prompt conflict: base container/CLAUDE.md tells agent to use CLAUDE.local.md, memory skill says memory/MEMORY.md — needs prompt reconciliation

## Artifacts Changed
- `src/container-runner.ts` (resolveBunPath, syncSkillSymlinks host-mode + stale replacement, import reorder)
- `container/agent-runner/src/providers/provider-registry.ts` ("host" → "claude" alias)
- `container/agent-runner/src/providers/claude.ts` (resolveClaudeCodePath)
- `groups/*/container.json` (provider: host)
- `groups/*/memory/MEMORY.md` (seed entries)
- `groups/*/models.json` (llama-cpp routing)
- `.env` (NANOCLAW_LLAMA_URL, SEARXNG_URL)
- `data/searxng/settings.yml` (SearXNG config)

## Related
- [[phase-08-operational-deployment|Phase 8: Operational Deployment + E2E Validation]]

### Review Gate
Reviewer score: 6/10 (revise). HIGH: symlink staleness bug (fixed inline). MEDIUM: artifact staleness (expected pre-debrief). MEDIUM: no unit tests for resolve*Path functions. Verdict after fix: accept.

### Activation Quality
Active knowledge: 3 entries, 3 referenced (~100% approximate hit rate, literal match). Host-mode spawn mechanism, memory fragment integration, and agent group config structure all directly used during E2E debugging.

## Soft Observations / Phase N+1 Candidates
- Memory write prompt conflict | Prompt reconciliation phase: resolve CLAUDE.local.md vs memory/MEMORY.md precedence | Evidence: agent tool-use test proves Write works, memory write test shows it doesn't target MEMORY.md
- No unit tests for host-mode path resolution | Test coverage phase: add tests for resolveBunPath, resolveClaudeCodePath, syncSkillSymlinks host-mode branch | Evidence: reviewer flagged as LOW
