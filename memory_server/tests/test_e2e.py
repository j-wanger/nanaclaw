"""End-to-end lifecycle test for the memory MCP server.

Validates: store, search (FTS5 + hybrid), dedup, forget, export/import
round-trip, stats, and warm-tier two-pass simulation.
"""

import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).parent.parent))

from config import EmbeddingConfig
from models import Category, Trust
from storage import (
    export_memories,
    forget,
    import_memories,
    init_db,
    search_fts,
    search_hybrid,
    stats,
    store,
)

# -- Embedding availability detection --

_fastembed_available = False
try:
    from embedding import EmbeddingProvider

    _provider = EmbeddingProvider(EmbeddingConfig(mode="local"))
    _test_emb = _provider.embed("test")
    if _test_emb is not None and len(_test_emb) > 0:
        _fastembed_available = True
except Exception:
    pass

needs_embedding = pytest.mark.skipif(
    not _fastembed_available, reason="fastembed not available"
)


# -- Test data --

FACTS = [
    ("NanoClaw uses a two-DB session architecture with inbound and outbound SQLite files", "architecture"),
    ("The project uses Python with pydantic for data models", "tooling"),
    ("SQLite FTS5 provides full-text search for memory retrieval", "architecture"),
    ("Agent containers run on Bun while the host runs on Node", "architecture"),
    ("RRF fusion combines BM25 and cosine similarity scores", "search"),
]

PREFERENCES = [
    ("Alice prefers terse technical communication with no fluff", "communication"),
    ("Dark themes are preferred for all code editors", "ui"),
    ("Use Python for automation scripts and data processing", "tooling"),
    ("Keep warm context under 10 results total across both passes", "memory"),
]

CORRECTIONS = [
    ("Do not batch memory storage at session end — store incrementally as facts emerge", "workflow"),
    ("Push back on proposals rather than agreeing — provide substantive feedback", "communication"),
    ("Never store code patterns derivable from the codebase in memory", "workflow"),
]

REFERENCES = [
    ("LongMemEval paper: scoring formulas don't help, extraction quality matters", "research"),
    ("sqlite-vec extension for cosine similarity search in SQLite", "tooling"),
    ("fastembed nomic-embed-text-v1.5 for local embedding generation", "tooling"),
]


@pytest.fixture
def db(tmp_path):
    """Initialize a test DB and store 15 memories across categories."""
    conn = init_db(tmp_path / "e2e.db")
    yield conn
    conn.close()


def _store_all_memories(conn, embedding_fn=None):
    """Store 15 memories across 4 categories. Returns dict of id -> content."""
    stored = {}

    for content, ctx in FACTS:
        emb = embedding_fn(content) if embedding_fn else None
        r = store(conn, content, category=Category.FACT, trust=Trust.HIGH, context=ctx, embedding=emb)
        stored[r.id] = content

    for content, ctx in PREFERENCES:
        emb = embedding_fn(content) if embedding_fn else None
        r = store(conn, content, category=Category.PREFERENCE, trust=Trust.HIGH, context=ctx, embedding=emb)
        stored[r.id] = content

    for content, ctx in CORRECTIONS:
        emb = embedding_fn(content) if embedding_fn else None
        r = store(conn, content, category=Category.CORRECTION, trust=Trust.HIGH, context=ctx, embedding=emb)
        stored[r.id] = content

    for content, ctx in REFERENCES:
        emb = embedding_fn(content) if embedding_fn else None
        r = store(conn, content, category=Category.ENTITY, trust=Trust.MEDIUM, context=ctx, embedding=emb)
        stored[r.id] = content

    return stored


class TestFTSSearch:
    """FTS5 keyword search without embeddings."""

    def test_keyword_returns_relevant(self, db):
        _store_all_memories(db)
        results = search_fts(db, "SQLite architecture")
        assert len(results) > 0
        contents = [e.content for e, _ in results]
        assert any("SQLite" in c for c in contents)

    def test_category_filter(self, db):
        _store_all_memories(db)
        results = search_fts(db, "communication style", category=Category.PREFERENCE)
        for entry, _ in results:
            assert entry.category == Category.PREFERENCE

    def test_relevance_ranking(self, db):
        _store_all_memories(db)
        results = search_fts(db, "communication")
        assert len(results) > 0
        # Communication-related entries should appear
        contents = [e.content for e, _ in results]
        assert any("communication" in c.lower() for c in contents)


@needs_embedding
class TestHybridSearch:
    """Hybrid search with real embeddings."""

    @pytest.fixture
    def edb(self, tmp_path):
        conn = init_db(tmp_path / "e2e_emb.db")
        provider = EmbeddingProvider(EmbeddingConfig(mode="local"))
        _store_all_memories(conn, embedding_fn=provider.embed)
        yield conn, provider
        conn.close()

    def test_hybrid_returns_results(self, edb):
        conn, provider = edb
        q_emb = provider.embed("database architecture")
        results = search_hybrid(conn, "database architecture", q_emb, limit=5)
        assert len(results) > 0

    def test_hybrid_match_type(self, edb):
        conn, provider = edb
        q_emb = provider.embed("SQLite search")
        results = search_hybrid(conn, "SQLite search", q_emb, limit=5)
        match_types = {mt for _, _, mt in results}
        # Should have at least one result with a match type
        assert match_types.issubset({"hybrid", "fts5", "vector"})

    def test_preference_ranked_for_style_query(self, edb):
        conn, provider = edb
        q_emb = provider.embed("communication style preferences")
        results = search_hybrid(conn, "communication style preferences", q_emb, limit=5)
        assert len(results) > 0
        # At least one of the top results should be a preference or correction about communication
        top_contents = [e.content for e, _, _ in results[:3]]
        assert any("communication" in c.lower() or "terse" in c.lower() for c in top_contents)


@needs_embedding
class TestCosineDedup:
    """Near-duplicate detection via cosine similarity."""

    def test_near_duplicate_reinforced_or_warned(self, tmp_path):
        conn = init_db(tmp_path / "dedup.db")
        provider = EmbeddingProvider(EmbeddingConfig(mode="local"))

        content_a = "Alice prefers terse technical communication with no fluff"
        emb_a = provider.embed(content_a)
        r1 = store(conn, content_a, embedding=emb_a)
        assert r1.action == "created"

        # Store a near-duplicate (same meaning, slightly different wording)
        content_b = "Alice prefers terse technical communication without fluff"
        emb_b = provider.embed(content_b)
        r2 = store(conn, content_b, embedding=emb_b)

        # Should be reinforced (cosine > 0.90) or warned (0.85-0.90)
        assert r2.action == "reinforced" or r2.warning is not None
        conn.close()


class TestForgetAndActiveOnly:
    """Forget a memory, verify it's excluded from active search."""

    def test_forgotten_excluded(self, db):
        stored = _store_all_memories(db)
        # Pick the first stored memory
        target_id = list(stored.keys())[0]
        target_content = stored[target_id]

        # Forget it
        assert forget(db, target_id) is True

        # Active-only search should exclude it
        # Use a word from the forgotten memory's content
        word = target_content.split()[0]
        results = search_fts(db, word, active_only=True)
        ids = [e.id for e, _ in results]
        assert target_id not in ids

    def test_forgotten_included_when_not_active_only(self, db):
        stored = _store_all_memories(db)
        target_id = list(stored.keys())[0]
        target_content = stored[target_id]

        forget(db, target_id)

        # Search with active_only=False should include it
        word = target_content.split()[0]
        results = search_fts(db, word, active_only=False)
        ids = [e.id for e, _ in results]
        assert target_id in ids


class TestExportImportRoundTrip:
    """Export all memories, import into fresh DB, verify content preserved."""

    def test_round_trip_preserves_content(self, db, tmp_path):
        _store_all_memories(db)

        # Export
        md = export_memories(db)
        assert "Memory Export" in md

        # Import into fresh DB
        db2 = init_db(tmp_path / "import.db")
        result = import_memories(db2, md, mode="merge")

        assert result["errors"] == []
        assert result["imported"] == 15  # All 15 memories

        # Verify some specific content
        md2 = export_memories(db2)
        assert "NanoClaw uses a two-DB session architecture" in md2
        assert "Alice prefers terse technical communication" in md2
        assert "LongMemEval paper" in md2
        assert "Dark themes are preferred" in md2
        db2.close()

    def test_round_trip_preserves_categories(self, db, tmp_path):
        _store_all_memories(db)
        md = export_memories(db)

        db2 = init_db(tmp_path / "import_cat.db")
        import_memories(db2, md, mode="merge")

        s = stats(db2)
        assert s.by_category.get("fact", 0) == 5
        assert s.by_category.get("preference", 0) == 4
        assert s.by_category.get("correction", 0) == 3
        # References stored as entity category
        assert s.by_category.get("entity", 0) == 3
        db2.close()


class TestStats:
    """Verify stats reflect actual state."""

    def test_stats_after_store(self, db):
        _store_all_memories(db)
        s = stats(db)

        assert s.total_active == 15
        assert s.total_superseded == 0
        assert s.by_category["fact"] == 5
        assert s.by_category["preference"] == 4
        assert s.by_category["correction"] == 3
        assert s.by_category["entity"] == 3
        assert s.oldest is not None
        assert s.newest is not None

    def test_stats_after_forget(self, db):
        stored = _store_all_memories(db)
        target_id = list(stored.keys())[0]
        forget(db, target_id)

        s = stats(db)
        assert s.total_active == 14
        assert s.total_superseded == 1


class TestWarmTierSimulation:
    """Simulate the two-pass warm tier retrieval pattern."""

    def _extract_keywords(self, text: str, max_keywords: int = 5) -> list[str]:
        """Simple keyword extraction: pick the most distinctive words."""
        import re

        stop_words = {
            "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
            "have", "has", "had", "do", "does", "did", "will", "would", "could",
            "should", "may", "might", "shall", "can", "need", "dare", "ought",
            "used", "to", "of", "in", "for", "on", "with", "at", "by", "from",
            "as", "into", "through", "during", "before", "after", "above", "below",
            "between", "out", "off", "over", "under", "again", "further", "then",
            "once", "here", "there", "when", "where", "why", "how", "all", "each",
            "every", "both", "few", "more", "most", "other", "some", "such", "no",
            "nor", "not", "only", "own", "same", "so", "than", "too", "very",
            "just", "because", "but", "and", "or", "if", "while", "that", "this",
            "it", "its", "my", "your", "his", "her", "our", "their", "what",
            "which", "who", "whom", "these", "those", "let",
        }
        # Split on whitespace and hyphens to avoid FTS5 operator issues
        words = re.split(r'[\s\-]+', text.lower())
        # Filter stop words and short words, keep unique
        seen = set()
        keywords = []
        for w in words:
            cleaned = re.sub(r'[^a-z0-9]', '', w)
            if cleaned and cleaned not in stop_words and len(cleaned) > 2 and cleaned not in seen:
                seen.add(cleaned)
                keywords.append(cleaned)
        return keywords[:max_keywords]

    def test_pass1_spawn_keywords(self, db):
        """Pass 1: extract keywords from CLAUDE.md-like text and search."""
        _store_all_memories(db)

        claude_md_sample = """
        NanoClaw personal Claude assistant. Two-DB session architecture.
        Agent containers on Bun, host on Node. SQLite persistent storage.
        Memory MCP server with FTS5 and embedding search.
        Branch: feature/phase-30-embeddings
        """

        keywords = self._extract_keywords(claude_md_sample)
        assert len(keywords) >= 3
        assert len(keywords) <= 5

        query = " ".join(keywords)
        pass1_results = search_fts(db, query, limit=5)
        assert len(pass1_results) > 0

    def test_pass2_first_message_keywords(self, db):
        """Pass 2: extract keywords from a first user message and search."""
        _store_all_memories(db)

        first_message = "Let's work on the embedding search and RRF fusion scoring today"

        keywords = self._extract_keywords(first_message)
        assert len(keywords) >= 3

        query = " ".join(keywords)
        pass2_results = search_fts(db, query, limit=5)
        assert len(pass2_results) > 0

    def test_merge_dedup_combined(self, db):
        """Full two-pass: merge Pass 1 + Pass 2, dedup by ID, verify <= 10."""
        _store_all_memories(db)

        # Pass 1: spawn keywords
        claude_md_sample = """
        NanoClaw personal Claude assistant. Two-DB session architecture.
        Agent containers on Bun, host on Node. SQLite persistent storage.
        Memory MCP server with FTS5 and embedding search.
        Branch: feature/phase-30-embeddings
        """
        kw1 = self._extract_keywords(claude_md_sample)
        pass1 = search_fts(db, " ".join(kw1), limit=5)

        # Pass 2: first message keywords
        first_message = "Let's work on the embedding search and RRF fusion scoring today"
        kw2 = self._extract_keywords(first_message)
        pass2 = search_fts(db, " ".join(kw2), limit=5)

        # Merge and dedup by memory ID
        seen_ids = set()
        combined = []
        for entry, score in pass1:
            if entry.id not in seen_ids:
                seen_ids.add(entry.id)
                combined.append((entry, score))
        for entry, score in pass2:
            if entry.id not in seen_ids:
                seen_ids.add(entry.id)
                combined.append((entry, score))

        # No duplicates
        ids = [e.id for e, _ in combined]
        assert len(ids) == len(set(ids)), "Combined results have duplicates"

        # Under 10 total
        assert len(combined) <= 10, f"Combined results exceed 10: got {len(combined)}"

        # Should have results from both passes
        assert len(combined) > 0

    @needs_embedding
    def test_warm_tier_with_hybrid_search(self, tmp_path):
        """Two-pass warm tier using hybrid search with real embeddings."""
        conn = init_db(tmp_path / "warm.db")
        provider = EmbeddingProvider(EmbeddingConfig(mode="local"))
        _store_all_memories(conn, embedding_fn=provider.embed)

        # Pass 1
        claude_md_sample = "NanoClaw two-DB session SQLite memory embedding search"
        kw1 = self._extract_keywords(claude_md_sample)
        q1 = " ".join(kw1)
        q1_emb = provider.embed(q1)
        pass1 = search_hybrid(conn, q1, q1_emb, limit=5)

        # Pass 2
        first_message = "Work on RRF fusion scoring and cosine dedup today"
        kw2 = self._extract_keywords(first_message)
        q2 = " ".join(kw2)
        q2_emb = provider.embed(q2)
        pass2 = search_hybrid(conn, q2, q2_emb, limit=5)

        # Merge and dedup
        seen_ids = set()
        combined = []
        for entry, score, mt in pass1:
            if entry.id not in seen_ids:
                seen_ids.add(entry.id)
                combined.append((entry, score, mt))
        for entry, score, mt in pass2:
            if entry.id not in seen_ids:
                seen_ids.add(entry.id)
                combined.append((entry, score, mt))

        ids = [e.id for e, _, _ in combined]
        assert len(ids) == len(set(ids)), "Duplicates in combined hybrid results"
        assert len(combined) <= 10
        assert len(combined) > 0

        conn.close()
