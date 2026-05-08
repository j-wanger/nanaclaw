---
title: "Phase 45: UX, Persona, and Curation Fixes"
aliases: [persona fix, wiki curator, session continuity]
category: phases
tags: [ux, persona, curation, compaction]
parents: []
created: 2026-05-08
updated: 2026-05-08
source: plan
status: complete
scope: ["SOUL.md", "container/skills/wiki-curator/*", ".claude/rules/session-continuity.md", "container/agent-runner/src/providers/claude.ts", "container/skills/wiki-manager/instructions.md"]
entry_criteria: "Phase 44 complete, daily-use UX issues identified"
exit_criteria: "SOUL.md warm persona; wiki-curator skill with taxonomy-first; PostCompact hook writes session-state.md; 7 memory entries stored; knowledge-wiki reference added; v1 migration checked"
---

# Phase 45: UX, Persona, and Curation Fixes

## Objective

Fix five daily-use problems: robotic persona, silent curation hours, poor compaction recovery, confabulation about past workflows, deflection when referencing external skill patterns.

## Scope

- `SOUL.md` — persona rewrite
- `container/skills/wiki-curator/` — new skill (taxonomy-first curation)
- `.claude/rules/session-continuity.md` — compaction recovery rules
- `container/agent-runner/src/providers/claude.ts` — PostCompact hook
- `container/skills/wiki-manager/instructions.md` — knowledge-wiki reference

## Exit Criteria

- [x] SOUL.md rewritten (no "pragmatic senior engineer", has "Nana") — rewritten to lean baseline; full persona in CLAUDE.local.md
- [x] wiki-curator skill exists with taxonomy-first workflow + progress reporting
- [x] PostCompact hook writes session-state.md with compact_summary
- [x] 7 workflow/relationship memory entries stored
- [x] knowledge-wiki reference in wiki-manager instructions
- [x] v1 migration checked — no openclaw artifacts; v1 persona recovered from archive

## Notes

Approach reviewer (6/10) caught that PostCompact hook EXISTS in SDK (contrary to plan's constraint). WU3 redesigned around PostCompact. Plan reviewer (5/10) raised session-state.md cross-session bleed — resolved: container SDK CWD is per-agent-group workspace, so .claude/rules/ there is isolated.
