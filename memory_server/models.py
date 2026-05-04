from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


class Category(str, Enum):
    FACT = "fact"
    PREFERENCE = "preference"
    CORRECTION = "correction"
    ENTITY = "entity"
    CUSTOM = "custom"


class Trust(str, Enum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class Source(str, Enum):
    USER_EXPLICIT = "user-explicit"
    OBSERVED = "observed"
    INFERRED = "inferred"
    IMPORTED = "imported"
    CONSOLIDATED = "consolidated"


class MemoryEntry(BaseModel):
    id: str = Field(description="mem_<nanoid>")
    content: str
    context: Optional[str] = None
    category: Category = Category.FACT
    trust: Trust = Trust.MEDIUM
    strength: int = Field(default=1, ge=1)
    source: Optional[Source] = None
    source_session: Optional[str] = None
    tags: list[str] = Field(default_factory=list)
    active: bool = True
    superseded_by: Optional[str] = None
    contradicts: list[str] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    access_count: int = 0


class SearchResult(BaseModel):
    memory: MemoryEntry
    score: float
    match_type: str = "fts5"  # fts5 | vector | hybrid
    verified: Optional[bool] = None


class ReinforcementEntry(BaseModel):
    id: Optional[int] = None
    memory_id: str
    session_id: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    context: Optional[str] = None


class StoreResult(BaseModel):
    id: str
    action: str  # created | reinforced
    existing_id: Optional[str] = None
    warning: Optional[str] = None


class StatsResponse(BaseModel):
    total_active: int
    total_superseded: int
    by_category: dict[str, int]
    by_trust: dict[str, int]
    oldest: Optional[datetime] = None
    newest: Optional[datetime] = None
    total_reinforcements: int = 0
