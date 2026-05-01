---
title: "Phase 23: Claim Backfill E2E In Progress"
aliases: []
category: journal
tags: [knowledge-base, vector-embeddings, e2e, operational]
parents: [phase-23-claim-backfill-e2e]
created: 2026-04-30
updated: 2026-04-30
source: debrief
---

# Phase 23: Claim Backfill E2E In Progress

## What Happened
- Set up nomic-embed-text-v1.5 embedding server on port 8081 (522MB f32 GGUF, ~454MB GPU)
- Discovered and fixed two E2E bugs that Phase 22 mocks didn't catch:
  - llama-server returns nested `embedding: [[768 floats]]` not flat `embedding: [768 floats]` — added `unwrapEmbedding` helper
  - Qwen workers output bare `[CLAIM] text` without list marker `- ` — relaxed regex to `(?:-\s*)?`
- Updated research skill with claim backfill workflow instructions
- Smoke tested claims_only on 5 AML articles: 58 claims extracted successfully
- E2E validated full pipeline: claim_embed → claims.db (58 rows), claim_search (returns ranked results), claim_dedup (98 pairs at 0.85 threshold)
- Kicked off full AML backfill (120 articles, batch processing via Qwen --parallel 2)

## Problems Solved
- Nested embedding format — `unwrapEmbedding()` handles both flat and nested array shapes
- Claim extraction regex — `(?:-\s*)?` makes list marker optional, matching both worker output styles

## Artifacts Changed
- `container/agent-runner/src/mcp-tools/claim-embeddings.ts` (unwrapEmbedding for nested response)
- `container/agent-runner/src/mcp-tools/claim-embeddings.test.ts` (+2 tests for nested format)
- `container/agent-runner/src/mcp-tools/claim-store.ts` (relaxed CLAIM_RE regex)
- `container/skills/research/SKILL.md` (added ## Claim Backfill section)
- `container/skills/research/instructions.md` (added rule 9 for backfill workflow)
- `.env` (added NANOCLAW_EMBED_URL)

### Activation Quality
Active knowledge: 3 entries, 3 referenced (~100% hit rate, literal match).

## Soft Observations / Phase N+1 Candidates
- Smoke test articles were PDF-extracted garbage (PDF metadata, not AML content) — source quality filtering before claim extraction could improve signal | suggested: source_score threshold gate on claims_only mode | evidence: smoke test claim samples
- Qwen --parallel 2 makes 120-article batches take ~75min — consider separate lightweight model for claim-only extraction (no summary needed) | suggested: model routing for claims_only tasks | evidence: backfill timing observation

## Related
- [[phase-23-claim-backfill-e2e|Phase 23: Claim Backfill E2E]]
