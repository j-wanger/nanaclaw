---
title: "Phase 26: Unified Knowledge Vector Store"
aliases: [knowledge-vector-store, sentence-embedding-store, unified-vectors]
category: phases
tags: [vector-embeddings, knowledge-store, sentence-splitting, contextual-embedding]
parents: []
created: 2026-05-01
updated: 2026-05-01
source: plan
status: active
scope: ["container/agent-runner/src/mcp-tools/vector-utils.ts", "container/agent-runner/src/mcp-tools/sentence-splitter.ts", "container/agent-runner/src/mcp-tools/knowledge-vector-store.ts", "container/agent-runner/src/mcp-tools/sentence-embed-pipeline.ts", "container/agent-runner/src/mcp-tools/knowledge-tools.ts", "container/agent-runner/src/mcp-tools/claim-vector-store.ts", "container/agent-runner/src/mcp-tools/claim-embed-pipeline.ts", "container/agent-runner/src/mcp-tools/claim-tools.ts", "container/agent-runner/src/mcp-tools/index.ts"]
entry_criteria: "Phase 25 complete"
exit_criteria: "Shared vector-utils, sentence splitter, unified knowledge.db with type discriminator, claim pipeline refactored, sentence embed pipeline with contextual embedding + is_claim flagging, knowledge_search/knowledge_embed MCP tools, build+tests pass"
---

# Phase 26: Unified Knowledge Vector Store

## Objective

Embed every sentence from wiki articles into a unified per-wiki knowledge.db alongside existing claims. Enables extraction coverage tracking, conflict identification, and semi-automatic claim discovery via embedding similarity.

## Scope

- New: vector-utils.ts, sentence-splitter.ts, knowledge-vector-store.ts, sentence-embed-pipeline.ts, knowledge-tools.ts
- Refactor: claim-vector-store.ts (delete), claim-embed-pipeline.ts, claim-tools.ts, index.ts
- Kept as-is: claim-embeddings.ts (embedText/embedBatch), claim-store.ts (extractClaims/appendClaims)

## Exit Criteria

- [x] vector-utils.ts exports shared cosineSimilarity
- [x] sentence-splitter.ts parses markdown into sentences with section context
- [x] KnowledgeVectorStore with unified schema (type='claim'|'sentence'), chunked search (10K rows/batch)
- [x] Claim pipeline refactored + existing claims.db migrated to knowledge.db
- [x] Sentence embed pipeline: contextual embedding, is_claim flagging, chunked embedBatch (256/req)
- [x] knowledge_search/knowledge_embed MCP tools (claim tools kept as aliases)
- [x] Build + typecheck + all tests pass

## Notes

- Unified schema: id, text, contextual_text, embedding, type, source_url, article_slug, section, source_score, wiki, created
- Contextual embedding: prepend [article_title | section_heading] per sentence (Anthropic pattern, +67% retrieval improvement)
- is_claim: lowercase(trim(text)) match against claims.jsonl at insert time
- ~295K sentences + ~9K claims per wiki, ~900MB total embeddings
- Chunked search keeps memory under ~30MB per query
- Conflict detection and claim discovery deferred to Phase 27
