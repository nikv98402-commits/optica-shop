from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True, slots=True)
class Relevance:
    score: int
    topics: list[str]
    matches: dict[str, list[str]]
    context_matches: list[str]


def score_relevance(title: str, text: str, language: str, taxonomy: dict[str, Any]) -> Relevance:
    haystack = f"{title}\n{text}".casefold()
    language_key = "ru" if language == "ru" else "en"
    title_folded = title.casefold()
    topics: list[str] = []
    matches: dict[str, list[str]] = {}
    score = 0
    context_terms = [
        str(term).casefold()
        for term in taxonomy.get("context_terms", {}).get(language_key, [])
    ]
    context_matches = [term for term in context_terms if _contains(haystack, term)]
    for topic, definition in sorted(taxonomy["topics"].items()):
        terms = [str(term).casefold() for term in definition.get("include", {}).get(language_key, [])]
        requires_context = {
            str(term).casefold()
            for term in definition.get("requires_context", {}).get(language_key, [])
        }
        found = [
            term
            for term in terms
            if _contains(haystack, term)
            and (term not in requires_context or context_matches)
        ]
        if not found:
            continue
        topics.append(topic)
        matches[topic] = found
        score += min(len(found), 2)
        if any(_contains(title_folded, term) for term in found):
            score += 2
    return Relevance(
        score=score,
        topics=topics,
        matches=matches,
        context_matches=context_matches,
    )


def has_exclusion(text: str, language: str, selection: dict[str, Any]) -> str | None:
    language_key = "ru" if language == "ru" else "en"
    folded = text.casefold()
    for phrase in selection.get("exclusion_phrases", {}).get(language_key, []):
        if str(phrase).casefold() in folded:
            return str(phrase)
    return None


def _contains(text: str, term: str) -> bool:
    if not term:
        return False
    if re.fullmatch(r"[\w-]+", term, flags=re.UNICODE):
        return re.search(rf"(?<!\w){re.escape(term)}(?!\w)", text, flags=re.UNICODE) is not None
    return term in text
