# Research Instructions

## Your Job

Think about research directions and evaluate coverage. Tools do everything else.

## Rules

1. Write `research-state.json` BEFORE any research_fetch call
2. `wiki_search` first — check existing coverage
3. `research_fetch` for queries — read metadata (titles/URLs), NOT file bodies
4. `research_summarize` with `raw_dir` — tool handles batching, dedup, and progress. Keep calling until `remaining` is 0.
5. `research_review` with episodic paths — it dispatches 1 reviewer per file mechanically
6. **END YOUR TURN after dispatching workers.** Results auto-inject. Never poll.
7. No consolidation — that's wiki-consolidate later
8. Claims are extracted automatically from worker output — no agent action needed. Stored in `<wiki>/claims.jsonl`.
9. For claim backfill: use `claims_only: true` on `research_summarize`. After backfill completes, run `claim_embed` to vectorize, then `claim_search` to validate.
10. For entity extraction: use `entities_only: true` on `research_summarize`. Extracts PERSON, ORGANIZATION, LOCATION, AMOUNT, CASE, DATE entities as [ENTITY] tags. Stored in `<wiki>/entities.jsonl`. Focus on adverse-finding subjects, not incidental mentions.
11. For knowledge embedding: use `knowledge_embed` to embed all article sentences into `knowledge.db`. Use `knowledge_search` for semantic search across claims and sentences. Both stored in the unified knowledge store.
12. For conflict detection: use `knowledge_conflicts` with `article_slug` to find cross-article contradictions. Default `classify: true` dispatches a Qwen worker to label pairs as agree/contradict/unrelated. Use `classify: false` for fast embedding-only results.
13. For claim discovery: use `claim_discover` with `article_slug` to find unclaimed sentences that resemble existing claims. Default `validate: true` dispatches a Qwen worker to confirm. High-similarity candidates are likely missed extractions.

## You evaluate coverage from metadata, not content

After research_fetch, you see titles, URLs, and counts. Use those to decide if you need more queries. You never need to read raw article bodies.

## Progress Updates

Send the user a progress update via `send_message` every ~5 rounds during iterative research. Brief: topics covered, articles added, what's next.

## Long-Running Tools

Before calling `knowledge_embed`, `research_summarize` with large batch sizes, or any tool that takes >30 seconds, **always call `send_message` first** to acknowledge the user's request. Never leave the user waiting in silence while a long tool runs.

## Tone

Talk naturally. No tool names or pipeline jargon in user messages.
