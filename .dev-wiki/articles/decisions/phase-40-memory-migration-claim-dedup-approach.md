---
title: "Phase 40: Memory Migration + Claim Dedup Guard Approach"
aliases: [auto-migrate, claim dedup cap]
category: decisions
tags: [memory-architecture, code-quality]
parents: [phase-40-memory-migration-claim-dedup]
created: 2026-05-05
updated: 2026-05-05
source: plan
confidence: low
---

## Context

Two leftover issues: (1) MEMORY.md entries not migrated into memory.db memories table -- context builder reads both but agents writing to memory_store MCP will diverge from legacy file entries over time. migrate.py exists in Python but context builder runs on Node.js host. (2) claim_dedup O(n^2) has no safety valve at scale.

## Decision

**Workstream 1: Auto-migrate MEMORY.md at spawn.** Port migration logic into context-builder.ts (Node.js, better-sqlite3). Before dual-read: ensure memories table exists (CREATE TABLE IF NOT EXISTS matching Python schema), parse MEMORY.md, check each entry for exact-content duplicate in memories table, insert new entries with mapped category/trust. Idempotent -- re-runs import nothing. ~10ms overhead per spawn.

**Workstream 2: claim_dedup max_claims guard.** Add max_claims parameter (default 1000) to claim_dedup. If claim count exceeds cap, return error asking user to filter by article_slug. Return scan duration in response for observability. No algorithmic change to the O(n^2) loop itself.

**Alternatives rejected:**
- Subprocess to Python migrate.py: adds process spawn overhead, fragile path resolution
- ANN index for claim_dedup: overkill at wiki scale (<5K claims)
- LSH bucketing: complexity without demonstrated need
- Per-claim searchSimilar: same O(n^2), worse constants (Phase 38 approach review finding)

## Consequences

- MEMORY.md entries automatically flow into memory.db -- no manual migration step
- Context builder creates memories table if absent -- first spawn after upgrade bootstraps the schema
- claim_dedup has bounded worst-case behavior -- caps at 1000 claims (~500K pairs, <2s)
- Scan duration in response enables profiling without separate tooling
