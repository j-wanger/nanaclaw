import json
import os
import tempfile
from pathlib import Path

import pytest

# Add parent to path for direct imports
import sys
sys.path.insert(0, str(Path(__file__).parent.parent))

from models import Category, Source, Trust
from storage import (
    forget,
    get_by_id,
    init_db,
    mark_contradiction,
    prune,
    reinforce,
    search_all,
    stats,
    store,
    tag,
)


@pytest.fixture
def db(tmp_path):
    db_path = tmp_path / "test_memory.db"
    conn = init_db(db_path)
    yield conn
    conn.close()


class TestInitDb:
    def test_creates_tables(self, db):
        tables = {
            row[0]
            for row in db.execute(
                "SELECT name FROM sqlite_master WHERE type='table'"
            ).fetchall()
        }
        assert "memories" in tables
        assert "reinforcements" in tables
        assert "meta" in tables

    def test_creates_fts(self, db):
        tables = {
            row[0]
            for row in db.execute(
                "SELECT name FROM sqlite_master WHERE type='table'"
            ).fetchall()
        }
        assert "memories_fts" in tables

    def test_schema_version(self, db):
        row = db.execute("SELECT value FROM meta WHERE key = 'schema_version'").fetchone()
        assert row[0] == "1"

    def test_idempotent(self, tmp_path):
        db_path = tmp_path / "test.db"
        conn1 = init_db(db_path)
        conn1.close()
        conn2 = init_db(db_path)
        tables = {
            row[0]
            for row in conn2.execute(
                "SELECT name FROM sqlite_master WHERE type='table'"
            ).fetchall()
        }
        assert "memories" in tables
        conn2.close()


class TestStore:
    def test_creates_entry(self, db):
        result = store(db, "Alice prefers dark themes")
        assert result.action == "created"
        assert result.id.startswith("mem_")

    def test_entry_fields(self, db):
        result = store(
            db,
            "Always use Python for scripts",
            context="User stated during PR review",
            category=Category.PREFERENCE,
            trust=Trust.HIGH,
            source=Source.USER_EXPLICIT,
            tags=["coding", "preferences"],
        )
        entry = get_by_id(db, result.id)
        assert entry is not None
        assert entry.content == "Always use Python for scripts"
        assert entry.context == "User stated during PR review"
        assert entry.category == Category.PREFERENCE
        assert entry.trust == Trust.HIGH
        assert entry.source == Source.USER_EXPLICIT
        assert entry.tags == ["coding", "preferences"]
        assert entry.active is True
        assert entry.strength == 1

    def test_defaults(self, db):
        result = store(db, "some fact")
        entry = get_by_id(db, result.id)
        assert entry.category == Category.FACT
        assert entry.trust == Trust.MEDIUM
        assert entry.tags == []
        assert entry.active is True
        assert entry.access_count == 0


class TestGetById:
    def test_found(self, db):
        result = store(db, "test content")
        entry = get_by_id(db, result.id)
        assert entry is not None
        assert entry.content == "test content"

    def test_not_found(self, db):
        entry = get_by_id(db, "mem_nonexistent")
        assert entry is None

    def test_increments_access_count(self, db):
        result = store(db, "test content")
        get_by_id(db, result.id)
        get_by_id(db, result.id)
        row = db.execute(
            "SELECT access_count FROM memories WHERE id = ?", (result.id,)
        ).fetchone()
        assert row[0] == 2


class TestForget:
    def test_deactivates(self, db):
        result = store(db, "forget me")
        assert forget(db, result.id)
        entry = get_by_id(db, result.id)
        assert entry is not None
        assert entry.active is False

    def test_with_superseded_by(self, db):
        r1 = store(db, "old fact")
        r2 = store(db, "new fact")
        forget(db, r1.id, superseded_by=r2.id)
        entry = get_by_id(db, r1.id)
        assert entry.superseded_by == r2.id

    def test_nonexistent(self, db):
        assert not forget(db, "mem_nonexistent")


class TestTag:
    def test_add_tags(self, db):
        result = store(db, "tag me")
        tags = tag(db, result.id, add=["a", "b"])
        assert tags == ["a", "b"]

    def test_remove_tags(self, db):
        result = store(db, "tag me", tags=["a", "b", "c"])
        tags = tag(db, result.id, remove=["b"])
        assert tags == ["a", "c"]

    def test_add_and_remove(self, db):
        result = store(db, "tag me", tags=["a", "b"])
        tags = tag(db, result.id, add=["c"], remove=["a"])
        assert tags == ["b", "c"]

    def test_no_duplicates(self, db):
        result = store(db, "tag me", tags=["a"])
        tags = tag(db, result.id, add=["a", "b"])
        assert tags == ["a", "b"]

    def test_nonexistent(self, db):
        result = tag(db, "mem_nonexistent", add=["a"])
        assert result is None


class TestReinforce:
    def test_increments_strength(self, db):
        result = store(db, "reinforce me")
        reinforce(db, result.id, session_id="sess_1")
        row = db.execute(
            "SELECT strength FROM memories WHERE id = ?", (result.id,)
        ).fetchone()
        assert row[0] == 2

    def test_creates_reinforcement_record(self, db):
        result = store(db, "reinforce me")
        reinforce(db, result.id, session_id="sess_1", context="confirmed again")
        rows = db.execute(
            "SELECT * FROM reinforcements WHERE memory_id = ?", (result.id,)
        ).fetchall()
        assert len(rows) == 1
        assert rows[0]["session_id"] == "sess_1"
        assert rows[0]["context"] == "confirmed again"


class TestDedup:
    def test_exact_match_reinforces(self, db):
        r1 = store(db, "Alice prefers dark themes")
        r2 = store(db, "Alice prefers dark themes")
        assert r1.action == "created"
        assert r2.action == "reinforced"
        assert r2.existing_id == r1.id

    def test_case_insensitive(self, db):
        r1 = store(db, "Alice prefers dark themes")
        r2 = store(db, "alice prefers dark themes")
        assert r2.action == "reinforced"

    def test_whitespace_normalized(self, db):
        r1 = store(db, "  Alice prefers dark themes  ")
        r2 = store(db, "Alice prefers dark themes")
        assert r2.action == "reinforced"

    def test_strength_increments(self, db):
        r1 = store(db, "test fact")
        store(db, "test fact")
        row = db.execute(
            "SELECT strength FROM memories WHERE id = ?", (r1.id,)
        ).fetchone()
        assert row[0] == 2

    def test_inactive_not_matched(self, db):
        r1 = store(db, "forgotten fact")
        forget(db, r1.id)
        r2 = store(db, "forgotten fact")
        assert r2.action == "created"
        assert r2.id != r1.id

    def test_near_duplicate_warns(self, db):
        base = "alpha beta gamma delta epsilon zeta eta theta iota kappa lambda mu nu xi omicron pi rho sigma tau upsilon"
        store(db, base + " phi")
        r2 = store(db, base + " chi")
        assert r2.action == "created"
        assert r2.warning is not None

    def test_different_content_no_warning(self, db):
        store(db, "fact about coding preferences")
        r2 = store(db, "completely different topic about gardening tools")
        assert r2.warning is None


class TestStats:
    def test_empty_db(self, db):
        s = stats(db)
        assert s.total_active == 0
        assert s.total_superseded == 0
        assert s.by_category == {}
        assert s.by_trust == {}
        assert s.oldest is None
        assert s.newest is None

    def test_with_data(self, db):
        store(db, "fact 1", category=Category.FACT, trust=Trust.HIGH)
        store(db, "fact 2", category=Category.FACT, trust=Trust.MEDIUM)
        store(db, "pref 1", category=Category.PREFERENCE, trust=Trust.HIGH)
        r = store(db, "to forget")
        forget(db, r.id)

        s = stats(db)
        assert s.total_active == 3
        assert s.total_superseded == 1
        assert s.by_category == {"fact": 2, "preference": 1}
        assert s.by_trust == {"high": 2, "medium": 1}
        assert s.oldest is not None
        assert s.newest is not None
        assert s.total_reinforcements == 0


class TestMarkContradiction:
    def test_marks_bidirectionally(self, db):
        a = store(db, "Memory MCP uses Postgres").id
        b = store(db, "Memory MCP uses SQLite").id

        mark_contradiction(db, a, b)

        entry_a = get_by_id(db, a)
        entry_b = get_by_id(db, b)
        assert b in entry_a.contradicts
        assert a in entry_b.contradicts

    def test_idempotent_no_duplicate_entries(self, db):
        a = store(db, "Claim X is true").id
        b = store(db, "Claim X is false").id

        mark_contradiction(db, a, b)
        mark_contradiction(db, a, b)
        mark_contradiction(db, b, a)

        entry_a = get_by_id(db, a)
        entry_b = get_by_id(db, b)
        # Each side records the other exactly once
        assert entry_a.contradicts.count(b) == 1
        assert entry_b.contradicts.count(a) == 1

    def test_nonexistent_id_raises(self, db):
        a = store(db, "real entry").id
        with pytest.raises((ValueError, LookupError)):
            mark_contradiction(db, a, "mem_does_not_exist")
        with pytest.raises((ValueError, LookupError)):
            mark_contradiction(db, "mem_does_not_exist", a)

    def test_advisory_only_no_trust_demotion(self, db):
        a_id = store(db, "Trusted claim", trust=Trust.HIGH).id
        b_id = store(db, "Conflicting claim", trust=Trust.HIGH).id

        mark_contradiction(db, a_id, b_id)

        # Trust unchanged on both — contradiction is advisory only
        assert get_by_id(db, a_id).trust == Trust.HIGH
        assert get_by_id(db, b_id).trust == Trust.HIGH
        # Both still active
        assert get_by_id(db, a_id).active is True
        assert get_by_id(db, b_id).active is True


class TestPrune:
    def test_prune_finds_candidates(self, db):
        # Low trust, never reinforced, freshly created (access_count=0 < 2) — prunable
        r = store(db, "stale low-trust fact", trust=Trust.LOW)
        candidates = prune(db, dry_run=True)
        ids = [c["id"] for c in candidates]
        assert r.id in ids

    def test_prune_dry_run_no_modification(self, db):
        r = store(db, "another stale fact", trust=Trust.LOW)
        prune(db, dry_run=True)
        entry = get_by_id(db, r.id)
        assert entry.active is True

    def test_prune_execute_archives(self, db):
        r = store(db, "archive me", trust=Trust.LOW)
        archived = prune(db, dry_run=False)
        ids = [c["id"] for c in archived]
        assert r.id in ids
        # Use direct query to avoid get_by_id incrementing access_count
        row = db.execute("SELECT active FROM memories WHERE id = ?", (r.id,)).fetchone()
        assert row["active"] == 0

    def test_prune_excludes_high_trust(self, db):
        r = store(db, "high-trust fact", trust=Trust.HIGH)
        candidates = prune(db, dry_run=True)
        ids = [c["id"] for c in candidates]
        assert r.id not in ids

    def test_prune_excludes_reinforced(self, db):
        r = store(db, "reinforced low-trust fact", trust=Trust.LOW)
        reinforce(db, r.id, session_id="sess_1")
        # strength is now 2
        candidates = prune(db, dry_run=True)
        ids = [c["id"] for c in candidates]
        assert r.id not in ids


@pytest.fixture
def project_global_dbs(tmp_path):
    proj = init_db(tmp_path / "project.db")
    glob = init_db(tmp_path / "global.db")
    yield proj, glob
    proj.close()
    glob.close()


class TestSearchAllGlobalFanout:
    def test_search_all_queries_both_dbs(self, project_global_dbs):
        proj, glob = project_global_dbs
        store(proj, "Project memory about NanoClaw architecture")
        store(glob, "Global memory about Alice's general preferences")

        results = search_all(proj, glob, "memory", limit=10)
        contents = [entry.content for entry, _, _ in results]
        assert any("Project memory" in c for c in contents)
        assert any("Global memory" in c for c in contents)

    def test_search_all_global_project_preference_on_tie(self, project_global_dbs):
        proj, glob = project_global_dbs
        # Identical content in each — same FTS rank in each DB
        store(proj, "shared topic alpha beta gamma")
        store(glob, "shared topic alpha beta gamma")

        results = search_all(proj, glob, "shared topic alpha beta gamma", limit=10)
        assert len(results) == 2
        # Project must come first on tied rank
        proj_id = proj.execute("SELECT id FROM memories LIMIT 1").fetchone()["id"]
        assert results[0][0].id == proj_id

    def test_search_all_global_empty_one_db_returns_only_other(self, project_global_dbs):
        proj, glob = project_global_dbs
        store(proj, "Only project has this content about widgets")

        results = search_all(proj, glob, "widgets", limit=10)
        assert len(results) == 1
        assert "Only project" in results[0][0].content

        # And the inverse
        store(glob, "Only global has this content about gadgets")
        results2 = search_all(proj, glob, "gadgets", limit=10)
        assert len(results2) == 1
        assert "Only global" in results2[0][0].content

    def test_search_all_global_respects_limit(self, project_global_dbs):
        proj, glob = project_global_dbs
        for i in range(5):
            store(proj, f"shared topic alpha beta proj-{i}")
            store(glob, f"shared topic alpha beta glob-{i}")

        results = search_all(proj, glob, "shared topic alpha beta", limit=3)
        assert len(results) == 3
