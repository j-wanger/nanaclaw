# Active Knowledge
## Phase: 11 - Host-Mode Fragment Path Fix

### Fragment Symlink Architecture
from: [[decision:phase-11-host-mode-fragment-path-fix]]
retrieved: 2026-04-27

- composeGroupClaudeMd creates symlinks: shared base (.claude-shared.md), skill fragments (skill-*.md), module fragments (module-*.md)
- Docker targets: /app/CLAUDE.md, /app/skills/<name>/instructions.md, /app/src/mcp-tools/<name>.instructions.md
- Host targets: <root>/container/CLAUDE.md, <root>/container/skills/<name>/instructions.md, <root>/container/agent-runner/src/mcp-tools/<name>.instructions.md
- Inline fragments (soul.md, memory-context.md, wiki-context.md) are NOT affected — they're files, not symlinks

### Cascade Effect
from: [[decision:phase-11-host-mode-fragment-path-fix]]
retrieved: 2026-04-27

- Broken symlinks → agent can't read skill instructions → doesn't know about dispatch_worker or wiki_write
- Without dispatch_worker → agent does research synchronously → blocks poll loop → can't respond during dispatch
- readContainerConfig already returns provider field — use it to branch path resolution
