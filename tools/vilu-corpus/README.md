# ViLu ophthalmology corpus pipeline

This isolated Python 3.11 module builds a reproducible, license-aware RU/EN
ophthalmology corpus candidate set. It implements GitHub issue #88 only.

It does **not** publish content, create embeddings, write to a vector database,
train a model, call Supabase, or alter the ViLu frontend.

## Safety boundary

- The upstream `PleIAs/common_corpus` revision is pinned to an exact SHA.
- Only the `Open Science` collection is eligible.
- Missing source fields fail the run.
- Unknown licenses, missing identifiers, missing dates and ambiguous relevance
  remain inside the bounded candidate set and go to `review.csv`.
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
hard eligibility filtering. Review-only conditions such as an unknown license
or missing date do not silently remove a record from the audit trail.

Validate output hashes, licenses, deduplication and chunk references:

```powershell
uv run vilu-corpus validate --output runs/pilot-1000 --min-candidates 1000 --min-accepted 100
```

`--min-candidates` and `--min-accepted` make acceptance fail when source
coverage is insufficient. Before returning a threshold failure, validation
writes a metadata-only `validation-report.json` with aggregate prefilter and
downstream reason counts.

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
- `validation-report.json`: post-build aggregate validation diagnostics; it
  never contains document text and is written even when acceptance thresholds
  fail.

Do not upload these files to public Pages or commit them to Git. The manual
GitHub Actions workflow uploads one bounded run as a short-retention repository
artifact even when threshold validation fails, so the metadata-only diagnosis
and protected review/rejected evidence are not lost.

## Configuration

- `configs/corpus.yaml` owns source revision, safety thresholds and license
  policy.
- `configs/taxonomy.yaml` owns RU/EN ophthalmology topics and terms.

Taxonomy matching is fail-closed:

- add approved clinical aliases to a topic's `include` list;
- add ambiguous generic terms such as `refraction` or `screen time` to
  `requires_context`, so they score only when the document also contains a
  language-specific ophthalmic `context_terms` match;
- documents with ophthalmic context but no approved topic remain rejected and
  are counted as `ophthalmic_context_without_topic` in aggregate diagnostics.

Taxonomy changes do not require code changes and are included in the manifest
hash.
