---
title: "Phase 29: Memory MCP Server — Core Storage + Tools"
aliases: [memory-mcp-core, memory-server-storage, memory-store]
category: phases
tags: [memory-server, mcp, sqlite, fts5, python]
parents: []
created: 2026-05-02
updated: 2026-05-03
source: plan
status: completed
scope: ["memory_server/__main__.py", "memory_server/server.py", "memory_server/storage.py", "memory_server/models.py", "memory_server/config.py", "memory_server/requirements.txt", "memory_server/tests/"]
entry_criteria: "Phase 28 complete"
exit_criteria: "MCP server starts via stdio, memory_store creates entries with dedup detection, memory_search returns FTS5-ranked results, memory_forget/tag/stats work, 10-memory store+search integration test passes"
---

# Phase 29: Memory MCP Server — Core Storage + Tools

## Objective

Scaffold the Memory MCP Server as a standalone Python project. Implement SQLite storage with FTS5 search and the core tool set: memory_store (with near-duplicate detection), memory_search (FTS5-only, no embeddings yet), memory_forget, memory_tag, memory_stats. Server runs via stdio transport.

## Scope

- New: memory_server/ directory (Python package)
- Files: __main__.py, server.py, storage.py, models.py, config.py, requirements.txt
- Tests: tests/test_storage.py, tests/test_search.py, tests/fixtures/

## Key Design Decisions

- SQLite primary store (not markdown) — memory access patterns favor it
- FTS5 for keyword search (embedding search added in Phase 30)
- Near-duplicate detection: cosine > 0.90 auto-reinforce, 0.85-0.90 warn (embedding-based, fallback to exact match in this phase)
- `context` column captures provenance ("why this memory exists")
- No decay formula — trust levels + explicit supersede instead
- Soft delete via active=0 + superseded_by link

## Exit Criteria

- [ ] MCP server starts via `python -m memory_server` without error
- [ ] memory_store creates entries with correct schema fields
- [ ] memory_store detects exact-text duplicates and reinforces
- [ ] memory_search returns FTS5-ranked results
- [ ] memory_forget marks memories as inactive
- [ ] memory_tag adds/removes tags
- [ ] memory_stats returns correct counts by category and trust
- [ ] Integration test: store 10 memories, search 3 queries, verify relevance
