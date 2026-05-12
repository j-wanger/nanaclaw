Project management rules:

- If working on an external project (not your workspace), call `project_context("activate", {project: "<name>"})` first. This resolves the project path from the registry and makes all `.project/` operations target that directory.
- Call `project_init` before writing any implementation code for a multi-step task. If `.project/work/` already exists, it returns the current progress — read it and resume. When a project is activated via `project_context`, `project_init` automatically targets that project's `.project/work/` directory.
- Work tasks in order. Don't skip unless blocked (note the blocker in progress.md and move on).
- Update `progress.md` after completing each task: increment current_task, note what was done.
- The success field in each task is a command — run it to verify before marking the task done.
- On compaction recovery: read `.project/work/progress.md` first, then `tasks.md`. Resume from the current task.
- When all tasks are complete: archive key outcomes to `.project/decisions/` or `.project/lessons.md`, then delete `.project/work/` and tell the user what was accomplished. Never delete `.project/` itself.
- `.project/work/` is ephemeral task state. `.project/` root is persistent project knowledge — decisions, lessons, rules.
