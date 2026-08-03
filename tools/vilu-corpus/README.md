# ViLu ophthalmology corpus pipeline

This isolated Python 3.11 module builds a reproducible, license-aware RU/EN
ophthalmology corpus candidate set. It implements GitHub issue #88 only.

It does **not** publish content, create embeddings, write to a vector database,
train a model, call Supabase, or alter the ViLu frontend.

## Safety boundary

- The upstream `PleIAs/common_corpus` revision is pinned to an exact SHA.
- The pinned shard glob is explicit because the upstream dataset card exposes
  only one of the 10,000 parquet shards through its default configuration.
- Metadata-only parquet predicates retain RU/EN Open Science rows with an
  exact accepted-license allowlist before document bodies enter the bounded
  scanner. The same rules are checked again locally and remain part of the
  hashed configuration.
- Only the `Open Science` collection is eligible.
- Missing source fields fail the run.
- Unknown licenses, missing identifiers, missing dates and ambiguous relevance
  remain inside the bounded candidate set and go to `review.csv`.
- Irrelevant records do not consume the bounded candidate limit, but remain in
  the metadata-only `rejected.jsonl` audit trail. Excluded, stale and
  unsupported-language records are counted in aggregate prefilter diagnostics.
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
uv run vilu-corpus build --limit 1000 --scan-limit 100000 --progress-every 1000 --checkpoint-every 5000 --output runs/pilot-1000
```

`--scan-limit` is the strict maximum number of source records delivered to the
pipeline after the pinned metadata-only parquet predicates. Predicate pushdown
does not weaken the local eligibility, relevance or license checks.
`--limit` is the maximum number of candidates retained after deterministic
hard eligibility and ophthalmology relevance filtering. Review-only conditions
such as an unknown license, missing date or ambiguous relevance do not silently
remove a record from the audit trail. Definitively irrelevant records are
audited but do not occupy candidate slots.

`--progress-every` prints aggregate progress after the configured number of
source records; its default is 1,000. `--checkpoint-every` atomically refreshes
the metadata-only `checkpoint.json` after the configured number of source
records; its default is 5,000. The checkpoint contains counts, rates, elapsed
time, aggregate rejection reasons and the failure type, but never document
text or exception messages. It is finalized on success and on handled failure
paths so a stalled or failed bounded run can be diagnosed safely.

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
- `stats.json`, `manifest.json`, and `README.md`: deterministic run evidence;
- `validation-report.json`: post-build aggregate validation diagnostics; it
  never contains document text and is written even when acceptance thresholds
  fail.
- `checkpoint.json`: metadata-only selection progress and terminal status; it
  is stored separately from the protected reproducible corpus artifact.

Do not upload these files to public Pages or commit them to Git. The manual
GitHub Actions workflow always attempts to upload `checkpoint.json` as a
separate seven-day diagnostic artifact. When the build completes, it uploads
the bounded run without `checkpoint.json` as a protected seven-day repository
artifact; that protected artifact is retained when later acceptance validation
fails, so aggregate diagnostics and review/rejected evidence are not lost.

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

The configured RU/EN taxonomy is compiled once per run and matched in one pass
per document. This changes selection cost, not relevance, boundary, context or
title-bonus semantics.

Taxonomy changes do not require code changes and are included in the manifest
hash.
