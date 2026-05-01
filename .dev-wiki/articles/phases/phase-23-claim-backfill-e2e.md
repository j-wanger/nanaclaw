---
title: "Phase 23: Claim Backfill E2E"
aliases: [claim-backfill, embedding-server-setup, e2e-claims]
category: phases
tags: [knowledge-base, vector-embeddings, claim-store, e2e, operational]
parents: []
created: 2026-04-30
updated: 2026-04-30
source: plan
status: completed
scope: ["container/skills/research/**", ".env", "container/agent-runner/src/mcp-tools/**"]
entry_criteria: "Phase 22 complete (vector claim store infrastructure)"
exit_criteria: "Embedding server on NANOCLAW_EMBED_URL with 768-dim vectors, research skill documents backfill workflow, claims.jsonl populated from raw articles, claims.db populated via claim_embed, claim_search returns relevant results, claim_dedup identifies duplicates, build+tests pass"
---

# Phase 23: Claim Backfill E2E

## Objective

Stand up the nomic-embed-text-v1.5 embedding server, run claims_only across ~5,900 raw articles (2,870 AML + 3,017 trading), embed into per-wiki claims.db, and validate claim_search + claim_dedup on real data.

## Scope

- `.env` — NANOCLAW_EMBED_URL configuration
- `container/skills/research/**` — backfill workflow instructions
- `container/agent-runner/src/mcp-tools/**` — bug fixes if surfaced during E2E
- Operational: llama-server embedding instance setup + live pipeline runs

## Exit Criteria

- [ ] Embedding server responds on NANOCLAW_EMBED_URL with 768-dim vectors
- [ ] Research skill instructions document claims_only backfill workflow
- [ ] claims.jsonl populated with real claims from raw articles (>500 per wiki)
- [ ] claims.db populated with embedded vectors via claim_embed
- [ ] claim_search returns relevant results for known topics
- [ ] claim_dedup identifies near-duplicate pairs (or confirms none above threshold)
- [ ] Build + typecheck + all tests pass

## Notes

- Primarily operational validation of Phase 22 code against real data
- Embedding model: nomic-embed-text-v1.5 GGUF (~150MB, 768 dims) on second llama-server instance (port 8081)
- Claim backfill is long-running — summarize-state.json and embed-state.json provide session-boundary persistence
- ~5,900 raw articles × ~5 claims/article ≈ ~30K claims; brute-force cosine sim still <100ms at this scale
