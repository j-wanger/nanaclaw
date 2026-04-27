---
title: "Phase 1b Memory Module Approach"
aliases: [memory-approach, spawn-time-injection]
category: decisions
tags: [memory, fts5, context-injection, module]
parents: [phase-01b-memory-module]
created: 2026-04-25
updated: 2026-04-25
source: plan
confidence: high
---

## Context

Phase 1a established the memory architecture (MEMORY.md + FTS5 + frozen snapshot). Phase 1b needs to decide: how to integrate into the existing module system, where to generate the context fragment, and what to defer.

## Decision

- **Host-side module with spawn-time injection.** Memory module self-registers at `src/modules/memory/`. No MCP tools — agent reads/writes MEMORY.md as a file. Host processes at spawn via `buildMounts`.
- **Fragment after compose.** Context builder runs in `buildMounts` AFTER `composeGroupClaudeMd`. Compose prunes fragments dir; memory writes fresh. Sequential, no rollback needed.
- **Wiki bridge descoped.** Domain map injection deferred — will be solved by mounting wiki skills + directories into containers instead. Cleaner: wiki access becomes an agent capability, not a memory module feature.
- **No MCP tools.** File-based MEMORY.md access only. Reactive search deferred to future phase.

## Consequences

- Simpler Phase 1b scope: 6 tasks (3M + 3S), no wiki dependency
- Agent must follow MEMORY.md format convention (enforced via container skill instructions, not programmatically)
- Wiki knowledge access will require separate container mount configuration
- Fragment generation failure is non-fatal (try/catch, logs warning, doesn't block spawn)
