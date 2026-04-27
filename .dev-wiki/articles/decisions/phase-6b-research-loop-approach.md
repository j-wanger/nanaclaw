---
title: "Phase 6b: Research Loop + Episodic Integration Approach"
aliases: [phase-6b-approach, research-loop-approach, episodic-integration]
category: decisions
tags: [scheduling, autonomous, research-loop, knowledge-wiki, episodic, local-worker]
parents: [phase-06-autonomous-loops]
created: 2026-04-26
updated: 2026-04-26
source: plan
confidence: medium
---

## Context

Phase 6a gave workers multi-turn tool-calling. Phase 5 built web_search, web_extract, wiki_write, and the deep-research skill (orchestrator-driven). Phase 6b is the convergence: workers autonomously execute research loops on a schedule, producing episodic wiki entries with provenance.

Existing infrastructure: scheduling (schedule_task + cron recurrence), deep-work tools (deadline tracking), worker dispatch with agent loop + tool registry, web tools, wiki_write.

## Decision

**Worker-driven autonomous research loops.** Workers get dispatched with tools [web_search, web_extract, wiki_write] and handle the full search→extract→synthesize→write pipeline. The orchestrator (Claude) plans research topics, dispatches workers, reviews results, and sends channel notifications.

Key choices:
1. **Fix dispatch_worker tools wiring.** Phase 6a built the agent loop and tool registry but never wired the `tools` field through the MCP tool handler or schema. This must be fixed first — without it, workers silently run single-shot.
2. **wiki_write extended with episodic tier.** New optional params: `tier` (default "inbox", or "episodic"), `worker_id`, `task_id`. Episodic entries go to wiki `episodic/` subdirectory with provenance frontmatter.
3. **max_duration as prompt-level + contract-level constraint.** Workers bounded by contract `timeout_ms` and `max_iterations`. Skill instructs orchestrator to check elapsed time before each dispatch. Host sweep's stale detection (30-min ceiling) provides hard backstop. No deep-work dependency — simpler and more reliable than soft enforcement.
4. **Channel notification via normal delivery.** No new notification mechanism — orchestrator writes summary as regular outbound message.
5. **Recurrence via existing scheduling.** Research tasks are regular scheduled tasks with research-specific prompts.

**Rejected alternatives:**
- *Orchestrator-driven research* — Claude calls web_search/web_extract directly, worker only synthesizes. Rejected because it defeats Phase 6a's purpose, costs Claude API for mechanical web fetching, and the deep-research skill already provides that pattern.
- *Deep-work tools for max_duration* — considered but rejected. Deep-work is soft enforcement (relies on orchestrator compliance). The combination of worker contract timeout_ms + prompt-level time tracking + host sweep hard backstop is more reliable without adding coupling.

## Consequences

- Workers must operate within Qwen's 4K-8K context budget. Mitigations: max_chars on web_extract, max_iterations cap (6), context_budget_tokens (6000).
- Episodic entries accumulate in wiki episodic/ without consolidation (downstream /wiki-consolidate is a future phase).
- dispatch_worker tools wiring is a Phase 6a gap that gets fixed here — backfill, not new design.
