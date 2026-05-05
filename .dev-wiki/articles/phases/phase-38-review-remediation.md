---
title: "Phase 38: Review Remediation"
aliases: [cognitive load, code dedup, memory sync]
category: phases
tags: [code-quality, documentation, memory-architecture]
parents: []
created: 2026-05-05
updated: 2026-05-05
source: plan
status: active
scope: ["container/agent-runner/src/mcp-tools/*.ts", "container/skills/wiki-manager/*", "src/modules/memory/context-builder.ts", "src/modules/memory/context-builder.test.ts"]
entry_criteria: "Phase 37 complete, external review findings documented"
exit_criteria: "knowledge-routing.md exists; loadWikis/resolveWikiPath/text() centralized; wiki-manager taxonomy aligned; context builder dual-read; all tests passing"
---

# Phase 38: Review Remediation

## Objective

Address 4 issues from external code review: search routing guidance for 30+ MCP tools, loadWikis/resolveWikiPath/text() dedup across 13 files, wiki-manager taxonomy alignment with content-model, and context builder dual-read for MEMORY.md + memory.db sync.

## Scope

- `container/agent-runner/src/mcp-tools/*.ts` — dedup loadWikis/resolveWikiPath/text()
- `container/skills/wiki-manager/` — routing guidance + taxonomy
- `src/modules/memory/context-builder.ts` — dual-read

## Exit Criteria

- [ ] knowledge-routing.md exists with intent-to-tool map
- [ ] loadWikis/resolveWikiPath/text() centralized in wiki-utils.ts, duplicates replaced
- [ ] wiki-manager instructions use content-model terminology
- [ ] context builder reads both MEMORY.md and memory.db memories table
- [ ] all tests passing (578+ baseline)

## Notes

Issue 5 (claim_dedup O(n^2)) deferred — approach reviewer found searchSimilar also does full-table scan, so per-claim calls are same complexity with worse constants. Current approach adequate at wiki scale.
