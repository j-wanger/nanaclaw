---
title: "Phase 21: Source Triage + Claim Extraction"
aliases: [source-triage, claim-extraction]
category: phases
tags: [knowledge-base, source-scoring, claim-extraction, research-pipeline]
parents: []
created: 2026-04-30
updated: 2026-04-30
source: plan
status: active
scope: ["container/agent-runner/src/mcp-tools/**", "container/skills/research/**"]
entry_criteria: "Phase 20 complete"
exit_criteria: "computeSourceScore exists with domain allowlist, source_score in raw frontmatter, summarize workers extract [CLAIM] tags, claims appended to per-wiki claims.jsonl, skill updated, build+tests pass"
---

# Phase 21: Source Triage + Claim Extraction

## Objective

Add source quality scoring at fetch time and structured claim extraction alongside summaries. Foundation for vector dedup and consolidation in Phase 22.

## Scope

- `container/agent-runner/src/mcp-tools/` — source-score.ts, claim-store.ts, research-fetch.ts, research-summarize.ts, dispatch.ts
- `container/skills/research/` — summarize-prompt.md, SKILL.md, instructions.md

## Exit Criteria

- [ ] computeSourceScore with domain allowlist + depth scoring
- [ ] source_score in raw article frontmatter via research_fetch
- [ ] Summarize workers extract [CLAIM] tags via boundaries + postcondition
- [ ] postProcessResult extracts claims → per-wiki claims.jsonl
- [ ] Research skill documents claim extraction
- [ ] Build + container typecheck + all tests pass

## Notes

- Claim extraction guidance via boundaries array (orchestrator-controlled), not hardcoded in prompt-builder.ts — keeps Qwen prompt lean per working-knowledge 4K-8K sweet spot
- source_score lookup degrades gracefully to 0 for pre-Phase-21 raw articles
- source-authority.json templates seeded per-wiki on disk (not in container skills)
- Vector embeddings + dedup deferred to Phase 22
