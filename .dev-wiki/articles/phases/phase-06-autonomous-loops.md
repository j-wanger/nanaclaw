---
title: "Phase 6b: Research Loop + Episodic Integration"
aliases: [phase-6b, autonomous-loops, research-loops]
category: phases
tags: [scheduling, autonomous, research-loop, knowledge-wiki, episodic]
parents: [phase-06a-worker-tool-calling, phase-05-web-search-research]
created: 2026-04-25
updated: 2026-04-26
ceremony: standard
source: plan
status: completed
scope: ["container/skills/research-loop/**", "container/agent-runner/src/mcp-tools/wiki-write.ts", "src/modules/scheduling/**"]
entry_criteria: "Phase 6a complete (worker tool-calling runtime), knowledge-wiki skill with episodic/ support"
exit_criteria: "Research loop fires on schedule, output in episodic/ with tier:episodic frontmatter, recurrence works, per-task max_duration terminates cleanly, channel notified with summary"
---

# Phase 6b: Research Loop + Episodic Integration

## Objective

Build autonomous research loops using tool-calling workers — scheduled tasks that dispatch workers with web tools to research topics, produce episodic wiki entries, and notify the channel with summaries. Extends wiki_write with episodic tier support.

## Exit Criteria

- [ ] Scheduled research task fires on time
- [ ] Research output in knowledge-wiki episodic/ with tier:episodic frontmatter (worker, task_id provenance)
- [ ] Recurrence: task fires, completes, rescheduled
- [ ] Per-task max_duration terminates cleanly
- [ ] Channel notification with research summary

## Notes

- Depends on Phase 6a (worker tool-calling runtime)
- Workers handle full research loop autonomously (search → extract → synthesize → wiki write)
- Orchestrator plans research, dispatches workers, reviews results, consolidates
- wiki_write extended with tier: "episodic" and provenance fields (worker, task_id)
- Downstream: /wiki-consolidate processes episodic entries into articles
