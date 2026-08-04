from __future__ import annotations

import argparse
import json
import math
import sys
import time
from datetime import UTC, datetime
from itertools import islice
from pathlib import Path
from typing import Any, TextIO

from .config import canonical_hash, load_config, load_taxonomy
from .dedupe import deduplicate
from .models import Candidate, Decision, Status
from .probe import iter_source, probe_source
from .report import load_report
from .score import compile_relevance
from .select import evaluate
from .validate import validate_run
from .writer import write_outputs

MODULE_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_CONFIG = MODULE_ROOT / "configs" / "corpus.yaml"
DEFAULT_TAXONOMY = MODULE_ROOT / "configs" / "taxonomy.yaml"

_BOUNDED_SELECTION_DEFAULTS = {
    "metadata_batch_size": 128,
    "forecast_after": 500,
    "min_accepted": 100,
    "runtime_budget_seconds": 4200.0,
    "confidence_z": 2.576,
}


class ReachabilityError(ValueError):
    """Bounded selection cannot meet its declared acceptance contract."""

    def __init__(self, projection: dict[str, Any]) -> None:
        self.projection = projection
        super().__init__(", ".join(projection["reason_codes"]))


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
    build.add_argument(
        "--progress-every",
        type=_positive_int,
        default=1000,
        help="Log aggregate progress after this many source records",
    )
    build.add_argument(
        "--checkpoint-every",
        type=_positive_int,
        default=5000,
        help="Write a metadata-only diagnostic checkpoint after this many source records",
    )
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
                progress_every=args.progress_every,
                checkpoint_every=args.checkpoint_every,
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
    progress_every: int = 1000,
    checkpoint_every: int = 5000,
    progress_stream: TextIO = sys.stderr,
) -> dict[str, Any]:
    if scan_limit < limit:
        raise ValueError("scan_limit must be greater than or equal to limit")
    source = _resolved_source(config["source"], config_dir)
    required_fields = list(source["required_fields"])
    relevance_policy = compile_relevance(taxonomy)
    decisions: list[Decision] = []
    selection_rejected: list[Decision] = []
    raw_read_count = 0
    prefilter_reasons: dict[str, int] = {}
    reached_candidate_limit = False
    reachability: dict[str, Any] | None = None
    phase = "selection"
    started_at = time.monotonic()
    output_dir.mkdir(parents=True, exist_ok=True)
    _write_checkpoint(
        output_dir,
        _checkpoint_payload(
            status="running",
            raw_read_count=0,
            scan_limit=scan_limit,
            candidate_count=0,
            candidate_limit=limit,
            decisions=decisions,
            rejected_count=0,
            prefilter_reasons=prefilter_reasons,
            elapsed_seconds=0.0,
            phase=phase,
        ),
    )

    def write_failure_checkpoint(error: BaseException) -> None:
        _write_checkpoint(
            output_dir,
            {
                **_checkpoint_payload(
                    status="failed",
                    raw_read_count=raw_read_count,
                    scan_limit=scan_limit,
                    candidate_count=len(decisions),
                    candidate_limit=limit,
                    decisions=decisions,
                    rejected_count=len(selection_rejected),
                    prefilter_reasons=prefilter_reasons,
                    elapsed_seconds=time.monotonic() - started_at,
                    phase=phase,
                    reachability=reachability,
                ),
                "error_type": type(error).__name__,
            },
        )

    try:
        bounded = _bounded_selection_policy(config)
        is_huggingface = source["kind"] == "huggingface"
        source_options: dict[str, Any] = {}
        if is_huggingface:
            # Cheap license/language/open-science/size predicates are pushed
            # into the Parquet scan by the pinned source configuration. Relevance
            # still needs the real document text; rejecting from title-only
            # metadata would create false negatives.
            phase = "filtered_relevance_scan"
            source_options = {
                "columns": required_fields,
                "batch_size": int(bounded["metadata_batch_size"]),
            }

        for mapping in islice(iter_source(source, **source_options), scan_limit):
            raw_read_count += 1
            candidate = Candidate.from_mapping(mapping, required_fields)
            decision = evaluate(
                candidate,
                config,
                taxonomy,
                relevance_policy=relevance_policy,
            )
            blockers = sorted(set(decision.reasons) & _PREFILTER_BLOCKERS)
            if blockers:
                for reason in blockers:
                    prefilter_reasons[reason] = prefilter_reasons.get(reason, 0) + 1
            elif decision.status is Status.REJECTED:
                selection_rejected.append(decision)
                for reason in decision.reasons:
                    prefilter_reasons[reason] = prefilter_reasons.get(reason, 0) + 1
            else:
                decisions.append(decision)
                if len(decisions) == limit:
                    reached_candidate_limit = True

            elapsed_seconds = time.monotonic() - started_at
            should_report = raw_read_count % progress_every == 0 or reached_candidate_limit
            should_checkpoint = (
                raw_read_count % checkpoint_every == 0 or reached_candidate_limit
            )
            if is_huggingface:
                forecast_after = int(bounded["forecast_after"])
                accepted_count = sum(
                    item.status is Status.ACCEPTED for item in decisions
                )
                runtime_budget_expired = (
                    elapsed_seconds >= float(bounded["runtime_budget_seconds"])
                    and not (
                        len(decisions) >= limit
                        and accepted_count >= int(bounded["min_accepted"])
                    )
                )
                should_forecast = raw_read_count >= forecast_after and (
                    reachability is None or should_report or should_checkpoint
                )
                should_forecast = should_forecast or runtime_budget_expired
                if should_forecast:
                    # Full-text evaluation has already happened, so REVIEW is a
                    # valid bounded candidate and ACCEPTED is an exact count rather
                    # than a title-only proxy.
                    reachability = _reachability_projection(
                        raw_read_count=raw_read_count,
                        candidate_count=len(decisions),
                        accepted_proxy_count=accepted_count,
                        candidate_target=limit,
                        accepted_target=int(bounded["min_accepted"]),
                        scan_limit=scan_limit,
                        elapsed_seconds=elapsed_seconds,
                        runtime_budget_seconds=float(bounded["runtime_budget_seconds"]),
                        confidence_z=float(bounded["confidence_z"]),
                    )
                    # The streamed dataset has a deterministic but non-random
                    # order. Statistical yield projections are therefore useful
                    # diagnostics, not proof that a later cluster cannot satisfy
                    # the target. Only exact scan/runtime bounds may terminate.

            payload = _checkpoint_payload(
                status="running",
                raw_read_count=raw_read_count,
                scan_limit=scan_limit,
                candidate_count=len(decisions),
                candidate_limit=limit,
                decisions=decisions,
                rejected_count=len(selection_rejected),
                prefilter_reasons=prefilter_reasons,
                elapsed_seconds=elapsed_seconds,
                phase=phase,
                reachability=reachability,
            )
            if should_report:
                _print_progress(progress_stream, payload)
            if should_checkpoint:
                _write_checkpoint(output_dir, payload)
            if reachability and reachability["reason_codes"]:
                raise ReachabilityError(reachability)
            if reached_candidate_limit:
                break

        if is_huggingface and raw_read_count >= int(bounded["forecast_after"]):
            reachability = _reachability_projection(
                raw_read_count=raw_read_count,
                candidate_count=len(decisions),
                accepted_proxy_count=sum(
                    item.status is Status.ACCEPTED for item in decisions
                ),
                candidate_target=limit,
                accepted_target=int(bounded["min_accepted"]),
                scan_limit=scan_limit,
                elapsed_seconds=time.monotonic() - started_at,
                runtime_budget_seconds=float(bounded["runtime_budget_seconds"]),
                confidence_z=float(bounded["confidence_z"]),
            )
            if reachability["reason_codes"]:
                raise ReachabilityError(reachability)
    except BaseException as error:
        write_failure_checkpoint(error)
        raise
    if raw_read_count == 0:
        error = ValueError("source returned no records")
        write_failure_checkpoint(error)
        raise error

    input_count = len(decisions)
    accepted = [item.document for item in decisions if item.status is Status.ACCEPTED and item.document]
    review = [item for item in decisions if item.status is Status.REVIEW]
    rejected = selection_rejected
    near = config["pipeline"]["near_duplicate"]
    try:
        dedupe_result = deduplicate(
            accepted,
            shingle_size=int(near["shingle_size"]),
            permutations=int(near["permutations"]),
            bands=int(near["bands"]),
            similarity_threshold=float(near["similarity_threshold"]),
        )
        source_exhausted = not reached_candidate_limit and raw_read_count < scan_limit
        scan_limit_reached = not reached_candidate_limit and raw_read_count >= scan_limit
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
            source_exhausted=source_exhausted,
            scan_limit_reached=scan_limit_reached,
            prefilter_reasons=prefilter_reasons,
            chunk_config=config["pipeline"]["chunking"],
        )
    except BaseException as error:
        write_failure_checkpoint(error)
        raise
    result = {
        "output": str(output_dir),
        "raw_read_count": raw_read_count,
        "input_count": input_count,
        "source_exhausted": source_exhausted,
        "scan_limit_reached": scan_limit_reached,
        "prefilter_skipped_count": raw_read_count - input_count,
        "accepted_count": len(dedupe_result.documents),
        "review_count": len(review),
        "rejected_count": len(rejected),
        "duplicate_count": len(dedupe_result.duplicates),
        "manifest_files": len(manifest["files"]),
    }
    final_checkpoint = _checkpoint_payload(
        status="complete",
        raw_read_count=raw_read_count,
        scan_limit=scan_limit,
        candidate_count=len(decisions),
        candidate_limit=limit,
        decisions=decisions,
        rejected_count=len(selection_rejected),
        prefilter_reasons=prefilter_reasons,
        elapsed_seconds=time.monotonic() - started_at,
        phase="complete",
        reachability=reachability,
    )
    final_checkpoint["final_counts"] = {
        key: result[key]
        for key in (
            "accepted_count",
            "review_count",
            "rejected_count",
            "duplicate_count",
        )
    }
    _write_checkpoint(output_dir, final_checkpoint)
    _print_progress(progress_stream, final_checkpoint)
    return result


def _checkpoint_payload(
    *,
    status: str,
    raw_read_count: int,
    scan_limit: int,
    candidate_count: int,
    candidate_limit: int,
    decisions: list[Decision],
    rejected_count: int,
    prefilter_reasons: dict[str, int],
    elapsed_seconds: float,
    phase: str = "selection",
    reachability: dict[str, Any] | None = None,
) -> dict[str, Any]:
    accepted_count = sum(item.status is Status.ACCEPTED for item in decisions)
    review_count = sum(item.status is Status.REVIEW for item in decisions)
    records_per_second = raw_read_count / elapsed_seconds if elapsed_seconds > 0 else 0.0
    payload = {
        "schema_version": 1,
        "status": status,
        "phase": phase,
        "updated_at": datetime.now(UTC).isoformat(),
        "elapsed_seconds": round(elapsed_seconds, 3),
        "records_per_second": round(records_per_second, 3),
        "raw_read_count": raw_read_count,
        "scan_limit": scan_limit,
        "scan_progress_percent": round(raw_read_count / scan_limit * 100, 2),
        "candidate_count": candidate_count,
        "candidate_limit": candidate_limit,
        "candidate_progress_percent": round(candidate_count / candidate_limit * 100, 2),
        "accepted_candidate_count": accepted_count,
        "review_candidate_count": review_count,
        "rejected_count": rejected_count,
        "prefilter_reasons": dict(sorted(prefilter_reasons.items())),
    }
    if reachability is not None:
        payload["reachability"] = reachability
    return payload


def _reachability_projection(
    *,
    raw_read_count: int,
    candidate_count: int,
    accepted_proxy_count: int,
    candidate_target: int,
    accepted_target: int,
    scan_limit: int,
    elapsed_seconds: float,
    runtime_budget_seconds: float,
    confidence_z: float,
) -> dict[str, Any]:
    candidate_upper = _wilson_upper(candidate_count, raw_read_count, confidence_z)
    accepted_upper = _wilson_upper(accepted_proxy_count, raw_read_count, confidence_z)
    candidate_required = (
        raw_read_count
        if candidate_count >= candidate_target
        else _required_samples(candidate_target, candidate_upper, raw_read_count)
    )
    accepted_required = (
        raw_read_count
        if accepted_proxy_count >= accepted_target
        else _required_samples(accepted_target, accepted_upper, raw_read_count)
    )
    required_values = [value for value in (candidate_required, accepted_required) if value is not None]
    required_raw = max(required_values, default=raw_read_count)
    records_per_second = raw_read_count / elapsed_seconds if elapsed_seconds > 0 else 0.0
    targets_reached = (
        candidate_count >= candidate_target and accepted_proxy_count >= accepted_target
    )
    projected_seconds = (
        elapsed_seconds
        if targets_reached
        else required_raw / records_per_second
        if records_per_second > 0
        else None
    )
    remaining_records = max(0, scan_limit - raw_read_count)
    candidate_reachable = candidate_count + remaining_records >= candidate_target
    accepted_reachable = accepted_proxy_count + remaining_records >= accepted_target
    runtime_reachable = targets_reached or elapsed_seconds < runtime_budget_seconds
    reason_codes: list[str] = []
    if not candidate_reachable:
        reason_codes.append("candidate_target_unreachable_within_scan_limit")
    if not accepted_reachable:
        reason_codes.append("accepted_target_unreachable_within_scan_limit")
    if not runtime_reachable:
        reason_codes.append("targets_unreachable_within_runtime_budget")
    warning_codes: list[str] = []
    if candidate_required is None or candidate_required > scan_limit:
        warning_codes.append("candidate_target_statistically_unlikely_within_scan_limit")
    if accepted_required is None or accepted_required > scan_limit:
        warning_codes.append("accepted_target_statistically_unlikely_within_scan_limit")
    if (
        not targets_reached
        and projected_seconds is not None
        and projected_seconds > runtime_budget_seconds
    ):
        warning_codes.append("targets_statistically_unlikely_within_runtime_budget")
    return {
        "sample_size": raw_read_count,
        "candidate_count": candidate_count,
        "accepted_proxy_count": accepted_proxy_count,
        "remaining_records": remaining_records,
        "candidate_upper_yield": round(candidate_upper, 8),
        "accepted_upper_yield": round(accepted_upper, 8),
        "candidate_required_raw_optimistic": candidate_required,
        "accepted_required_raw_optimistic": accepted_required,
        "projected_total_seconds": round(projected_seconds, 3) if projected_seconds is not None else None,
        "candidate_reachable_by_scan": candidate_reachable,
        "accepted_reachable_by_scan": accepted_reachable,
        "reachable_by_runtime": runtime_reachable,
        "reason_codes": reason_codes,
        "warning_codes": warning_codes,
    }


def _bounded_selection_policy(config: dict[str, Any]) -> dict[str, int | float]:
    raw = config["pipeline"].get("bounded_selection", {})
    if not isinstance(raw, dict):
        raise ValueError("pipeline.bounded_selection must be a mapping")
    policy: dict[str, int | float] = {**_BOUNDED_SELECTION_DEFAULTS, **raw}
    integer_fields = (
        "metadata_batch_size",
        "forecast_after",
        "min_accepted",
    )
    for field in integer_fields:
        value = policy[field]
        if isinstance(value, bool) or not isinstance(value, int):
            raise ValueError(f"pipeline.bounded_selection.{field} must be an integer")
    if int(policy["metadata_batch_size"]) <= 0:
        raise ValueError("pipeline.bounded_selection.metadata_batch_size must be greater than zero")
    if int(policy["forecast_after"]) <= 0:
        raise ValueError("pipeline.bounded_selection.forecast_after must be greater than zero")
    if int(policy["min_accepted"]) < 0:
        raise ValueError("pipeline.bounded_selection.min_accepted must be zero or greater")
    for field in ("runtime_budget_seconds", "confidence_z"):
        value = policy[field]
        if isinstance(value, bool) or not isinstance(value, (int, float)) or value <= 0:
            raise ValueError(f"pipeline.bounded_selection.{field} must be greater than zero")
    return policy


def _wilson_upper(successes: int, samples: int, z: float) -> float:
    if samples <= 0:
        return 0.0
    proportion = successes / samples
    z_squared = z * z
    denominator = 1 + z_squared / samples
    centre = proportion + z_squared / (2 * samples)
    margin = z * math.sqrt(
        proportion * (1 - proportion) / samples + z_squared / (4 * samples * samples)
    )
    return min(1.0, (centre + margin) / denominator)


def _required_samples(target: int, upper_yield: float, observed: int) -> int | None:
    if target <= 0:
        return observed
    if upper_yield <= 0:
        return None
    return max(observed, math.ceil(target / upper_yield))


def _write_checkpoint(output_dir: Path, payload: dict[str, Any]) -> None:
    path = output_dir / "checkpoint.json"
    temporary = output_dir / "checkpoint.json.tmp"
    temporary.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
        newline="\n",
    )
    temporary.replace(path)


def _print_progress(stream: TextIO, payload: dict[str, Any]) -> None:
    safe = {
        key: payload[key]
        for key in (
            "status",
            "elapsed_seconds",
            "records_per_second",
            "raw_read_count",
            "scan_limit",
            "candidate_count",
            "candidate_limit",
            "accepted_candidate_count",
            "review_candidate_count",
            "rejected_count",
            "prefilter_reasons",
        )
    }
    print(
        "vilu-corpus progress: "
        + json.dumps(safe, ensure_ascii=False, sort_keys=True, separators=(",", ":")),
        file=stream,
        flush=True,
    )


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
