from __future__ import annotations

import hashlib
import re
import unicodedata

_CONTROL = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")
_HORIZONTAL_SPACE = re.compile(r"[^\S\n]+")
_MANY_NEWLINES = re.compile(r"\n{3,}")


def clean_text(text: str) -> str:
    """Apply only reversible formatting cleanup; never translate or rewrite."""
    normalized = unicodedata.normalize("NFKC", text).replace("\r\n", "\n").replace("\r", "\n")
    normalized = _CONTROL.sub("", normalized)
    normalized = "\n".join(_HORIZONTAL_SPACE.sub(" ", line).strip() for line in normalized.split("\n"))
    return _MANY_NEWLINES.sub("\n\n", normalized).strip()


def normalized_for_hash(text: str) -> str:
    return " ".join(clean_text(text).casefold().split())


def content_hash(text: str) -> str:
    return hashlib.sha256(normalized_for_hash(text).encode("utf-8")).hexdigest()


def document_id(identifier: str, text_hash: str) -> str:
    payload = f"{identifier.strip()}:{text_hash}"
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()
