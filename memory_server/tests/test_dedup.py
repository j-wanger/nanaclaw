import math
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).parent.parent))

from models import Category, Trust
from storage import get_by_id, init_db, store


@pytest.fixture
def db(tmp_path):
    conn = init_db(tmp_path / "test.db")
    yield conn
    conn.close()


class TestExactDuplicate:
    def test_exact_match_reinforces(self, db):
        r1 = store(db, "Alice prefers dark themes")
        r2 = store(db, "Alice prefers dark themes")
        assert r1.action == "created"
        assert r2.action == "reinforced"
        assert r2.existing_id == r1.id

    def test_case_insensitive_match(self, db):
        r1 = store(db, "Alice prefers dark themes")
        r2 = store(db, "alice prefers dark themes")
        assert r2.action == "reinforced"
        assert r2.existing_id == r1.id

    def test_whitespace_normalized(self, db):
        r1 = store(db, "  Alice prefers dark themes  ")
        r2 = store(db, "Alice prefers dark themes")
        assert r2.action == "reinforced"

    def test_reinforcement_increments_strength(self, db):
        r1 = store(db, "test fact")
        store(db, "test fact")
        row = db.execute(
            "SELECT strength FROM memories WHERE id = ?", (r1.id,)
        ).fetchone()
        assert row[0] == 2

    def test_reinforcement_creates_record(self, db):
        r1 = store(db, "test fact", source_session="sess_1")
        store(db, "test fact", source_session="sess_2", context="confirmed again")
        rows = db.execute(
            "SELECT * FROM reinforcements WHERE memory_id = ?", (r1.id,)
        ).fetchall()
        assert len(rows) == 1

    def test_inactive_not_matched(self, db):
        from storage import forget

        r1 = store(db, "forgotten fact")
        forget(db, r1.id)
        r2 = store(db, "forgotten fact")
        assert r2.action == "created"
        assert r2.id != r1.id


class TestNearDuplicate:
    def test_high_overlap_warns(self, db):
        base_words = "alpha beta gamma delta epsilon zeta eta theta iota kappa lambda mu nu xi omicron pi rho sigma tau upsilon"
        store(db, base_words + " phi")
        r2 = store(db, base_words + " chi")
        assert r2.action == "created"
        assert r2.warning is not None
        assert "Similar memory" in r2.warning

    def test_low_overlap_no_warning(self, db):
        store(db, "Alice prefers dark themes in editors")
        r2 = store(db, "The project uses SQLite for storage")
        assert r2.action == "created"
        assert r2.warning is None

    def test_different_content_no_warning(self, db):
        store(db, "fact about coding")
        r2 = store(db, "completely different topic about gardening")
        assert r2.warning is None


def _make_vec(seed: float, dim: int = 768) -> list[float]:
    """Create a synthetic normalized embedding."""
    vec = [math.sin(seed * (i + 1)) for i in range(dim)]
    norm = math.sqrt(sum(v * v for v in vec))
    return [v / norm for v in vec]


def _perturb_vec(vec: list[float], noise: float) -> list[float]:
    """Add small perturbation to a vector — controls cosine similarity.

    Smaller noise => higher cosine similarity to original.
    """
    perturbed = [v + noise * math.sin(i * 7.13) for i, v in enumerate(vec)]
    norm = math.sqrt(sum(v * v for v in perturbed))
    return [v / norm for v in perturbed]


class TestCosineDuplicate:
    """Cosine-similarity based near-duplicate detection."""

    def test_cosine_dedup_reinforces(self, db):
        """Memories with >0.90 cosine similarity auto-reinforce."""
        base_emb = _make_vec(42.0)
        # Very small perturbation => cosine > 0.90
        similar_emb = _perturb_vec(base_emb, 0.01)

        # Verify the similarity is actually > 0.90
        from storage import _cosine_similarity
        sim = _cosine_similarity(base_emb, similar_emb)
        assert sim > 0.90, f"Test setup: cosine similarity {sim} should be > 0.90"

        r1 = store(db, "unique content alpha", embedding=base_emb)
        assert r1.action == "created"

        r2 = store(db, "different text beta", embedding=similar_emb)
        assert r2.action == "reinforced"
        assert r2.existing_id == r1.id

        # Verify strength was incremented
        row = db.execute(
            "SELECT strength FROM memories WHERE id = ?", (r1.id,)
        ).fetchone()
        assert row[0] == 2

    def test_cosine_dedup_warns(self, db):
        """Memories with 0.85-0.90 cosine similarity produce a warning."""
        base_emb = _make_vec(42.0)
        # Moderate perturbation => cosine in 0.85-0.90 range
        # We need to find the right noise level empirically
        medium_emb = _perturb_vec(base_emb, 0.18)

        from storage import _cosine_similarity
        sim = _cosine_similarity(base_emb, medium_emb)

        # If this doesn't land in 0.85-0.90, adjust noise
        if not (0.85 < sim <= 0.90):
            # Binary search for the right noise level
            lo, hi = 0.01, 1.0
            for _ in range(50):
                mid = (lo + hi) / 2
                test_emb = _perturb_vec(base_emb, mid)
                test_sim = _cosine_similarity(base_emb, test_emb)
                if test_sim > 0.90:
                    lo = mid
                elif test_sim < 0.85:
                    hi = mid
                else:
                    medium_emb = test_emb
                    sim = test_sim
                    break
            else:
                pytest.skip("Could not find noise level producing 0.85-0.90 cosine similarity")

        assert 0.85 < sim <= 0.90, f"Test setup: cosine similarity {sim} should be in (0.85, 0.90]"

        r1 = store(db, "unique content gamma", embedding=base_emb)
        assert r1.action == "created"

        r2 = store(db, "different content delta", embedding=medium_emb)
        assert r2.action == "created"  # Not reinforced, just warned
        assert r2.warning is not None
        assert "Similar memory" in r2.warning

    def test_cosine_dedup_no_match_distant(self, db):
        """Distant embeddings (cosine < 0.85) produce no warning."""
        emb_a = _make_vec(1.0)
        emb_b = _make_vec(100.0)

        from storage import _cosine_similarity
        sim = _cosine_similarity(emb_a, emb_b)
        assert sim < 0.85, f"Test setup: cosine similarity {sim} should be < 0.85"

        r1 = store(db, "unique content epsilon", embedding=emb_a)
        r2 = store(db, "unique content zeta", embedding=emb_b)
        assert r2.action == "created"
        assert r2.warning is None

    def test_cosine_dedup_supplements_word_overlap(self, db):
        """Cosine dedup works alongside word-overlap dedup, not replacing it."""
        # Different embeddings but high word overlap => word-overlap still warns
        base_words = "alpha beta gamma delta epsilon zeta eta theta iota kappa lambda mu nu xi omicron pi rho sigma tau upsilon"
        emb_a = _make_vec(1.0)
        emb_b = _make_vec(100.0)  # Distant embedding

        r1 = store(db, base_words + " phi", embedding=emb_a)
        r2 = store(db, base_words + " chi", embedding=emb_b)
        assert r2.action == "created"
        assert r2.warning is not None  # Word overlap should still trigger
