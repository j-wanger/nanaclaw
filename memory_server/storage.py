from __future__ import annotations

import json
import logging
import sqlite3
import struct
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Optional

import math

from nanoid import generate as nanoid

from models import (
    Category,
    MemoryEntry,
    ReinforcementEntry,
    Source,
    StatsResponse,
    StoreResult,
    Trust,
)

logger = logging.getLogger(__name__)

SCHEMA_VERSION = 1

# Module-level flag: True if sqlite-vec extension loaded successfully
_vec_available = False


def init_db(db_path: str | Path) -> sqlite3.Connection:
    path = Path(db_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(path))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")

    conn.executescript("""
        CREATE TABLE IF NOT EXISTS memories (
            id             TEXT PRIMARY KEY,
            content        TEXT NOT NULL,
            context        TEXT,
            category       TEXT NOT NULL DEFAULT 'fact',
            trust          TEXT NOT NULL DEFAULT 'medium',
            strength       INTEGER NOT NULL DEFAULT 1,
            source         TEXT,
            source_session TEXT,
            tags           TEXT NOT NULL DEFAULT '[]',
            active         INTEGER NOT NULL DEFAULT 1,
            superseded_by  TEXT,
            contradicts    TEXT NOT NULL DEFAULT '[]',
            embedding      BLOB,
            created_at     TEXT NOT NULL,
            updated_at     TEXT NOT NULL,
            access_count   INTEGER NOT NULL DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS reinforcements (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            memory_id  TEXT NOT NULL REFERENCES memories(id),
            session_id TEXT NOT NULL,
            timestamp  TEXT NOT NULL,
            context    TEXT
        );

        CREATE TABLE IF NOT EXISTS meta (
            key   TEXT PRIMARY KEY,
            value TEXT
        );

        INSERT OR IGNORE INTO meta (key, value) VALUES ('schema_version', '1');
        INSERT OR IGNORE INTO meta (key, value) VALUES ('has_vectors', '0');
    """)

    _ensure_fts(conn)
    _ensure_vec(conn)
    conn.commit()
    return conn


def _ensure_fts(conn: sqlite3.Connection) -> None:
    exists = conn.execute(
        "SELECT 1 FROM sqlite_master WHERE type='table' AND name='memories_fts'"
    ).fetchone()
    if exists:
        return

    conn.executescript("""
        CREATE VIRTUAL TABLE memories_fts USING fts5(
            content, tags,
            content=memories, content_rowid=rowid
        );

        CREATE TRIGGER memories_ai AFTER INSERT ON memories BEGIN
            INSERT INTO memories_fts(rowid, content, tags)
            VALUES (new.rowid, new.content, new.tags);
        END;

        CREATE TRIGGER memories_ad AFTER DELETE ON memories BEGIN
            INSERT INTO memories_fts(memories_fts, rowid, content, tags)
            VALUES ('delete', old.rowid, old.content, old.tags);
        END;

        CREATE TRIGGER memories_au AFTER UPDATE ON memories BEGIN
            INSERT INTO memories_fts(memories_fts, rowid, content, tags)
            VALUES ('delete', old.rowid, old.content, old.tags);
            INSERT INTO memories_fts(rowid, content, tags)
            VALUES (new.rowid, new.content, new.tags);
        END;
    """)


def _ensure_vec(conn: sqlite3.Connection) -> None:
    global _vec_available
    try:
        import sqlite_vec

        conn.enable_load_extension(True)
        sqlite_vec.load(conn)
        conn.enable_load_extension(False)

        conn.execute("""
            CREATE VIRTUAL TABLE IF NOT EXISTS memories_vec
            USING vec0(embedding float[768])
        """)
        conn.execute("INSERT OR REPLACE INTO meta (key, value) VALUES ('has_vectors', '1')")
        _vec_available = True
        logger.info("sqlite-vec loaded — vector search enabled")
    except ImportError:
        logger.warning("sqlite-vec not installed — running in FTS5-only mode")
        _vec_available = False
    except Exception as e:
        logger.warning(f"sqlite-vec failed to load: {e} — running in FTS5-only mode")
        _vec_available = False


def _embedding_to_blob(embedding: list[float]) -> bytes:
    """Pack a list of floats into a little-endian f32 BLOB."""
    return struct.pack(f"<{len(embedding)}f", *embedding)


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _row_to_entry(row: sqlite3.Row) -> MemoryEntry:
    return MemoryEntry(
        id=row["id"],
        content=row["content"],
        context=row["context"],
        category=Category(row["category"]),
        trust=Trust(row["trust"]),
        strength=row["strength"],
        source=Source(row["source"]) if row["source"] else None,
        source_session=row["source_session"],
        tags=json.loads(row["tags"]),
        active=bool(row["active"]),
        superseded_by=row["superseded_by"],
        contradicts=json.loads(row["contradicts"]),
        created_at=datetime.fromisoformat(row["created_at"]),
        updated_at=datetime.fromisoformat(row["updated_at"]),
        access_count=row["access_count"],
    )


def store(
    conn: sqlite3.Connection,
    content: str,
    *,
    context: Optional[str] = None,
    category: Category = Category.FACT,
    trust: Trust = Trust.MEDIUM,
    source: Optional[Source] = None,
    source_session: Optional[str] = None,
    tags: Optional[list[str]] = None,
    embedding: Optional[list[float]] = None,
) -> StoreResult:
    dup = _find_exact_duplicate(conn, content)
    if dup:
        reinforce(conn, dup["id"], session_id=source_session or "unknown", context=context)
        return StoreResult(id=dup["id"], action="reinforced", existing_id=dup["id"])

    near_result = _find_near_duplicate(conn, content, embedding=embedding)
    warning = None
    if near_result:
        near_row, near_action = near_result
        if near_action == "reinforce":
            reinforce(conn, near_row["id"], session_id=source_session or "unknown", context=context)
            return StoreResult(id=near_row["id"], action="reinforced", existing_id=near_row["id"])
        elif near_action == "warn":
            warning = f"Similar memory exists: {near_row['id']}"

    mem_id = f"mem_{nanoid(size=12)}"
    now = _now_iso()
    emb_blob = _embedding_to_blob(embedding) if embedding else None
    conn.execute(
        """INSERT INTO memories
           (id, content, context, category, trust, strength, source,
            source_session, tags, active, superseded_by, contradicts,
            embedding, created_at, updated_at, access_count)
           VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?, 1, NULL, '[]', ?, ?, ?, 0)""",
        (
            mem_id,
            content,
            context,
            category.value,
            trust.value,
            source.value if source else None,
            source_session,
            json.dumps(tags or []),
            emb_blob,
            now,
            now,
        ),
    )

    # Insert into vec table if embedding provided and sqlite-vec is available
    if embedding and _vec_available:
        rowid = conn.execute(
            "SELECT rowid FROM memories WHERE id = ?", (mem_id,)
        ).fetchone()["rowid"]
        conn.execute(
            "INSERT INTO memories_vec (rowid, embedding) VALUES (?, ?)",
            (rowid, emb_blob),
        )

    conn.commit()
    return StoreResult(id=mem_id, action="created", warning=warning)


def _find_exact_duplicate(conn: sqlite3.Connection, content: str) -> Optional[sqlite3.Row]:
    normalized = content.strip().lower()
    row = conn.execute(
        "SELECT * FROM memories WHERE LOWER(TRIM(content)) = ? AND active = 1",
        (normalized,),
    ).fetchone()
    return row


def _cosine_similarity(a: list[float], b: list[float]) -> float:
    """Compute cosine similarity between two vectors."""
    dot = sum(x * y for x, y in zip(a, b))
    norm_a = math.sqrt(sum(x * x for x in a))
    norm_b = math.sqrt(sum(x * x for x in b))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot / (norm_a * norm_b)


def _find_near_duplicate(
    conn: sqlite3.Connection,
    content: str,
    embedding: Optional[list[float]] = None,
) -> Optional[tuple[Optional[sqlite3.Row], Optional[str]]]:
    """Find near-duplicate memories via word overlap and cosine similarity.

    Returns (row, action) where action is:
      - "reinforce" if cosine > 0.90 (auto-reinforce)
      - "warn" if cosine 0.85-0.90 or word overlap > 0.90
      - None if no near-duplicate found

    When cosine data is unavailable, falls back to word-overlap only (warns).
    """
    best_row: Optional[sqlite3.Row] = None
    best_action: Optional[str] = None

    # Cosine-based dedup when embeddings available
    if embedding and _vec_available:
        candidates = conn.execute(
            "SELECT * FROM memories WHERE active = 1 AND embedding IS NOT NULL"
        ).fetchall()
        for row in candidates:
            blob = row["embedding"]
            if not blob:
                continue
            other_emb = list(struct.unpack(f"<{len(blob)//4}f", blob))
            sim = _cosine_similarity(embedding, other_emb)
            if sim > 0.90:
                return (row, "reinforce")
            elif sim > 0.85:
                best_row = row
                best_action = "warn"

    if best_row is not None:
        return (best_row, best_action)

    # Fallback: word-overlap based near-duplicate detection
    words = set(content.strip().lower().split())
    if not words:
        return None
    candidates = conn.execute(
        "SELECT * FROM memories WHERE active = 1"
    ).fetchall()
    for row in candidates:
        other_words = set(row["content"].strip().lower().split())
        if not other_words:
            continue
        overlap = len(words & other_words) / max(len(words | other_words), 1)
        if overlap > 0.90:
            return (row, "warn")
    return None


def get_by_id(conn: sqlite3.Connection, memory_id: str) -> Optional[MemoryEntry]:
    row = conn.execute("SELECT * FROM memories WHERE id = ?", (memory_id,)).fetchone()
    if not row:
        return None
    conn.execute(
        "UPDATE memories SET access_count = access_count + 1 WHERE id = ?",
        (memory_id,),
    )
    conn.commit()
    return _row_to_entry(row)


def forget(
    conn: sqlite3.Connection,
    memory_id: str,
    *,
    superseded_by: Optional[str] = None,
) -> bool:
    row = conn.execute("SELECT id FROM memories WHERE id = ?", (memory_id,)).fetchone()
    if not row:
        return False
    conn.execute(
        "UPDATE memories SET active = 0, superseded_by = ?, updated_at = ? WHERE id = ?",
        (superseded_by, _now_iso(), memory_id),
    )
    conn.commit()
    return True


def tag(
    conn: sqlite3.Connection,
    memory_id: str,
    *,
    add: Optional[list[str]] = None,
    remove: Optional[list[str]] = None,
) -> Optional[list[str]]:
    row = conn.execute("SELECT tags FROM memories WHERE id = ?", (memory_id,)).fetchone()
    if not row:
        return None
    current: list[str] = json.loads(row["tags"])
    if add:
        for t in add:
            if t not in current:
                current.append(t)
    if remove:
        current = [t for t in current if t not in remove]
    conn.execute(
        "UPDATE memories SET tags = ?, updated_at = ? WHERE id = ?",
        (json.dumps(current), _now_iso(), memory_id),
    )
    conn.commit()
    return current


def mark_contradiction(
    conn: sqlite3.Connection,
    memory_id_a: str,
    memory_id_b: str,
) -> None:
    """Record a bidirectional contradiction between two memories.

    Updates the JSON contradicts array on both rows. Idempotent — re-marking
    the same pair is a no-op. Raises ValueError if either id is unknown.
    Advisory only: no trust demotion or deactivation occurs.
    """
    rows = conn.execute(
        "SELECT id, contradicts FROM memories WHERE id IN (?, ?)",
        (memory_id_a, memory_id_b),
    ).fetchall()
    by_id = {r["id"]: r for r in rows}
    if memory_id_a not in by_id:
        raise ValueError(f"unknown memory id: {memory_id_a}")
    if memory_id_b not in by_id:
        raise ValueError(f"unknown memory id: {memory_id_b}")
    if memory_id_a == memory_id_b:
        raise ValueError("cannot mark a memory as contradicting itself")

    now = _now_iso()
    for self_id, other_id in [(memory_id_a, memory_id_b), (memory_id_b, memory_id_a)]:
        current: list[str] = json.loads(by_id[self_id]["contradicts"])
        if other_id in current:
            continue
        current.append(other_id)
        conn.execute(
            "UPDATE memories SET contradicts = ?, updated_at = ? WHERE id = ?",
            (json.dumps(current), now, self_id),
        )
    conn.commit()


def reinforce(
    conn: sqlite3.Connection,
    memory_id: str,
    *,
    session_id: str,
    context: Optional[str] = None,
) -> None:
    now = _now_iso()
    conn.execute(
        "INSERT INTO reinforcements (memory_id, session_id, timestamp, context) VALUES (?, ?, ?, ?)",
        (memory_id, session_id, now, context),
    )
    conn.execute(
        "UPDATE memories SET strength = strength + 1, updated_at = ? WHERE id = ?",
        (now, memory_id),
    )
    conn.commit()


def prune(
    conn: sqlite3.Connection,
    *,
    dry_run: bool = True,
    max_age_days: int = 180,
    min_access_count: int = 2,
) -> list[dict]:
    """Identify and optionally archive stale memories.

    A memory is prunable when active=1, trust='low', strength=1, and either
    older than max_age_days or access_count < min_access_count. When
    dry_run=False, matching memories are deactivated (active=0).
    """
    cutoff = (datetime.now(timezone.utc) - timedelta(days=max_age_days)).isoformat()
    rows = conn.execute(
        """SELECT id, content, created_at, access_count, trust
           FROM memories
           WHERE active = 1
             AND trust = 'low'
             AND strength = 1
             AND (created_at < ? OR access_count < ?)""",
        (cutoff, min_access_count),
    ).fetchall()

    candidates = [
        {
            "id": r["id"],
            "content": r["content"][:100],
            "created_at": r["created_at"],
            "access_count": r["access_count"],
            "trust": r["trust"],
        }
        for r in rows
    ]

    if not dry_run and candidates:
        ids = [c["id"] for c in candidates]
        now = _now_iso()
        placeholders = ",".join(["?"] * len(ids))
        conn.execute(
            f"UPDATE memories SET active = 0, updated_at = ? WHERE id IN ({placeholders})",
            (now, *ids),
        )
        conn.commit()

    return candidates


def stats(conn: sqlite3.Connection) -> StatsResponse:
    total_active = conn.execute("SELECT COUNT(*) FROM memories WHERE active = 1").fetchone()[0]
    total_superseded = conn.execute("SELECT COUNT(*) FROM memories WHERE active = 0").fetchone()[0]

    by_category = {}
    for row in conn.execute(
        "SELECT category, COUNT(*) as cnt FROM memories WHERE active = 1 GROUP BY category"
    ):
        by_category[row["category"]] = row["cnt"]

    by_trust = {}
    for row in conn.execute(
        "SELECT trust, COUNT(*) as cnt FROM memories WHERE active = 1 GROUP BY trust"
    ):
        by_trust[row["trust"]] = row["cnt"]

    oldest_row = conn.execute(
        "SELECT MIN(created_at) as oldest FROM memories WHERE active = 1"
    ).fetchone()
    newest_row = conn.execute(
        "SELECT MAX(created_at) as newest FROM memories WHERE active = 1"
    ).fetchone()

    total_reinforcements = conn.execute("SELECT COUNT(*) FROM reinforcements").fetchone()[0]

    oldest = datetime.fromisoformat(oldest_row["oldest"]) if oldest_row["oldest"] else None
    newest = datetime.fromisoformat(newest_row["newest"]) if newest_row["newest"] else None

    return StatsResponse(
        total_active=total_active,
        total_superseded=total_superseded,
        by_category=by_category,
        by_trust=by_trust,
        oldest=oldest,
        newest=newest,
        total_reinforcements=total_reinforcements,
    )


def search_fts(
    conn: sqlite3.Connection,
    query: str,
    *,
    limit: int = 10,
    category: Optional[Category] = None,
    active_only: bool = True,
) -> list[tuple[MemoryEntry, float]]:
    fts_query = _sanitize_fts_query(query)
    if not fts_query:
        return []

    sql = """
        SELECT m.*, bm25(memories_fts) as score
        FROM memories_fts f
        JOIN memories m ON m.rowid = f.rowid
        WHERE memories_fts MATCH ?
    """
    params: list = [fts_query]

    if active_only:
        sql += " AND m.active = 1"
    if category:
        sql += " AND m.category = ?"
        params.append(category.value)

    sql += " ORDER BY score LIMIT ?"
    params.append(limit)

    rows = conn.execute(sql, params).fetchall()
    results = []
    for row in rows:
        entry = _row_to_entry(row)
        results.append((entry, abs(row["score"])))
    return results


def search_vec(
    conn: sqlite3.Connection,
    query_embedding: list[float],
    *,
    limit: int = 10,
    category: Optional[Category] = None,
    active_only: bool = True,
) -> list[tuple[MemoryEntry, float]]:
    """Cosine similarity search via sqlite-vec.

    Returns list of (MemoryEntry, cosine_distance) tuples, ordered by
    ascending distance (most similar first). Returns empty list if
    sqlite-vec is unavailable.
    """
    if not _vec_available:
        return []

    query_blob = _embedding_to_blob(query_embedding)

    # Fetch more candidates than limit to allow for filtering
    fetch_limit = limit * 3 if (category or active_only) else limit

    sql = """
        SELECT v.rowid, v.distance
        FROM memories_vec v
        WHERE v.embedding MATCH ?
        ORDER BY v.distance
        LIMIT ?
    """
    vec_rows = conn.execute(sql, (query_blob, fetch_limit)).fetchall()

    results: list[tuple[MemoryEntry, float]] = []
    for vrow in vec_rows:
        row = conn.execute(
            "SELECT * FROM memories WHERE rowid = ?", (vrow[0],)
        ).fetchone()
        if not row:
            continue
        if active_only and not row["active"]:
            continue
        if category and row["category"] != category.value:
            continue
        entry = _row_to_entry(row)
        results.append((entry, vrow[1]))
        if len(results) >= limit:
            break

    return results


_TRUST_RANK = {"high": 3, "medium": 2, "low": 1}


def search_hybrid(
    conn: sqlite3.Connection,
    query: str,
    query_embedding: Optional[list[float]] = None,
    *,
    limit: int = 10,
    category: Optional[Category] = None,
    active_only: bool = True,
    alpha: float = 0.4,
    k: int = 60,
) -> list[tuple[MemoryEntry, float, str]]:
    """Hybrid search combining FTS5 and vector results via Reciprocal Rank Fusion.

    score = alpha/(k + fts_rank) + (1-alpha)/(k + vec_rank)

    When query_embedding is None or vec is unavailable, falls back to FTS5-only.
    When FTS5 returns nothing but vec does, uses vec-only.

    Returns list of (MemoryEntry, rrf_score, match_type) tuples.
    match_type is "hybrid", "fts5", or "vector".
    """
    fts_results = search_fts(conn, query, limit=limit * 2, category=category, active_only=active_only)
    vec_results: list[tuple[MemoryEntry, float]] = []

    if query_embedding and _vec_available:
        vec_results = search_vec(conn, query_embedding, limit=limit * 2, category=category, active_only=active_only)

    # No results from either source
    if not fts_results and not vec_results:
        return []

    # FTS5-only fallback
    if not vec_results:
        return [(entry, score, "fts5") for entry, score in fts_results[:limit]]

    # Vector-only fallback
    if not fts_results:
        return [(entry, score, "vector") for entry, score in vec_results[:limit]]

    # Build rank maps (1-indexed)
    fts_ranks: dict[str, int] = {}
    fts_entries: dict[str, MemoryEntry] = {}
    for rank, (entry, _score) in enumerate(fts_results, start=1):
        fts_ranks[entry.id] = rank
        fts_entries[entry.id] = entry

    vec_ranks: dict[str, int] = {}
    vec_entries: dict[str, MemoryEntry] = {}
    for rank, (entry, _score) in enumerate(vec_results, start=1):
        vec_ranks[entry.id] = rank
        vec_entries[entry.id] = entry

    # Compute RRF scores for all unique IDs
    all_ids = set(fts_ranks.keys()) | set(vec_ranks.keys())
    scored: list[tuple[str, float]] = []
    for mem_id in all_ids:
        rrf = 0.0
        if mem_id in fts_ranks:
            rrf += alpha / (k + fts_ranks[mem_id])
        if mem_id in vec_ranks:
            rrf += (1 - alpha) / (k + vec_ranks[mem_id])
        scored.append((mem_id, rrf))

    # Sort by RRF score descending, then tiebreak
    def sort_key(item: tuple[str, float]):
        mem_id, rrf = item
        entry = fts_entries.get(mem_id) or vec_entries[mem_id]
        trust_rank = _TRUST_RANK.get(entry.trust.value, 0)
        return (-rrf, -trust_rank, -entry.strength, -entry.updated_at.timestamp())

    scored.sort(key=sort_key)

    # Apply trust tiebreaking: within 0.05 RRF tolerance, re-sort by trust then strength then recency
    results: list[tuple[MemoryEntry, float, str]] = []
    for mem_id, rrf in scored[:limit]:
        entry = fts_entries.get(mem_id) or vec_entries[mem_id]
        if mem_id in fts_ranks and mem_id in vec_ranks:
            match_type = "hybrid"
        elif mem_id in fts_ranks:
            match_type = "fts5"
        else:
            match_type = "vector"
        results.append((entry, rrf, match_type))

    return results


def search_all(
    project_conn: sqlite3.Connection,
    global_conn: sqlite3.Connection,
    query: str,
    query_embedding: Optional[list[float]] = None,
    *,
    limit: int = 10,
    category: Optional[Category] = None,
    active_only: bool = True,
    alpha: float = 0.4,
    k: int = 60,
) -> list[tuple[MemoryEntry, float, str]]:
    """Fan out a hybrid search to project and global stores, then merge.

    Each store is searched independently via search_hybrid; results are merged
    using RRF over each item's rank within its source list. On equal RRF score
    project entries rank higher than global entries.
    """
    proj_results = search_hybrid(
        project_conn, query, query_embedding,
        limit=limit * 2, category=category, active_only=active_only,
        alpha=alpha, k=k,
    )
    glob_results = search_hybrid(
        global_conn, query, query_embedding,
        limit=limit * 2, category=category, active_only=active_only,
        alpha=alpha, k=k,
    )

    # source_pref: 0 = project, 1 = global. Lower wins on RRF tie.
    combined: list[tuple[MemoryEntry, float, str, int]] = []
    for rank, (entry, _score, mt) in enumerate(proj_results, start=1):
        combined.append((entry, 1.0 / (k + rank), mt, 0))
    for rank, (entry, _score, mt) in enumerate(glob_results, start=1):
        combined.append((entry, 1.0 / (k + rank), mt, 1))

    combined.sort(key=lambda item: (-item[1], item[3]))
    return [(entry, rrf, mt) for entry, rrf, mt, _ in combined[:limit]]


def export_memories(
    conn: sqlite3.Connection,
    *,
    category: Optional[Category] = None,
) -> str:
    """Export active memories to human-readable markdown.

    Groups memories by category. When category is specified, only that
    category is exported.
    """
    sql = "SELECT * FROM memories WHERE active = 1"
    params: list = []
    if category:
        sql += " AND category = ?"
        params.append(category.value)
    sql += " ORDER BY category, created_at"

    rows = conn.execute(sql, params).fetchall()
    if not rows:
        return "# Memory Export\n\nNo active memories.\n"

    # Group by category
    grouped: dict[str, list[sqlite3.Row]] = {}
    for row in rows:
        cat = row["category"]
        if cat not in grouped:
            grouped[cat] = []
        grouped[cat].append(row)

    lines: list[str] = ["# Memory Export\n"]

    for cat_name in sorted(grouped.keys()):
        lines.append(f"# {cat_name.capitalize()}\n")
        for row in grouped[cat_name]:
            entry = _row_to_entry(row)
            tags_list = entry.tags
            summary = entry.content[:50]
            trust_val = entry.trust.value

            lines.append(f"## [{cat_name}] {summary} ({trust_val})\n")
            lines.append(f"**Content:** {entry.content}")
            lines.append(f"- **ID:** {entry.id}")
            lines.append(f"- **Trust:** {trust_val}")
            lines.append(f"- **Strength:** {entry.strength}")
            if tags_list:
                lines.append(f"- **Tags:** {', '.join(tags_list)}")
            lines.append(f"- **Created:** {entry.created_at.isoformat()}")
            if entry.context:
                lines.append(f"- **Context:** {entry.context}")

            # Count reinforcements
            r_count = conn.execute(
                "SELECT COUNT(*) FROM reinforcements WHERE memory_id = ?",
                (entry.id,),
            ).fetchone()[0]
            suffix = "time" if r_count == 1 else "times"
            lines.append(f"- **Reinforced:** {r_count} {suffix}")
            lines.append("")

    return "\n".join(lines)


def import_memories(
    conn: sqlite3.Connection,
    markdown: str,
    *,
    mode: str = "merge",
) -> dict:
    """Import memories from exported markdown format.

    Args:
        conn: Database connection.
        markdown: Exported markdown string.
        mode: 'merge' (add new, reinforce duplicates) or 'replace'
              (deactivate all existing, then load fresh).

    Returns:
        dict with keys: imported (int), reinforced (int), errors (list[str]).
    """
    if not markdown or not markdown.strip():
        return {"imported": 0, "reinforced": 0, "errors": []}

    if mode == "replace":
        conn.execute(
            "UPDATE memories SET active = 0, updated_at = ? WHERE active = 1",
            (_now_iso(),),
        )
        conn.commit()

    entries = _parse_export_markdown(markdown)
    imported = 0
    reinforced = 0
    errors: list[str] = []

    for entry_data in entries:
        try:
            cat_str = entry_data.get("category", "fact")
            try:
                cat = Category(cat_str)
            except ValueError:
                errors.append(f"Invalid category '{cat_str}' for entry: {entry_data.get('content', '')[:50]}")
                continue

            trust_str = entry_data.get("trust", "medium")
            try:
                trust = Trust(trust_str)
            except ValueError:
                errors.append(f"Invalid trust '{trust_str}' for entry: {entry_data.get('content', '')[:50]}")
                continue

            result = store(
                conn,
                entry_data["content"],
                context=entry_data.get("context"),
                category=cat,
                trust=trust,
                source=Source.IMPORTED,
                tags=entry_data.get("tags", []),
            )

            if result.action == "created":
                imported += 1
            elif result.action == "reinforced":
                reinforced += 1
        except Exception as e:
            errors.append(f"Error importing entry: {e}")

    return {"imported": imported, "reinforced": reinforced, "errors": errors}


import re

_HEADING_RE = re.compile(r"^##\s+\[(\w+)\]\s+.+\((\w+)\)\s*$")


def _parse_export_markdown(markdown: str) -> list[dict]:
    """Parse exported markdown into a list of entry dicts.

    Each entry dict has: content, category, trust, tags, context.
    """
    entries: list[dict] = []
    current: Optional[dict] = None

    for line in markdown.split("\n"):
        heading_match = _HEADING_RE.match(line)
        if heading_match:
            if current and current.get("content"):
                entries.append(current)
            current = {
                "category": heading_match.group(1),
                "trust": heading_match.group(2),
                "tags": [],
                "context": None,
                "content": None,
            }
            continue

        if current is None:
            continue

        if line.startswith("**Content:** "):
            current["content"] = line[len("**Content:** "):]
        elif line.startswith("- **Tags:** "):
            tags_str = line[len("- **Tags:** "):]
            current["tags"] = [t.strip() for t in tags_str.split(",") if t.strip()]
        elif line.startswith("- **Context:** "):
            current["context"] = line[len("- **Context:** "):]

    # Don't forget the last entry
    if current and current.get("content"):
        entries.append(current)

    return entries


def _sanitize_fts_query(query: str) -> str:
    tokens = query.strip().split()
    safe = [t for t in tokens if t and not any(c in t for c in '()"*:')]
    if not safe:
        return ""
    return " OR ".join(safe)
