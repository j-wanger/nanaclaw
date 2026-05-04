---
title: "Phase 30: Memory MCP Server — Embeddings + Claude Code Complete"
aliases: []
category: journal
tags: [memory-server, mcp, embedding, fastembed, sqlite-vec, rrf, claude-code, phase-complete]
parents: [phase-30-memory-mcp-embeddings]
created: 2026-05-03
updated: 2026-05-03
source: debrief
---

# Phase 30: Memory MCP Server — Embeddings + Claude Code Complete

## What Happened
- Added embedding-based semantic search to memory server: configurable provider (local fastembed nomic-embed-text-v1.5 or HTTP server mode), sqlite-vec extension for cosine similarity via vec0 virtual table
- RRF fusion search combining FTS5 BM25 + vector cosine: α=0.4, k=60, trust tie-breaking (high>medium>low → strength → recency)
- Cosine-based near-duplicate detection: >0.90 auto-reinforces, 0.85-0.90 warns. Supplements existing word-overlap dedup.
- Export/import tools: memory_export dumps human-readable markdown grouped by category, memory_import parses it back with merge (dedup-aware) or replace (soft-delete all + reload) modes
- Claude Code integration: memory-profile.md (hot tier, ~500 tokens) + memory-workflow.md (when/how to call memory tools, two-pass warm tier)
- E2E test validates full lifecycle: 15 memories, search, dedup, forget, export/import round-trip, warm tier simulation
- All implementation done via Claude Code agent dispatch with orchestrator review — process corrected from Phase 29

## Decisions Made
- No new architectural decisions — Phase 30 implemented the design from [[memory-mcp-server-architecture]]
- Category mapping for memory-workflow.md: user corrections→correction, user profile→preference, project context→entity, external references→custom+tags

## Problems Solved
- Recency tiebreaker in RRF sort was inverted (oldest-first). Fixed by negating timestamp in sort key.
- memory-workflow.md used invalid Category enum values (feedback/user/project/reference). Fixed to match actual enum (correction/preference/entity/custom).

## Artifacts Changed
- `memory_server/embedding.py` (new) — configurable EmbeddingProvider with local/server modes
- `memory_server/storage.py` (modified) — sqlite-vec, search_vec, search_hybrid, cosine dedup, export_memories, import_memories
- `memory_server/server.py` (modified) — auto-embed on store, hybrid search, memory_export/import tools (now 7 MCP tools)
- `memory_server/config.py` (modified) — EmbeddingConfig dataclass
- `memory_server/requirements.txt` (modified) — added fastembed, httpx, sqlite-vec
- `.claude/rules/memory-profile.md` (new) — hot tier user profile
- `.claude/rules/memory-workflow.md` (new) — when/how to use memory tools + warm tier
- `memory_server/tests/` — 5 test files, 130 total tests (+68 from Phase 29's 62)

### Review Gate
- Reviewer score: 7/10, verdict: revise
- HIGH: Recency tiebreaker inverted in RRF sort — **fixed** (negated timestamp)
- HIGH: memory-workflow.md used invalid category names — **fixed** (mapped to actual enum values)
- MEDIUM: `import re` mid-file in storage.py, full table scan in cosine dedup, raw scores in fallback paths, mutable default args in server.py — accepted (non-blocking)
- After fixes: all 130 tests pass

### Health Delta
- Test count: 62 → 130 (+68 tests)
- Dependencies added: fastembed>=0.4, httpx>=0.27, sqlite-vec>=0.1.6
- New tools: memory_export, memory_import (total: 7 MCP tools)

### Activation Quality
Active knowledge: 3 entries, 3 referenced (~100% approximate hit rate, literal match).

## Related
- [[phase-30-memory-mcp-embeddings|Phase 30: Memory MCP Server — Embeddings + Claude Code]]
- [[memory-mcp-server-architecture|Decision: Memory MCP Server Architecture]]
