---
title: "Fresh Fork over V1 Continuation"
aliases: [fork-decision, v1-vs-v2]
category: decisions
tags: [architecture, fork]
parents: [phase-00-fresh-fork-smoke-test]
created: 2026-04-25
updated: 2026-04-25
source: plan
confidence: high
---

## Context

Nanaclaw v1 was a heavily modified fork of an earlier NanoClaw version with MemU memory system, host-mode runner, and deep work sessions. Upstream NanoClaw v2 is a ground-up rewrite with a mature module system, two-DB session architecture, and 44 channel skills. The question: continue v1 modifications or fresh-fork v2?

## Decision

Fresh fork of upstream NanoClaw v2.0.13. Port valuable v1 concepts (memory, host-mode, deep work) as new modules rather than rebasing v1's modifications onto v2.

Rationale: v2's module system (self-registering via side-effect imports), two-DB session architecture, and CLAUDE.md composition are architecturally superior to v1's approaches. Porting concepts as modules is cleaner than reconciling two divergent codebases.

## Consequences

- Must re-implement memory, host-mode, and deep work as v2 modules (Phases 1b, 2)
- Gain: upstream's 44 channel skills, permissions/RBAC, agent-to-agent messaging, self-mod
- Gain: clean upgrade path for future upstream releases
- Risk: v1 patterns may not map cleanly to v2's module system (mitigated by research in Phase 1a)
