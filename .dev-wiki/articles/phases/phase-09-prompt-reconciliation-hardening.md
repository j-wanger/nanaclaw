---
title: "Phase 9: Agent Prompt Reconciliation"
aliases: [phase-9, prompt-reconciliation, memory-conflict]
category: phases
tags: [prompts, memory, composition, personality, host-mode]
parents: [phase-08-operational-deployment]
created: 2026-04-27
updated: 2026-04-27
ceremony: standard
source: plan
status: active
scope: ["container/CLAUDE.md", "container/skills/memory/*", "src/claude-md-compose.ts", "src/claude-md-compose.test.ts", "groups/*/CLAUDE.local.md", "SOUL.md", "container/agent-runner/src/**", "container/skills/**/*.md"]
entry_criteria: "Phase 8 complete (operational daily driver)"
exit_criteria: "No contradictory memory instructions, SOUL.md in agent context, no Docker paths in base, MEMORY.md sole write target, compose test passes"
---

# Phase 9: Agent Prompt Reconciliation

## Objective

Make the composed agent prompt stack coherent for daily use — resolve the CLAUDE.local.md vs MEMORY.md memory authority conflict, integrate SOUL.md personality via composition pipeline, and eliminate hardcoded Docker paths from host-mode instructions.

## Scope

Prompt content:
- `container/CLAUDE.md` — fork-owned base, rewrite to remove memory conflict + Docker paths
- `container/skills/memory/instructions.md` + `SKILL.md` — sole memory authority
- `SOUL.md` — personality fragment source

Composition pipeline:
- `src/claude-md-compose.ts` — add SOUL.md inline fragment
- `src/claude-md-compose.test.ts` — coherence assertions

Cleanup:
- `groups/*/CLAUDE.local.md` — personality overrides only
- `container/agent-runner/src/**` — stale CLAUDE.local.md memory references
- `container/skills/**/*.md` — stale `/workspace/agent` references

## Exit Criteria

- [ ] Composed CLAUDE.md has zero contradictory memory instructions
- [ ] SOUL.md personality appears in agent context via composition
- [ ] No hardcoded Docker paths (`/workspace/agent`) in base instructions or skills
- [ ] Agent writes memories to MEMORY.md (not CLAUDE.local.md) — prompt-driven, manual E2E verify
- [ ] Compose verification test passes

## Notes

- Fork-owned: container/CLAUDE.md is fully ours, no upstream merge concern
- Memory skill (Phase 1b) is the single source of truth for memory instructions
- SOUL.md wired as inline fragment (not symlink) to avoid host-mode path resolution issues
- CLAUDE.local.md retains role for per-group personality overrides, NOT memory storage
