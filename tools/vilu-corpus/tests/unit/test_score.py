from vilu_corpus.score import has_exclusion, score_relevance


TAXONOMY = {
    "topics": {
        "myopia": {"include": {"en": ["myopia"], "ru": ["миопия"]}},
        "screening": {"include": {"en": ["vision screening"], "ru": ["проверка зрения"]}},
    }
}


def test_title_match_scores_higher_and_returns_topics() -> None:
    result = score_relevance("Myopia review", "Evidence about myopia.", "en", TAXONOMY)
    assert result.score == 3
    assert result.topics == ["myopia"]


def test_russian_terms_are_matched() -> None:
    result = score_relevance("Проверка зрения", "Клиническая проверка зрения.", "ru", TAXONOMY)
    assert result.score == 3
    assert result.topics == ["screening"]


def test_exclusion_phrase_is_language_specific() -> None:
    selection = {"exclusion_phrases": {"en": ["veterinary ophthalmology"], "ru": []}}
    assert has_exclusion("A veterinary ophthalmology paper", "en", selection)
    assert has_exclusion("A clinical ophthalmology paper", "en", selection) is None
