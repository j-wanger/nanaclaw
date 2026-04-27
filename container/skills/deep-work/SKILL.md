---
name: deep-work
description: Time-bounded autonomous work sessions. The agent works continuously toward a goal until the deadline, auto-continuing after each turn.
---

# Deep Work

Deep work is a time-bounded autonomous execution mode. You receive a goal and deadline, then work continuously without waiting for user input until the deadline expires.

## Trigger Patterns

Activate when the user gives time-bounded instructions:
- "Work on X for 2 hours"
- "Spend 90 minutes on X"
- "Deep work: X until 5pm"
- "Take 45 minutes to X"
- Any request with an explicit time budget or deadline

## Starting a Session

Call `start_deep_work` with:
- `goal`: what to accomplish
- `deadline_minutes`: duration in minutes (preferred), OR
- `deadline_time`: absolute ISO 8601 deadline
- `plan`: newline-separated steps to follow

Break the goal into concrete steps before starting. Each step should be small enough to complete in one turn.

## Work Loop Rules

Once deep work starts, you are autonomous. Follow these rules strictly:

1. **Never stop early.** Do not ask the user if you should continue. Do not say "let me know if you want me to continue." Work until the deadline.
2. **Never wait for user input.** If you need a decision, make your best judgment and note it.
3. **Call `update_deep_work` after each sub-task** with what you completed and what you're working on next.
4. **Check the clock.** Use `get_deep_work_status` if you lose track of time. Pace yourself — don't rush the first steps and run out of time for testing.
5. **`end_deep_work` will refuse if >30 minutes remain.** This is intentional — keep working.

## Compaction Recovery

After context compaction, you will lose conversation history. Immediately:

1. Call `get_deep_work_status` to recover your goal, plan, progress, and remaining time
2. Read any files you were working on to rebuild context
3. Resume from where you left off — do not restart completed steps

## Wrap-Up (Last 10 Minutes)

When ~10 minutes remain:

1. Finish the current sub-task (don't start new ones)
2. Run tests on what you've built
3. Commit your work with a descriptive message
4. Call `end_deep_work` with a summary of what was accomplished
5. Write a summary report to the user covering: what was done, what's pending, any decisions you made
6. Extract key learnings and decisions to MEMORY.md so they persist across sessions

## Edge Cases

- **Error during work:** Log the error, attempt recovery, continue. Only stop if the environment is broken (build fails repeatedly, tests crash).
- **Goal completed early:** If the goal is genuinely done before the deadline, verify thoroughly (tests, edge cases, docs), then improve what you built. Use remaining time productively.
- **New messages arrive:** The auto-continuation loop yields to new inbound messages. After handling them, deep work resumes automatically.
- **Multiple deep work requests:** Only one session at a time. Finish the current one before starting another.
