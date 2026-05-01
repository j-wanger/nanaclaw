---
title: "Phase 20: Summarize Pipeline Reliability"
aliases: [summarize-reliability, batch-tracker-removal]
category: phases
tags: [worker-dispatch, research-pipeline, state-management]
parents: []
created: 2026-04-30
updated: 2026-04-30
source: plan
status: active
scope: ["container/agent-runner/src/mcp-tools/**", "container/agent-runner/src/poll-loop.ts", "container/skills/research/**"]
entry_criteria: "Phase 19 complete"
exit_criteria: "Batch tracker removed from summarize path, research_summarize accepts raw_dir+batch_size with source_url dedup and summarize-state.json, research_review retains batch holding, skill teaches bulk pattern, stale tasks cleaned, build+tests pass"
---

# Phase 20: Summarize Pipeline Reliability

## Objective

Replace the broken singleton batch tracker with tool-controlled stateful batching. Nana's session stalled at batch 41 with ~545 articles remaining because: (1) rapid-fire dispatches overwrote the batch tracker, (2) no persistent summarize progress, (3) batch tracker blocked the idle worker wake mechanism.

## Scope

- `container/agent-runner/src/mcp-tools/` — tools.ts (batch tracker removal), research-summarize.ts (stateful batching)
- `container/agent-runner/src/poll-loop.ts` — comment cleanup
- `container/skills/research/` — SKILL.md + instructions.md bulk summarization

## Exit Criteria

- [ ] Batch tracker removed from summarize path
- [ ] research_summarize accepts raw_dir + batch_size with source_url dedup and summarize-state.json
- [ ] research_review retains registerPendingBatch
- [ ] Research skill teaches bulk summarization, old paths-array pattern retired
- [ ] Stale task files cleaned safely
- [ ] Build + container typecheck + all tests pass
