---
title: "Phase 1b: Memory Module Implementation"
aliases: [phase-1b, memory-module]
category: phases
tags: [memory, module, fts5, context-injection]
parents: [phase-01a-memory-architecture-research]
created: 2026-04-25
updated: 2026-04-25
source: plan
status: active
scope: ["src/modules/memory/**", "src/modules/index.ts", "src/container-runner.ts", "container/skills/memory/**"]
entry_criteria: "Phase 0 complete, Phase 1a research available, upstream module pattern understood"
exit_criteria: "Memory module builds, MEMORY.md CRUD works, FTS5 search works, context builder produces frozen fragment, cold start flow works, CLAUDE.local.md coexistence verified"
---

# Phase 1b: Memory Module Implementation

## Objective

Implement the memory module as a self-registering NanoClaw module. Operational memory via MEMORY.md (source of truth) + derived FTS5 index. Frozen context fragment at spawn.

## Scope

- `src/modules/memory/` — types, memory-store, fts, context-builder
- `container/skills/memory/` — SKILL.md + instructions.md
- Modify: src/modules/index.ts, src/container-runner.ts

## Exit Criteria

- [ ] Memory module builds without TypeScript errors
- [ ] pnpm test still passes (no regressions)
- [ ] MEMORY.md CRUD works end-to-end
- [ ] FTS5 index rebuilds from MEMORY.md in <50ms for 100 entries
- [ ] Context builder produces non-empty .claude-fragments/memory-context.md
- [ ] Cold start: new group → agent asks 3 seed questions
- [ ] Smoke test: remember fact → new session → agent recalls it [manual]
- [ ] CLAUDE.local.md not conflicted by memory module

## Notes

Key decisions from Phase 1a: no salience formula (FTS5 + recency tie-breaking), ~1,500 token budget, frozen snapshot injection, MEMORY.md as human-readable source of truth. See docs/memory-architecture.md.

Wiki bridge descoped — will be handled by mounting wiki skills + directories into containers instead of injecting domain maps at spawn.
