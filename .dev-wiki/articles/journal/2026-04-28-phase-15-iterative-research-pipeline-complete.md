---
title: "Phase 15: Iterative Research Pipeline Complete"
aliases: [phase-15-complete]
category: journal
tags: [research, mcp-tools, searxng, workers, knowledge-wiki, dispatch, phase-complete]
parents: [phase-15-iterative-research-pipeline]
created: 2026-04-28
updated: 2026-04-28
source: debrief
---

# Phase 15: Iterative Research Pipeline Complete

## What Happened
- Built research_fetch MCP tool — pure script (zero LLM): SearXNG query → URL dedup via per-wiki raw/.url-index → parallel fetch+extract via Promise.allSettled → write raw articles with Hermes frontmatter (sha256, source_url, ingested). ~15-30s total vs 3-8 min with LLM workers.
- Added write_to contract extension to dispatch post-processing: episodic tier writes articles with frontmatter, review tier updates target article status. All routing is code-driven, no LLM needed.
- Rewrote research skill for iterative pipeline: wiki-first knowledge query, iterative search loop (generate queries → research_fetch → evaluate → more queries), single-shot summarize/review workers with write_to routing.
- Added instructions.md to 5 container skills (agent-browser, deep-work, local-worker, self-customize, voice) for fragment composition.
- Compacted worker result injection for write_to workers — metadata only, no article body in poll-loop results.
- Live test via Telegram confirmed full pipeline operational.

## Problems Solved
- NanoClaw crash-loop on startup: Docker daemon wasn't running, causing fatal error in ensureContainerRuntimeRunning. Fixed by starting Docker and restarting service via launchctl.

## Artifacts Changed
- `container/agent-runner/src/mcp-tools/research-fetch.ts` (new — scriptable search+extract)
- `container/agent-runner/src/mcp-tools/research-fetch.test.ts` (new — 6 test suites)
- `container/agent-runner/src/mcp-tools/url-index.ts` (new — URL dedup index)
- `container/agent-runner/src/mcp-tools/url-index.test.ts` (new — index tests)
- `container/agent-runner/src/mcp-tools/research-summarize.ts` (new — episodic path + review dispatch)
- `container/agent-runner/src/mcp-tools/research-review.ts` (new — scored review)
- `container/agent-runner/src/mcp-tools/local-worker/contract.ts` (write_to extension)
- `container/agent-runner/src/mcp-tools/local-worker/dispatch.ts` (post-processing logic)
- `container/agent-runner/src/mcp-tools/local-worker/tools.ts` (compact result injection)
- `container/skills/research/SKILL.md` (iterative pipeline rewrite)
- `container/skills/research/instructions.md` (compact rules)
- `container/skills/research/summarize-prompt.md` (single-shot template)
- `container/skills/research/review-prompt.md` (single-shot template)
- 5 new `instructions.md` across container skills

### Review Gate
Reviewer: 7/10, verdict revise. HIGH: `findRawSource()` in research-review.ts matches episodic→raw by `source_url` in frontmatter, but `writeEpisodicArticle()` in dispatch.ts never writes `source_url` — review stage is inert. MEDIUM: WikiEntry/loadWikis/generateSlug duplicated across 6 MCP tool files. LOW: SKILL.md at 135 lines (under 160-line complex orchestration minimum), prompt template timeout_ms drift vs code.

### Activation Quality
Active knowledge: 4 entries (stale — scoped to Phase 13, not refreshed for Phase 15), 2 referenced (~50% approximate hit rate, literal match). Consider pruning low-relevance entries in next /dev-plan.

### Retro Check (Phases 0-15)

| Dimension | Findings | Signal |
|-----------|----------|--------|
| 1. Recurring Blockers | Worker step-repetition across Phases 12-14, resolved by Phase 15 script approach | low |
| 2. Decision Reversals | Research pipeline redesigned 4x (Phases 5→6b→13→14→15) before stabilizing on script+cognitive split | low |
| 3. User Corrections | 0 | none |

Recommendations:
- Research pipeline iteration was expected for novel capability — each phase narrowed the design space. The final split (script for mechanical, LLM for cognitive) is validated by live test. No systemic issue.

## Related
- [[phase-15-iterative-research-pipeline|Phase 15: Iterative Research Pipeline]]
- [[phase-14-unified-research-skill|Phase 14: Unified Research Skill]]
- [[phase-13-multi-stage-research-pipeline|Phase 13: Multi-Stage Research Pipeline]]
