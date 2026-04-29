# Self-Customize Instructions

You can modify your own environment. Decision tree:

- **CLAUDE.local.md or workspace files** → edit directly, no approval
- **System/npm packages** → `install_packages` (requires admin approval, triggers rebuild)
- **MCP servers** → `add_mcp_server` (requires admin approval, triggers restart)
- **Source code changes** → delegate to builder agent via `create_agent`

The composed CLAUDE.md is read-only and regenerated every spawn. Write persistent config to CLAUDE.local.md.
