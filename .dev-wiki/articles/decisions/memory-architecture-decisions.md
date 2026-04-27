---
title: "Memory Architecture Decisions"
aliases: [memory-arch, memory-design]
category: decisions
tags: [memory, fts5, context-injection, wiki-integration]
parents: [phase-01a-memory-architecture-research]
created: 2026-04-25
updated: 2026-04-25
source: plan
confidence: high
---

## Context

Phase 1a researched agent memory systems (Letta, Zep, Mem0, MIRIX, MemU v1, Anthropic). Key findings: v1's salience formula has log(1)=0 bug, multi-factor scoring lacks empirical validation, frozen snapshot injection universally adopted for cache economics.

## Decision

- **Tiers:** Operational (per-group MEMORY.md + derived FTS5 index) + Domain (knowledge-wiki, separate)
- **Storage:** Markdown source of truth, derived SQLite index (rebuildable)
- **Retrieval:** FTS5 keyword search for operational memory (no embeddings at this scale), cosine+recency for wiki
- **Injection:** Frozen snapshot at spawn (~1,500 tokens), never edited mid-session
- **Cold start:** 3-question seed + passive extraction
- **Wiki integration:** Domain map at spawn (~500 tokens/wiki) + reactive wiki-search tool mid-session

## Consequences

- MEMORY.md is human-readable, git-diffable, directly editable by agent or user
- No embedding model needed for operational memory (FTS5 sufficient for 500-2,000 entries)
- Cache-friendly: frozen snapshot avoids prompt cache invalidation
- Coexists with upstream's CLAUDE.local.md (structured vs unstructured memory)
- Pre-compaction flush deferred to Phase 2 (deep work sessions)
