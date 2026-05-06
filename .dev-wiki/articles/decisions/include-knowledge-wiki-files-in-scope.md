---
title: "Include Knowledge-Wiki Skill Files in Phase 43 Scope"
aliases: [knowledge-wiki-skill-scope]
category: decisions
tags: [documentation, knowledge-pipeline, instructions, scope]
parents: [phase-43-knowledge-pipeline-instruction-cleanup]
created: 2026-05-06
updated: 2026-05-06
source: plan
confidence: high
---

## Context

Phase 43 targets instruction cleanup after the Phase 42 pipeline simplification. The initial scope covered container/skills/ files only. However, article-conventions.md and content-model.md in ~/.claude/skills/knowledge-wiki/ reference claims extensively. Stale instructions pointing to deleted tools cause wasted agent turns when the wiki-manager skill is loaded.

## Decision

Include ~/.claude/skills/knowledge-wiki/article-conventions.md and content-model.md in Phase 43 scope rather than deferring to a separate phase. The files are small, the edits are mechanical (remove references to deleted tools), and leaving them stale creates immediate operational cost.

## Consequences

- Phase 43 scope expands from container/skills/ only to also include ~/.claude/skills/knowledge-wiki/.
- All stale instruction references are cleaned in a single pass rather than requiring a follow-up phase.
- No structural risk — these are instruction files, not code.
