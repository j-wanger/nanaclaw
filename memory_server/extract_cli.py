"""Post-session transcript-to-memories extraction CLI.

Reads a transcript file, runs the Qwen sidecar extractor to propose
memory entries, and stores each to the project DB. Output is intentionally
low-trust (forced by extractor.py).

Usage:
    python -m memory_server.extract_cli --file <transcript_path> [--db <db_path>]

The --db flag defaults to ${MEMORY_PROJECT_DIR}/memory.db, or ./memory.db
if MEMORY_PROJECT_DIR is unset.
"""

from __future__ import annotations

import argparse
import os
import sqlite3
import sys
from pathlib import Path
from typing import Optional

# Allow `python -m memory_server.extract_cli` and direct script use.
sys.path.insert(0, str(Path(__file__).parent))

from config import SidecarConfig
from extractor import extract_memories
from storage import init_db, store


def _default_db_path() -> str:
    project_dir = os.environ.get("MEMORY_PROJECT_DIR")
    if project_dir:
        return str(Path(project_dir) / "memory.db")
    return "./memory.db"


def extract_and_store(
    transcript_path: str,
    conn: sqlite3.Connection,
    config: SidecarConfig,
) -> dict:
    """Read transcript, extract proposals, store each. Returns summary counts."""
    text = Path(transcript_path).read_text(encoding="utf-8")
    proposals = extract_memories(text, config)

    stored = 0
    skipped_duplicate = 0
    for entry in proposals:
        result = store(
            conn,
            entry.content,
            context=entry.context,
            category=entry.category,
            trust=entry.trust,
            source=entry.source,
            tags=entry.tags,
        )
        if result.action == "created":
            stored += 1
        else:
            skipped_duplicate += 1

    return {
        "extracted": len(proposals),
        "stored": stored,
        "skipped_duplicate": skipped_duplicate,
    }


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="python -m memory_server.extract_cli",
        description="Extract memory entries from a session transcript via Qwen sidecar.",
    )
    parser.add_argument(
        "--file",
        required=True,
        help="Path to the transcript file to extract from.",
    )
    parser.add_argument(
        "--db",
        default=None,
        help="SQLite memory store path (default: ${MEMORY_PROJECT_DIR}/memory.db or ./memory.db).",
    )
    parser.add_argument(
        "--sidecar-endpoint",
        default="http://localhost:8080/v1/chat/completions",
        help="Qwen sidecar chat-completions endpoint.",
    )
    parser.add_argument(
        "--sidecar-model",
        default="qwen",
        help="Model name to send to the sidecar.",
    )
    parser.add_argument(
        "--timeout-ms",
        type=int,
        default=10000,
        help="Sidecar request timeout in milliseconds.",
    )
    return parser


def main(argv: Optional[list[str]] = None) -> int:
    args = _build_parser().parse_args(argv)
    db_path = args.db or _default_db_path()
    config = SidecarConfig(
        enabled=True,
        endpoint=args.sidecar_endpoint,
        model=args.sidecar_model,
        timeout_ms=args.timeout_ms,
    )

    conn = init_db(db_path)
    try:
        summary = extract_and_store(args.file, conn, config)
    finally:
        conn.close()

    print(
        f"Extracted {summary['extracted']} entries, stored {summary['stored']} "
        f"(skipped_duplicate={summary['skipped_duplicate']})"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
