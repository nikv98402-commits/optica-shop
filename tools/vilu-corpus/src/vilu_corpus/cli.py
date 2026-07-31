from __future__ import annotations

import argparse
import json
import sys
from itertools import islice
from pathlib import Path
from typing import Any

from .config import canonical_hash, load_config, load_taxonomy
from .dedupe import deduplicate
from .models import Candidate, Decision, Status
from .probe import iter_source, probe_source
from .report import load_report
from .select import evaluate
from .validate import validate_run
from .writer import write_outputs

MODULE_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_CONFIG = MODULE_ROOT / "configs" / "corpus.yaml"
DEFAULT_TAXONOMY = MODULE_ROOT / "configs" / "taxonomy.yaml"


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="vilu-corpus")
    parser.add_argument("--config", default=str(DEFAULT_CONFIG))
    parser.add_argument("--taxonomy", default=str(DEFAULT_TAXONOMY))
    subparsers = parser.add_subparsers(dest="command", required=True)

    subparsers.add_parser("probe", help="Verify the pinned source schema without logging text")
    build = subparsers.add_parser("build", help="Build a deterministic bounded corpus run")
    build.add_argument("--limit", type=_positive_int, required=True)
    build.add_argument(
        "--scan-limit",
        type=_positive_int,
        help="Maximum raw source records to read before stopping (defaults to --limit)",
    )
    build.add_argument("--output", type=Path, required=True)
    validate = subparsers.add_parser("validate", help="Validate hashes, licenses and referential integrity")
    validate.add_argument("--output", type=Path, required=True)
    validate.add_argument("--min-accepted", type=_non_negative_int, default=0)
    validate.add_argument("--min-candidates", type=_non_negative_int, default=0)
    report = subparsers.add_parser("report", help="Print aggregate run metadata only")
    report.add_argument("--output", type=Path, required=True)
    return parser


def main(argv: list[str] | None = None) -> None:
    args = build_parser().parse_args(argv)
    try:
        config = load_config(args.config)
        taxonomy = load_taxonomy(args.taxonomy)
        if args.command == "probe":
            result = probe_source(_resolved_source(config.source, config.path.parent))
        elif args.command == "build":
            result = build_run(
                config.data,
                taxonomy,
                limit=args.limit,
                scan_limit=args.scan_limit or args.limit,
                output_dir=args.output.resolve(),
                config_hash=config.sha256,
                taxonomy_hash=canonical_hash(taxonomy),
                config_dir=config.path.parent,
            )
        elif args.command == "validate":
            result = validate_run(
                args.output.resolve(),
                set(str(item) for item in config.licenses["accepted"]),
                min_accepted=args.min_accepted,
                min_candidates=args.min_candidates,
            )
        else:
            result = load_report(args.output.resolve())
        print(json.dumps(result, ensure_ascii=False, indent=2, sort_keys=True))
    except Exception as error:  # CLI boundary: concise and never includes document text.
        print(f"vilu-corpus: {type(error).__name__}: {error}", file=sys.stderr)
        raise SystemExit(1) from error


def build_run(
    config: dict[str, Any],
    taxonomy: dict[str, Any],
    *,
    limit: int,
    scan_limit: int,
    output_dir: Path,
    config_hash: str,
    taxonomy_hash: str,
    config_dir: Path,
) -> dict[str, Any]:
    if scan_limit < limit:
        raise ValueError("scan_limit must be greater than or equal to limit")
    source = _resolved_source(config["source"], config_dir)
    required_fields = list(source["required_fields"])
    decisions: list[Decision] = []
    selection_rejected: list[Decision] = []
    raw_read_count = 0
    prefilter_reasons: dict[str, int] = {}
    reached_candidate_limit = False
    for mapping in islice(iter_source(source), scan_limit):
        raw_read_count += 1
        candidate = Candidate.from_mapping(mapping, required_fields)
        decision = evaluate(candidate, config, taxonomy)
        blockers = sorted(set(decision.reasons) & _PREFILTER_BLOCKERS)
        if blockers:
            for reason in blockers:
                prefilter_reasons[reason] = prefilter_reasons.get(reason, 0) + 1
            continue
        if decision.status is Status.REJECTED:
            selection_rejected.append(decision)
            for reason in decision.reasons:
                prefilter_reasons[reason] = prefilter_reasons.get(reason, 0) + 1
            continue
        decisions.append(decision)
        if len(decisions) == limit:
            reached_candidate_limit = True
            break
    if raw_read_count == 0:
        raise ValueError("source returned no records")

    input_count = len(decisions)
    accepted = [item.document for item in decisions if item.status is Status.ACCEPTED and item.document]
    review = [item for item in decisions if item.status is Status.REVIEW]
    rejected = selection_rejected
    near = config["pipeline"]["near_duplicate"]
    dedupe_result = deduplicate(
        accepted,
        shingle_size=int(near["shingle_size"]),
        permutations=int(near["permutations"]),
        bands=int(near["bands"]),
        similarity_threshold=float(near["similarity_threshold"]),
    )
    manifest = write_outputs(
        output_dir,
        documents=dedupe_result.documents,
        review=review,
        rejected=rejected,
        duplicates=dedupe_result.duplicates,
        pipeline_version=str(config["pipeline"]["version"]),
        config_hash=config_hash,
        taxonomy_hash=taxonomy_hash,
        source=source,
        input_count=input_count,
        raw_read_count=raw_read_count,
        scan_limit=scan_limit,
        candidate_limit=limit,
        source_exhausted=not reached_candidate_limit and raw_read_count < scan_limit,
        prefilter_reasons=prefilter_reasons,
        chunk_config=config["pipeline"]["chunking"],
    )
    return {
        "output": str(output_dir),
        "raw_read_count": raw_read_count,
        "input_count": input_count,
        "source_exhausted": not reached_candidate_limit and raw_read_count < scan_limit,
        "prefilter_skipped_count": raw_read_count - input_count,
        "accepted_count": len(dedupe_result.documents),
        "review_count": len(review),
        "rejected_count": len(rejected),
        "duplicate_count": len(dedupe_result.duplicates),
        "manifest_files": len(manifest["files"]),
    }


def _resolved_source(source: dict[str, Any], config_dir: Path) -> dict[str, Any]:
    result = dict(source)
    if result.get("kind") == "fixture":
        fixture_path = Path(str(result["path"]))
        if not fixture_path.is_absolute():
            result["path"] = str((config_dir / fixture_path).resolve())
    return result


def _positive_int(value: str) -> int:
    parsed = int(value)
    if parsed <= 0:
        raise argparse.ArgumentTypeError("must be greater than zero")
    return parsed


def _non_negative_int(value: str) -> int:
    parsed = int(value)
    if parsed < 0:
        raise argparse.ArgumentTypeError("must be zero or greater")
    return parsed


_PREFILTER_BLOCKERS = {
    "before_min_year",
    "excluded_phrase",
    "language_not_allowed",
    "not_open_science",
    "text_missing",
    "word_count_out_of_range",
}
