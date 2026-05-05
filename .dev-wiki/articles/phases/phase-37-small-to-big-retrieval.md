---
title: "Phase 37: Small-to-Big Retrieval"
aliases: [expand_to_parent, parent chunk retrieval, sentence window]
category: phases
tags: [knowledge-architecture, retrieval, embeddings]
parents: []
created: 2026-05-05
updated: 2026-05-05
source: plan
status: active
scope: ["container/agent-runner/src/mcp-tools/knowledge-tools.ts", "container/agent-runner/src/mcp-tools/knowledge-vector-store.ts", "container/agent-runner/src/mcp-tools/*.test.ts"]
entry_criteria: "Phase 36 complete, knowledge_search returns sentence-level results with article_slug + section metadata"
exit_criteria: "knowledge_search accepts expand parameter; parent context via sentence window from knowledge.db; same-article overlap merging; all tests passing"
---

# Phase 37: Small-to-Big Retrieval

## Objective

Add sentence-window expansion to knowledge_search — search at sentence level for precision, return surrounding context (configurable window of neighboring sentences from knowledge.db) for LLM consumption. Phase 6 of the Option B knowledge-wiki architecture.

## Scope

Files and modules affected:
- `container/agent-runner/src/mcp-tools/knowledge-vector-store.ts` — getWindow method
- `container/agent-runner/src/mcp-tools/knowledge-tools.ts` — expand/window_size params + expandSearchResults
- Tests for both

## Exit Criteria

- [ ] knowledge_search accepts expand parameter ("none" | "window") and window_size
- [ ] Parent context extracted from knowledge.db via sentence window (N before + match + N after)
- [ ] Same-article overlap merging for nearby matches
- [ ] All tests passing (566+ baseline)

## Notes

Initial approach was section-level expansion from raw articles. Approach reviewer (5/10) caught that 98.3% of raw articles lack sub-headings — section expansion would return entire articles. Revised to sentence-window via knowledge.db ID ordering. IDs are sequential within articles due to sequential embed pipeline. No schema changes, no disk reads for expansion.

Part of the 6-phase Option B architecture plan ("Wiki as Primary, Sentences as Index"). Completes the final phase.
