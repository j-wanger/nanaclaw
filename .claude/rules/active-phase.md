# Active Phase Context

Phase: 40 -- Memory Migration + Claim Dedup Guard
Objective: Auto-migrate MEMORY.md into memory.db at spawn. Add max_claims cap to claim_dedup.
Status: Active. 0/3 tasks done.
Scope: src/modules/memory/context-builder.ts, container/agent-runner/src/mcp-tools/claim-tools.ts
Key constraints: memories table schema must match MCP server exactly. Only create memories table (no FTS/triggers/meta). COUNT query before loading embeddings for claim guard. Migration is idempotent (exact-content dedup).
Exit criteria: auto-migration working, claim_dedup capped at 1000 with duration_ms, tests passing.
Next: Task 1 -- auto-migrate MEMORY.md at spawn.
