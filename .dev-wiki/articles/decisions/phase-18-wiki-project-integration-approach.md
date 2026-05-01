---
title: "Phase 18: Wiki + Project Management Integration Approach"
aliases: [wiki-integration-approach, project-manager-approach]
category: decisions
tags: [wiki, mcp-tools, container-skills, project-management]
parents: [phase-18-wiki-project-management-integration]
created: 2026-04-29
updated: 2026-04-29
source: plan
confidence: medium
---

## Context

Container agents (Nana, Bob) can write to knowledge wikis (raw/episodic/inbox via wiki_write) and search them (wiki_search), but cannot read article content, check wiki health, or understand the tier lifecycle. Separately, agents lack any project management capability for multi-session coding tasks.

The user wants: (1) knowledge wiki integration without consolidation yet, (2) a simplified dev-wiki-like system for agents to plan and track coding projects, supporting both self-coding and orchestrator modes.

## Decision

Two streams in one phase:

**Knowledge wiki:** Three additions — wiki_read MCP tool (read by wiki_name + slug + tier, articles/ default), wiki_stats MCP tool (per-wiki tier counts), wiki-manager container skill (lifecycle, decision tree, MEMORY.md boundary).

**Project management:** Two additions — project-manager container skill (plan→tasks→execute→track workflow, .project/ directory convention, two modes), project_init MCP tool (scaffold with re-init guard).

Key design choices:
- wiki_read requires wiki_name (no cross-wiki guessing — use wiki_search first for discovery)
- wiki_read defaults to articles/ tier but accepts episodic/raw/inbox for research output checking
- .project/ lives in agent workspace (groups/<name>/), persists across sessions
- Simplified task schema: description + scope + success only (no TDD cycle, no size budgets)
- Shared wiki-utils.ts for frontmatter parsing (richer than wiki-search.ts's partial parser)

Rejected: (A) Full dev-wiki ceremony port — too coupled to Claude Code harness. (C) Skills-only without MCP tools — tools provide structured I/O and prevent format drift.

## Consequences

- Agents gain wiki content access and stats awareness, but NOT consolidation (follow-up phase)
- Project management is intentionally simple — can be extended with orchestrator dispatch later
- New shared wiki-utils.ts creates a minor maintenance surface but prevents parser duplication
