---
title: "Phase 33: Claim Markers + Contextual Sentence Embeddings"
aliases: []
category: phases
tags: [knowledge-architecture, claim-provenance, embeddings]
parents: []
created: 2026-05-04
updated: 2026-05-04
source: plan
status: active
scope: ["/Users/jwang/knowledge-wiki/skills/**", "container/agent-runner/src/mcp-tools/sentence-embed-pipeline.ts", "container/agent-runner/src/mcp-tools/knowledge-tools.ts"]
entry_criteria: "Phase 32 complete (memory MCP server operational)"
exit_criteria: "claim-spec.md exists, article-conventions.md documents claims, writer produces markers, wiki-health checks 14+15 operational, contextual prefix upgraded, knowledge_search returns context info"
---

# Phase 33: Claim Markers + Contextual Sentence Embeddings

## Objective

Establish the claim provenance convention in knowledge-wiki articles and upgrade sentence embeddings with richer contextual prefixes. These two independent workstreams form the foundation for the Phase 3 claim linker.

## Scope

**Workstream A (knowledge-wiki):**
- `/Users/jwang/knowledge-wiki/skills/knowledge-wiki/claim-spec.md` (new)
- `/Users/jwang/knowledge-wiki/skills/knowledge-wiki/article-conventions.md`
- `/Users/jwang/knowledge-wiki/skills/wiki-absorb/writer-prompt.md`
- `/Users/jwang/knowledge-wiki/skills/wiki-health/SKILL.md`
- `/Users/jwang/knowledge-wiki/skills/knowledge-wiki/reviewer-checklist.md`

**Workstream B (Nanaclaw):**
- `container/agent-runner/src/mcp-tools/sentence-embed-pipeline.ts`
- `container/agent-runner/src/mcp-tools/knowledge-tools.ts`

## Exit Criteria

- [x] claim-spec.md defines claim ID format, inline marker syntax, frontmatter schema, lifecycle
- [x] article-conventions.md documents claims: frontmatter section and [[clm_*]] convention
- [x] writer-prompt.md instructs writer to produce claim markers after factual statements
- [x] wiki-health checks 14 (marker integrity) and 15 (claim coverage) operational
- [x] reviewer-checklist.md includes check 13 (claims validation)
- [x] sentence-embed prefix upgraded from bracket to natural language format
- [x] knowledge_search returns contextual_text in results
- [ ] test article with 5+ claim markers passes wiki-health without errors

## Notes

Part of the 6-phase Option B architecture plan. Phases 1+2 combined. Cross-repo: Workstream A modifies knowledge-wiki, Workstream B modifies Nanaclaw.
