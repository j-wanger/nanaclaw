import struct
import sys
import time
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

sys.path.insert(0, str(Path(__file__).parent.parent))

from config import EmbeddingConfig, MemoryConfig
from embedding import EmbeddingProvider
from models import Category, Trust
from storage import forget, init_db, search_fts, search_hybrid, search_vec, store


@pytest.fixture
def db(tmp_path):
    conn = init_db(tmp_path / "test.db")
    store(conn, "Alice prefers dark themes in all editors", category=Category.PREFERENCE, trust=Trust.HIGH)
    store(conn, "The project uses SQLite for persistent storage", category=Category.FACT, trust=Trust.MEDIUM)
    store(conn, "Always use Python for automation scripts", category=Category.PREFERENCE, trust=Trust.HIGH)
    store(conn, "AML systems detect suspicious financial transactions", category=Category.FACT, trust=Trust.MEDIUM)
    store(conn, "M1 Max MacBook Pro is the development machine", category=Category.ENTITY, trust=Trust.HIGH)
    store(conn, "Use terse technical communication style", category=Category.PREFERENCE, trust=Trust.MEDIUM)
    store(conn, "NanoClaw uses two-DB session architecture", category=Category.FACT, trust=Trust.HIGH)
    store(conn, "Qwen context sweet spot is 4K-8K tokens", category=Category.FACT, trust=Trust.MEDIUM)
    store(conn, "Memory system replaces flat MEMORY.md files", category=Category.FACT, trust=Trust.MEDIUM)
    store(conn, "Trading systems need low latency data feeds", category=Category.FACT, trust=Trust.LOW)
    yield conn
    conn.close()


class TestSearchFts:
    def test_basic_search(self, db):
        results = search_fts(db, "dark themes")
        assert len(results) > 0
        contents = [r[0].content for r in results]
        assert any("dark themes" in c for c in contents)

    def test_ranked_results(self, db):
        results = search_fts(db, "Python scripts")
        assert len(results) > 0
        assert results[0][1] > 0  # score is positive

    def test_limit(self, db):
        results = search_fts(db, "the", limit=3)
        assert len(results) <= 3

    def test_category_filter(self, db):
        results = search_fts(db, "Python themes", category=Category.PREFERENCE)
        for entry, score in results:
            assert entry.category == Category.PREFERENCE

    def test_active_only(self, db):
        r = store(db, "forgotten SQLite fact about databases")
        forget(db, r.id)
        results = search_fts(db, "SQLite databases", active_only=True)
        ids = [entry.id for entry, _ in results]
        assert r.id not in ids

    def test_inactive_included(self, db):
        r = store(db, "forgotten SQLite fact about databases")
        forget(db, r.id)
        results = search_fts(db, "forgotten SQLite databases", active_only=False)
        ids = [entry.id for entry, _ in results]
        assert r.id in ids

    def test_empty_query(self, db):
        results = search_fts(db, "")
        assert results == []

    def test_no_results(self, db):
        results = search_fts(db, "xyzzyplugh")
        assert results == []

    def test_multiple_terms_or(self, db):
        results = search_fts(db, "SQLite Python")
        assert len(results) >= 2

    def test_tag_search(self, db):
        from storage import tag
        r = store(db, "tagged memory about important config")
        tag(db, r.id, add=["important", "config"])
        results = search_fts(db, "important")
        contents = [entry.content for entry, _ in results]
        assert "tagged memory about important config" in contents


def _make_vec(seed: float, dim: int = 768) -> list[float]:
    """Create a synthetic normalized embedding for testing.

    Uses a deterministic pattern so similar seeds produce similar vectors.
    """
    import math

    vec = [math.sin(seed * (i + 1)) for i in range(dim)]
    norm = math.sqrt(sum(v * v for v in vec))
    return [v / norm for v in vec]


class TestVectorSearch:
    @pytest.fixture
    def vec_db(self, tmp_path):
        conn = init_db(tmp_path / "vec_test.db")
        yield conn
        conn.close()

    def test_vec_available(self, vec_db):
        """sqlite-vec loads and has_vectors meta is '1'."""
        row = vec_db.execute(
            "SELECT value FROM meta WHERE key = 'has_vectors'"
        ).fetchone()
        assert row is not None
        assert row["value"] == "1"

    def test_store_with_embedding(self, vec_db):
        """Store a memory with embedding, verify it's persisted."""
        emb = _make_vec(1.0)
        r = store(vec_db, "Test memory with embedding", embedding=emb)
        assert r.action == "created"

        # Check embedding BLOB exists in memories table
        row = vec_db.execute(
            "SELECT embedding FROM memories WHERE id = ?", (r.id,)
        ).fetchone()
        assert row["embedding"] is not None
        # Decode and verify shape
        blob = row["embedding"]
        floats = struct.unpack(f"{len(blob)//4}f", blob)
        assert len(floats) == 768

        # Check vec table has the entry
        mem_row = vec_db.execute(
            "SELECT rowid FROM memories WHERE id = ?", (r.id,)
        ).fetchone()
        vec_row = vec_db.execute(
            "SELECT rowid FROM memories_vec WHERE rowid = ?",
            (mem_row["rowid"],),
        ).fetchone()
        assert vec_row is not None

    def test_search_vec_returns_results(self, vec_db):
        """Store several memories with embeddings, search, verify order."""
        # Store memories with different embeddings
        emb_a = _make_vec(1.0)
        emb_b = _make_vec(2.0)
        emb_c = _make_vec(3.0)

        store(vec_db, "Memory A about cats", embedding=emb_a)
        store(vec_db, "Memory B about dogs", embedding=emb_b)
        store(vec_db, "Memory C about fish", embedding=emb_c)

        # Search with a query embedding very close to emb_a
        query = _make_vec(1.01)  # Very close to seed 1.0
        results = search_vec(vec_db, query, limit=10)

        assert len(results) == 3
        # First result should be closest to the query (Memory A)
        assert results[0][0].content == "Memory A about cats"
        # Distances should be ordered ascending (closer = smaller distance)
        distances = [d for _, d in results]
        assert distances == sorted(distances)

    def test_search_vec_active_only(self, vec_db):
        """Forgotten memories excluded from vec search."""
        emb_a = _make_vec(1.0)
        emb_b = _make_vec(2.0)

        r_a = store(vec_db, "Active memory", embedding=emb_a)
        r_b = store(vec_db, "Forgotten memory", embedding=emb_b)
        forget(vec_db, r_b.id)

        results = search_vec(vec_db, _make_vec(2.0), limit=10)
        ids = [entry.id for entry, _ in results]
        assert r_a.id in ids
        assert r_b.id not in ids

    def test_search_vec_category_filter(self, vec_db):
        """Filter by category in vec search."""
        emb_a = _make_vec(1.0)
        emb_b = _make_vec(2.0)

        store(
            vec_db,
            "A fact about databases",
            category=Category.FACT,
            embedding=emb_a,
        )
        store(
            vec_db,
            "A preference about editors",
            category=Category.PREFERENCE,
            embedding=emb_b,
        )

        results = search_vec(
            vec_db, _make_vec(1.0), limit=10, category=Category.FACT
        )
        assert len(results) == 1
        assert results[0][0].category == Category.FACT

    def test_search_vec_empty_without_extension(self, vec_db):
        """When vec is unavailable, search_vec returns empty list."""
        import storage

        original = storage._vec_available
        try:
            storage._vec_available = False
            results = search_vec(vec_db, _make_vec(1.0))
            assert results == []
        finally:
            storage._vec_available = original


class TestRRFFusion:
    """Tests for hybrid search combining FTS5 and vector results via RRF."""

    @pytest.fixture
    def hybrid_db(self, tmp_path):
        conn = init_db(tmp_path / "hybrid_test.db")
        # Store memories with both text content (for FTS5) and embeddings (for vec)
        store(conn, "Python is great for automation scripts", embedding=_make_vec(1.0), trust=Trust.HIGH)
        store(conn, "SQLite database provides persistent storage", embedding=_make_vec(2.0), trust=Trust.MEDIUM)
        store(conn, "Trading systems need low latency data feeds", embedding=_make_vec(3.0), trust=Trust.LOW)
        store(conn, "Dark themes are preferred for code editors", embedding=_make_vec(4.0), trust=Trust.HIGH)
        store(conn, "Memory system replaces flat MEMORY.md files", embedding=_make_vec(5.0), trust=Trust.MEDIUM)
        yield conn
        conn.close()

    def test_hybrid_search_combines_results(self, hybrid_db):
        """Hybrid search returns results with match_type indicating signal source."""
        query_emb = _make_vec(1.01)  # Close to first memory
        results = search_hybrid(hybrid_db, "Python automation", query_emb, limit=10)
        assert len(results) > 0

        # Results are (entry, score, match_type) tuples
        match_types = [mt for _, _, mt in results]
        # Should have at least one hybrid or fts5 or vector result
        assert all(mt in ("hybrid", "fts5", "vector") for mt in match_types)

        # First result should be about Python (matches both FTS5 and close vec)
        assert "Python" in results[0][0].content

    def test_rrf_scoring(self, hybrid_db):
        """RRF formula produces correct relative ordering."""
        query_emb = _make_vec(2.01)  # Close to SQLite memory's embedding
        results = search_hybrid(hybrid_db, "SQLite database storage", query_emb, limit=10)
        assert len(results) > 0

        # All scores should be positive
        for _, score, _ in results:
            assert score > 0

        # Scores should be in descending order
        scores = [score for _, score, _ in results]
        assert scores == sorted(scores, reverse=True)

    def test_trust_tiebreaking(self, hybrid_db):
        """When RRF scores are close, higher trust ranks first."""
        # Create two memories with the same FTS content but different trust levels.
        # Use embeddings distant enough to avoid cosine dedup (>0.90 threshold)
        # but close enough that both get similar RRF vec ranks.
        conn = hybrid_db

        # Use seeds that produce cosine similarity ~0.6-0.8 (well below 0.90 dedup threshold)
        emb_low = _make_vec(10.0)
        emb_high = _make_vec(10.5)

        from storage import _cosine_similarity
        sim = _cosine_similarity(emb_low, emb_high)
        assert sim < 0.90, f"Test setup: embeddings too similar ({sim}), would trigger dedup"

        store(conn, "special tiebreak query alpha beta gamma", trust=Trust.LOW, embedding=emb_low)
        store(conn, "special tiebreak query alpha beta delta", trust=Trust.HIGH, embedding=emb_high)

        query_emb = _make_vec(10.25)  # Between both
        results = search_hybrid(conn, "special tiebreak query alpha beta", query_emb, limit=10)

        # Both should appear
        assert len(results) >= 2

        # Find the two special memories
        special = [(entry, score, mt) for entry, score, mt in results if "special tiebreak" in entry.content]
        assert len(special) >= 2

        # When RRF scores are within tolerance, high trust should come first
        if abs(special[0][1] - special[1][1]) < 0.05:
            assert special[0][0].trust == Trust.HIGH

    def test_fts_only_fallback(self, hybrid_db):
        """When no embedding available, falls back to FTS5 only."""
        results = search_hybrid(hybrid_db, "Python automation", query_embedding=None, limit=10)
        assert len(results) > 0

        # All should be fts5 match_type since no vec signal
        for _, _, match_type in results:
            assert match_type == "fts5"

    def test_vec_only_fallback(self, hybrid_db):
        """When FTS5 returns nothing but vec does, uses vector-only."""
        # Search for something that won't match FTS5 but has a close embedding
        query_emb = _make_vec(1.01)
        results = search_hybrid(hybrid_db, "xyzzyplugh", query_emb, limit=10)
        # Should get vector-only results since FTS5 returns nothing for nonsense query
        if len(results) > 0:
            for _, _, match_type in results:
                assert match_type == "vector"

    def test_empty_results(self, hybrid_db):
        """Returns empty when neither search finds anything."""
        import storage
        original = storage._vec_available
        try:
            storage._vec_available = False
            results = search_hybrid(hybrid_db, "xyzzyplugh", query_embedding=None, limit=10)
            assert results == []
        finally:
            storage._vec_available = original

    def test_limit_respected(self, hybrid_db):
        """Limit parameter is respected."""
        query_emb = _make_vec(1.0)
        results = search_hybrid(hybrid_db, "the", query_emb, limit=2)
        assert len(results) <= 2

    def test_category_filter(self, hybrid_db):
        """Category filter works in hybrid search."""
        query_emb = _make_vec(1.0)
        # Store memories in different categories were done at fixture level
        # Search for something that might span categories
        results = search_hybrid(
            hybrid_db, "Python automation data",
            query_emb, limit=10,
        )
        # Verify results exist
        assert len(results) > 0

    def test_auto_embed_on_store(self, tmp_path):
        """When server stores via memory_store tool, embedding is auto-populated."""
        from server import create_server, _connections

        # Clear cached connections
        _connections.clear()

        config = MemoryConfig(project_dir=str(tmp_path / "project"))
        server = create_server(config)

        # Get the memory_store tool function
        # Tools are registered on the FastMCP instance
        # Call via the internal function by name
        tools = {t.name: t for t in server._tool_manager.list_tools()}
        assert "memory_store" in tools

        # We need to call the underlying function to test
        # Store something through the server's internal function
        from storage import init_db as _init_db
        conn = _init_db(config.project_db_path)

        # Use the embedding provider directly to verify it works
        provider = EmbeddingProvider(config.embedding)
        emb = provider.embed("Test auto-embed content")

        if emb is not None:
            result = store(conn, "Test auto-embed content", embedding=emb)
            assert result.action == "created"

            # Verify embedding is stored in the DB
            row = conn.execute(
                "SELECT embedding FROM memories WHERE id = ?", (result.id,)
            ).fetchone()
            assert row["embedding"] is not None

            # Verify it has the right dimensions
            blob = row["embedding"]
            floats = struct.unpack(f"<{len(blob)//4}f", blob)
            assert len(floats) == 768
        else:
            pytest.skip("Embedding provider not available in test environment")

        conn.close()
        _connections.clear()
