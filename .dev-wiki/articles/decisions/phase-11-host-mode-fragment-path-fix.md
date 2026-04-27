---
title: "Phase 11: Host-Mode Fragment Path Fix"
aliases: [phase-11-approach, fragment-path-fix, host-mode-symlinks]
category: decisions
tags: [host-mode, composition, symlinks, mcp-tools]
parents: [phase-11-host-mode-fragment-path-fix]
created: 2026-04-27
updated: 2026-04-27
source: plan
confidence: medium
---

## Context

Live testing after Phase 10 revealed three related symptoms — all traced to one root cause:

1. **Agent doesn't use dispatch_worker** — hits llama-cpp directly via HTTP, blocking the poll loop
2. **Agent doesn't see registered wikis** — writes research to local file instead of wiki_write
3. **Agent doesn't respond during dispatch** — poll loop blocks while research runs synchronously

Root cause: `composeGroupClaudeMd` creates fragment symlinks targeting Docker mount paths (`/app/skills/...`, `/app/src/mcp-tools/...`). In host-mode, these paths don't exist — every skill and module instruction fragment is a broken symlink. The agent can't read its instructions.

## Decision

Detect `provider: "host"` from container.json (already read by compose). When host-mode, use absolute host filesystem paths for symlink targets. Container-mode keeps existing `/app/...` paths unchanged.

**Rejected alternatives:**
- *Inline all fragments (copy content instead of symlink):* Works but duplicates content needlessly. Symlinks are the established pattern.
- *Relative symlinks:* Fragile — depends on stable relative path from group dir to container/.

## Consequences

- Skill/module instruction fragments become readable in host-mode → agent uses MCP tools correctly
- dispatch_worker becomes fire-and-forget → poll loop resumes → agent responds during dispatch
- wiki_write sees registered wikis → research articles land in correct wiki
- Container-mode is unchanged (no regression risk for Docker deployments)
