# Research Loop

Autonomous research loops for scheduled tasks. Dispatches tool-calling workers to search the web, extract content, synthesize findings, and write episodic wiki entries.

## When to Use

- Scheduled task with a research topic (e.g., "Research: <topic>")
- Task prompt contains `max_duration` or research instructions
- Recurring research tasks (daily/weekly topic monitoring)

## Workflow

### 1. Parse Task

Extract from the scheduled task prompt:
- **topic**: what to research
- **max_duration**: time budget in minutes (default: 15)
- **wiki_name**: explicit wiki target (optional, auto-routes by default)

### 2. Plan Research

Break the topic into 1-3 focused search queries. Each query should target a different angle or source type.

### 3. Dispatch Worker

Dispatch a single worker with tools for the full research pipeline:

```
dispatch_worker(
  type: "research",
  objective: "Research: <topic>. Search for 2-3 sources, extract key content, synthesize findings, then write to wiki with episodic tier.",
  outputFormat: "markdown",
  context: "<topic description and any specific angles to investigate>",
  context_budget_tokens: 6000,
  timeout_ms: <max_duration_minutes * 60 * 1000>,
  tools: ["web_search", "web_extract", "wiki_write"],
  boundaries: [
    "Limit to 2-3 web_extract calls (max_chars: 8000 each)",
    "Write ONE wiki entry with tier: episodic",
    "Include source URLs in the article"
  ],
  postconditions: [
    { type: "contains", params: { substring: "Written to" } }
  ]
)
```

### 4. Context Shaping

The worker prompt must contain ONLY:
- The research topic and angles
- Output format expectations
- Tool usage guidance and limits

Do NOT include: conversation history, your own reasoning, system instructions, or unrelated context. Poor worker output usually means upstream context omission or bloat, not worker capability limitation.

### 5. Review Results

When worker results auto-surface via the poll loop:
- Check if wiki_write was called (tool trace in result)
- Verify the research quality is adequate
- Note the wiki file path from the result for notification

### 6. Channel Notification

After research completes, send a summary to the originating channel:

```
"Research complete: <topic>
Summary: <1-2 sentence key finding>
Written to: <wiki_name>/episodic/<slug>.md
Sources: <count> sources consulted"
```

### 7. Time Management (max_duration)

- Derive `timeout_ms` from the task's max_duration (default 15 min = 900000ms)
- Check elapsed time before dispatching additional workers
- If over budget, skip remaining research and send partial summary
- Worker contract `timeout_ms` provides hard per-worker cutoff
- Host sweep stale detection (30 min) is the final backstop

## Episodic Wiki Output

Workers write to wiki using the episodic tier:

```
wiki_write(
  title: "Descriptive title",
  content: "<synthesized findings with source citations>",
  tags: ["topic-tag-1", "topic-tag-2"],
  topic: "description for wiki routing",
  tier: "episodic",
  worker_id: "<worker task id>",
  task_id: "<scheduled task id if known>"
)
```

Episodic entries land in `episodic/` with provenance frontmatter (worker_id, task_id, source: worker-research). Downstream `/wiki-consolidate` (planned, not yet implemented) processes these into polished articles.

## Multi-Topic Research

For broad research covering multiple subtopics:
1. Dispatch one worker per subtopic (they run concurrently within semaphore limits)
2. Each worker writes its own episodic entry
3. After all workers complete, write a consolidated summary notification

## Compaction Recovery

If context compacts mid-research:
1. Check `list_tasks` for any pending/completed research workers
2. Check `get_worker_status` for results not yet reviewed
3. Resume from the last completed step — don't re-dispatch completed workers

## What NOT to Do

- Don't dispatch workers without tools — they can't search or write to wiki
- Don't pass more than 6000 tokens of context to a worker
- Don't set max_iterations above 6 — Qwen degrades beyond that
- Don't skip the channel notification — the user expects a summary
- Don't write to wiki yourself for scheduled research — let the worker handle it with episodic tier for provenance tracking
