---
title: "Phase 30: Memory MCP Server — Embeddings + Claude Code"
aliases: [memory-mcp-embeddings, memory-claude-code, memory-rrf]
category: phases
tags: [memory-server, mcp, embedding, fastembed, claude-code, rrf]
parents: []
created: 2026-05-02
updated: 2026-05-03
source: plan
status: completed
scope: ["memory_server/embedding.py", "memory_server/storage.py", "memory_server/server.py", "memory_server/tests/", ".claude/rules/memory-profile.md", ".claude/rules/memory-workflow.md"]
entry_criteria: "Phase 29 complete (core storage + FTS5 search working)"
exit_criteria: "Embedding search returns semantically relevant results, RRF fusion combines FTS5 + embedding scores, memory_export/import round-trips correctly, Claude Code connects and can store/search memories, two-pass warm tier seeds from ambient signals"
---

# Phase 30: Memory MCP Server — Embeddings + Claude Code

## Objective

Add embedding-based semantic search (fastembed or server endpoint, configurable), RRF fusion, memory_export/memory_import tools, and wire into Claude Code as an MCP server. Implement two-pass warm tier retrieval.

## Scope

- Modify: memory_server/storage.py (sqlite-vec, cosine search, RRF), memory_server/server.py (new tools)
- New: memory_server/embedding.py, .claude/rules/memory-profile.md, .claude/rules/memory-workflow.md
- Update: memory_server/config.py (embedding mode config)

## Key Design Decisions

- Embedding configurable: `mode: local` (fastembed in-process) or `mode: server` (HTTP endpoint like localhost:8081). Prevents ~2GB double-load when knowledge-wiki embedding server is running.
- RRF fusion: α=0.4, k=60 (same as knowledge-wiki search.py)
- Warm tier two-pass: Pass 1 at spawn uses ambient signals (CLAUDE.md keywords, git branch). Pass 2 after first user message re-searches with message keywords.
- memory_export renders human-readable markdown; memory_import parses it back. SQLite is primary store, markdown is the inspection interface.

## Exit Criteria

- [x] Embedding search returns semantically relevant results
- [x] RRF fusion combines FTS5 and embedding scores correctly
- [x] Embedding mode switches between local and server via config
- [x] memory_export produces readable markdown matching spec
- [x] memory_import round-trips: export → edit → import → search works
- [x] Claude Code connects to MCP server via settings.json (config example in memory-workflow.md)
- [x] memory-workflow rules cause Claude to search at session start and store on decisions
- [x] Two-pass warm tier: ambient signal search at spawn + first-message re-search
