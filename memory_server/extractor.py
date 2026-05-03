"""Transcript-to-memories extractor.

Calls a Qwen-style chat-completions endpoint to propose memory entries
from a session transcript. Output is intentionally low-trust and
inferred — the caller decides what to keep. Fails closed (returns []) on
any error: empty input, sidecar disabled, Qwen unavailable, malformed
response, or invalid entry shape.
"""

from __future__ import annotations

import json
import logging
from typing import Optional

import httpx
from pydantic import ValidationError

from config import SidecarConfig
from models import Category, MemoryEntry, Source, Trust

logger = logging.getLogger(__name__)


EXTRACTOR_PROMPT_TEMPLATE = """Extract durable memory entries from this conversation transcript.

A durable memory is a fact, preference, decision, or context that would be useful
to recall in a FUTURE session — not transient debugging chatter.

Respond with JSON ONLY, no prose:
{{
  "memories": [
    {{
      "content": "single atomic fact",
      "category": "fact|preference|correction|entity|custom",
      "context": "what triggered this memory",
      "tags": ["tag1", "tag2"]
    }}
  ]
}}

Transcript:
{transcript}"""


def extract_memories(
    transcript: str,
    config: SidecarConfig,
) -> list[MemoryEntry]:
    """Propose memory entries from a transcript via the Qwen sidecar.

    All output is forced to trust=low and source=inferred (deterministic
    boundary — caller cannot trust extracted memories without review).

    Returns [] when:
      - transcript is empty
      - sidecar is disabled
      - Qwen is unreachable / times out / returns non-200
      - response is not parseable JSON or missing the expected shape
    """
    if not transcript or not transcript.strip():
        return []
    if not config.enabled:
        return []

    raw = _call_qwen(transcript, config)
    if raw is None:
        return []

    proposals = _parse_proposals(raw)
    out: list[MemoryEntry] = []
    for p in proposals:
        entry = _build_entry(p)
        if entry is not None:
            out.append(entry)
    return out


def _call_qwen(transcript: str, config: SidecarConfig) -> Optional[str]:
    prompt = EXTRACTOR_PROMPT_TEMPLATE.format(transcript=transcript)
    try:
        response = httpx.post(
            config.endpoint,
            json={
                "model": config.model,
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.0,
            },
            timeout=config.timeout_ms / 1000.0,
        )
    except (httpx.ConnectError, httpx.TimeoutException, httpx.HTTPError) as e:
        logger.warning(f"Extractor Qwen unavailable: {e}")
        return None
    except Exception as e:
        logger.warning(f"Extractor Qwen call failed: {e}")
        return None

    if response.status_code != 200:
        logger.warning(f"Extractor sidecar returned {response.status_code}")
        return None

    try:
        return response.json()["choices"][0]["message"]["content"]
    except (KeyError, IndexError, ValueError, TypeError) as e:
        logger.warning(f"Extractor response shape malformed: {e}")
        return None


def _parse_proposals(raw_content: str) -> list[dict]:
    """Parse the Qwen response body into a list of proposal dicts.

    Tolerates leading/trailing prose: finds the first {...} JSON object.
    """
    text = raw_content.strip()
    # If the model wrapped JSON in fences or prose, try to isolate the object
    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1 or end < start:
        return []
    blob = text[start : end + 1]
    try:
        data = json.loads(blob)
    except json.JSONDecodeError:
        return []
    memories = data.get("memories")
    if not isinstance(memories, list):
        return []
    return [m for m in memories if isinstance(m, dict)]


def _build_entry(proposal: dict) -> Optional[MemoryEntry]:
    """Build a MemoryEntry with trust=low and source=inferred forced."""
    content = proposal.get("content")
    if not isinstance(content, str) or not content.strip():
        return None

    cat_raw = proposal.get("category", "fact")
    try:
        category = Category(cat_raw)
    except (ValueError, TypeError):
        return None

    tags = proposal.get("tags") or []
    if not isinstance(tags, list):
        tags = []
    tags = [t for t in tags if isinstance(t, str)]

    context = proposal.get("context")
    if context is not None and not isinstance(context, str):
        context = None

    try:
        return MemoryEntry(
            id=f"mem_proposed_{abs(hash(content)) % (10**12)}",
            content=content.strip(),
            context=context,
            category=category,
            trust=Trust.LOW,         # forced — deterministic boundary
            source=Source.INFERRED,  # forced — deterministic boundary
            tags=tags,
        )
    except ValidationError as e:
        logger.warning(f"Extractor entry validation failed: {e}")
        return None
