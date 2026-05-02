---
title: "Phase 27: Conflict Detection + Claim Discovery"
aliases: [conflict-detection, claim-discovery, knowledge-analysis]
category: decisions
tags: [vector-embeddings, conflict-detection, claim-discovery, qwen-workers]
parents: [phase-27-conflict-detection-claim-discovery]
created: 2026-05-01
updated: 2026-05-01
source: plan
confidence: medium
---

## Context

Phase 26 built a unified knowledge.db with ~300K sentence embeddings + ~9K claim embeddings (768-dim, nomic-embed-text-v1.5). The infrastructure exists but has no analytical tools — the agent can search but can't detect contradictions or discover missing claims. Phase 26 explicitly deferred conflict detection and semi-automatic claim discovery to this phase.

## Decision

**Two-stage pipeline for both capabilities:** embedding similarity (deterministic, fast) followed by Qwen worker classification (cheap, adds semantic judgment).

**Conflict Detection:**
- `findArticleConflicts(store, articleSlug, topK, minSimilarity)` — loads article sentences, searches cross-article for high-similarity matches (excluding same-article), returns pairs sorted by similarity.
- `findQueryConflicts(store, queryVec, topK)` — searches by query embedding, identifies cross-article pairs in results.
- Qwen worker classifies pairs as agree/contradict/unrelated using decision-tree prompt pattern.
- MCP tool: `knowledge_conflicts`

**Claim Discovery:**
- `discoverClaimsInArticle(store, articleSlug, topK)` — for each unclaimed sentence, computes max cosine similarity to any existing claim, ranks candidates.
- Qwen worker validates candidates as claim/not-claim.
- MCP tool: `claim_discover`

**Worker integration:**
- Lightweight classification helpers in `knowledge-classify.ts` — builds contracts, dispatches via executeAgentLoop, parses structured output ([RESULT], [VALIDATE] tags).
- Deterministic boundary validator on worker output — fail-stop on malformed results (aligns with "LLM pipelines fail open" working knowledge).
- Graceful fallback: returns unclassified results when Qwen unavailable.

**Store additions:** article_slug index + getByArticleSlug method on KnowledgeVectorStore.

**Alternative considered:** Pre-computing all conflicts at embed time (batch O(n²)). Rejected: 300K² = 90B comparisons infeasible, and conflicts are only useful when reviewing specific articles/topics.

## Consequences

- Article-scoped analysis keeps computation tractable (~500 sentences × 300K store per query)
- Qwen workers add semantic judgment without burdening the main agent's context
- Fallback ensures tools work even when Qwen is unavailable (embedding results only)
- No LLM pre-classification for all pairs — only classify candidates surfaced by similarity
