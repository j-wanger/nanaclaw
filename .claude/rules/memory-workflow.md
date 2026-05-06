# Memory Workflow

The memory MCP server provides persistent, searchable memory across sessions. Use it for facts that should survive context window boundaries.

## When to Store

Store incrementally as facts emerge. Do not batch at session end.

- **User corrections** ("no, do it this way"): category=correction, trust=high
- **Architectural decisions** (why X over Y): category=fact, trust=high
- **User profile revelations** (preferences, role, tools): category=preference, trust=high. Check memory-profile.md first -- if it belongs there, update that file instead.
- **Project context changes** (status shifts, new constraints): category=entity, trust=medium
- **External references** (useful URLs, tool versions, API quirks): category=custom, trust=medium, tags=["reference"]
- **Bug root causes** (the underlying issue, not the fix): category=fact, trust=medium

## When NOT to Store

- Code patterns derivable from the codebase (grep for them instead)
- Git history (use git log)
- Ephemeral task state (use TodoWrite or .project/)
- Anything already in CLAUDE.md or .claude/rules/ files
- Transient debugging context that won't matter next session

## When to Search

### Reactive triggers
- When user references prior work or decisions
- Before storing a new memory (avoid duplicates)
- When context suggests relevant memories exist but aren't in your prompt
- When starting work in an unfamiliar area of the project

### Proactive recall trigger
Before responding to any message that requires judgment, a recommendation, or a design choice, search memory and relevant knowledge wikis FIRST. Signal: you are about to say "I think...", "I'd recommend...", propose an approach, or compare alternatives. Both searches are sub-second. Skip for factual/procedural responses, acknowledgments, and status updates.

### Recall depth
- **Single pass (default):** 1 memory search + 1 knowledge search. Sufficient for most responses.
- **Follow the thread (2-3 rounds):** When initial results reference other sources, span multiple domains, or you need evidence to challenge a proposal. Follow references, search adjacent wikis.
- **Cap at 3 rounds.** If three rounds don't surface enough context, present what you have and flag the gap: "I found X but couldn't find prior context on Y."
- **Depth signal:** Are you confident enough to present a position? If not, and there are threads to pull, pull them before responding.

## Tool Patterns

```python
# Store a user correction
memory_store(
    content="User prefers X approach over Y because of Z",
    category="correction",
    trust="high",
    context="User corrected approach during code review"
)

# Search before acting on prior context
memory_search(query="user preferences for testing frameworks")

# Search with category filter
memory_search(query="project architecture", category="fact")

# Supersede an outdated memory
memory_forget(memory_id="mem_xxx", superseded_by="mem_yyy")

# Tag for cross-cutting concerns
memory_tag(memory_id="mem_xxx", tags=["architecture", "decision"])
```

## Writing Good Memory Content

- One atomic fact per entry. "Jake prefers X" not "Jake prefers X and also mentioned Y."
- Include the _why_ when storing decisions. "Chose SQLite over Postgres because single-user, no server process" beats "Using SQLite."
- Context field should capture what triggered the memory: the conversation moment, not a summary of the memory itself.

## MCP Server Configuration

Add to `~/.claude/settings.json`:

```json
{
  "mcpServers": {
    "memory": {
      "command": "uv",
      "args": ["run", "--directory", "/path/to/memory_server", "python", "-m", "memory_server"]
    }
  }
}
```

Replace `/path/to/memory_server` with the absolute path to the memory_server directory.

## Warm Tier (Session Start)

The warm tier seeds session context from memory at startup, before any explicit search. It runs exactly two passes — no more.

**Pass 1 — Spawn keywords:**
- At session start, extract 3-5 keywords from the project CLAUDE.md and current git branch name
- Call `memory_search(query="<keywords>")` with those keywords
- This gives baseline project context from prior sessions

**Pass 2 — First message keywords:**
- After receiving the user's first message, extract keywords from it
- Call `memory_search(query="<first message keywords>")`
- Merge with Pass 1 results, deduplicate by memory ID
- Use the combined set as session context

**Guidance:**
- Keep warm context under 10 results total (5 per pass, dedup'd)
- Don't search on every message — warm tier is passes 1 and 2 only
- For subsequent messages, use the proactive recall trigger (see above) — search when a response requires judgment, not on every turn
