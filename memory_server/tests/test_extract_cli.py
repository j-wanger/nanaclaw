"""Tests for the post-session transcript extraction CLI."""

from __future__ import annotations

import json
import sys
from pathlib import Path
from unittest.mock import MagicMock

import pytest

sys.path.insert(0, str(Path(__file__).parent.parent))

from extract_cli import main as extract_cli_main


def _mock_qwen_response(content: str) -> MagicMock:
    resp = MagicMock()
    resp.status_code = 200
    resp.json.return_value = {"choices": [{"message": {"content": content}}]}
    return resp


def test_extract_cli_reads_and_stores(tmp_path, monkeypatch):
    transcript = tmp_path / "transcript.txt"
    transcript.write_text(
        "User: I prefer Rust for new systems work.\n"
        "Assistant: Got it.\n"
        "User: Project uses SQLite, not Postgres.\n"
        "Assistant: Noted.\n",
        encoding="utf-8",
    )
    db_path = tmp_path / "memory.db"

    qwen_payload = json.dumps({
        "memories": [
            {
                "content": "User prefers Rust for new systems work",
                "category": "preference",
                "context": "Stated in conversation",
                "tags": ["rust"],
            },
            {
                "content": "Project uses SQLite (not Postgres)",
                "category": "fact",
                "context": "User correction",
                "tags": ["database"],
            },
        ]
    })
    monkeypatch.setattr(
        "extractor.httpx.post",
        MagicMock(return_value=_mock_qwen_response(qwen_payload)),
    )

    rc = extract_cli_main(["--file", str(transcript), "--db", str(db_path)])
    assert rc == 0

    import sqlite3
    conn = sqlite3.connect(str(db_path))
    conn.row_factory = sqlite3.Row
    rows = conn.execute(
        "SELECT content, trust, source FROM memories WHERE active = 1"
    ).fetchall()
    conn.close()

    assert len(rows) == 2
    contents = {r["content"] for r in rows}
    assert "User prefers Rust for new systems work" in contents
    assert "Project uses SQLite (not Postgres)" in contents
    # Extractor forces trust=low and source=inferred
    for r in rows:
        assert r["trust"] == "low"
        assert r["source"] == "inferred"


def test_extract_cli_empty_transcript(tmp_path, monkeypatch):
    transcript = tmp_path / "empty.txt"
    transcript.write_text("", encoding="utf-8")
    db_path = tmp_path / "memory.db"

    post_mock = MagicMock()
    monkeypatch.setattr("extractor.httpx.post", post_mock)

    rc = extract_cli_main(["--file", str(transcript), "--db", str(db_path)])
    assert rc == 0
    post_mock.assert_not_called()

    import sqlite3
    conn = sqlite3.connect(str(db_path))
    count = conn.execute("SELECT COUNT(*) FROM memories WHERE active = 1").fetchone()[0]
    conn.close()
    assert count == 0
