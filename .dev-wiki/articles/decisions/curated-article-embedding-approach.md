---
title: "Curated Article Embedding Approach"
aliases: [curated embedding, article embedding, retrieval topology fix]
category: decisions
tags: [knowledge-pipeline, embedding, retrieval]
parents: [phase-44-curated-article-embedding]
created: 2026-05-07
updated: 2026-05-07
source: plan
confidence: high
---

## Context

The retrieval topology is inverted: 217K raw source sentences are embedded in knowledge.db (full semantic search), but 139 curated articles — the valuable, Claude-written output layer — are only reachable via BM25 keyword search (wiki_search). Most valuable content is behind the least capable retrieval.

## Decision

Embed curated articles sentence-level into knowledge.db with type "curated", reusing the existing sentence embedding pipeline. Strip `[source-slug]` citation markers before embedding (frontmatter and headers already stripped by splitSentences). Add type filtering to knowledge_search so agents can search `type="curated"` specifically. Generate a full curated article index (slug + title + tags) at spawn via wiki-bridge.ts so native attention handles "which article should I read?" without any search tool. No similarity boost between curated and raw results initially — keep it simple, measure first.

Chose sentence-level over article-level embedding because: curated articles are long and multi-topic; sentence-level + window expansion gives both precision (find specific facts) and context (surrounding curated prose). This is the same granularity as raw articles, just with a different type tag.

## Consequences

- knowledge_search becomes the primary retrieval path for both raw and curated content
- wiki_search (BM25) becomes a lightweight fallback, no longer on the critical path
- Index-in-context (~2K tokens per wiki) gives agents a "table of contents" for all curated knowledge at spawn
- Citation markers stripped before embedding to avoid polluting semantic vectors — applied only in curated pre-processing, not in the shared sentence splitter (raw articles don't use citation markers)
- State file keying uses "articles:" prefix for curated sources to avoid collision with raw article tracking in the same sentence-embed-state.json
- No similarity boost between curated and raw initially — measure retrieval quality first, then tune
- Future: wiki-consolidate deferred (episodic tier is legacy/inactive)
