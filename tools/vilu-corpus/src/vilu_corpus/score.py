from __future__ import annotations

import re
from collections import deque
from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True, slots=True)
class Relevance:
    score: int
    topics: list[str]
    matches: dict[str, list[str]]
    context_matches: list[str]


@dataclass(frozen=True, slots=True)
class _TopicPolicy:
    name: str
    terms: tuple[str, ...]
    requires_context: frozenset[str]


@dataclass(frozen=True, slots=True)
class _LanguagePolicy:
    context_terms: tuple[str, ...]
    topics: tuple[_TopicPolicy, ...]
    matcher: "_TermMatcher"


@dataclass(frozen=True, slots=True)
class RelevancePolicy:
    languages: dict[str, _LanguagePolicy]


class _TermMatcher:
    """Find every configured term in one pass while preserving `_contains` semantics."""

    def __init__(self, terms: set[str]) -> None:
        self._terms = tuple(sorted((term for term in terms if term), key=lambda item: (len(item), item)))
        self._transitions: list[dict[str, int]] = [{}]
        self._failures: list[int] = [0]
        self._outputs: list[list[int]] = [[]]
        for index, term in enumerate(self._terms):
            state = 0
            for character in term:
                next_state = self._transitions[state].get(character)
                if next_state is None:
                    next_state = len(self._transitions)
                    self._transitions[state][character] = next_state
                    self._transitions.append({})
                    self._failures.append(0)
                    self._outputs.append([])
                state = next_state
            self._outputs[state].append(index)
        queue: deque[int] = deque(self._transitions[0].values())
        while queue:
            state = queue.popleft()
            for character, next_state in self._transitions[state].items():
                queue.append(next_state)
                failure = self._failures[state]
                while failure and character not in self._transitions[failure]:
                    failure = self._failures[failure]
                self._failures[next_state] = self._transitions[failure].get(character, 0)
                self._outputs[next_state].extend(self._outputs[self._failures[next_state]])

    def find(self, text: str) -> set[str]:
        found: set[str] = set()
        state = 0
        for end, character in enumerate(text):
            while state and character not in self._transitions[state]:
                state = self._failures[state]
            state = self._transitions[state].get(character, 0)
            for index in self._outputs[state]:
                term = self._terms[index]
                if _requires_word_boundaries(term):
                    start = end - len(term) + 1
                    if start > 0 and _is_word_character(text[start - 1]):
                        continue
                    if end + 1 < len(text) and _is_word_character(text[end + 1]):
                        continue
                found.add(term)
        return found


def compile_relevance(taxonomy: dict[str, Any]) -> RelevancePolicy:
    languages: dict[str, _LanguagePolicy] = {}
    for language_key in ("en", "ru"):
        context_terms = tuple(
            str(term).casefold()
            for term in taxonomy.get("context_terms", {}).get(language_key, [])
        )
        topics: list[_TopicPolicy] = []
        all_terms = set(context_terms)
        for topic, definition in sorted(taxonomy["topics"].items()):
            terms = tuple(
                str(term).casefold()
                for term in definition.get("include", {}).get(language_key, [])
            )
            requires_context = frozenset(
                str(term).casefold()
                for term in definition.get("requires_context", {}).get(language_key, [])
            )
            topics.append(_TopicPolicy(topic, terms, requires_context))
            all_terms.update(terms)
        languages[language_key] = _LanguagePolicy(
            context_terms=context_terms,
            topics=tuple(topics),
            matcher=_TermMatcher(all_terms),
        )
    return RelevancePolicy(languages=languages)


def score_relevance(
    title: str,
    text: str,
    language: str,
    taxonomy: dict[str, Any],
    *,
    policy: RelevancePolicy | None = None,
) -> Relevance:
    haystack = f"{title}\n{text}".casefold()
    language_key = "ru" if language == "ru" else "en"
    title_folded = title.casefold()
    language_policy = (policy or compile_relevance(taxonomy)).languages[language_key]
    haystack_matches = language_policy.matcher.find(haystack)
    title_matches = language_policy.matcher.find(title_folded)
    topics: list[str] = []
    matches: dict[str, list[str]] = {}
    score = 0
    context_matches = [
        term for term in language_policy.context_terms if term in haystack_matches
    ]
    for topic_policy in language_policy.topics:
        found = [
            term
            for term in topic_policy.terms
            if term in haystack_matches
            and (term not in topic_policy.requires_context or context_matches)
        ]
        if not found:
            continue
        topics.append(topic_policy.name)
        matches[topic_policy.name] = found
        score += min(len(found), 2)
        if any(term in title_matches for term in found):
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


def _requires_word_boundaries(term: str) -> bool:
    return re.fullmatch(r"[\w-]+", term, flags=re.UNICODE) is not None


def _is_word_character(character: str) -> bool:
    return re.fullmatch(r"\w", character, flags=re.UNICODE) is not None
