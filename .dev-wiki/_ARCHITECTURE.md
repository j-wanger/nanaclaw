# Architecture: nanoclaw

> Last updated: 2026-05-05 by /dev-debrief (Phase 42)

Personal Claude assistant (v2.0.13) — runs agents in isolated Docker containers. Three runtimes: Node.js host (pnpm, better-sqlite3) + Bun container (bun:sqlite) + Python memory server (uv, sqlite3). ~170 source files (excluding tests).

## Directory Layout

```
nanoclaw/
  src/                       # Host process (Node.js) — 97 .ts files
    db/                      # Central DB layer — 15 files (migrations/, schema, session-db)
    channels/                # Channel adapter infra — 6 files (adapter, registry, CLI, SDK bridge)
    modules/                 # Pluggable modules — registry-based
      permissions/           # Access control — 10 files (users, roles, approval flows)
      approvals/             # Approval primitives — 4 files (OneCLI bridge, response dispatch)
      scheduling/            # Task scheduling — 4 files (cron recurrence, delivery actions)
      agent-to-agent/        # Inter-agent routing — 5 files (route, create, destinations)
      self-mod/              # Self-modification — 3 files (request → approve → apply)
    providers/               # Host-side provider config — 2 files
  container/agent-runner/    # Container process (Bun) — 63 .ts files
    src/db/                  # Session DB ops — 6 files (messages in/out, state, routing)
    src/mcp-tools/           # MCP tool definitions — 44 files (core, scheduling, agents, self-mod, knowledge, research, wiki, local-worker)
    src/providers/           # Agent providers — 6 files (Claude SDK, factory, registry)
  memory_server/             # Memory MCP Server (Python) — 11 .py files (~2,800 lines)
    storage.py               # SQLite + FTS5 + sqlite-vec layer (store, search, dedup, prune, global fan-out)
    embedding.py             # Configurable embedding provider (local fastembed / HTTP server)
    server.py                # FastMCP tool wiring (12 tools)
    models.py                # Pydantic data models (Source.CONSOLIDATED added)
    config.py                # YAML/env config loading
    consolidator.py          # Single-link cosine clustering + Qwen merge (fail-closed)
    migrate.py               # MEMORY.md parser + migrator CLI
    extract_cli.py           # Post-session transcript extraction CLI
    tests/                   # 186 pytest tests (8 test files)
  setup/                     # Interactive setup wizard — 44 files (env, auth, container, channels)
  scripts/                   # Utility scripts — 9 files
  docs/                      # Architecture docs, DB docs, specs — 20 .md files
```

## Entry Points

| Entry | Runtime | Purpose |
|-------|---------|---------|
| `src/index.ts` | Node.js | init DB → migrations → container runtime → adapters → delivery polls → sweep |
| `container/agent-runner/src/index.ts` | Bun | load config → create provider → poll loop |
| `memory_server/__main__.py` | Python | create MCP server → run stdio transport |
| `setup/index.ts` | Node.js | Interactive setup wizard |
| `nanoclaw.sh` | Shell | Bootstrap: install deps, run setup, start service |

## Hub Modules

| Module | Importers | Role |
|--------|-----------|------|
| `src/log.ts` | 11 | Structured logger |
| `src/config.ts` | 8 | Constants: DATA_DIR, GROUPS_DIR, CONTAINER_IMAGE, ONECLI_URL |
| `src/types.ts` | 7 | AgentGroup, MessagingGroup, Session, User |
| `src/db/sessions.ts` | 5 | Session CRUD + pending questions/approvals |
| `src/db/connection.ts` | 5 | initDb, getDb, hasTable |

## Key Architecture Patterns

1. **Two-DB session split** — inbound.db (host→container) + outbound.db (container→host). Single writer per file. journal_mode=DELETE for cross-mount visibility.
2. **Registry pattern** — Channels, modules, providers self-register on import. Core runs with empty registries + inline fallbacks.
3. **Message-only IO** — Host/container communicate exclusively via session DBs. No IPC, no file watchers, no stdin.
4. **Heartbeat liveness** — Container touches `.heartbeat`; host sweep checks mtime at 60s intervals.
5. **OneCLI credential injection** — API keys never in env vars or chat. OneCLI gateway injects at request time.
6. **Memory MCP server** — Standalone Python process, consumed via stdio MCP transport by both Claude Code and Nanaclaw agents.

## Data Flow

- **Inbound:** Platform → Channel Adapter → `router.ts` → `session-manager.ts` (write messages_in) → `container-runner.ts` (wake)
- **Outbound:** `poll-loop.ts` (write messages_out) → `delivery.ts` (poll + deliver via adapter) → Platform
- **Scheduling:** MCP tool → messages_out → `delivery.ts` → `scheduling/actions.ts` → messages_in (future task)
- **Approvals:** MCP self-mod → messages_out → delivery → `approvals/primitive.ts` → DM approver → response → apply
- **Memory:** Agent → MCP stdio → memory_server → SQLite (project or global) → FTS5 ranked results

## Dependencies

**Host (Node.js):** better-sqlite3 11.10.0, @onecli-sh/sdk ^0.3.1, chat ^4.24.0, cron-parser 5.5.0, @clack/core + @clack/prompts, kleur
**Container (Bun):** @anthropic-ai/claude-agent-sdk, bun:sqlite, @modelcontextprotocol/sdk
**Memory Server (Python):** mcp>=1.0, pydantic>=2.0, pyyaml>=6.0, nanoid>=2.0, fastembed>=0.4, httpx>=0.27, sqlite-vec>=0.1.6
**Dev:** vitest, bun:test, pytest, typescript ^5.7.0, tsx, eslint + typescript-eslint, prettier, husky

## Development Toolchain

| Category | Tool | Config Path | Status |
|----------|------|-------------|--------|
| Testing | Vitest (host) | vitest.config.ts | detected |
| Testing | bun:test (container) | container/agent-runner/package.json | detected |
| Testing | pytest (memory) | memory_server/tests/ | detected |
| Type Checking | TypeScript (strict) | tsconfig.json | detected |
| Linting | ESLint + typescript-eslint | eslint.config.js | detected |
| Formatting | Prettier | package.json | detected |
| Deps | pnpm 10.33.0 | pnpm-workspace.yaml | detected |
| Deps | uv (Python) | memory_server/.venv/ | detected |
| Git Hooks | Husky | package.json | detected |
| Build | tsc (host), Bun native (container) | tsconfig.json | detected |

## Issues

No significant issues detected. Mature, well-structured codebase with clear separation of concerns.

## Related

- None yet
