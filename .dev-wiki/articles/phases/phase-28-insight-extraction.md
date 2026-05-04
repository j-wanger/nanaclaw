---
title: "Phase 28: Insight Extraction"
aliases: [insight-extraction, insights-only, knowledge-insights]
category: phases
tags: [knowledge-pipeline, insight-extraction, research-summarize, embedding-pipeline]
parents: []
created: 2026-05-02
updated: 2026-05-02
source: plan
status: active
scope: ["container/agent-runner/src/mcp-tools/claim-store.ts", "container/agent-runner/src/mcp-tools/research-summarize.ts", "container/agent-runner/src/mcp-tools/sentence-embed-pipeline.ts", "container/agent-runner/src/mcp-tools/knowledge-vector-store.ts", "container/agent-runner/src/mcp-tools/knowledge-tools.ts", "container/agent-runner/src/mcp-tools/knowledge-conflicts.ts", "container/agent-runner/src/mcp-tools/knowledge-analysis-tools.ts"]
entry_criteria: "Phase 27 complete (conflict detection + claim discovery)"
exit_criteria: "extractInsights() extracts [INSIGHT] tags, insights_only mode dispatches with insight prompt, insights.jsonl stores insights, embedding pipeline classifies type='insight', knowledge search accepts type='insight', conflict detection supports type filtering, build+tests pass"
---

# Phase 28: Insight Extraction

## Objective

Add insight extraction as a parallel knowledge type alongside claims. Insights are actionable heuristics, design patterns, and recommendations — distinct from factual claims. The type distinction is load-bearing for conflict detection: contradictory claims are real problems; contradictory insights are just different expert opinions.

## Scope

- Modify: claim-store.ts (insight regex + JSONL storage), research-summarize.ts (insights_only mode), sentence-embed-pipeline.ts (insight type classification), knowledge-vector-store.ts (type union), knowledge-tools.ts (type filter), knowledge-conflicts.ts (type-aware filtering), knowledge-analysis-tools.ts (type filter parameter)
- New files: none (all changes extend existing modules)

## Exit Criteria

- [ ] extractInsights() extracts [INSIGHT] tags from worker output
- [ ] insights_only mode dispatches workers with insight-focused prompt
- [ ] insights.jsonl stores extracted insights with metadata
- [ ] Embedding pipeline classifies sentences matching insights as type='insight'
- [ ] Knowledge search accepts type='insight' filter
- [ ] Conflict detection supports type filtering (skip insight-vs-insight by default)
- [ ] Build + typecheck + all tests pass

## Notes

- Mirrors the existing claim extraction pattern: regex → JSONL → embedding → search
- Priority order for type classification: claim > insight > sentence (a sentence matching both claim and insight is classified as claim)
- Insight prompt emphasizes heuristics, patterns, recommendations, best practices — not verifiable factual assertions
- No new files needed; all changes extend existing modules
