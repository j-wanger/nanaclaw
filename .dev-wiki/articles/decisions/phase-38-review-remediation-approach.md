---
title: "Phase 38: Review Remediation Approach"
aliases: [cognitive load, code dedup, memory sync]
category: decisions
tags: [code-quality, documentation, memory-architecture]
parents: [phase-38-review-remediation]
created: 2026-05-05
updated: 2026-05-05
source: plan
confidence: medium
---

## Context

External review of Phases 33-37 identified 5 issues ranging from documentation gaps to architectural debt. The codebase has 30+ MCP tools but no routing guidance for agents. loadWikis/resolveWikiPath is duplicated in 13 files. The MEMORY.md and memory.db stores don't sync. claim_dedup uses O(n^2) all-pairs comparison.

## Decision

**Four workstreams in one phase (issue 5 deferred):**

1. **Search routing guidance** -- new knowledge-routing.md mapping query intent to tool. Update wiki-manager instructions to include claim tools.

2. **loadWikis/resolveWikiPath/text() dedup** -- centralize in wiki-utils.ts (already has loadWikis). Add resolveWikiPath and text() helpers. Replace duplicates in tool files with imports. Split: ~8 "drop-in replacement" files vs ~4 "needs adaptation" files (wiki-search, research-fetch, wiki-write, research-summarize do custom resolution).

3. **Wiki-manager taxonomy alignment** -- update instructions.md to use content-model terminology (raw as pipeline input, episodic as research findings, articles with lifecycle status).

4. **Context builder dual-read** -- the per-group memory.db at groups/<group>/memory/ currently contains only host-side FTS tables. The memory MCP server would create its `memories` table in the same DB (MEMORY_PROJECT_DIR points there). Context builder checks if `memories` table exists -- if yes, query `WHERE active=1 ORDER BY created_at DESC`, convert to MemoryEntry format, merge with MEMORY.md entries, dedup by title, select within TOKEN_BUDGET. If `memories` table absent, fall back to MEMORY.md-only (existing behavior). Direct SQLite read via better-sqlite3, no MCP subprocess.

**Issue 5 deferred:** claim_dedup O(n^2) is fine at wiki scale (<5K claims). searchSimilar also does full-table scan internally, so per-claim calls would be O(n^2) with worse constants. Defer until profiling shows actual latency issue.

**Alternatives rejected:**
- Separate phases per issue: unnecessary overhead, all are independent and small
- MCP subprocess call for memory sync: adds latency, complexity; direct SQLite read suffices
- Dropping MEMORY.md entirely: too disruptive, agents still write to it
- Issue 5 fix via searchSimilar: same O(n^2) complexity, worse constants (approach review finding)

## Consequences

- Agents get clear tool routing guidance for 30+ MCP tools
- ~240 lines of duplication removed across 13 files
- Wiki-manager taxonomy aligns with knowledge-wiki content model
- Memory context at spawn includes both MEMORY.md and memory.db entries
- claim_dedup deferred -- current approach adequate for wiki scale
