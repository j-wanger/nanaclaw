---
title: "Phase 40: Memory Migration + Claim Dedup Guard"
aliases: [auto-migrate, claim dedup cap]
category: phases
tags: [memory-architecture, code-quality]
parents: []
created: 2026-05-05
updated: 2026-05-05
source: plan
status: active
scope: ["src/modules/memory/context-builder.ts", "src/modules/memory/context-builder.test.ts", "container/agent-runner/src/mcp-tools/claim-tools.ts", "container/agent-runner/src/mcp-tools/claim-tools.test.ts"]
entry_criteria: "Phase 39 complete, context builder dual-read implemented, memory skill updated"
exit_criteria: "context builder creates memories table + migrates MEMORY.md at spawn (idempotent); claim_dedup has max_claims cap + duration_ms; all tests passing"
---

# Phase 40: Memory Migration + Claim Dedup Guard

## Objective

Auto-migrate MEMORY.md entries into memory.db memories table at spawn time (idempotent). Add max_claims safety cap to claim_dedup O(n^2) loop.

## Scope

- `src/modules/memory/context-builder.ts` — auto-migration
- `container/agent-runner/src/mcp-tools/claim-tools.ts` — max_claims guard

## Exit Criteria

- [ ] Context builder creates memories table and migrates MEMORY.md entries at spawn (idempotent)
- [ ] claim_dedup has max_claims cap (default 1000) with duration_ms in response
- [ ] All tests passing

## Notes

Migration schema must match MCP memory server (memory_server/storage.py) exactly. Only create memories table — no FTS, triggers, meta, reinforcements. Use COUNT query before loading embeddings for claim_dedup guard.
