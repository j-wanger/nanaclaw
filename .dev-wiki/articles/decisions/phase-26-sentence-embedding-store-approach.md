---
title: "Phase 26: Unified Knowledge Vector Store"
aliases: [sentence-embedding-store, knowledge-vector-store, unified-vectors]
category: decisions
tags: [vector-embeddings, knowledge-store, sentence-splitting, contextual-embedding]
parents: [phase-26-unified-knowledge-vector-store]
created: 2026-05-01
updated: 2026-05-01
source: plan
confidence: medium
---

## Context

Claims extraction has no completeness verification. The user proposes embedding every sentence from wiki articles, flagging which are known claims. This transforms extraction verification from a prompt-quality problem into a data problem. Also enables conflict detection and semi-automatic claim discovery. Claims.db (Phase 22) has not been proven in production — merging now is cheaper than later.

## Decision

**Unified knowledge.db** per wiki replaces claims.db. Single table with type discriminator: `type='claim'` for extracted claims, `type='sentence'` for article sentences. Schema: `id, text, contextual_text, embedding, type, source_url, article_slug, section, source_score, wiki, created`. Contextual embedding: prepend `[article_title | section_heading]` per sentence before embedding (Anthropic's contextual retrieval pattern). Chunked search (10K rows/batch) to manage memory. Chunked embedBatch (256 sentences/request). is_claim flagging via normalized text match against claims.jsonl at insert time.

**Refactor claim pipeline:** ClaimVectorStore → KnowledgeVectorStore. claim_search/claim_embed/claim_dedup → knowledge_search/knowledge_embed. Claim tools become thin wrappers with type='claim' filter.

**New modules:** vector-utils.ts (shared cosineSimilarity), sentence-splitter.ts (markdown → sentences with section context), sentence-embed-pipeline.ts (batch articles → split → contextualize → embed → store).

**Alternative considered:** Keep claims.db and sentences.db as separate stores. Rejected by user — both are new/unproven, merging cost is low now and avoids future migration.

## Consequences

- One vector store per wiki instead of two — simpler mental model, one search surface
- Claims pipeline refactored — existing claim_embed/claim_search tests need updating
- ~295K sentence rows + ~9K claim rows per wiki in one DB
- Chunked search keeps memory under ~30MB per query
- Conflict detection and semi-automatic claim discovery deferred to Phase 27
