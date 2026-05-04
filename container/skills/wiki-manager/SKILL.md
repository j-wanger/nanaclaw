---
name: wiki-manager
description: Knowledge wiki awareness. Read articles, check stats, understand the 4-tier lifecycle. Complements the research skill (which writes) with read and management awareness.
---

# Wiki Management

You have access to knowledge wikis — structured collections of domain knowledge organized in four tiers.

## Trigger Patterns

- Questions about what you know on a topic ("what do we know about X?", "check the wiki for Y")
- Follow-up after research ("how many articles did we add?", "what's the wiki status?")
- Domain questions that existing wiki articles might answer
- Requests to look up or read specific wiki content

## The Four Tiers

| Tier | Purpose | How content arrives |
|------|---------|-------------------|
| **raw** | Immutable source material with sha256 checksums | `research_fetch` writes here |
| **episodic** | Per-source summaries from research workers | `research_summarize` writes here via `write_to` |
| **inbox** | Staged entries awaiting human review | Direct `wiki_write` calls |
| **articles** | Polished, cross-linked knowledge (organized in categories) | Promoted by the user from inbox/episodic |

Content flows: raw → episodic → (inbox →) articles. Your research pipeline handles raw and episodic. **Promoting episodic content to articles is the user's job** — don't attempt consolidation yourself.

## Tools

| Tool | Use when | Input |
|------|----------|-------|
| `wiki_search` | You don't know what exists — discover articles by keyword | `query`, optional `wiki_name` |
| `wiki_read` | You know the slug — fetch full article content | `wiki_name` + `slug`, optional `tier` |
| `wiki_stats` | Check wiki health — how many articles per tier | Optional `wiki_name` |
| `wiki_write` | Write new content to a wiki tier | `title`, `content`, `tags`, optional `tier` |

### Decision Tree

```
Need domain knowledge?
  → Do you know the exact article slug?
      YES → wiki_read(wiki_name, slug)
      NO  → wiki_search(query) → pick slug → wiki_read(wiki_name, slug)

Checking research output?
  → wiki_stats() to see tier counts
  → wiki_read(wiki_name, slug, tier="episodic") to check specific summaries

Writing new content?
  → Use the research skill for structured research
  → Use wiki_write directly for one-off captures
```

## Wiki vs MEMORY.md

These are different systems with different purposes:

| | Wiki | MEMORY.md |
|---|------|-----------|
| **Contains** | Domain knowledge (facts, patterns, findings) | Relationship context (preferences, history, identity) |
| **Scope** | Shared across agents for a domain | Per-agent-group, personal |
| **Writes** | Research pipeline, wiki_write | Memory skill |
| **Reads** | wiki_search, wiki_read | Memory fragment at spawn |

Don't write domain knowledge to MEMORY.md. Don't write personal context to wikis.
