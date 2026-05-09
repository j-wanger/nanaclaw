# Wiki Configs

Per-wiki settings for the retriever template. Substitute these values into the `{{placeholders}}` in `retriever-template.md`.

---

## aml-wiki

- **wiki_name:** `aml-wiki`
- **domain_scope:** Anti-money laundering, financial crime, fraud, sanctions, terrorist financing, and related regulatory frameworks. Covers typologies (TBML, shell companies, crypto laundering), detection methods (transaction monitoring, KYC, entity resolution), enforcement actions, and jurisdictional compliance regimes. 137 curated articles synthesized from 2870 raw sources.
- **retrieval_hints:**
  - Try both acronym and full form — TBML and trade-based money laundering, PEP and politically exposed person, SAR and suspicious activity report
  - Financial crime typologies often overlap — a drug trafficking question may also have relevant hits under hawala, money mules, or correspondent banking
  - Enforcement case studies are indexed under the institution name (e.g. "td-bank") and the typology
- **key_concepts:** transaction monitoring, KYC/CDD, TBML, sanctions evasion, shell companies, money mules, crypto laundering, correspondent banking, PEP screening, SAR filing, hawala, de-risking, beneficial ownership, terrorist financing, fraud typologies

---

## trading-wiki

- **wiki_name:** `trading-wiki`
- **domain_scope:** Stock and ETF trading, market microstructure, technical and fundamental analysis, quantitative and algorithmic trading, options, risk management, portfolio construction, market data infrastructure, and personal investing operations. 156 curated articles synthesized from 3017 raw sources.
- **retrieval_hints:**
  - Market structure terms have multiple names — dark pools / alternative trading systems, maker-taker / exchange fee models, NBBO / national best bid and offer
  - Options questions may span Greeks, strategies, and volatility — search for the specific concept (e.g. "iron condor") and the broader category (e.g. "spread strategies")
  - Quantitative topics overlap with risk management — search both categories for questions about drawdown, Sharpe ratio, or position sizing
- **key_concepts:** market microstructure, order types, technical analysis, fundamental analysis, options Greeks, volatility, ETF mechanics, portfolio construction, risk management, algorithmic trading, backtesting, market regimes, execution quality, regulatory framework, fixed income

---

## database-wiki

- **wiki_name:** `database-wiki`
- **domain_scope:** Practical knowledge for local and embedded database systems — DuckDB, Kuzu, SQLite, LanceDB, and data loading patterns with Python and Node tooling. Focus on hands-on usage patterns rather than theory. 0 curated articles; searches will hit raw sources only.
- **retrieval_hints:**
  - Search by database engine name (DuckDB, SQLite, Kuzu) and by the pattern (e.g. "parquet loading", "graph traversal", "FTS5")
  - Python and Node tooling questions may be indexed under the library name (e.g. "better-sqlite3", "duckdb-python")
  - Schema design and migration patterns overlap across engines
- **key_concepts:** DuckDB, SQLite, Kuzu, LanceDB, parquet, CSV loading, FTS5, graph queries, embedded databases, connection pooling, WAL mode, data pipelines, Python DB APIs, Node DB drivers, schema migration

---

## agentic-engineering-wiki

- **wiki_name:** `agentic-engineering-wiki`
- **domain_scope:** Building AI agent systems — context engineering, harness design, workflow patterns, multi-agent orchestration, session management, prompt engineering for agents, evaluation/testing, safety/reliability, and cost/performance optimization. 0 curated articles; searches will hit raw sources only.
- **retrieval_hints:**
  - "Context engineering" and "prompt engineering" are distinct — the former is about what the agent sees, the latter is about how instructions are worded
  - Multi-agent questions may be indexed under orchestration, delegation, or tool use
  - Safety and defensive patterns overlap — search both for questions about guardrails or failure modes
- **key_concepts:** context engineering, harness design, tool use, multi-agent orchestration, session persistence, prompt engineering, agent evaluation, safety guardrails, cost optimization, workflow patterns, defensive patterns

---

## board-game-design-wiki

- **wiki_name:** `board-game-design-wiki`
- **domain_scope:** Board game design covering game mechanics, player dynamics, playtesting methodology, publishing and production, design theory, game theory foundations, and tabletop industry context. 0 curated articles; searches will hit raw sources only.
- **retrieval_hints:**
  - Mechanic names vary — "worker placement" vs "action drafting", "deck building" vs "deck construction"
  - Player count and interaction level are cross-cutting concerns — search the specific mechanic and "player interaction" or "scaling"
  - Publishing questions span Kickstarter, retail distribution, and print-on-demand
- **key_concepts:** game mechanics, worker placement, deck building, player interaction, playtesting, game balance, component design, publishing, Kickstarter, game theory, player dynamics, theme integration, solo modes, cooperative design

---

## agent-memory-wiki

- **wiki_name:** `agent-memory-wiki`
- **domain_scope:** AI agent memory systems — persistent context across sessions, retrieval-augmented generation, knowledge graphs, embedding stores, memory consolidation patterns, and session persistence strategies. 0 curated articles; searches will hit raw sources only.
- **retrieval_hints:**
  - Memory systems span retrieval (RAG, embedding search), storage (vector DBs, knowledge graphs), and lifecycle (consolidation, forgetting, pruning)
  - Search for both the pattern name ("memory consolidation") and the implementation approach ("summarize and compress")
  - Overlap with agentic-engineering-wiki on session management — agent-memory-wiki focuses on the memory subsystem specifically
- **key_concepts:** memory architectures, RAG, embedding stores, knowledge graphs, session persistence, memory consolidation, context management, vector search, episodic memory, semantic memory, forgetting strategies, memory retrieval

---

## negative-news

- **wiki_name:** `negative-news`
- **domain_scope:** Negative news articles related to financial crime in North America. Raw source material for entity extraction and adverse media screening. 0 curated articles; all content is raw sources.
- **retrieval_hints:**
  - Search by entity name (person, company, institution) for adverse media hits
  - Financial crime type terms (fraud, embezzlement, sanctions violation) will surface relevant articles
  - Geographic terms (city, state/province, country) can narrow results for jurisdiction-specific searches
- **key_concepts:** adverse media, entity screening, financial crime news, enforcement actions, fraud, sanctions violations, regulatory penalties, corporate misconduct, politically exposed persons, criminal prosecution
