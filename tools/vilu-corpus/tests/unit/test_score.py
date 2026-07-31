from vilu_corpus.score import has_exclusion, score_relevance


TAXONOMY = {
    "context_terms": {
        "en": ["ophthalmic", "retinal"],
        "ru": ["офтальмологический", "сетчатка"],
    },
    "topics": {
        "glaucoma": {
            "include": {
                "en": ["glaucoma", "ocular hypertension"],
                "ru": ["глаукома", "офтальмогипертензия"],
            }
        },
        "myopia": {"include": {"en": ["myopia"], "ru": ["миопия"]}},
        "refractive_errors": {
            "include": {"en": ["refraction"], "ru": ["рефракция"]},
            "requires_context": {"en": ["refraction"], "ru": ["рефракция"]},
        },
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


def test_clinical_alias_recovers_relevant_document() -> None:
    result = score_relevance(
        "Ocular hypertension monitoring",
        "An ophthalmic cohort monitored ocular hypertension.",
        "en",
        TAXONOMY,
    )
    assert result.score == 3
    assert result.topics == ["glaucoma"]
    assert result.context_matches == ["ophthalmic"]


def test_ophthalmic_context_without_approved_topic_stays_unmatched() -> None:
    result = score_relevance(
        "Retinal microvascular geometry",
        "A retinal imaging methods study.",
        "en",
        TAXONOMY,
    )
    assert result.score == 0
    assert result.topics == []
    assert result.context_matches == ["retinal"]


def test_non_ophthalmic_vision_language_does_not_match() -> None:
    result = score_relevance(
        "Computer vision architecture",
        "A benchmark for image classification systems.",
        "en",
        TAXONOMY,
    )
    assert result.score == 0
    assert result.topics == []
    assert result.context_matches == []


def test_weak_refraction_term_requires_ophthalmic_context() -> None:
    result = score_relevance(
        "Optical refraction model",
        "A physics simulation of wave propagation.",
        "en",
        TAXONOMY,
    )
    assert result.score == 0
    assert result.topics == []


def test_body_only_alias_remains_borderline_for_manual_review() -> None:
    result = score_relevance(
        "Population monitoring",
        "The study measured ocular hypertension in adults.",
        "en",
        TAXONOMY,
    )
    assert result.score == 1
    assert result.topics == ["glaucoma"]


def test_exclusion_phrase_is_language_specific() -> None:
    selection = {"exclusion_phrases": {"en": ["veterinary ophthalmology"], "ru": []}}
    assert has_exclusion("A veterinary ophthalmology paper", "en", selection)
    assert has_exclusion("A clinical ophthalmology paper", "en", selection) is None
