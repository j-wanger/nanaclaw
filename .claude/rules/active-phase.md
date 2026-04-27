# Active Phase Context

Phase: 11 - Host-Mode Fragment Path Fix
Objective: Fix broken fragment symlinks in composeGroupClaudeMd so host-mode agents read skill/module instructions
Scope: src/claude-md-compose.ts, src/claude-md-compose.test.ts, src/container-config.ts
Key constraints: Container-mode (/app/... paths) must be unchanged. Detect provider from readContainerConfig.
Exit: 5 criteria — fragment symlinks resolve, .claude-shared.md resolves, container-mode unchanged, all tests pass, build clean
Abort: if blocked >3 attempts, ask user: skip or abort
Root cause: 3 live-test bugs (no dispatch_worker, no wiki access, blocking during research) all trace to broken symlinks
