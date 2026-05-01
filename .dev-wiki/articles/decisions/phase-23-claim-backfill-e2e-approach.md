---
title: "Phase 23: Claim Backfill E2E Approach"
aliases: [claim-backfill-approach]
category: decisions
tags: [knowledge-base, vector-embeddings, e2e, operational]
parents: [phase-23-claim-backfill-e2e]
created: 2026-04-30
updated: 2026-04-30
source: plan
confidence: medium
---

## Context

Phase 22 built the full vector claim infrastructure (embedding client, SQLite store, embed pipeline, MCP tools, claims_only mode), but everything was tested against mocks. No real claims.jsonl exists yet (both AML and trading wikis have 0 claims), and the nomic-embed-text-v1.5 embedding server hasn't been set up. Need to validate the entire pipeline end-to-end with real data.

## Decision

Operational validation phase: set up embedding server, update skill instructions for agent-driven backfill workflow, smoke test on small batch, then full-scale backfill across both wikis.

**Approach:** (1) Stand up second llama-server for embeddings on port 8081, (2) document the backfill workflow in research skill instructions, (3) smoke test claims_only on 20 articles, (4) E2E test claim_embed → claim_search → claim_dedup, (5) full backfill across both wikis.

**Rejected:** (A) running backfill without smoke test first — too risky for 5,900 articles, (B) automated test-only validation — need real data to validate embedding quality and dedup thresholds.

## Consequences

- Real claim data enables meaningful semantic search and dedup evaluation
- Embedding server adds ~150MB GPU memory as a second llama-server process
- Any bugs in Phase 22 code surface during live testing — scope includes bug fixes
- State files (summarize-state.json, embed-state.json) are load-bearing for session recovery
