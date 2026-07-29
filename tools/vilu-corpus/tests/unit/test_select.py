from copy import deepcopy

from vilu_corpus.models import Candidate, Status
from vilu_corpus.select import evaluate


CONFIG = {
    "pipeline": {
        "min_year": 2015,
        "min_words": 300,
        "max_words": 200000,
        "accepted_languages": {"en": ["en", "english"], "ru": ["ru", "russian"]},
        "accepted_open_types": ["Open Science"],
        "relevance": {"accept_score": 3, "review_score": 1},
    },
    "licenses": {
        "accepted": ["CC-BY-4.0"],
        "aliases": {"cc by 4.0": "CC-BY-4.0"},
    },
    "selection": {
        "exclusion_phrases": {
            "en": ["veterinary ophthalmology"],
            "ru": ["ветеринарная офтальмология"],
        }
    },
}
TAXONOMY = {"topics": {"myopia": {"include": {"en": ["myopia"], "ru": ["миопия"]}}}}


def candidate(**changes: object) -> Candidate:
    values = {
        "identifier": "doi:1",
        "collection": "papers",
        "open_type": "Open Science",
        "curator": "fixture",
        "license": "CC BY 4.0",
        "date": 2024,
        "title": "Myopia clinical review",
        "creator": "Test journal",
        "language": "English",
        "language_type": "Written",
        "word_count": 300,
        "token_count": 400,
        "text": "Myopia evidence " * 300,
    }
    values.update(changes)
    return Candidate(**values)


def test_eligible_document_is_accepted() -> None:
    result = evaluate(candidate(), CONFIG, TAXONOMY)
    assert result.status is Status.ACCEPTED
    assert result.document
    assert result.document.language == "en"
    assert result.document.license == "CC-BY-4.0"


def test_unknown_license_and_missing_date_are_reviewed() -> None:
    result = evaluate(candidate(license="Custom", date=None), CONFIG, TAXONOMY)
    assert result.status is Status.REVIEW
    assert set(result.reasons) == {"date_missing_or_invalid", "license_unknown"}


def test_old_irrelevant_and_excluded_documents_are_rejected() -> None:
    assert evaluate(candidate(date=2014), CONFIG, TAXONOMY).reasons == ["before_min_year"]
    assert evaluate(candidate(title="Other", text="unrelated " * 300), CONFIG, TAXONOMY).reasons == [
        "not_relevant"
    ]
    assert evaluate(
        candidate(text="veterinary ophthalmology " * 300), CONFIG, TAXONOMY
    ).reasons == ["excluded_phrase"]


def test_missing_source_text_is_rejected_fail_closed() -> None:
    assert evaluate(candidate(text=""), CONFIG, TAXONOMY).reasons == ["text_missing"]


def test_ambiguous_relevance_goes_to_review() -> None:
    custom = deepcopy(CONFIG)
    custom["pipeline"]["relevance"]["accept_score"] = 4
    result = evaluate(candidate(), custom, TAXONOMY)
    assert result.status is Status.REVIEW
    assert "relevance_ambiguous" in result.reasons
