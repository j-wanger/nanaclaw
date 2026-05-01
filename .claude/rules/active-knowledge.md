# Active Knowledge — Phase 24

### Error Recovery Patterns
from: [[wiki:error-recovery-and-retry-patterns]]
retrieved: 2026-04-30

- Transient errors (network timeout, rate limit) → retry with exponential backoff, 3 attempts max
- Anti-pattern: error swallowing — catching and continuing as if nothing happened hides problems
- Recovery decision tree: transient → retry, diagnostic → fix → retry, fundamental → escalate

### Orchestrator Failure Modes
from: [[wiki:orchestrator-failure-modes]]
retrieved: 2026-04-30

- Termination unawareness: 12.4% of multi-agent failures (MAST taxonomy)
- Mitigation: explicit completion contracts, circuit breakers, timeout thresholds
- Infinite handoff loops generate no error signals — detection is the hard part

### Poll Loop Architecture
from: [[decision:phase-24-deep-work-session-reliability-approach]]
retrieved: 2026-04-30

- Keep while loop as fast-path driver, idle check as safety net (not either/or)
- JS single-threaded: idle branch and while loop are mutually exclusive, no concurrency risk
- writeMessageOut for user notifications — same pattern as existing error responses
