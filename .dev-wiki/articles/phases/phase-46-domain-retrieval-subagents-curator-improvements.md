---
title: "Phase 46: Domain Retrieval Subagents + Curator Improvements"
aliases: [retrieval subagents, curator improvements]
category: phases
tags: [retrieval, subagents, curation, knowledge-pipeline]
parents: []
created: 2026-05-09
updated: 2026-05-09
source: plan
status: active
scope: ["container/skills/wiki-curator/*", "container/experts/*", "container/skills/expert-routing/*", "groups/dm-with-wang/.claude-fragments/*", "SOUL.md", "container/agent-runner/src/providers/claude.ts"]
entry_criteria: "Phase 45 complete, curator and retrieval patterns identified"
exit_criteria: "Wiki-curator has 4 systematic improvements; retrieval subagent architecture operational via SDK Task with expert-routing skill"
---

# Phase 46: Domain Retrieval Subagents + Curator Improvements

## Objective

Two workstreams: (1) Four systematic improvements to wiki-curator — source landscape sampling, coverage verification, source quality heuristics, two-round execution. (2) Ephemeral retrieval subagents via SDK Task tool with parameterized template and expert-routing skill.

## Scope

- `container/skills/wiki-curator/*` — curator workflow improvements
- `container/experts/` — retriever template and per-wiki config
- `container/skills/expert-routing/` — routing skill with delegation rules
- `groups/dm-with-wang/.claude-fragments/` — skill fragments
- `SOUL.md` — retrieval delegation posture
- `container/agent-runner/src/providers/claude.ts` — SDK Task spike (read-only validation)

## Exit Criteria

- [ ] Wiki-curator SKILL.md has all 4 improvements (landscape, coverage, quality, two-round)
- [ ] Curator instructions and fragment updated with two-round model and relaxed min-sources
- [ ] SDK Task retrieval pattern documented with spike findings
- [ ] Expert-routing skill operational with retriever template and per-wiki config

## Notes

Key simplification: SDK Task tool is already allowlisted in claude.ts (lines 48-50). Subagents inherit parent's MCP tools. No agent-runner code changes needed — Nana spawns Task directly with retriever prompt. Default direct search, opt-in delegation for multi-hop questions. Sonnet model for retrieval subagents.
