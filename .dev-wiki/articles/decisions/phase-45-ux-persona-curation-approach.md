---
title: "Phase 45: UX, Persona, and Curation Fixes Approach"
aliases: []
category: decisions
tags: [ux, persona, curation, compaction]
parents: [phase-45-ux-persona-curation-fixes]
created: 2026-05-08
updated: 2026-05-08
source: plan
confidence: medium
---

## Context

External advisory session identified 5 daily-use problems: robotic persona (SOUL.md too clinical), silent curation hours (no skill governs curation), poor compaction recovery (no session state survives), confabulation about workflows (memory stores facts not processes), deflection on external references (knowledge-wiki skill suite unknown to Nana).

## Decision

6 work units in one phase. Key revision from advisory plan: PostCompact hook EXISTS in SDK (PostCompactHookInput with compact_summary field) — WU3 redesigned to use it instead of rules-only recovery. session-state.md written by PostCompact hook to container workspace .claude/rules/ (per-agent-group, not cross-session).

**Alternatives rejected:**
- PreCompact fallback for session state: PostCompact is more reliable (deterministic hook with compact_summary)
- Split into 3 phases: work units are small and independent, single phase is practical
- curation-state.json scaffolding: runtime artifact created by the skill during execution, not at install time

## Consequences

- Nana's personality shifts from clinical engineer to warm collaborator
- Wiki curation has a documented workflow preventing the Phase 42 failure mode
- Context survives compaction via PostCompact hook + behavioral rules
- Workflow patterns stored in memory prevent confabulation about past processes
- Knowledge-wiki skill suite disambiguated from wiki-manager skill
