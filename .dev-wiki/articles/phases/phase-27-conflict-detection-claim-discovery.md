---
title: "Phase 27: Conflict Detection + Claim Discovery"
aliases: [conflict-detection, claim-discovery, knowledge-conflicts]
category: phases
tags: [vector-embeddings, conflict-detection, claim-discovery, qwen-workers, knowledge-analysis]
parents: []
created: 2026-05-01
updated: 2026-05-01
source: plan
status: active
scope: ["container/agent-runner/src/mcp-tools/knowledge-vector-store.ts", "container/agent-runner/src/mcp-tools/knowledge-conflicts.ts", "container/agent-runner/src/mcp-tools/knowledge-discovery.ts", "container/agent-runner/src/mcp-tools/knowledge-classify.ts", "container/agent-runner/src/mcp-tools/knowledge-analysis-tools.ts", "container/agent-runner/src/mcp-tools/index.ts"]
entry_criteria: "Phase 26 complete (unified knowledge.db)"
exit_criteria: "Store gains article_slug index + getByArticleSlug, conflict detection finds cross-article pairs + Qwen classifies, claim discovery ranks unclaimed sentences + Qwen validates, MCP tools registered, build+tests pass"
---

# Phase 27: Conflict Detection + Claim Discovery

## Objective

Build two analytical capabilities on Phase 26's unified knowledge.db: (1) detect cross-article contradictions by surfacing high-similarity sentence pairs and classifying via Qwen worker, (2) discover unclaimed sentences that resemble existing claims and validate via Qwen worker.

## Scope

- Modify: knowledge-vector-store.ts (index + method), index.ts (barrel)
- New: knowledge-conflicts.ts, knowledge-discovery.ts, knowledge-classify.ts, knowledge-analysis-tools.ts

## Exit Criteria

- [ ] KnowledgeVectorStore has article_slug index and getByArticleSlug method
- [ ] findArticleConflicts + findQueryConflicts return cross-article pairs sorted by similarity
- [ ] discoverClaimsInArticle returns ranked unclaimed sentences with nearest claim
- [ ] Qwen worker classifies conflict pairs and validates claim candidates with graceful fallback (returns unclassified on failure)
- [ ] knowledge_conflicts + claim_discover MCP tools registered and functional
- [ ] Build + typecheck + all tests pass

## Notes

- Two-stage pipeline: embedding similarity (deterministic) → Qwen classification (semantic)
- Article-scoped operations: ~500 sentences × 300K store ≈ 150M cosine ops, feasible on M1 Max
- Decision-tree prompt pattern for Qwen workers (working knowledge: more reliable than natural language)
- Deterministic boundary validator on worker output (working knowledge: fail-stop at boundaries)
- 9K claims small enough to load in memory (~27MB) for discovery scoring
