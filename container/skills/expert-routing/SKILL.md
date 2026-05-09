# Expert Routing

Delegate domain-specific retrieval to focused subagents via the Task tool. This isolates retrieval noise (multiple searches, article reads, dead ends) from the main conversation context.

## When to Delegate

**Default is direct search.** Only delegate when:
- **Multi-hop question** — requires multiple searches, article reads, and cross-referencing to assemble an answer
- **Cross-domain question** — spans 2+ wikis (e.g. AML typology applied to a trading scenario)
- **Ambiguous query** — good search terms aren't obvious; the retriever needs to explore and rephrase
- **Noisy prior search** — a direct `knowledge_search` returned too much irrelevant context

**Handle directly (no subagent):**
- Simple factual lookup — one search, top result answers it
- You already have relevant context from this conversation
- Non-domain question (general knowledge, coding, etc.)
- The curated article index in your context already points to the right article

## Routing Table

| Domain signals | Wiki |
|---|---|
| AML, money laundering, financial crime, sanctions, KYC, TBML, fraud typologies, SAR, PEP, terrorist financing, compliance | `aml-wiki` |
| Trading, stocks, ETF, options, market microstructure, technical analysis, fundamental analysis, portfolio, risk management, algorithmic trading, fixed income, bonds | `trading-wiki` |
| DuckDB, SQLite, Kuzu, LanceDB, database, SQL, parquet, FTS5, embedded DB, data loading | `database-wiki` |
| Agent design, context engineering, harness, multi-agent, orchestration, prompt engineering for agents, agent evaluation, tool use patterns | `agentic-engineering-wiki` |
| Board game, game design, mechanics, playtesting, tabletop, game balance, publishing | `board-game-design-wiki` |
| Agent memory, RAG, embedding store, knowledge graph, memory consolidation, session persistence, context management | `agent-memory-wiki` |
| Adverse media, negative news, entity screening, financial crime news | `negative-news` |

If the question doesn't map to any wiki, answer from general knowledge — don't force a retrieval.

## How to Delegate

### 1. Send a progress message

Always tell the user before delegating:
- Single wiki: "Checking the [domain] knowledge base..."
- Cross-domain: "Checking both [domain1] and [domain2]..."

### 2. Compose the Task prompt

Read `container/experts/retriever-template.md` for the template. Read `container/experts/wiki-configs.md` for the per-wiki values. Substitute `{{wiki_name}}`, `{{domain_scope}}`, and `{{retrieval_hints}}` into the template.

Append the user's question as a structured brief:

```json
{
  "question": "The user's actual question",
  "domain_context": "Why they're asking, if known from conversation",
  "depth": "retrieve or analyze",
  "known_facts": ["Facts already established in this conversation"],
  "constraints": ["Any constraints — e.g. jurisdiction, time period"]
}
```

**Depth selection:**
- `retrieve` — factual lookup, need specific facts with sources
- `analyze` — need interpretation, trade-off analysis, or expert judgment on top of facts

### 3. Dispatch via Task tool

Single domain:
```
Task({ prompt: "<composed retriever prompt + brief>" })
```

Cross-domain (parallel):
```
Task({ prompt: "<retriever for wiki-A + brief>" })
Task({ prompt: "<retriever for wiki-B + brief>" })
```

Dispatch cross-domain retrievals in parallel — don't wait for one before starting the other.

### 4. Synthesize the response

Parse the retriever's JSON output. Use the key_facts and coverage_assessment to compose your answer to the user. Rules:
- **Cite sources** — mention the article or topic when stating wiki-derived facts
- **Surface gaps** — if the retriever flagged thin coverage, tell the user what the wiki doesn't cover
- **Cross-domain conflicts** — if two retrievers return conflicting facts, present both with their sources and let the user decide
- **Don't parrot** — synthesize the facts into a natural answer, don't dump the raw JSON

## What the Retriever Returns

```json
{
  "relevant_articles": [{"slug": "...", "relevance": "..."}],
  "key_facts": [{"fact": "...", "source": "raw-article-slug"}],
  "coverage_assessment": "...",
  "out_of_scope": false,
  "analysis": "..."
}
```

If `out_of_scope` is true, the question doesn't belong to that wiki. Fall back to general knowledge or try a different wiki.
