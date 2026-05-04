import json
import sys
import tempfile
from datetime import datetime, timezone
from pathlib import Path

import pytest

# Add parent to path for direct imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from models import Category, Source, Trust
from storage import (
    export_memories,
    forget,
    import_memories,
    init_db,
    reinforce,
    store,
    tag,
)


@pytest.fixture
def db(tmp_path):
    db_path = tmp_path / "test_memory.db"
    conn = init_db(db_path)
    yield conn
    conn.close()


def _store_sample(db, content, **kwargs):
    """Helper to store a memory and return the result."""
    return store(db, content, **kwargs)


class TestExportMemories:
    def test_export_produces_valid_markdown(self, db):
        """Export should produce markdown with all fields present."""
        _store_sample(
            db,
            "Alice prefers dark themes",
            category=Category.PREFERENCE,
            trust=Trust.HIGH,
            tags=["ui", "preferences"],
            context="Observed from editor settings",
        )
        md = export_memories(db)

        assert "## [preference]" in md
        assert "Alice prefers dark themes" in md
        assert "**Content:**" in md
        assert "**Trust:** high" in md
        assert "**Tags:** ui, preferences" in md
        assert "**Context:** Observed from editor settings" in md
        assert "**Strength:**" in md
        assert "**Created:**" in md
        assert "mem_" in md

    def test_export_groups_by_category(self, db):
        """Memories should be grouped by category with category headers."""
        _store_sample(db, "fact one", category=Category.FACT)
        _store_sample(db, "pref one", category=Category.PREFERENCE)
        _store_sample(db, "fact two", category=Category.FACT)

        md = export_memories(db)

        # Category headers should appear
        assert "# fact" in md.lower() or "# Fact" in md or "# fact" in md
        assert "# preference" in md.lower() or "# Preference" in md

    def test_export_filters_by_category(self, db):
        """When category is specified, only that category should appear."""
        _store_sample(db, "fact one", category=Category.FACT)
        _store_sample(db, "pref one", category=Category.PREFERENCE)

        md = export_memories(db, category=Category.PREFERENCE)

        assert "pref one" in md
        assert "fact one" not in md

    def test_export_empty_db(self, db):
        """Export with no memories should return empty/header-only markdown."""
        md = export_memories(db)
        # Should not error, may contain a header or be empty
        assert isinstance(md, str)
        assert "## [" not in md  # No memory entries

    def test_export_only_active(self, db):
        """Export should only include active memories."""
        r1 = _store_sample(db, "active memory")
        r2 = _store_sample(db, "forgotten memory")
        forget(db, r2.id)

        md = export_memories(db)

        assert "active memory" in md
        assert "forgotten memory" not in md

    def test_export_reinforcement_count(self, db):
        """Export should show reinforcement count."""
        r = _store_sample(db, "reinforced memory")
        reinforce(db, r.id, session_id="s1", context="first time")
        reinforce(db, r.id, session_id="s2", context="second time")

        md = export_memories(db)

        assert "**Reinforced:** 2 times" in md

    def test_export_no_context_field(self, db):
        """When context is None, the Context line should be omitted or show none."""
        _store_sample(db, "no context memory")

        md = export_memories(db)

        # Context line should not appear for memories without context
        assert "no context memory" in md

    def test_export_multiple_tags(self, db):
        """Tags should be comma-separated."""
        _store_sample(db, "tagged memory", tags=["alpha", "beta", "gamma"])

        md = export_memories(db)

        assert "**Tags:** alpha, beta, gamma" in md

    def test_export_no_tags(self, db):
        """Memories with no tags should show empty or omit tags line."""
        _store_sample(db, "untagged memory")

        md = export_memories(db)
        assert "untagged memory" in md


class TestImportMemories:
    def _make_export_md(self, entries):
        """Helper to build valid export markdown for testing import."""
        lines = ["# Memory Export\n"]
        for e in entries:
            cat = e.get("category", "fact")
            content = e.get("content", "test content")
            trust = e.get("trust", "medium")
            strength = e.get("strength", 1)
            tags = e.get("tags", [])
            context = e.get("context", None)
            mem_id = e.get("id", "mem_test123456")

            summary = content[:50]
            lines.append(f"## [{cat}] {summary} ({trust})\n")
            lines.append(f"**Content:** {content}")
            lines.append(f"- **ID:** {mem_id}")
            lines.append(f"- **Trust:** {trust}")
            lines.append(f"- **Strength:** {strength}")
            if tags:
                lines.append(f"- **Tags:** {', '.join(tags)}")
            lines.append(f"- **Created:** 2026-01-01T00:00:00+00:00")
            if context:
                lines.append(f"- **Context:** {context}")
            lines.append(f"- **Reinforced:** 0 times")
            lines.append("")

        return "\n".join(lines)

    def test_import_merge_creates_new(self, db):
        """Merge mode should create new entries from markdown."""
        md = self._make_export_md([
            {"content": "New fact from import", "category": "fact", "trust": "high", "tags": ["imported"]},
        ])

        result = import_memories(db, md, mode="merge")

        assert result["imported"] >= 1
        assert result["errors"] == []

        # Verify it's in the DB
        rows = db.execute(
            "SELECT * FROM memories WHERE content = 'New fact from import' AND active = 1"
        ).fetchall()
        assert len(rows) == 1
        assert rows[0]["trust"] == "high"

    def test_import_merge_reinforces_duplicates(self, db):
        """Merge mode should reinforce existing exact duplicates."""
        _store_sample(db, "Existing memory")

        md = self._make_export_md([
            {"content": "Existing memory", "category": "fact"},
        ])

        result = import_memories(db, md, mode="merge")

        assert result["reinforced"] >= 1

        # Strength should be incremented
        row = db.execute(
            "SELECT strength FROM memories WHERE content = 'Existing memory' AND active = 1"
        ).fetchone()
        assert row["strength"] >= 2

    def test_import_replace_deactivates_old(self, db):
        """Replace mode should deactivate all existing memories before importing."""
        r1 = _store_sample(db, "Old memory one")
        r2 = _store_sample(db, "Old memory two")

        md = self._make_export_md([
            {"content": "New replacement", "category": "fact"},
        ])

        result = import_memories(db, md, mode="replace")

        assert result["imported"] >= 1

        # Old memories should be inactive
        old1 = db.execute(
            "SELECT active FROM memories WHERE id = ?", (r1.id,)
        ).fetchone()
        old2 = db.execute(
            "SELECT active FROM memories WHERE id = ?", (r2.id,)
        ).fetchone()
        assert old1["active"] == 0
        assert old2["active"] == 0

        # New memory should be active
        new = db.execute(
            "SELECT active FROM memories WHERE content = 'New replacement'"
        ).fetchone()
        assert new["active"] == 1

    def test_import_round_trip(self, db):
        """Export → import → export should produce consistent content."""
        _store_sample(
            db, "Round trip fact",
            category=Category.FACT,
            trust=Trust.HIGH,
            tags=["test"],
            context="From test",
        )
        _store_sample(
            db, "Round trip preference",
            category=Category.PREFERENCE,
            trust=Trust.MEDIUM,
            tags=["pref"],
        )

        md1 = export_memories(db)

        # Import into a fresh DB
        db2_path = Path(db.execute("PRAGMA database_list").fetchone()[2]).parent / "rt.db"
        db2 = init_db(db2_path)

        result = import_memories(db2, md1, mode="merge")
        assert result["errors"] == []

        md2 = export_memories(db2)

        # Core content should be preserved
        assert "Round trip fact" in md2
        assert "Round trip preference" in md2
        assert "**Trust:** high" in md2
        assert "**Tags:** test" in md2

        db2.close()

    def test_import_malformed_markdown(self, db):
        """Malformed markdown should produce errors, not crash."""
        malformed = """
## [fact] Valid entry (high)

**Content:** This is valid
- **ID:** mem_abc123456789
- **Trust:** high
- **Strength:** 1
- **Created:** 2026-01-01T00:00:00+00:00
- **Reinforced:** 0 times

## This heading has no category brackets

Some random text without structure.

## [invalid_category] Bad category (medium)

**Content:** Has bad category
- **ID:** mem_def123456789
- **Trust:** medium
- **Strength:** 1
- **Created:** 2026-01-01T00:00:00+00:00
- **Reinforced:** 0 times
"""

        result = import_memories(db, malformed, mode="merge")

        # Should have processed some entries, with errors for bad ones
        assert isinstance(result["errors"], list)
        # The valid entry should have been imported
        valid = db.execute(
            "SELECT * FROM memories WHERE content = 'This is valid' AND active = 1"
        ).fetchall()
        assert len(valid) == 1

    def test_import_empty_string(self, db):
        """Importing empty string should return zero results, not crash."""
        result = import_memories(db, "", mode="merge")

        assert result["imported"] == 0
        assert result["reinforced"] == 0
        assert result["errors"] == []

    def test_import_preserves_tags(self, db):
        """Tags from markdown should be preserved on imported entries."""
        md = self._make_export_md([
            {"content": "Tagged import", "tags": ["alpha", "beta"]},
        ])

        import_memories(db, md, mode="merge")

        row = db.execute(
            "SELECT tags FROM memories WHERE content = 'Tagged import' AND active = 1"
        ).fetchone()
        tags = json.loads(row["tags"])
        assert "alpha" in tags
        assert "beta" in tags

    def test_import_preserves_context(self, db):
        """Context from markdown should be preserved on imported entries."""
        md = self._make_export_md([
            {"content": "Contextual import", "context": "From a session"},
        ])

        import_memories(db, md, mode="merge")

        row = db.execute(
            "SELECT context FROM memories WHERE content = 'Contextual import' AND active = 1"
        ).fetchone()
        assert row["context"] == "From a session"

    def test_import_replace_then_merge(self, db):
        """Replace mode followed by merge should work correctly."""
        _store_sample(db, "Original memory")

        md1 = self._make_export_md([
            {"content": "Replaced entry", "category": "fact"},
        ])
        import_memories(db, md1, mode="replace")

        md2 = self._make_export_md([
            {"content": "Merged on top", "category": "preference"},
        ])
        result = import_memories(db, md2, mode="merge")

        assert result["imported"] >= 1

        # Both should be active
        active = db.execute(
            "SELECT COUNT(*) as cnt FROM memories WHERE active = 1"
        ).fetchone()["cnt"]
        assert active == 2


class TestExportImportIntegration:
    def test_full_lifecycle(self, db):
        """Store → tag → reinforce → export → fresh import → verify."""
        r = _store_sample(
            db,
            "Lifecycle test memory",
            category=Category.ENTITY,
            trust=Trust.HIGH,
            context="Test context",
        )
        tag(db, r.id, add=["lifecycle", "test"])
        reinforce(db, r.id, session_id="s1")

        md = export_memories(db)

        assert "Lifecycle test memory" in md
        assert "**Tags:** lifecycle, test" in md
        assert "**Reinforced:** 1 time" in md  # singular

        # Import into fresh DB
        db2_path = Path(db.execute("PRAGMA database_list").fetchone()[2]).parent / "lc.db"
        db2 = init_db(db2_path)

        result = import_memories(db2, md, mode="merge")
        assert result["errors"] == []
        assert result["imported"] >= 1

        row = db2.execute(
            "SELECT * FROM memories WHERE content = 'Lifecycle test memory' AND active = 1"
        ).fetchone()
        assert row is not None
        assert row["trust"] == "high"
        assert row["category"] == "entity"
        assert "lifecycle" in json.loads(row["tags"])

        db2.close()
