---
title: "Phase 13: Multi-Stage Research Pipeline Complete"
aliases: [phase-13-complete]
category: journal
tags: [local-worker, research-loop, wiki-design, multi-agent, live-test]
parents: [phase-13-multi-stage-research-pipeline]
created: 2026-04-27
updated: 2026-04-27
source: debrief
---

# Phase 13: Multi-Stage Research Pipeline Complete

## What Happened
- Discovered llama-cpp already runs 4 parallel inference slots (no `--parallel` flag needed). Updated models.json max_concurrent from 1 to 4 for both agent groups.
- Added wiki_write raw tier: `tier: "raw"` routes to `raw/articles/`, computes sha256 of content body via `crypto.createHash`, includes `source_url`, `ingested` date, and `sha256` in frontmatter. 3 new tests.
- Created 3 prompt template companion files for the pipeline stages: search-extract (8K budget), summarize (6K budget), review (4K scored rubric).
- Rewrote research-loop SKILL.md from single-worker autonomous loop to 5-stage orchestrated pipeline (Plan, Search+Raw, Summarize, Review, Consolidate).
- Live E2E test via CLI adapter: 3 parallel workers dispatched, all timed out (120s) without calling wiki_write. Orchestrator adapted — extracted content from worker tool traces and wrote 6 raw articles directly. Raw articles in `agentic-engineering-wiki/raw/articles/` with correct Hermes frontmatter.

## Problems Solved
- launchd plist discovery: service registered as `com.nanoclaw-v2-f63cf683`, not `com.nanoclaw`. Previous attempts to start/restart via `launchctl list com.nanoclaw` failed silently.
- CLI socket staleness: failed `pnpm run dev` attempt created stale socket preventing subsequent connections. Fixed by removing socket before restart.

## Open Questions
- Worker step-repetition: all 3 workers exhausted iterations on search/extract without transitioning to wiki_write. The decision-tree prompt pattern isn't sufficient to force the transition. Possible fix: remove wiki_write from Stage 2 workers entirely and have the orchestrator write raw articles from worker output.
- Worker result pickup: `checkWorkerResults` in poll-loop didn't clean up result files. Possible timing issue — needs investigation.

## Artifacts Changed
- `groups/dm-with-wang/models.json` (max_concurrent: 1 → 4)
- `groups/cli-with-wang/models.json` (max_concurrent: 1 → 4)
- `container/agent-runner/src/mcp-tools/wiki-write.ts` (raw tier, sha256, source_url)
- `container/agent-runner/src/mcp-tools/wiki-write.test.ts` (3 new raw tier tests)
- `container/skills/research-loop/SKILL.md` (5-stage pipeline rewrite)
- `container/skills/research-loop/search-extract-prompt.md` (new)
- `container/skills/research-loop/summarize-prompt.md` (new)
- `container/skills/research-loop/review-prompt.md` (new)

### Review Gate
Reviewer: 8/10, verdict revise. MEDIUM: stale _CURRENT_STATE.md and phase article (resolved by debrief). LOW: review-prompt.md example verdict inconsistency (fixed).

### Activation Quality
Active knowledge: 4 entries, 3 referenced (~75% approximate hit rate, literal match). Healthy activation.

## Soft Observations / Phase N+1 Candidates
- Worker wiki_write failure pattern is structural, not prompt-fixable | Phase 14: separate search-only workers from write stage, orchestrator handles all wiki_write calls | live test tool traces
- checkWorkerResults timing issue may cause stale result files | Phase 14: investigate poll-loop re-entry and result cleanup lifecycle | worker-results/ directory state after live test

## Related
- [[phase-13-multi-stage-research-pipeline|Phase 13: Multi-Stage Research Pipeline]]
- [[phase-12-worker-research-reliability|Phase 12: Worker Research Reliability]]
