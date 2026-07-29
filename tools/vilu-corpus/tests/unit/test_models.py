import pytest

from vilu_corpus.models import Candidate


def test_candidate_schema_is_fail_closed() -> None:
    with pytest.raises(ValueError, match="source schema missing fields"):
        Candidate.from_mapping({"identifier": "x"}, ["identifier", "text"])
