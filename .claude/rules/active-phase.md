# Active Phase Context

Phase: 32 — Memory MCP Server: Nanaclaw + Consolidation
Objective: Global store fan-out, consolidation, migration from MEMORY.md, pruning, Nanaclaw MCP wiring.
Status: All 6 tasks complete. Awaiting user confirmation for phase completion.
Scope: memory_server/consolidator.py, memory_server/migrate.py, memory_server/models.py, memory_server/storage.py, memory_server/server.py, memory_server/extract_cli.py, memory_server/tests/, groups/dm-with-wang/container.json
Key constraints: Python-first (no TypeScript host changes). Consolidation fail-closed (skip on Qwen failure). Migration preserves original types as tags. Per-group MEMORY_PROJECT_DIR env in mcpServers config.
Exit criteria: scope="all" fan-out search, consolidation merges 3+ memories, migration from MEMORY.md, memory_prune dry-run, Nanaclaw config wiring, post-session extraction CLI, workers excluded from memory context.
Abort: if blocked >3 attempts on any task, ask user.
