# Active Knowledge
## Phase: 10 - Host-Mode Integration Tests

### Three Regression Vectors
from: [[wiki:regression-testing-for-agents]]
retrieved: 2026-04-27

- Agent systems regress on three independent vectors: prompt changes, harness changes, model upgrades
- "Start regression testing once the first release ships" — we're past greenfield (9 phases, 332 tests)
- Golden set starts at 20-50 cases; smoke tier (5 scenarios) runs on every commit

### Two-DB Session Invariants
from: [[decision:two-tier-heterogeneous-architecture]]
retrieved: 2026-04-27

- `journal_mode=DELETE` is load-bearing for cross-mount visibility — WAL breaks container↔host reads
- Host uses even seq numbers, container uses odd — parity is a correctness invariant
- Session DB tests use raw SQL schema, not session-manager helpers, to avoid migration side effects
- Mock the adapter layer in delivery tests — real adapters reintroduce E2E dependency
