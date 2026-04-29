---
title: "Unified Research Skill"
aliases: [phase-14-decision, research-skill-consolidation]
category: decisions
tags: [research, skills, orchestration, knowledge-wiki]
parents: [phase-14-unified-research-skill]
created: 2026-04-27
updated: 2026-04-27
source: plan
confidence: high
---

## Context

Three overlapping skills handle research: `deep-research/` (upstream, autonomous single-agent), `research-loop/` (Phase 13, scheduled-task orchestrated pipeline), and ad-hoc research has no enforced structure. Live testing showed the agent skips the plan phase when not forced, leading to worker step-repetition failures. Research output was also conflated with agent memory — findings should route to knowledge wikis, not MEMORY.md.

## Decision

Replace all three paths with a single `research/` skill. Plan gate enforced via `research-state.json` file write (must exist before dispatch). Auto-injected via `instructions.md` so the agent can't skip it. All research output routes to knowledge wikis. Both ad-hoc and scheduled research use the same pipeline. Delete `deep-research/` and `research-loop/`.

Alternatives considered:
- Keep research-loop as scheduling wrapper → rejected: unnecessary indirection, schedule_task already handles triggers
- Programmatic MCP gate (reject dispatch_worker without plan file) → rejected: over-engineering, skill-level behavioral contract is sufficient and consistent with deep-work pattern

## Consequences

- One skill to maintain instead of three
- Plan gate is behavioral (prompt-enforced), not programmatic — agent CAN skip it, but instructions.md auto-injection makes this unlikely
- Research output never pollutes MEMORY.md — clear separation between knowledge wiki (findings) and agent memory (personal/project context)
- Prompt templates (search-extract, summarize, review) live under research/ as companions
