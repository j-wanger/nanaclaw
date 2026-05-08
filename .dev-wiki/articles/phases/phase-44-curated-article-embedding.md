---
title: "Phase 44: Curated Article Embedding + Index-in-Context"
aliases: []
category: phases
tags: [knowledge-pipeline, retrieval, embedding]
parents: []
created: 2026-05-07
updated: 2026-05-07
source: plan
status: completed
scope: ["container/agent-runner/src/mcp-tools/knowledge-*.ts", "container/agent-runner/src/mcp-tools/sentence-*.ts", "src/modules/memory/wiki-bridge.ts", "container/skills/wiki-manager/*"]
entry_criteria: "Phase 43 complete, curated articles exist in knowledge wikis"
exit_criteria: "Curated articles embedded in knowledge.db with type 'curated', index-in-context at spawn, type filtering in knowledge_search"
---

# Phase 44: Curated Article Embedding + Index-in-Context

## Objective

Fix inverted retrieval topology — embed curated wiki articles into knowledge.db so semantic search reaches the valuable output layer, not just raw source material. Add full curated article index at spawn for native attention routing.

## Scope

Files and modules affected:
- `container/agent-runner/src/mcp-tools/knowledge-vector-store.ts`
- `container/agent-runner/src/mcp-tools/knowledge-tools.ts`
- `container/agent-runner/src/mcp-tools/sentence-splitter.ts`
- `container/agent-runner/src/mcp-tools/sentence-embed-pipeline.ts`
- `src/modules/memory/wiki-bridge.ts` (host-side, runs at spawn)
- `container/skills/wiki-manager/`

## Exit Criteria

- [ ] Curated articles embedded in knowledge.db with type "curated"
- [ ] Markdown stripped before embedding (frontmatter, headers, citation markers)
- [ ] knowledge_search supports type filtering
- [ ] wiki-bridge.ts generates full curated article index at spawn
- [ ] Documentation updated (knowledge-routing.md, wiki-manager skill)

## Notes

Retrieval is currently inverted: 217K raw source sentences embedded but 139 curated articles only reachable via BM25 keyword search. This phase corrects the topology.
