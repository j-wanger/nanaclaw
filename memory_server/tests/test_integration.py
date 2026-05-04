import json
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).parent.parent))

from models import Category, Trust
from storage import forget, get_by_id, init_db, search_fts, stats, store, tag

FIXTURES_PATH = Path(__file__).parent / "fixtures" / "memories.json"


@pytest.fixture
def db(tmp_path):
    conn = init_db(tmp_path / "test.db")
    yield conn
    conn.close()


@pytest.fixture
def loaded_db(db):
    with open(FIXTURES_PATH) as f:
        fixtures = json.load(f)
    ids = []
    for mem in fixtures:
        result = store(
            db,
            mem["content"],
            category=Category(mem["category"]),
            trust=Trust(mem["trust"]),
            tags=mem.get("tags", []),
        )
        ids.append(result.id)
    return db, ids


class TestIntegrationStoreAndSearch:
    def test_all_fixtures_stored(self, loaded_db):
        db, ids = loaded_db
        assert len(ids) == 20
        s = stats(db)
        assert s.total_active == 20

    def test_search_python(self, loaded_db):
        db, _ = loaded_db
        results = search_fts(db, "Python scripting automation")
        assert len(results) > 0
        top = results[0][0]
        assert "Python" in top.content

    def test_search_architecture(self, loaded_db):
        db, _ = loaded_db
        results = search_fts(db, "architecture session database")
        assert len(results) > 0
        contents = [r[0].content for r in results]
        assert any("two-DB" in c or "architecture" in c for c in contents)

    def test_search_trading(self, loaded_db):
        db, _ = loaded_db
        results = search_fts(db, "trading latency market")
        assert len(results) > 0
        assert any("trading" in r[0].content.lower() for r in results)

    def test_search_llm_reliability(self, loaded_db):
        db, _ = loaded_db
        results = search_fts(db, "LLM pipeline fail")
        assert len(results) > 0
        assert any("fail" in r[0].content.lower() for r in results)

    def test_search_user_profile(self, loaded_db):
        db, _ = loaded_db
        results = search_fts(db, "timezone Toronto")
        assert len(results) > 0
        assert any("Toronto" in r[0].content for r in results)


class TestIntegrationDedup:
    def test_exact_duplicate_reinforces(self, loaded_db):
        db, _ = loaded_db
        result = store(db, "Favorite programming language is Rust")
        assert result.action == "reinforced"
        s = stats(db)
        assert s.total_active == 20


class TestIntegrationForget:
    def test_forget_filters_from_search(self, loaded_db):
        db, ids = loaded_db
        trading_results = search_fts(db, "trading latency")
        assert len(trading_results) > 0
        trading_id = trading_results[0][0].id

        forget(db, trading_id)

        results_after = search_fts(db, "trading latency", active_only=True)
        result_ids = [r[0].id for r in results_after]
        assert trading_id not in result_ids

        s = stats(db)
        assert s.total_active == 19
        assert s.total_superseded == 1


class TestIntegrationStats:
    def test_category_counts(self, loaded_db):
        db, _ = loaded_db
        s = stats(db)
        assert s.by_category["fact"] == 11
        assert s.by_category["preference"] == 4
        assert s.by_category["correction"] == 2
        assert s.by_category["entity"] == 3

    def test_trust_counts(self, loaded_db):
        db, _ = loaded_db
        s = stats(db)
        assert s.by_trust["high"] == 10
        assert s.by_trust["medium"] == 9
        assert s.by_trust["low"] == 1

    def test_oldest_newest(self, loaded_db):
        db, _ = loaded_db
        s = stats(db)
        assert s.oldest is not None
        assert s.newest is not None
        assert s.oldest <= s.newest


class TestIntegrationTags:
    def test_add_tag_and_search(self, loaded_db):
        db, ids = loaded_db
        tag(db, ids[0], add=["important", "verified"])
        entry = get_by_id(db, ids[0])
        assert "important" in entry.tags
        assert "verified" in entry.tags

    def test_remove_tag(self, loaded_db):
        db, ids = loaded_db
        entry_before = get_by_id(db, ids[0])
        original_tags = entry_before.tags[:]
        if original_tags:
            tag(db, ids[0], remove=[original_tags[0]])
            entry_after = get_by_id(db, ids[0])
            assert original_tags[0] not in entry_after.tags

    def test_tag_search_via_fts(self, loaded_db):
        db, ids = loaded_db
        results = search_fts(db, "coding")
        assert len(results) >= 2
