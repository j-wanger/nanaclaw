---
title: "Phase 13: Multi-Stage Research Pipeline"
aliases: [phase-13, research-pipeline, orchestrated-research]
category: phases
tags: [local-worker, research-loop, wiki-design, multi-agent]
parents: [phase-12-worker-research-reliability]
created: 2026-04-27
updated: 2026-04-27
source: plan
status: complete
scope: ["container/agent-runner/src/mcp-tools/wiki-write.ts", "container/agent-runner/src/mcp-tools/wiki-write.test.ts", "container/skills/research-loop/**", "groups/*/models.json", ".env"]
entry_criteria: "Phase 12 complete, autonomous research loop proven unreliable, Hermes raw/ pattern identified"
exit_criteria: "Parallel inference configured, wiki_write tier:raw with sha256, 5-stage pipeline in SKILL.md, prompt templates, live test produces raw+summarized entries, build clean"
---

# Phase 13: Multi-Stage Research Pipeline

## Objective

Replace autonomous agent-loop research with orchestrator-driven multi-stage pipeline. Nana plans and orchestrates, Qwen workers execute focused single-stage tasks. Add parallel inference capacity and raw material layer for domain knowledge bases.

## Scope

- `container/agent-runner/src/mcp-tools/wiki-write.ts` — raw tier
- `container/skills/research-loop/` — SKILL.md rewrite + prompt templates
- `groups/*/models.json` — parallel inference config
- `.env` — secondary model endpoints

## Exit Criteria

- [x] llama-cpp supports parallel requests (4 slots, max_concurrent=4)
- [x] wiki_write supports tier: raw with Hermes frontmatter (source_url, ingested, sha256)
- [x] research-loop SKILL.md teaches 5-stage orchestrated pipeline
- [x] Stage prompt templates (search+write-raw, summarize, review)
- [x] Live test: pipeline produces raw .md (6 articles with sha256 frontmatter)
- [x] All tests pass, build clean (366 host + 230 container)
