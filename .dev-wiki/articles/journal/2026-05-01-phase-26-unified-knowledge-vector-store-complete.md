---
title: "Phase 26: Unified Knowledge Vector Store Complete"
aliases: [knowledge-vector-store-complete]
category: journal
tags: [vector-embeddings, knowledge-store, sentence-splitting, contextual-embedding]
parents: [phase-26-unified-knowledge-vector-store]
created: 2026-05-01
updated: 2026-05-01
source: debrief
---

# Phase 26: Unified Knowledge Vector Store Complete

## What Happened
- Built unified knowledge.db replacing claims.db — single vector store per wiki with type discriminator (claim|sentence)
- Extracted cosineSimilarity to shared vector-utils.ts, implemented sentence-splitter.ts with markdown-aware splitting (frontmatter/code/table skipping, abbreviation protection, section extraction)
- KnowledgeVectorStore with chunked search (10K rows/batch) for memory management at scale (~295K sentences)
- Refactored entire claim pipeline (claim-embed-pipeline, claim-tools, claim-vector-store.test) to use KnowledgeVectorStore — deleted claim-vector-store.ts
- Sentence embed pipeline: contextual embedding [title | section] prefix, is_claim flagging via normalized text match, chunked embedBatch (256/request), incremental state tracking
- knowledge_search + knowledge_embed MCP tools with type filtering, claim tools preserved as aliases
- Approach reviewer scored 5/10 initially (memory pressure, code duplication concerns), user directed store unification — approach revised to merge claims.db and sentences.db

## Decisions Made
- [[phase-26-sentence-embedding-store-approach|Unified Knowledge Vector Store]] — merge claims.db + sentences into single knowledge.db per user direction (both stores unproven, merging cost low now)

## Problems Solved
- Memory pressure at 295K rows — chunked search loads 10K rows at a time instead of full scan (~30MB vs 860MB)
- embedBatch can't handle 295K sentences — chunked at 256 per HTTP request
- Sentence splitting edge cases — abbreviations (U.S., Dr.), code blocks, tables, headings handled by explicit rules
- Type error in chunked search params — conditional $type field caused TS union narrowing issue, fixed with explicit Record<string, string|number>

## Artifacts Changed
- `container/agent-runner/src/mcp-tools/vector-utils.ts` (new — shared cosineSimilarity)
- `container/agent-runner/src/mcp-tools/sentence-splitter.ts` (new — markdown → sentences)
- `container/agent-runner/src/mcp-tools/knowledge-vector-store.ts` (new — unified store)
- `container/agent-runner/src/mcp-tools/sentence-embed-pipeline.ts` (new — batch embed with contextual prefix)
- `container/agent-runner/src/mcp-tools/knowledge-tools.ts` (new — knowledge_search + knowledge_embed)
- `container/agent-runner/src/mcp-tools/claim-vector-store.ts` (deleted)
- `container/agent-runner/src/mcp-tools/claim-embed-pipeline.ts` (refactored to KnowledgeVectorStore)
- `container/agent-runner/src/mcp-tools/claim-tools.ts` (refactored to KnowledgeVectorStore)
- `container/agent-runner/src/mcp-tools/index.ts` (added knowledge-tools import)

## Health Delta
- Container tests: 418 → 452 (+34 new: 5 vector-utils, 12 sentence-splitter, 7 knowledge-vector-store, 7 sentence-embed-pipeline, 3 knowledge-tools)
- Host build: clean. Container typecheck: clean.
- claim-vector-store.ts deleted — all tests updated to use KnowledgeVectorStore

### Activation Quality
Active knowledge: 3 entries, 3 referenced (~100% approximate hit rate, literal match).

## Related
- [[phase-26-unified-knowledge-vector-store|Phase 26: Unified Knowledge Vector Store]]
