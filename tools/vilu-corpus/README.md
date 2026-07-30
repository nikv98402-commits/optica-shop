# ViLu ophthalmology corpus pipeline

This isolated Python 3.11 module builds a reproducible, license-aware RU/EN
ophthalmology corpus candidate set. It implements GitHub issue #88 only.

It does **not** publish content, create embeddings, write to a vector database,
train a model, call Supabase, or alter the ViLu frontend.

## Safety boundary

- The upstream `PleIAs/common_corpus` revision is pinned to an exact SHA.
- Only the `Open Science` collection is eligible.
- Missing source fields fail the run.
- Unknown licenses, missing dates and ambiguous relevance go to `review.csv`.
- Excluded, stale, unsupported-language and irrelevant records go to
  `rejected.jsonl`.
- Accepted records are deduplicated by source identifier, normalized-text
  SHA-256 and deterministic MinHash/LSH candidate search.
- Raw and cleaned text exist only inside protected run artifacts. Run
  directories are gitignored and the CLI never logs document text.

The accepted license allowlist is deliberately narrower than all licenses
present in Common Corpus. Extending it requires a reviewed configuration
change.

## Local setup

```powershell
cd tools/vilu-corpus
uv sync --locked --extra dev
```

## Commands

Verify the live pinned schema without printing text:

```powershell
uv run vilu-corpus probe
```

Build a bounded run:

```powershell
uv run vilu-corpus build --limit 1000 --scan-limit 100000 --output runs/pilot-1000
```

`--scan-limit` is the strict maximum number of raw source records read.
`--limit` is the maximum number of candidates retained after deterministic
language, open-science, license, and basic-quality filtering.

Validate output hashes, licenses, deduplication and chunk references:

```powershell
uv run vilu-corpus validate --output runs/pilot-1000 --min-accepted 100
```

`--min-accepted` makes acceptance fail when too few documents qualify.

Print aggregate metadata (never document text):

```powershell
uv run vilu-corpus report --output runs/pilot-1000
```

## Outputs

Each run contains:

- `documents.parquet` and `documents.jsonl`: accepted raw/clean records;
- `chunks.parquet`: deterministic chunks for later, out-of-scope RAG work;
- `review.csv`: metadata-only manual review queue;
- `rejected.jsonl`: metadata-only rejected records;
- `duplicates.parquet`: exact and near-duplicate audit trail;
- `licenses.csv` and `taxonomy_coverage.csv`: aggregate coverage;
- `stats.json`, `manifest.json`, and `README.md`: deterministic run evidence.

Do not upload these files to public Pages or commit them to Git. The manual
GitHub Actions workflow uploads one bounded run as a short-retention repository
artifact.

## Configuration

- `configs/corpus.yaml` owns source revision, safety thresholds and license
  policy.
- `configs/taxonomy.yaml` owns RU/EN ophthalmology topics and terms.

Taxonomy changes do not require code changes and are included in the manifest
hash.
