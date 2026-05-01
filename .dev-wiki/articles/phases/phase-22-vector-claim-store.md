---
title: "Phase 22: Vector Claim Store"
aliases: [vector-claims, claim-embeddings, claim-dedup]
category: phases
tags: [knowledge-base, vector-embeddings, claim-store, dedup]
parents: []
created: 2026-04-30
updated: 2026-04-30
source: plan
status: completed
scope: ["container/agent-runner/src/mcp-tools/**"]
entry_criteria: "Phase 21 complete (source scoring + claim extraction pipeline)"
exit_criteria: "research_summarize claims_only mode, embedding client via NANOCLAW_EMBED_URL, per-wiki claims.db with embedding BLOBs, claim_embed/claim_search/claim_dedup MCP tools, build+tests pass"
---

# Phase 22: Vector Claim Store

## Objective

Backfill claims from 3,000+ existing raw articles via claims_only mode on research_summarize, then build vector embedding infrastructure for semantic claim search and near-duplicate detection.

## Scope

- `container/agent-runner/src/mcp-tools/` — research-summarize.ts (claims_only), claim-embeddings.ts, claim-vector-store.ts, claim-embed-pipeline.ts, claim-tools.ts, contract.ts, dispatch.ts

## Exit Criteria

- [ ] research_summarize claims_only mode extracts claims from raw articles without episodic writes
- [ ] Embedding client connects to local llama-server /embedding endpoint via NANOCLAW_EMBED_URL
- [ ] Per-wiki claims.db stores claims with embedding BLOBs
- [ ] claim_embed MCP tool triggers embed pipeline (JSONL → embeddings → claims.db)
- [ ] claim_search returns semantically similar claims for a query
- [ ] claim_dedup returns near-duplicate claim pairs above threshold
- [ ] Build + container typecheck + all tests pass

## Notes

- Two-stage: claim backfill first (Stage 1), then vector infrastructure (Stage 2)
- Embedding model: nomic-embed-text-v1.5 GGUF (~150MB, 768 dims) on second llama-server instance
- Key sizing: ~15K claims × 768 dims = ~46MB float data, brute-force cosine sim <100ms
- Deferred: conflict detection (polarity analysis), clustering (DBSCAN/HDBSCAN), cross-wiki merging
