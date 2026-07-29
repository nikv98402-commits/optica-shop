from vilu_corpus.clean import content_hash, document_id
from vilu_corpus.dedupe import deduplicate, jaccard, minhash_signature, shingles
from vilu_corpus.models import ProcessedDocument


def document(identifier: str, text: str) -> ProcessedDocument:
    digest = content_hash(text)
    return ProcessedDocument(
        document_id=document_id(identifier, digest),
        source_identifier=identifier,
        collection="papers",
        open_type="Open Science",
        curator="fixture",
        license="CC-BY-4.0",
        year=2024,
        title="Myopia",
        creator="Journal",
        language="en",
        word_count=len(text.split()),
        token_count=0,
        raw_text=text,
        clean_text=text,
        content_sha256=digest,
        topics=["myopia"],
        relevance_score=3,
    )


def test_exact_content_duplicate_keeps_first_document() -> None:
    result = deduplicate(
        [document("a", "myopia evidence"), document("b", "MYOPIA  evidence")],
        shingle_size=2,
        permutations=8,
        bands=2,
        similarity_threshold=0.8,
    )
    assert len(result.documents) == 1
    assert result.duplicates[0].kind == "content_sha256"


def test_minhash_is_deterministic_and_near_duplicate_is_removed() -> None:
    base = " ".join(f"word{index}" for index in range(80))
    near = base + " extra"
    assert minhash_signature(base, shingle_size=3, permutations=16) == minhash_signature(
        base, shingle_size=3, permutations=16
    )
    result = deduplicate(
        [document("a", base), document("b", near)],
        shingle_size=3,
        permutations=16,
        bands=4,
        similarity_threshold=0.9,
    )
    assert len(result.documents) == 1
    assert result.duplicates[0].kind == "minhash_lsh"


def test_shingle_jaccard_handles_empty_and_overlap() -> None:
    assert jaccard(set(), set()) == 1.0
    assert jaccard(shingles("a b c", 2), shingles("a b d", 2)) == 1 / 3
