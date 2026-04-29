---
title: "Phase 14: Unified Research Skill"
aliases: [phase-14, unified-research]
category: phases
tags: [research, skills, orchestration, knowledge-wiki, compaction]
parents: [phase-13-multi-stage-research-pipeline]
created: 2026-04-27
updated: 2026-04-27
source: plan
status: active
scope: ["container/skills/research/**", "container/skills/deep-research/**", "container/skills/research-loop/**", "src/claude-md-compose.ts"]
entry_criteria: "Phase 13 complete (5-stage pipeline proven, raw tier working, prompt templates exist)"
exit_criteria: "Single research/ skill with plan gate via instructions.md, prompt templates moved, deep-research/ and research-loop/ deleted, live test shows plan-first behavior and wiki output, build clean"
---

# Phase 14: Unified Research Skill

## Objective

Replace deep-research/ and research-loop/ with a single research/ skill that enforces plan-first research pipeline, uses file-based state for compaction recovery, and routes all output to knowledge wikis.

## Scope

- `container/skills/research/` — new skill (SKILL.md + instructions.md + 3 prompt templates)
- `container/skills/deep-research/` — delete
- `container/skills/research-loop/` — delete
- `src/claude-md-compose.ts` — verify fragment composition handles deletion
- `container/agent-runner/src/mcp-tools/local-worker/research-loop.test.ts` — update or remove

## Exit Criteria

- [x] Single research/ skill with plan gate (research-state.json) enforced via instructions.md
- [ ] Prompt templates moved from research-loop/ to research/
- [ ] deep-research/ and research-loop/ deleted, references cleaned
- [ ] Live test: plan-first behavior, raw articles in wiki, no MEMORY.md research writes
- [ ] Build clean, all tests pass
