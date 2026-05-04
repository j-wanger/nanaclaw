import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).parent.parent))

from migrate import migrate_file, parse_memory_md
from models import Category, Source, Trust
from storage import init_db


SAMPLE_MEMORY_MD = """# Memory

## [user] Alice — Profile (2026-04-26)
Software engineer working in data infrastructure. Builds distributed systems and tooling.

## [feedback] Pushback Expected (2026-05-02)
Alice expects substantive engagement with proposals, not agreement.

## [project] NanoClaw Fork — Architecture (2026-04-26)
Two-tier heterogeneous: Claude Agent SDK + local Qwen via llama-cpp.

## [reference] Useful Tool (2026-04-30)
sqlite-vec extension provides cosine similarity search via virtual tables.
"""


@pytest.fixture
def db(tmp_path):
    conn = init_db(tmp_path / "test_migration.db")
    yield conn
    conn.close()


@pytest.fixture
def memory_md_file(tmp_path):
    path = tmp_path / "MEMORY.md"
    path.write_text(SAMPLE_MEMORY_MD)
    return path


class TestParseMemoryMd:
    def test_parse_memory_md_extracts_entries(self):
        entries = parse_memory_md(SAMPLE_MEMORY_MD)
        assert len(entries) == 4
        assert entries[0]["type"] == "user"
        assert entries[0]["title"] == "Alice — Profile"
        assert entries[0]["date"] == "2026-04-26"
        assert "Software engineer" in entries[0]["content"]

        assert entries[1]["type"] == "feedback"
        assert entries[1]["title"] == "Pushback Expected"
        assert "substantive engagement" in entries[1]["content"]

        assert entries[2]["type"] == "project"
        assert entries[3]["type"] == "reference"

    def test_parse_memory_md_type_mapping(self, db):
        result = migrate_file(_write_tmp(db, SAMPLE_MEMORY_MD), db)
        assert result["imported"] == 4

        rows = db.execute(
            "SELECT category, content FROM memories ORDER BY created_at"
        ).fetchall()
        cat_by_content = {r["content"][:20]: r["category"] for r in rows}

        # user → fact
        assert any(c == "fact" for k, c in cat_by_content.items() if "Software engineer" in k)
        # feedback → correction
        assert any(c == "correction" for k, c in cat_by_content.items() if "Alice expects" in k)
        # project → fact
        assert any(c == "fact" for k, c in cat_by_content.items() if "Two-tier" in k)
        # reference → custom
        assert any(c == "custom" for k, c in cat_by_content.items() if "sqlite-vec" in k)

    def test_parse_memory_md_preserves_source_type_tag(self, db):
        migrate_file(_write_tmp(db, SAMPLE_MEMORY_MD), db)
        import json

        rows = db.execute("SELECT content, tags FROM memories").fetchall()
        tags_by_content = {r["content"][:30]: json.loads(r["tags"]) for r in rows}

        for content_prefix, tags in tags_by_content.items():
            assert any(t.startswith("source-type:") for t in tags), (
                f"Missing source-type tag for: {content_prefix}"
            )

        # Specific mappings
        for content_prefix, tags in tags_by_content.items():
            if "Software engineer" in content_prefix:
                assert "source-type:user" in tags
            elif "Alice expects" in content_prefix:
                assert "source-type:feedback" in tags
            elif "Two-tier" in content_prefix:
                assert "source-type:project" in tags
            elif "sqlite-vec" in content_prefix:
                assert "source-type:reference" in tags


class TestMigrateFile:
    def test_migrate_file_sets_source_imported(self, db, memory_md_file):
        result = migrate_file(str(memory_md_file), db)
        assert result["total"] == 4
        assert result["imported"] == 4

        rows = db.execute("SELECT source FROM memories").fetchall()
        for r in rows:
            assert r["source"] == Source.IMPORTED.value

    def test_migrate_file_trust_levels(self, db, memory_md_file):
        migrate_file(str(memory_md_file), db)
        rows = db.execute("SELECT content, trust FROM memories").fetchall()
        for r in rows:
            if "Alice expects" in r["content"]:
                assert r["trust"] == Trust.HIGH.value, "feedback should map to high"
            else:
                assert r["trust"] == Trust.MEDIUM.value, (
                    f"non-feedback should map to medium, got {r['trust']} for {r['content'][:40]}"
                )

    def test_migrate_file_idempotent(self, db, memory_md_file):
        first = migrate_file(str(memory_md_file), db)
        assert first["imported"] == 4
        assert first["skipped_duplicate"] == 0

        second = migrate_file(str(memory_md_file), db)
        assert second["total"] == 4
        assert second["imported"] == 0
        assert second["skipped_duplicate"] == 4

        # Confirm only 4 active rows still in DB
        count = db.execute("SELECT COUNT(*) FROM memories WHERE active = 1").fetchone()[0]
        assert count == 4

    def test_migrate_file_preserves_title_in_context(self, db, memory_md_file):
        migrate_file(str(memory_md_file), db)
        rows = db.execute("SELECT content, context FROM memories").fetchall()

        for r in rows:
            assert r["context"] is not None
            assert "Migrated from MEMORY.md:" in r["context"]
            if "Software engineer" in r["content"]:
                assert "Alice — Profile" in r["context"]
            elif "Alice expects" in r["content"]:
                assert "Pushback Expected" in r["context"]
            elif "Two-tier" in r["content"]:
                assert "NanoClaw Fork — Architecture" in r["context"]


def _write_tmp(_db, text: str) -> str:
    """Helper: write text to a temp MEMORY.md and return its path."""
    import tempfile

    f = tempfile.NamedTemporaryFile(
        mode="w", suffix=".md", delete=False, encoding="utf-8"
    )
    f.write(text)
    f.close()
    return f.name
