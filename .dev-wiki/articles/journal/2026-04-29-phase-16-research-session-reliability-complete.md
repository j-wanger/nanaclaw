---
title: "Phase 16: Research Session Reliability Complete"
aliases: [phase-16-complete]
category: journal
tags: [research, context-engineering, deep-work, communication, dispatch, phase-complete]
parents: [phase-16-research-session-reliability]
created: 2026-04-29
updated: 2026-04-29
source: debrief
---

# Phase 16: Research Session Reliability Complete

## What Happened
- Compacted research tool outputs to reduce context footprint: research_fetch returns `{added, skipped, failed, new_articles: [{title, url}]}` (~3KB vs ~6KB per call for 20 articles), research_summarize and research_review drop per-worker arrays.
- Fixed review stage source_url propagation: added `source_url` to WriteTo interface, research_summarize extracts from raw article frontmatter, writeEpisodicArticle includes in episodic frontmatter. findRawSource can now match episodic→raw correctly.
- Added communication guidance to research skill: send_message every ~5 rounds in both SKILL.md and instructions.md (survives compaction). Added deep work awareness section — keep researching until coverage saturated or deadline, don't stop after initial topics.
- Also this session: set up Bob agent group (dm-with-bob) with telegram-2 adapter, installed llama-server with launchd auto-start (Qwen3.6-35B-A3B, 2 parallel slots), debugged Nana delivery failure caused by stale telegram2 destination in inbound.db.

## Problems Solved
- Nana not responding after Bob setup: init-first-agent script wired a telegram2 messaging group as a destination in Nana's session. Nana's agent wrote replies addressed to telegram2 which Bob's bot couldn't deliver. Fixed by removing stale destination entry and orphaned messaging group.

## Artifacts Changed
- `container/agent-runner/src/mcp-tools/research-fetch.ts` (compact output format)
- `container/agent-runner/src/mcp-tools/research-fetch.test.ts` (updated assertions + size test)
- `container/agent-runner/src/mcp-tools/research-summarize.ts` (compact output + source_url extraction)
- `container/agent-runner/src/mcp-tools/research-review.ts` (compact output)
- `container/agent-runner/src/mcp-tools/local-worker/contract.ts` (WriteTo.source_url)
- `container/agent-runner/src/mcp-tools/local-worker/dispatch.ts` (writeEpisodicArticle source_url)
- `container/agent-runner/src/mcp-tools/local-worker/dispatch.test.ts` (+2 source_url tests)
- `container/skills/research/SKILL.md` (communication + deep work + compact example)
- `container/skills/research/instructions.md` (progress update rule)
- `src/channels/telegram-2.ts` (new — second Telegram bot adapter)
- `src/channels/index.ts` (telegram-2 import)
- `groups/dm-with-bob/` (new agent group — container.json, CLAUDE.local.md, models.json, memory)

### Review Gate
Reviewer: 7/10, verdict revise. HIGH: research_fetch compact output dropped paths but research_summarize needs `paths` array — fetch→summarize handoff broken. Fixed: added `raw_dir` and `wiki` to research_fetch response, updated SKILL.md to document listing raw_dir for paths. LOW: test description said "2KB" but assertion was 4KB (fixed), empty catch in findRawSource (acceptable for this use case).

### Activation Quality
Active knowledge: 4 entries, 4 referenced (~100% hit rate, literal match). All cross-wiki entries directly informed planning decisions.

## Related
- [[phase-16-research-session-reliability|Phase 16: Research Session Reliability]]
- [[phase-15-iterative-research-pipeline|Phase 15: Iterative Research Pipeline]]
