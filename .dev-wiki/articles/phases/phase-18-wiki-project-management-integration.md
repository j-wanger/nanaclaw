---
title: "Phase 18: Knowledge Wiki + Project Management Agent Integration"
aliases: [wiki-integration, project-manager]
category: phases
tags: [wiki, mcp-tools, container-skills, project-management]
parents: []
created: 2026-04-29
updated: 2026-04-29
source: plan
status: active
scope: ["container/agent-runner/src/mcp-tools/**", "container/skills/**"]
entry_criteria: "Phase 17 complete"
exit_criteria: "wiki_read returns structured content, wiki_stats returns tier counts, wiki management skill teaches lifecycle, project_init scaffolds .project/, project skill teaches workflow, build + typecheck + tests pass"
---

# Phase 18: Knowledge Wiki + Project Management Agent Integration

## Objective

Give container agents (Nana, Bob) two new capabilities: (1) knowledge wiki awareness — read articles, check stats, understand the tier lifecycle, and (2) a simplified project management system for multi-session coding projects.

## Scope

- `container/agent-runner/src/mcp-tools/` — new MCP tools (wiki-read, wiki-stats, project-init, wiki-utils)
- `container/skills/` — new container skills (wiki-manager, project-manager)

## Exit Criteria

- [ ] wiki_read returns structured content for a valid slug+wiki, errors on unknown
- [ ] wiki_stats returns correct per-wiki tier counts
- [ ] Wiki management skill injected into compose pipeline, teaches decision tree
- [ ] project_init creates valid .project/ scaffold, refuses re-init
- [ ] Project management skill injected into compose pipeline
- [ ] Build + container typecheck + all tests pass

## Notes

- Knowledge wiki consolidation (episodic → articles) is deferred — skill teaches "not your job yet"
- Project management is simplified vs dev-wiki — no TDD ceremony, no reviewer dispatch, no compaction anchors
- Orchestrator mode documented in skill but worker dispatch integration is deferred
- Approach reviewer scored 7/10, plan reviewer scored 8/10 — feedback incorporated
