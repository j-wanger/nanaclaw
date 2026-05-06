---
title: "Phase 42: Pipeline Simplification Approach"
aliases: [pipeline-simplification, remove-old-pipeline]
category: decisions
tags: [pipeline, simplification, knowledge-embed, research]
parents: [phase-42-pipeline-simplification]
created: 2026-05-05
updated: 2026-05-05
source: plan
confidence: high
---

## Context

The knowledge pipeline evolved through 30+ phases from a Qwen-dependent summarization pipeline (raw → Qwen summarize → episodic → Qwen review → articles) to a deterministic embedding pipeline (raw → sentence embeddings → semantic search). The old pipeline's tools still exist alongside the new ones, causing confusion about which path to use. Qwen workers had reliability issues (15.7% step repetition, <25% TNR on review). The sentence embedding + small-to-big retrieval (Phases 26, 33, 37) made the summarization step unnecessary for knowledge retrieval.

## Decision

Remove the old Qwen-dependent pipeline entirely. Delete research_summarize, research_review, and all claim provenance tools (claim_link, claim_conflicts, claim_reconcile, claim_embed, claim_search, claim_dedup, claim_discover). Strip claim/insight/entity extraction branches from local-worker/dispatch.ts. Delete claim-store.ts (inline the 5-line ClaimEntry type into sentence-embed-pipeline.ts). Keep the deterministic pipeline: research_fetch → knowledge_embed → knowledge_search + knowledge_conflicts. Clear stale wiki data (episodic/, articles/, claims.jsonl, insights.jsonl, entities.jsonl) across all wikis — raw articles and knowledge.db are the only persistent artifacts.

Files to KEEP (still have live dependents):
- knowledge-classify.ts (classifyConflictPairs used by retained knowledge_conflicts tool)
- claim-embeddings.ts (embedText used by knowledge-tools.ts)
- knowledge-vector-store.ts, vector-utils.ts, knowledge-conflicts.ts, sentence-splitter.ts
- sentence-embed-pipeline.ts (graceful degradation, type inlined from deleted claim-store.ts)

Alternatives considered:
- **Archive to branch**: Rejected — git history preserves everything. Named branches add maintenance burden.
- **Keep claim tools dormant**: Rejected — dead code causes exactly the confusion that triggered this phase.
- **Modify sentence-embed-pipeline.ts**: Rejected (YAGNI) — graceful degradation when claims.jsonl is absent is sufficient. Only change: inline ClaimEntry type after claim-store.ts deletion.
- **Remove knowledge_conflicts Qwen dispatch**: Not done — classify=true dispatches Qwen for conflict classification, but this is an optional enhancement, not part of the critical fetch→embed→search path.

## Consequences

- Pipeline simplifies to 3 deterministic tools (fetch, embed, search). No Qwen in the critical path.
- Claim provenance chain (Phases 21-23, 33-37) is removed. NLI verification capability is lost. If needed later, it can be rebuilt on the sentence embedding layer.
- knowledge_conflicts (sentence-level contradiction detection) is retained — it operates on sentence embeddings, not claims. Qwen classify is optional.
- ~15 source files + ~8 test files deleted from container/agent-runner.
- dispatch.ts claim/insight/entity extraction branches removed — no more orphan JSONL writes.
- .claude-fragments documentation updated alongside SKILL.md to prevent agent from referencing deleted tools.
- Wiki content deletion is irreversible (though raw articles remain).
