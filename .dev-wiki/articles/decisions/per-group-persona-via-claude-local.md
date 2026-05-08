---
title: "Per-Group Persona via CLAUDE.local.md"
aliases: [per-group persona, CLAUDE.local.md persona]
category: decisions
tags: [persona, agent-groups, configuration]
parents: [phase-45-ux-persona-curation-fixes]
created: 2026-05-08
updated: 2026-05-08
source: debrief
confidence: high
---

## Context

Phase 45 Task 1 originally planned a full persona rewrite in SOUL.md. During implementation, Jake requested the full persona (毒舌小妹, recovered from nanaclaw-archive v1) be scoped to the dm-with-wang Telegram agent group only, not applied globally to all agent groups.

## Decision

Split persona into two tiers:

1. **SOUL.md** — lean shared baseline. Technical judgment, communication style defaults. Applied to all agent groups.
2. **groups/dm-with-wang/CLAUDE.local.md** — full 毒舌小妹 persona. Warm, direct, personality-rich. Applied only to the Telegram DM agent group via CLAUDE.md composition.

This is a USER OVERRIDE escape hatch — the original plan had SOUL.md carrying the full persona.

**Alternatives rejected:**
- Full persona in SOUL.md (original plan): forces personality on all agent groups including utility/tool agents that should be neutral
- Per-group SOUL.md copies: breaks the shared-baseline guarantee, creates drift

## Consequences

- Other agent groups (future bots, utility agents) get a clean neutral baseline
- The dm-with-wang group gets the full personality Jake expects from v1
- CLAUDE.md composition chain: base CLAUDE.md + SOUL.md (shared) + CLAUDE.local.md (per-group) + skill fragments
- Adding personality to new groups requires only a CLAUDE.local.md in that group's folder
