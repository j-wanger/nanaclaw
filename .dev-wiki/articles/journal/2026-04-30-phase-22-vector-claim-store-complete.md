---
title: "Phase 22: Vector Claim Store Complete"
aliases: []
category: journal
tags: [knowledge-base, vector-embeddings, claim-store, dedup]
parents: [phase-22-vector-claim-store]
created: 2026-04-30
updated: 2026-04-30
source: debrief
---

# Phase 22: Vector Claim Store Complete

## What Happened
- Implemented full vector claim infrastructure: embedding client, SQLite vector store, JSONL-to-DB pipeline, and 3 MCP tools (claim_embed, claim_search, claim_dedup)
- Added `claims_only` mode to `research_summarize` — extract claims from raw articles without episodic article generation, using simplified boundaries and `write_to.tier='claims'`
- Extended `WriteTo.tier` union in contract.ts and added claims handler to postProcessResult in dispatch.ts
- Refactored boundary/postcondition constants out of inline dispatch logic in research-summarize.ts

## Problems Solved
- ESM module readonly exports — test approach switched from import interception to reading task files written to disk
- pnpm PATH resolution — hermes/corepack shim path needed for build verification

## Artifacts Changed
- `container/agent-runner/src/mcp-tools/claim-embeddings.ts` (new: embedding client for NANOCLAW_EMBED_URL)
- `container/agent-runner/src/mcp-tools/claim-vector-store.ts` (new: ClaimVectorStore with cosine similarity, getAllClaims)
- `container/agent-runner/src/mcp-tools/claim-embed-pipeline.ts` (new: JSONL → embeddings → claims.db with incremental offset)
- `container/agent-runner/src/mcp-tools/claim-tools.ts` (new: 3 MCP tools + barrel registration)
- `container/agent-runner/src/mcp-tools/research-summarize.ts` (claims_only mode, boundary constants)
- `container/agent-runner/src/mcp-tools/local-worker/contract.ts` (WriteTo.tier union: 'claims')
- `container/agent-runner/src/mcp-tools/local-worker/dispatch.ts` (claims tier handler with source_score lookup)
- `container/agent-runner/src/mcp-tools/index.ts` (barrel import)

### Review Gate
Score: 8/10 (revise). Fixed: zero-vector hack replaced with `getAllClaims()`, added partial-batch failure logging, `source_score` lookup added to claims tier handler, tool description updated for claims_only mode. WAL journal_mode acknowledged as intentional (claims.db is per-wiki, not cross-mount).

### Activation Quality
Active knowledge: 4 entries, 3 referenced (~75% approximate hit rate, literal match).

## Related
- [[phase-22-vector-claim-store|Phase 22: Vector Claim Store]]
