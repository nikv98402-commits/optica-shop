from __future__ import annotations

from datetime import date, datetime
from typing import Any

from .clean import clean_text, content_hash, document_id
from .licenses import LicenseState, normalize_license
from .models import Candidate, Decision, ProcessedDocument, Status
from .score import has_exclusion, score_relevance


def evaluate(candidate: Candidate, config: dict[str, Any], taxonomy: dict[str, Any]) -> Decision:
    pipeline = config["pipeline"]
    reasons: list[str] = []
    review_reasons: list[str] = []

    language = _normalize_language(candidate.language, pipeline["accepted_languages"])
    if not language:
        return _decision(Status.REJECTED, ["language_not_allowed"], candidate)
    if candidate.open_type.casefold() not in {
        str(value).casefold() for value in pipeline["accepted_open_types"]
    }:
        return _decision(Status.REJECTED, ["not_open_science"], candidate)
    if not candidate.identifier:
        review_reasons.append("identifier_missing")
    if not candidate.text.strip():
        return _decision(Status.REJECTED, ["text_missing"], candidate)

    year = _extract_year(candidate.date)
    if year is None:
        review_reasons.append("date_missing_or_invalid")
        year = 0
    elif year < int(pipeline["min_year"]):
        return _decision(Status.REJECTED, ["before_min_year"], candidate)

    if not int(pipeline["min_words"]) <= candidate.word_count <= int(pipeline["max_words"]):
        return _decision(Status.REJECTED, ["word_count_out_of_range"], candidate)

    license_decision = normalize_license(candidate.license, config["licenses"])
    if license_decision.state is LicenseState.REVIEW:
        review_reasons.append(license_decision.reason)

    cleaned = clean_text(candidate.text)
    exclusion = has_exclusion(f"{candidate.title}\n{cleaned}", language, config["selection"])
    if exclusion:
        return _decision(Status.REJECTED, ["excluded_phrase"], candidate, {"phrase": exclusion})

    relevance = score_relevance(candidate.title, cleaned, language, taxonomy)
    accept_score = int(pipeline["relevance"]["accept_score"])
    review_score = int(pipeline["relevance"]["review_score"])
    if relevance.score < review_score:
        return _decision(Status.REJECTED, ["not_relevant"], candidate)
    if relevance.score < accept_score:
        review_reasons.append("relevance_ambiguous")

    text_hash = content_hash(cleaned)
    processed = ProcessedDocument(
        document_id=document_id(candidate.identifier, text_hash),
        source_identifier=candidate.identifier,
        collection=candidate.collection,
        open_type=candidate.open_type,
        curator=candidate.curator,
        license=license_decision.normalized,
        year=year,
        title=candidate.title,
        creator=candidate.creator,
        language=language,
        word_count=candidate.word_count,
        token_count=candidate.token_count,
        raw_text=candidate.text,
        clean_text=cleaned,
        content_sha256=text_hash,
        topics=relevance.topics,
        relevance_score=relevance.score,
        reasons=sorted(set(reasons + review_reasons)),
    )
    if review_reasons:
        return Decision(Status.REVIEW, sorted(set(review_reasons)), processed)
    return Decision(Status.ACCEPTED, ["eligible"], processed)


def _normalize_language(value: str, accepted: dict[str, list[str]]) -> str | None:
    folded = value.strip().casefold()
    for code, aliases in accepted.items():
        if folded == str(code).casefold() or folded in {str(alias).casefold() for alias in aliases}:
            return code
    return None


def _extract_year(value: Any) -> int | None:
    if isinstance(value, datetime):
        return value.year
    if isinstance(value, date):
        return value.year
    if isinstance(value, int):
        return value if 1000 <= value <= 9999 else None
    text = str(value or "").strip()
    for token in text.replace("/", "-").split("-"):
        if token.isdigit() and len(token) == 4:
            year = int(token)
            if 1000 <= year <= 9999:
                return year
    return None


def _decision(
    status: Status,
    reasons: list[str],
    candidate: Candidate,
    metadata: dict[str, Any] | None = None,
) -> Decision:
    safe_metadata = {
        "identifier": candidate.identifier,
        "title": candidate.title,
        "license": candidate.license,
        "language": candidate.language,
    }
    safe_metadata.update(metadata or {})
    return Decision(status=status, reasons=reasons, metadata=safe_metadata)
