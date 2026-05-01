---
title: "Phase 22: Vector Claim Store Planned"
category: journal
tags: [knowledge-base, vector-embeddings, claim-store, planning]
created: 2026-04-30
phase: 22
---

# Phase 22: Vector Claim Store Planned

## What Happened
- Planned Phase 22 after confirming Phase 21 complete (6/6 tasks, all exit criteria met)
- Cross-wiki retrieval from agentic-engineering-wiki (5 articles: chunking-and-embedding-strategies, wiki-retrieval-architecture, karpathy-wiki-pattern-architecture, flat-file-vs-graph-wiki-tradeoffs, wiki-knowledge-graph-architectures) and database-wiki (index scan, no directly relevant articles)
- User directed data-first approach (option B): populate claims.jsonl from 3,000+ existing raw articles before building vector infrastructure
- User confirmed direct claim extraction from raw articles (lightweight claim-only workers, no re-summarization of existing episodic articles)
- Approach reviewer scored 7/10 (accept) — key revision: use claims_only mode on existing research_summarize instead of new MCP tool
- Plan reviewer scored 6/10 (revise) — fixed: contract.ts scope for WriteTo tier extension, index.ts barrel wiring, 768-dim spec, multi-wiki path resolution

## Decisions Made
- [[phase-22-vector-claim-store-approach|Phase 22: Vector Claim Store Approach]] — two-stage (backfill + vector store), claims_only mode on research_summarize, nomic-embed-text-v1.5 embedding model, SQLite claims.db per wiki

## Artifacts Changed
- `.dev-wiki/articles/phases/phase-22-vector-claim-store.md` (created, status: active)
- `.dev-wiki/articles/decisions/phase-22-vector-claim-store-approach.md` (created, medium confidence)
- `.dev-wiki/tasks.md` (Phase 22 tasks added, Phase 21 collapsed)
- `.dev-wiki/_CURRENT_STATE.md` (Phase 22 active)
- `.claude/rules/active-phase.md` (Phase 22 constraints)
- `.claude/rules/active-knowledge.md` (Phase 22 knowledge: 4 source sections, 28 lines)

### Activation Quality
Active knowledge: 4 entries (Phase 22, newly written). 0 referenced (~0% hit rate — expected for planning-only session, no implementation yet).

## Related
- [[phase-22-vector-claim-store|Phase 22: Vector Claim Store]]
