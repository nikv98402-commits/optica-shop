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


def validate_run(
    output_dir: Path,
    accepted_licenses: set[str],
    *,
    min_accepted: int = 0,
    min_candidates: int = 0,
) -> dict[str, Any]:
    if min_accepted < 0:
        raise ValueError("min_accepted must be zero or greater")
    if min_candidates < 0:
        raise ValueError("min_candidates must be zero or greater")
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
    stats = json.loads((output_dir / "stats.json").read_text(encoding="utf-8"))
    candidate_count = int(manifest["selection"]["candidate_count"])
    failures = []
    if candidate_count < min_candidates:
        failures.append(
            {
                "code": "candidate_count_below_minimum",
                "actual": candidate_count,
                "required": min_candidates,
            }
        )
    if len(document_ids) < min_accepted:
        failures.append(
            {
                "code": "accepted_count_below_minimum",
                "actual": len(document_ids),
                "required": min_accepted,
            }
        )
    report = {
        "valid": not failures,
        "accepted_documents": len(document_ids),
        "candidate_documents": candidate_count,
        "chunks": len(chunks),
        "verified_hashes": len(manifest["files"]),
        "required_minimums": {
            "accepted": min_accepted,
            "candidates": min_candidates,
        },
        "failures": failures,
        "diagnostics": {
            "raw_read_count": stats["raw_read_count"],
            "prefilter_skipped_count": stats["prefilter_skipped_count"],
            "prefilter_reasons": stats["prefilter_reasons"],
            "source_exhausted": stats["source_exhausted"],
            "downstream_reasons": stats["downstream_reasons"],
        },
    }
    _write_validation_report(output_dir / "validation-report.json", report)
    if failures:
        summary = "; ".join(
            f"{failure['code']}: {failure['actual']} < {failure['required']}"
            for failure in failures
        )
        raise ValueError(f"acceptance thresholds failed: {summary}")
    return report


def _write_validation_report(path: Path, report: dict[str, Any]) -> None:
    temporary = path.with_suffix(".tmp")
    temporary.write_text(
        json.dumps(report, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
        newline="\n",
    )
    temporary.replace(path)
