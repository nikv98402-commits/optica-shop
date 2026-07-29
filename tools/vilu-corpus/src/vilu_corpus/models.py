from __future__ import annotations

from dataclasses import asdict, dataclass, field
from enum import StrEnum
from typing import Any


class Status(StrEnum):
    ACCEPTED = "accepted"
    REVIEW = "review"
    REJECTED = "rejected"


@dataclass(slots=True)
class Candidate:
    identifier: str
    collection: str
    open_type: str
    curator: str
    license: str
    date: Any
    title: str
    creator: str
    language: str
    language_type: str
    word_count: int
    token_count: int
    text: str

    @classmethod
    def from_mapping(cls, value: dict[str, Any], required_fields: list[str]) -> "Candidate":
        missing = [field_name for field_name in required_fields if field_name not in value]
        if missing:
            raise ValueError(f"source schema missing fields: {', '.join(sorted(missing))}")
        return cls(
            identifier=str(value.get("identifier") or "").strip(),
            collection=str(value.get("collection") or "").strip(),
            open_type=str(value.get("open_type") or "").strip(),
            curator=str(value.get("curator") or "").strip(),
            license=str(value.get("license") or "").strip(),
            date=value.get("date"),
            title=str(value.get("title") or "").strip(),
            creator=str(value.get("creator") or "").strip(),
            language=str(value.get("language") or "").strip(),
            language_type=str(value.get("language_type") or "").strip(),
            word_count=_safe_int(value.get("word_count")),
            token_count=_safe_int(value.get("token_count")),
            text=str(value.get("text") or ""),
        )


@dataclass(slots=True)
class ProcessedDocument:
    document_id: str
    source_identifier: str
    collection: str
    open_type: str
    curator: str
    license: str
    year: int
    title: str
    creator: str
    language: str
    word_count: int
    token_count: int
    raw_text: str
    clean_text: str
    content_sha256: str
    topics: list[str]
    relevance_score: int
    reasons: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass(slots=True)
class Decision:
    status: Status
    reasons: list[str]
    document: ProcessedDocument | None = None
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass(slots=True)
class Duplicate:
    duplicate_id: str
    canonical_id: str
    kind: str
    similarity: float


def _safe_int(value: Any) -> int:
    try:
        return int(value or 0)
    except (TypeError, ValueError):
        return 0
