from __future__ import annotations

import csv
import json
from pathlib import Path
from typing import Any

import pyarrow.parquet as pq

from .writer import file_sha256

REQUIRED_OUTPUTS = {
    "documents.jsonl",
    "documents.parquet",
    "chunks.parquet",
    "review.csv",
    "rejected.jsonl",
    "duplicates.parquet",
    "licenses.csv",
    "taxonomy_coverage.csv",
    "stats.json",
    "manifest.json",
    "README.md",
}


def validate_run(output_dir: Path, accepted_licenses: set[str]) -> dict[str, Any]:
    missing = sorted(name for name in REQUIRED_OUTPUTS if not (output_dir / name).is_file())
    if missing:
        raise ValueError(f"run is missing outputs: {', '.join(missing)}")
    manifest = json.loads((output_dir / "manifest.json").read_text(encoding="utf-8"))
    for name, expected in manifest["files"].items():
        actual = file_sha256(output_dir / name)
        if actual != expected:
            raise ValueError(f"hash mismatch for {name}")

    document_ids: set[str] = set()
    content_hashes: set[str] = set()
    identifiers: set[str] = set()
    with (output_dir / "documents.jsonl").open("r", encoding="utf-8") as handle:
        for line in handle:
            row = json.loads(line)
            if row["license"] not in accepted_licenses:
                raise ValueError(f"unapproved license in accepted documents: {row['license']}")
            if row["document_id"] in document_ids:
                raise ValueError("duplicate document_id in accepted documents")
            if row["source_identifier"] in identifiers:
                raise ValueError("duplicate source identifier in accepted documents")
            if row["content_sha256"] in content_hashes:
                raise ValueError("duplicate content hash in accepted documents")
            document_ids.add(row["document_id"])
            identifiers.add(row["source_identifier"])
            content_hashes.add(row["content_sha256"])

    chunks = pq.read_table(output_dir / "chunks.parquet").to_pylist()
    if any(row.get("document_id") not in document_ids for row in chunks):
        raise ValueError("orphan chunk detected")
    with (output_dir / "licenses.csv").open("r", encoding="utf-8") as handle:
        license_rows = list(csv.DictReader(handle))
    if any(row["license"] not in accepted_licenses for row in license_rows):
        raise ValueError("license report contains an unapproved accepted license")
    return {
        "valid": True,
        "accepted_documents": len(document_ids),
        "chunks": len(chunks),
        "verified_hashes": len(manifest["files"]),
    }
