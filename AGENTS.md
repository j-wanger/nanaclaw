# Nanaclaw Development Conventions

## Architecture

Single Node process orchestrating per-session agent containers. Two runtimes: Node host (pnpm, better-sqlite3) + Bun container (bun:sqlite). No shared modules between runtimes — communication is exclusively via session DBs.

### Two-DB Session Pattern

Every session has inbound.db (host writes, container reads) + outbound.db (container writes, host reads). Three invariants are load-bearing:
1. journal_mode=DELETE — WAL mmapped -shm doesn't refresh across mounts
2. Host opens-writes-closes per op — close invalidates the container's page cache
3. One writer per file — DELETE-mode journal-unlink isn't atomic cross-mount

### Module System

Modules self-register on import via side effects. Add new modules to `src/modules/index.ts`. Each module gets its own directory under `src/modules/` with an `index.ts` that performs registrations. Core runs with empty registries and inline fallbacks.

### Provider Abstraction

Host-side provider config lives in `src/providers/`. Container-side providers live in `container/agent-runner/src/providers/`. Both use self-registration registries.

## TypeScript

- Strict mode enabled. Fix all type errors, don't use `as any`.
- Host: ES2022 target, NodeNext modules, better-sqlite3 for SQLite
- Container: Bun native, bun:sqlite (use `$name` params, not bare `name`)
- Named SQL params on host: `better-sqlite3` auto-strips `$` prefix; Bun does not

## Testing

- Host tests: `pnpm test` (vitest), files in `src/**/*.test.ts` and `setup/**/*.test.ts`
- Container tests: `cd container/agent-runner && bun test` (bun:test)
- Container tests import from `bun:test`, not `vitest`
- Every phase must pass: `pnpm test` + `pnpm run build` + CLI smoke test

## Supply Chain

- pnpm with `minimumReleaseAge: 4320` (3 days)
- Never add to `minimumReleaseAgeExclude` or `onlyBuiltDependencies` without human approval
- Container deps (bun): no minimumReleaseAge, but pin deliberately

## Skills

Four types: channel/provider install skills, utility skills, operational skills, container skills. New capabilities are skills, not trunk features. See CONTRIBUTING.md.

## Key Paths

| Path | Purpose |
|------|---------|
| src/index.ts | Host entry point |
| src/router.ts | Inbound routing |
| src/delivery.ts | Outbound delivery |
| src/session-manager.ts | Session lifecycle |
| src/container-runner.ts | Container spawning |
| container/agent-runner/src/ | Container runtime (Bun) |
| docs/memory-architecture.md | Memory design research |
