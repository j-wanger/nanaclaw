"""Migrate legacy MEMORY.md entries into the SQLite memory store.

Parses the agent's flat MEMORY.md file (sectioned by `## [type] Title (date)`)
and imports each entry via storage.store(). Storage's exact-text dedup makes
re-runs idempotent: a second run on the same file imports nothing new.
"""

from __future__ import annotations

import argparse
import re
import sqlite3
import sys
from pathlib import Path
from typing import Optional

# Allow `python -m memory_server.migrate` and direct script use.
sys.path.insert(0, str(Path(__file__).parent))

from models import Category, Source, Trust
from storage import init_db, store


# user → fact, feedback → correction, project → fact, reference → custom
_TYPE_TO_CATEGORY: dict[str, Category] = {
    "user": Category.FACT,
    "feedback": Category.CORRECTION,
    "project": Category.FACT,
    "reference": Category.CUSTOM,
}

# feedback → high (explicit corrections); everything else → medium.
_TYPE_TO_TRUST: dict[str, Trust] = {
    "feedback": Trust.HIGH,
}

_HEADING_RE = re.compile(r"^##\s+\[(\w+)\]\s+(.+?)\s*\((\d{4}-\d{2}-\d{2})\)\s*$")


def parse_memory_md(text: str) -> list[dict]:
    """Split MEMORY.md text into a list of {type, title, date, content} dicts.

    Each `## [type] Title (YYYY-MM-DD)` heading starts a new entry; everything
    until the next heading (or EOF) is the content body. Headings with an
    unrecognized format are ignored.
    """
    entries: list[dict] = []
    current: Optional[dict] = None
    body_lines: list[str] = []

    def _flush() -> None:
        if current is None:
            return
        current["content"] = "\n".join(body_lines).strip()
        if current["content"]:
            entries.append(current)

    for line in text.splitlines():
        m = _HEADING_RE.match(line)
        if m:
            _flush()
            current = {
                "type": m.group(1),
                "title": m.group(2).strip(),
                "date": m.group(3),
                "content": "",
            }
            body_lines = []
            continue
        if current is not None:
            body_lines.append(line)

    _flush()
    return entries


def migrate_file(file_path: str, conn: sqlite3.Connection) -> dict:
    """Parse the file at file_path and store each entry into conn.

    Returns a summary {total, imported, skipped_duplicate}.
    Entries with unrecognized types are counted in `skipped_unknown_type`.
    """
    text = Path(file_path).read_text(encoding="utf-8")
    entries = parse_memory_md(text)

    imported = 0
    skipped_duplicate = 0
    skipped_unknown_type = 0

    for entry in entries:
        etype = entry["type"]
        category = _TYPE_TO_CATEGORY.get(etype)
        if category is None:
            skipped_unknown_type += 1
            continue

        trust = _TYPE_TO_TRUST.get(etype, Trust.MEDIUM)
        context = f"Migrated from MEMORY.md: {entry['title']}"
        tags = [f"source-type:{etype}"]

        result = store(
            conn,
            entry["content"],
            context=context,
            category=category,
            trust=trust,
            source=Source.IMPORTED,
            tags=tags,
        )

        if result.action == "created":
            imported += 1
        else:
            skipped_duplicate += 1

    return {
        "total": len(entries),
        "imported": imported,
        "skipped_duplicate": skipped_duplicate,
        "skipped_unknown_type": skipped_unknown_type,
    }


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="python -m memory_server.migrate",
        description="Migrate a legacy MEMORY.md file into the SQLite memory store.",
    )
    parser.add_argument(
        "--file",
        required=True,
        help="Path to MEMORY.md to import.",
    )
    parser.add_argument(
        "--db",
        default="memory.db",
        help="Path to the SQLite memory store (default: ./memory.db).",
    )
    return parser


def main(argv: Optional[list[str]] = None) -> int:
    args = _build_parser().parse_args(argv)
    conn = init_db(args.db)
    try:
        summary = migrate_file(args.file, conn)
    finally:
        conn.close()

    print(
        f"Migrated {summary['imported']}/{summary['total']} entries "
        f"(skipped_duplicate={summary['skipped_duplicate']}, "
        f"skipped_unknown_type={summary['skipped_unknown_type']})"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
