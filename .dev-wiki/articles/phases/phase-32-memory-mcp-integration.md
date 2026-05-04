---
title: "Phase 32: Memory MCP Server — Nanaclaw + Consolidation"
aliases: [memory-mcp-nanaclaw, memory-consolidation, memory-prune, memory-migration]
category: phases
tags: [memory-server, mcp, nanaclaw, consolidation, migration, global-memory]
parents: []
created: 2026-05-02
updated: 2026-05-03
source: plan
status: active
scope: ["memory_server/consolidator.py", "memory_server/migrate.py", "memory_server/models.py", "memory_server/storage.py", "memory_server/server.py", "memory_server/extract_cli.py", "memory_server/tests/", "groups/dm-with-wang/container.json"]
entry_criteria: "Phase 30 complete (embeddings working). Phase 31 optional (sidecar enhances but isn't required)."
exit_criteria: "Nanaclaw agent spawns with warm-tier memory from MCP server, post-session extraction works, consolidation merges related memories, global store works, migration from MEMORY.md succeeds, memory_prune flags low-value entries"
---

# Phase 32: Memory MCP Server — Nanaclaw + Consolidation

## Objective

Wire memory MCP server into Nanaclaw's agent group config (host mode), implement memory consolidation (merge related entries), global/cross-project memory store, migration from existing MEMORY.md files, and memory_prune for noise management.

## Scope

- New: memory_server/consolidator.py, memory_server/migrate.py
- Modify: memory_server/storage.py (global store, prune), memory_server/server.py (memory_prune tool)
- Nanaclaw: context builder update, post-session hook

## Key Design Decisions

- Phase assumes host mode (no Docker). Container support is a future concern.
- Consolidation: cluster related memories (cosine > 0.80), generate merged entry via Qwen/Claude, supersede originals
- Global store at ~/.memory/global.db for cross-project preferences
- memory_search(scope="all") fans out to both project + global, project ranked higher
- Prune threshold: trust='low' AND strength=1 AND (sessions > 20 OR days > 180). Dry-run mode for review.
- Workers do NOT get memory context — orchestrator calls memory tools, workers call wiki tools
- Worker episodic findings go to knowledge-wiki, NOT memory store

## Exit Criteria

- [ ] Nanaclaw agent spawns with warm-tier memory from MCP server
- [ ] Memory search works during Nanaclaw sessions (cold-tier)
- [ ] Post-session extraction produces new memory entries
- [ ] Workers do NOT receive memory context
- [ ] Consolidation merges 3+ related memories into 1 consolidated entry
- [ ] memory_search(scope="all") returns from both project and global stores
- [ ] Migration from MEMORY.md produces correct entries with trust levels
- [ ] memory_prune flags unreinforced low-trust entries (dry-run mode)
