from __future__ import annotations

import hashlib
from collections import defaultdict
from dataclasses import dataclass

from .clean import normalized_for_hash
from .models import Duplicate, ProcessedDocument

_MAX_HASH = (1 << 64) - 1


@dataclass(slots=True)
class DedupeResult:
    documents: list[ProcessedDocument]
    duplicates: list[Duplicate]


def deduplicate(
    documents: list[ProcessedDocument],
    *,
    shingle_size: int,
    permutations: int,
    bands: int,
    similarity_threshold: float,
) -> DedupeResult:
    exact_seen: dict[str, str] = {}
    content_seen: dict[str, str] = {}
    unique: list[ProcessedDocument] = []
    duplicates: list[Duplicate] = []

    for document in documents:
        if document.source_identifier in exact_seen:
            duplicates.append(
                Duplicate(document.document_id, exact_seen[document.source_identifier], "identifier", 1.0)
            )
            continue
        if document.content_sha256 in content_seen:
            duplicates.append(
                Duplicate(document.document_id, content_seen[document.content_sha256], "content_sha256", 1.0)
            )
            continue
        exact_seen[document.source_identifier] = document.document_id
        content_seen[document.content_sha256] = document.document_id
        unique.append(document)

    signatures = {
        document.document_id: minhash_signature(
            document.clean_text, shingle_size=shingle_size, permutations=permutations
        )
        for document in unique
    }
    candidates = lsh_candidates(signatures, bands=bands)
    removed: set[str] = set()
    for left_index, left in enumerate(unique):
        if left.document_id in removed:
            continue
        for right in unique[left_index + 1 :]:
            if right.document_id in removed:
                continue
            key = tuple(sorted((left.document_id, right.document_id)))
            if key not in candidates:
                continue
            similarity = jaccard(
                shingles(left.clean_text, shingle_size),
                shingles(right.clean_text, shingle_size),
            )
            if similarity >= similarity_threshold:
                removed.add(right.document_id)
                duplicates.append(
                    Duplicate(right.document_id, left.document_id, "minhash_lsh", round(similarity, 6))
                )
    kept = [document for document in unique if document.document_id not in removed]
    duplicates.sort(key=lambda item: (item.canonical_id, item.duplicate_id, item.kind))
    return DedupeResult(kept, duplicates)


def shingles(text: str, size: int) -> set[str]:
    tokens = normalized_for_hash(text).split()
    if len(tokens) < size:
        return {" ".join(tokens)} if tokens else set()
    return {" ".join(tokens[index : index + size]) for index in range(len(tokens) - size + 1)}


def minhash_signature(text: str, *, shingle_size: int, permutations: int) -> tuple[int, ...]:
    values = shingles(text, shingle_size)
    if not values:
        return tuple([_MAX_HASH] * permutations)
    signature: list[int] = []
    for seed in range(permutations):
        signature.append(
            min(
                int.from_bytes(
                    hashlib.blake2b(
                        value.encode("utf-8"),
                        digest_size=8,
                        person=seed.to_bytes(8, "little"),
                    ).digest(),
                    "big",
                )
                for value in values
            )
        )
    return tuple(signature)


def lsh_candidates(signatures: dict[str, tuple[int, ...]], *, bands: int) -> set[tuple[str, str]]:
    if not signatures:
        return set()
    signature_size = len(next(iter(signatures.values())))
    if bands <= 0 or signature_size % bands:
        raise ValueError("bands must divide the signature length")
    rows = signature_size // bands
    buckets: dict[tuple[int, tuple[int, ...]], list[str]] = defaultdict(list)
    for document_id, signature in signatures.items():
        for band in range(bands):
            start = band * rows
            buckets[(band, signature[start : start + rows])].append(document_id)
    candidates: set[tuple[str, str]] = set()
    for ids in buckets.values():
        ordered = sorted(ids)
        for index, left in enumerate(ordered):
            for right in ordered[index + 1 :]:
                candidates.add((left, right))
    return candidates


def jaccard(left: set[str], right: set[str]) -> float:
    if not left and not right:
        return 1.0
    return len(left & right) / len(left | right)
