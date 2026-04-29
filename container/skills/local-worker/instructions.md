# Local Worker Instructions

Dispatch bounded tasks to local Qwen via `dispatch_worker`. Results auto-inject — never poll `get_worker_status`.

## When to dispatch
- Code implementation from clear spec
- Structured output (JSON extraction, data transforms)
- File generation from spec

## Critical rule
**END YOUR TURN after dispatching.** If your turn stays open, worker results never arrive. Dispatch, tell the user, stop.

## Contract fields
- `type`: file-op | code-impl | research | structured-output
- `outputFormat`: json | code | markdown
- `write_to`: auto-route output to wiki (episodic or review tier)
- `timeout_ms`: default 60s, use 1200s for research workers
