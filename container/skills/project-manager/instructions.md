Project management rules:

- Call `project_init` before writing any implementation code for a multi-step task. If `.project/` already exists, it returns the current state — read it and resume.
- Work tasks in order. Don't skip unless blocked (note the blocker in state.md and move on).
- Update `state.md` after completing each task: increment current_task, note what was done.
- The success field in each task is a command — run it to verify before marking the task done.
- On compaction recovery: read `.project/state.md` first, then `tasks.md`. Resume from the current task.
- When all tasks are complete: delete `.project/` and tell the user what was accomplished.
- `.project/` is work state, not memory. Don't store preferences or knowledge here.
