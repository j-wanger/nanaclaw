---
title: "Phase 34: Claim Linker"
aliases: []
category: phases
tags: [knowledge-architecture, claim-provenance, NLI]
parents: []
created: 2026-05-04
updated: 2026-05-04
source: plan
status: completed
scope: ["container/agent-runner/src/mcp-tools/claim-linker.ts", "container/agent-runner/src/mcp-tools/knowledge-tools.ts"]
entry_criteria: "Phase 33 complete (claim markers, contextual embeddings, wiki-health checks operational)"
exit_criteria: "claim_link MCP tool operational, sentence_ids populated for ≥1 claim, nli_score populated, lifecycle transitions from unlinked, test article with 5+ markers passes wiki-health after linking"
---

# Phase 34: Claim Linker

## Objective

Build the `claim_link` MCP tool that transitions wiki article claims from "unlinked" to "linked"/"verified" by matching claim text against knowledge.db sentences with NLI verification via Qwen local worker.

## Scope

- `container/agent-runner/src/mcp-tools/claim-linker.ts` (new — core pipeline + frontmatter update)
- `container/agent-runner/src/mcp-tools/knowledge-tools.ts` (register claim_link tool)

## Exit Criteria

- [x] claim_link MCP tool operational
- [x] sentence_ids populated for ≥1 claim in test article
- [x] nli_score populated with entailment score
- [x] Lifecycle transitions from "unlinked" to "linked"/"verified"
- [x] Test article with 5+ claim markers passes wiki-health after linking

## Notes

Phase 3 of 6-phase Option B architecture. Two-pass pipeline: vector retrieval (cosine threshold ≥0.7, same-article excluded via client-side post-filter) → Qwen NLI classification (entails/neutral/contradicts → numeric scores 1.0/0.5/0.0, averaged as nli_score). Reuses knowledge-classify.ts pattern for Qwen classification. YAML frontmatter update via targeted regex (no js-yaml dep). Batch NLI pairs per article into single Qwen call within 4K-8K token budget.
