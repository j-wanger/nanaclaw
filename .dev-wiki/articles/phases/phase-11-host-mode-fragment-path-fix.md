---
title: "Phase 11: Host-Mode Fragment Path Fix"
aliases: [phase-11, fragment-path-fix]
category: phases
tags: [host-mode, composition, symlinks, mcp-tools]
parents: [phase-10-host-mode-integration-tests]
created: 2026-04-27
updated: 2026-04-27
source: plan
status: active
scope: ["src/claude-md-compose.ts", "src/claude-md-compose.test.ts", "src/container-config.ts"]
entry_criteria: "Phase 10 complete, live testing revealed broken fragment symlinks in host-mode"
exit_criteria: "Fragment symlinks resolve when provider=host, .claude-shared.md resolves, container-mode unchanged, all tests pass, build clean"
---

# Phase 11: Host-Mode Fragment Path Fix

## Objective

Fix broken fragment symlinks in composeGroupClaudeMd so host-mode agents can read skill/module instructions, enabling MCP tool usage (dispatch_worker, wiki_write), async worker dispatch, and wiki integration.

## Scope

- `src/claude-md-compose.ts` — path resolution logic
- `src/claude-md-compose.test.ts` — host-mode fragment tests
- `src/container-config.ts` — provider field access

## Exit Criteria

- [ ] Fragment symlinks resolve to real files when provider=host
- [ ] .claude-shared.md symlink resolves when provider=host
- [ ] Container-mode (non-host) paths unchanged
- [ ] All tests pass (existing + new)
- [ ] Build clean

## Notes

- Root cause of 3 live-testing bugs: no dispatch_worker, no wiki access, blocking during research
- All trace to broken symlinks → missing skill/module instructions → agent doesn't know about MCP tools
- Surgical fix: 1M + 2S tasks, ~30 lines of code change
