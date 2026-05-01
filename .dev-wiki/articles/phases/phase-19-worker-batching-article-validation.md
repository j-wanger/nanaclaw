---
title: "Phase 19: Worker Result Batching + Article Validation Gates"
aliases: [worker-batching, article-validation]
category: phases
tags: [worker-dispatch, validation, wiki, research-pipeline]
parents: []
created: 2026-04-29
updated: 2026-04-29
source: plan
status: active
scope: ["container/agent-runner/src/mcp-tools/**", "container/agent-runner/src/poll-loop.ts"]
entry_criteria: "Phase 18 complete"
exit_criteria: "Worker results batch until all dispatched workers complete or 60s timeout, raw articles validated after write, episodic articles validated with auto-repair, wiki_backfill_source_urls tool works, build+typecheck+tests pass"
---

# Phase 19: Worker Result Batching + Article Validation Gates

## Objective

Fix three production issues: worker result drip-feed causing message spam (~15 separate messages for 30 workers), missing mechanical validation on raw/episodic outputs, and source_url missing from all 723 existing episodic entries.

## Scope

- `container/agent-runner/src/mcp-tools/` — article-validation, wiki-backfill, research-fetch, research-summarize, research-review
- `container/agent-runner/src/mcp-tools/local-worker/` — tools.ts (batch tracker + validation gate in dispatch)

## Exit Criteria

- [ ] Worker results batch until all dispatched workers complete or 60s timeout
- [ ] Raw articles validated after write; failures marked extraction: invalid
- [ ] Episodic articles validated with auto-repair (source_url, tags from write_to); unfixable marked needs-review
- [ ] wiki_backfill_source_urls matches existing episodic to raw by slug and writes source_url
- [ ] Build + container typecheck + all tests pass

## Notes

- Batch tracker is module-state singleton in tools.ts (matches existing module-level pattern)
- Validation is deterministic — no LLM judge (per working-knowledge: fail-open principle)
- Backfill uses slug common-prefix matching (no new dependency)
