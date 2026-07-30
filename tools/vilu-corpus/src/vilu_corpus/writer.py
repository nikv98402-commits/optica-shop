from __future__ import annotations

import csv
import hashlib
import json
from dataclasses import asdict
from pathlib import Path
from typing import Any

import pyarrow as pa
import pyarrow.parquet as pq

from .models import Decision, Duplicate, ProcessedDocument


def write_outputs(
    output_dir: Path,
    *,
    documents: list[ProcessedDocument],
    review: list[Decision],
    rejected: list[Decision],
    duplicates: list[Duplicate],
    pipeline_version: str,
    config_hash: str,
    taxonomy_hash: str,
    source: dict[str, Any],
    input_count: int,
    raw_read_count: int,
    scan_limit: int,
    candidate_limit: int,
    source_exhausted: bool,
    prefilter_reasons: dict[str, int],
    chunk_config: dict[str, int],
) -> dict[str, Any]:
    output_dir.mkdir(parents=True, exist_ok=True)
    ordered_documents = sorted(documents, key=lambda item: item.document_id)
    write_jsonl(output_dir / "documents.jsonl", [item.to_dict() for item in ordered_documents])
    write_parquet(output_dir / "documents.parquet", [item.to_dict() for item in ordered_documents])

    chunks = []
    for document in ordered_documents:
        for index, text in enumerate(
            chunk_text(
                document.clean_text,
                max_chars=int(chunk_config["max_chars"]),
                overlap_chars=int(chunk_config["overlap_chars"]),
            )
        ):
            chunks.append(
                {
                    "chunk_id": f"{document.document_id}:{index:05d}",
                    "document_id": document.document_id,
                    "chunk_index": index,
                    "language": document.language,
                    "topics": document.topics,
                    "text": text,
                    "text_sha256": hashlib.sha256(text.encode("utf-8")).hexdigest(),
                }
            )
    write_parquet(output_dir / "chunks.parquet", chunks)
    _write_review_csv(output_dir / "review.csv", review)
    write_jsonl(output_dir / "rejected.jsonl", [_safe_decision(item) for item in rejected])
    write_parquet(output_dir / "duplicates.parquet", [asdict(item) for item in duplicates])
    _write_licenses(output_dir / "licenses.csv", ordered_documents)
    _write_taxonomy_coverage(output_dir / "taxonomy_coverage.csv", ordered_documents)

    stats = {
        "raw_read_count": raw_read_count,
        "input_count": input_count,
        "prefilter_skipped_count": raw_read_count - input_count,
        "prefilter_reasons": dict(sorted(prefilter_reasons.items())),
        "source_exhausted": source_exhausted,
        "accepted_count": len(ordered_documents),
        "review_count": len(review),
        "rejected_count": len(rejected),
        "downstream_reasons": {
            "review": _reason_counts(review),
            "rejected": _reason_counts(rejected),
        },
        "duplicate_count": len(duplicates),
        "chunk_count": len(chunks),
        "languages": _counts(item.language for item in ordered_documents),
        "licenses": _counts(item.license for item in ordered_documents),
        "topics": _counts(topic for item in ordered_documents for topic in item.topics),
    }
    _write_json(output_dir / "stats.json", stats)

    hashed_files = [
        "documents.jsonl",
        "documents.parquet",
        "chunks.parquet",
        "review.csv",
        "rejected.jsonl",
        "duplicates.parquet",
        "licenses.csv",
        "taxonomy_coverage.csv",
        "stats.json",
    ]
    manifest = {
        "pipeline_version": pipeline_version,
        "config_sha256": config_hash,
        "taxonomy_sha256": taxonomy_hash,
        "source": {
            "kind": source["kind"],
            "repository": source.get("repository"),
            "revision": source.get("revision"),
            "split": source.get("split"),
        },
        "input_count": input_count,
        "selection": {
            "raw_read_limit": scan_limit,
            "raw_read_count": raw_read_count,
            "candidate_limit": candidate_limit,
            "candidate_count": input_count,
            "source_exhausted": source_exhausted,
            "prefilter_skipped_count": raw_read_count - input_count,
            "prefilter_reasons": dict(sorted(prefilter_reasons.items())),
        },
        "files": {name: file_sha256(output_dir / name) for name in hashed_files},
    }
    _write_json(output_dir / "manifest.json", manifest)
    write_run_readme(output_dir, stats, manifest)
    return manifest


def write_parquet(path: Path, rows: list[dict[str, Any]]) -> None:
    if rows:
        table = pa.Table.from_pylist(rows)
    else:
        table = pa.table({"empty": pa.array([], type=pa.string())})
    pq.write_table(table, path, compression="zstd", write_statistics=True)


def write_jsonl(path: Path, rows: list[dict[str, Any]]) -> None:
    with path.open("w", encoding="utf-8", newline="\n") as handle:
        for row in rows:
            handle.write(json.dumps(row, ensure_ascii=False, sort_keys=True, separators=(",", ":")))
            handle.write("\n")


def chunk_text(text: str, *, max_chars: int, overlap_chars: int) -> list[str]:
    if max_chars <= 0 or overlap_chars < 0 or overlap_chars >= max_chars:
        raise ValueError("invalid chunking configuration")
    paragraphs = [paragraph.strip() for paragraph in text.split("\n\n") if paragraph.strip()]
    chunks: list[str] = []
    current = ""
    for paragraph in paragraphs:
        units = _split_long(paragraph, max_chars)
        for unit in units:
            candidate = f"{current}\n\n{unit}".strip() if current else unit
            if len(candidate) <= max_chars:
                current = candidate
                continue
            if current:
                chunks.append(current)
                prefix = current[-overlap_chars:].lstrip() if overlap_chars else ""
                overlapped = f"{prefix}\n\n{unit}".strip() if prefix else unit
                current = overlapped if len(overlapped) <= max_chars else unit
            else:
                current = unit
    if current:
        chunks.append(current)
    return chunks


def file_sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def write_run_readme(output_dir: Path, stats: dict[str, Any], manifest: dict[str, Any]) -> None:
    source = manifest["source"]
    text = (
        "# ViLu corpus run\n\n"
        "This directory is a protected build artifact. It must not be committed or published "
        "with the frontend.\n\n"
        f"- Raw records read: {stats['raw_read_count']}\n"
        f"- Input records: {stats['input_count']}\n"
        f"- Prefiltered before pilot: {stats['prefilter_skipped_count']}\n"
        f"- Source exhausted before candidate limit: {stats['source_exhausted']}\n"
        f"- Accepted: {stats['accepted_count']}\n"
        f"- Review: {stats['review_count']}\n"
        f"- Rejected: {stats['rejected_count']}\n"
        f"- Duplicates removed: {stats['duplicate_count']}\n"
        f"- Source: `{source.get('repository') or source['kind']}`\n"
        f"- Revision: `{source.get('revision') or 'fixture'}`\n"
        f"- Config SHA-256: `{manifest['config_sha256']}`\n"
        f"- Taxonomy SHA-256: `{manifest['taxonomy_sha256']}`\n"
    )
    (output_dir / "README.md").write_text(text, encoding="utf-8", newline="\n")


def _safe_decision(decision: Decision) -> dict[str, Any]:
    metadata = dict(decision.metadata)
    if decision.document:
        metadata.update(
            {
                "identifier": decision.document.source_identifier,
                "title": decision.document.title,
                "license": decision.document.license,
                "language": decision.document.language,
                "content_sha256": decision.document.content_sha256,
            }
        )
    return {"status": decision.status.value, "reasons": sorted(decision.reasons), **metadata}


def _write_review_csv(path: Path, decisions: list[Decision]) -> None:
    fields = ["identifier", "title", "language", "license", "reasons", "content_sha256"]
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields)
        writer.writeheader()
        for decision in sorted(decisions, key=lambda item: _safe_decision(item).get("identifier", "")):
            row = _safe_decision(decision)
            writer.writerow(
                {
                    "identifier": row.get("identifier", ""),
                    "title": row.get("title", ""),
                    "language": row.get("language", ""),
                    "license": row.get("license", ""),
                    "reasons": "|".join(row["reasons"]),
                    "content_sha256": row.get("content_sha256", ""),
                }
            )


def _write_licenses(path: Path, documents: list[ProcessedDocument]) -> None:
    counts = _counts(item.license for item in documents)
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.writer(handle)
        writer.writerow(["license", "document_count"])
        writer.writerows(sorted(counts.items()))


def _write_taxonomy_coverage(path: Path, documents: list[ProcessedDocument]) -> None:
    counts = _counts(topic for item in documents for topic in item.topics)
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.writer(handle)
        writer.writerow(["topic", "document_count"])
        writer.writerows(sorted(counts.items()))


def _counts(values: Any) -> dict[str, int]:
    result: dict[str, int] = {}
    for value in values:
        result[str(value)] = result.get(str(value), 0) + 1
    return dict(sorted(result.items()))


def _reason_counts(decisions: list[Decision]) -> dict[str, int]:
    return _counts(reason for decision in decisions for reason in decision.reasons)


def _write_json(path: Path, value: Any) -> None:
    path.write_text(
        json.dumps(value, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
        newline="\n",
    )


def _split_long(text: str, max_chars: int) -> list[str]:
    if len(text) <= max_chars:
        return [text]
    words = text.split()
    result: list[str] = []
    current: list[str] = []
    length = 0
    for word in words:
        if len(word) > max_chars:
            if current:
                result.append(" ".join(current))
                current = []
                length = 0
            result.extend(word[index : index + max_chars] for index in range(0, len(word), max_chars))
            continue
        if current and length + len(word) + 1 > max_chars:
            result.append(" ".join(current))
            current = []
            length = 0
        current.append(word)
        length += len(word) + (1 if length else 0)
    if current:
        result.append(" ".join(current))
    return result
