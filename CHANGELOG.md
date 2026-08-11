# Changelog

All notable ViLu MVP changes should be documented here.

## [0.8.0.0] - 2026-08-11

### Added

- Added a reproducible 100-question RU/EN retrieval evaluation set pinned to the
  approved ophthalmology corpus manifest, Cloudflare Qwen embedding model and
  1024-dimensional vector contract.
- Added a service-role-only, read-only retrieval evaluation RPC that fails
  closed for inactive publications, revoked approvals, rejected sources and
  non-indexable content while capping retrieval at eight chunks.
- Added a protected manual GitHub workflow and operator guide for fixture and
  live evaluation without publishing corpus text, questions or embeddings.

### Tests

- Added contract, boundary and pgTAP coverage for Recall@8, provenance,
  exact-quote citations, abstention, result caps and live embedding-to-RPC
  mapping.
- Rechecked the fixture gate, all 285 unit tests, TypeScript, lint and the
  production build without applying the migration or generating live
  embeddings.

## [0.7.0.0] - 2026-08-10

### Added

- Added an explicitly approved ophthalmology corpus release path that validates
  the protected workflow-artifact digest, manifest, provenance, licenses and
  exact source/chunk counts before any publication can begin.
- Added server-only staging, atomic activation, safe abort/retry and rollback
  operations for versioned corpus releases in the existing Knowledge Assistant
  index, without exposing corpus tables or RPCs to browser roles.
- Added a protected publication runbook and shared TypeScript contracts for the
  fixed Cloudflare 1024-dimension embedding model.

### Tests

- Added publisher failure-path tests and 39 local pgTAP integration checks for
  revoked approvals, artifact-digest mismatch, staging invisibility, exact
  counts, activation, cleanup, rollback and service-role boundaries.
- Rechecked the approved 301-document / 6,663-chunk artifact in read-only mode,
  Knowledge Assistant boundary, TypeScript, lint, all 275 unit tests and the
  production build without applying production migration or live embeddings.

## [0.6.3.1] - 2026-08-08

### Fixed

- Made the bounded biomedical corpus scan start with the newest pinned PubMed
  shards, so post-2015 ophthalmology records are reachable within the strict
  scan limit without relaxing license, date, language, or relevance checks.

### Tests

- Added a regression assertion for the exact deterministic newest-to-oldest
  shard order and rechecked corpus tests, TypeScript, lint, frontend tests,
  Python compilation, workflow YAML, and the production build.

## [0.6.3.0] - 2026-08-08

### Changed

- Switched the bounded ophthalmology acceptance pipeline to the exact pinned
  `common-pile/pubmed` biomedical source, while keeping Common Corpus available
  only for a later, separately bounded enrichment pass.
- Normalized the PubMed source schema into the existing corpus contract without
  inventing token counts or weakening language, open-science, relevance, date,
  size, or exact-license checks.
- Made the acceptance workflow use the explicit corpus configuration and write
  progress and metadata-only checkpoints every 500 scanned records.

### Fixed

- Rejected schema drift, invalid metadata, unsupported adapters and canonical
  upstream filters on adapted sources before they can silently change the
  bounded corpus selection.

### Tests

- Added regression coverage for the pinned source and revision, raw-to-canonical
  adaptation, exact PubMed license variants, author normalization, projection,
  batch handling, schema drift and fail-closed filter behavior.
- Rechecked 81 corpus tests, Python compilation, workflow YAML, TypeScript,
  lint, all 260 frontend tests and the production build without running a
  corpus pilot.

## [0.6.2.0] - 2026-08-04

### Fixed

- Streamed sparse, already-filtered Hugging Face corpus rows immediately instead
  of waiting for a full user-facing batch, restoring visible pilot progress on
  low-yield revisions without weakening license or relevance filters.
- Wrote a metadata-only `filtered_relevance_scan` checkpoint before reading the
  first source row, so a slow upstream read is distinguishable from a stalled
  pipeline without exposing corpus text.

### Tests

- Added regression coverage for direct filtered-row streaming, retained reader
  batch configuration, and the pre-read source-phase checkpoint.
- Rechecked all 74 corpus tests, Python compilation, TypeScript, lint, all 260
  frontend tests, the checkout contract, and the production build without
  running a corpus pilot.

## [0.6.1.0] - 2026-08-04

### Changed

- Accelerated bounded Common Corpus reads with columnar batches while
  preserving deterministic row order and the strict scan limit.
- Pushed the safe `(date >= 2015 OR date is unknown)` predicate into the
  pinned source scan, retaining undated records for downstream review.
- Persisted a metadata-only checkpoint at every progress interval so long
  acceptance runs always leave current, non-sensitive diagnostics.

### Fixed

- Recorded the complete base and alternative source filters in probe output
  and protected manifest provenance, keeping acceptance artifacts
  self-describing and reproducible.

### Tests

- Added regression coverage for batched source iteration, composed DNF
  filters, progress checkpoint cadence, and full filter provenance.
- Rechecked all 73 corpus tests, Python compilation, TypeScript, lint, all 260
  frontend tests, and the production build without running a corpus pilot.

## [0.6.0.0] - 2026-08-04

### Changed

- Reworked bounded Common Corpus selection to push safe metadata predicates
  into the pinned Parquet scan, project only required columns, and process
  records in bounded batches while preserving deterministic ordering.
- Kept the full ophthalmology relevance check as a compiled single-pass matcher
  and added continuous runtime, scan-limit, progress, and metadata-only
  checkpoint diagnostics for long acceptance runs.
- Added accepted-yield and candidate-yield forecasts as diagnostic warnings;
  only exact scan and runtime bounds can terminate selection, so a late cluster
  of valid licensed documents remains eligible.
- Preserved undated otherwise-valid records for manual review instead of
  rejecting them before downstream policy checks.

### Fixed

- Prevented low-yield statistical forecasts from aborting a deterministic scan
  that can still reach its acceptance target within the configured exact bounds.
- Hardened reachability reporting so failures retain aggregate reason codes and
  safe checkpoint metadata without publishing document text.

### Tests

- Added regression coverage for strict license and language filtering, pushed
  Parquet predicates, batched scanning, low-yield diagnostics, late-cluster
  success, exact scan/runtime exhaustion, progress checkpoints, deterministic
  output, and protected artifact boundaries.
- Rechecked 70 corpus tests, Python compilation, TypeScript, lint, all 260
  frontend tests, and the production build without running a corpus pilot.

## [0.5.7.0] - 2026-08-03

### Changed

- Made the bounded ViLu corpus pilot report steady progress and preserve a
  metadata-only diagnostic checkpoint, so stalled or failed runs can be
  diagnosed without exposing document text.
- Replaced repeated relevance-term scans with a compiled single-pass matcher,
  reducing representative 1,000-document scoring time by more than 50x while
  preserving Russian and English boundary, context, and title-bonus behavior.
- Added a 75-minute workflow timeout and an always-uploaded diagnostic artifact
  that remains separate from the protected, reproducible corpus outputs.

### Fixed

- Marked empty-source, source-read, deduplication, and output-write failures as
  failed checkpoints instead of leaving acceptance runs falsely marked as
  running.

### Tests

- Added regression coverage for successful progress checkpoints, empty inputs,
  source failures, downstream output failures, safe diagnostic metadata, and
  workflow artifact boundaries.
- Rechecked 56 corpus tests, Python compilation, TypeScript, lint, all 260
  frontend tests, and the production build without running a corpus pilot.

## [0.5.6.1] - 2026-08-03

### Fixed

- Applied the exact accepted-license allowlist to the pinned Common Corpus
  loader before bounded selection, preventing ambiguous license families from
  consuming the 1,000-candidate pilot quota while keeping downstream checks
  fail-closed.

### Tests

- Added regression coverage for the upstream loader contract, rejected
  ambiguous license families, and alignment between the upstream filter and
  the canonical accepted-license configuration.
- Rechecked all 52 corpus tests and Python compilation, TypeScript, lint, all
  260 frontend tests, checkout contracts, and the production build.
- Confirmed the four existing, unrelated Knowledge Assistant E2E expectation
  failures separately; this release does not change that UI or backend.

## [0.5.6.0] - 2026-07-31

### Fixed

- Enumerated all parquet shards in the pinned Common Corpus revision and
  applied Open Science plus Russian/English metadata predicates before the
  bounded scanner, so licensed ophthalmology candidates are not hidden by the
  dataset's single-shard default configuration.
- Kept local language, license, open-science and relevance checks fail-closed,
  and recorded shard/filter provenance in probe and manifest outputs without
  exposing document text.

### Tests

- Added fail-closed filter and shard validation, exact mocked Hugging Face
  loader-contract coverage, metadata-only probe checks and deterministic
  manifest provenance coverage.
- Rechecked all 51 corpus tests, Python compilation, TypeScript, lint, all 260
  frontend tests, checkout tests and the production build.

## [0.5.5.0] - 2026-07-31

### Fixed

- Applied the bounded corpus candidate limit only after deterministic
  ophthalmology relevance filtering, so irrelevant records no longer prevent
  later eligible records from entering an acceptance pilot.
- Preserved metadata-only rejection diagnostics and aggregate reason counts for
  irrelevant records without weakening language, licensing, open-science or
  raw scan limits.

### Tests

- Added regression coverage for an irrelevant record preceding an eligible
  ophthalmology record, and rechecked all 40 corpus tests plus Python
  compilation.

## [0.5.4.0] - 2026-07-31

### Fixed

- Improved deterministic ophthalmology relevance recall with approved clinical
  aliases and explicit eye-care context, while preserving strict language,
  open-science, licensing, and bounded-selection gates.
- Kept generic terms such as refraction and screen time context-gated to avoid
  admitting unrelated documents, and added aggregate diagnostics for
  ophthalmic records that do not map to an approved taxonomy topic.

### Tests

- Added unit and integration coverage for accepted clinical aliases, unrelated
  computer-vision text, weak context-dependent terms, ambiguous body-only
  matches, and safe downstream rejection diagnostics.
- Rechecked all 39 corpus tests, Python compilation, all 260 frontend tests,
  TypeScript, lint, and the production build.

## [0.5.3.1] - 2026-07-30

### Fixed

- Made the checksum-pinned representative corpus fixture validate Git's
  canonical LF bytes, eliminating mixed-line-ending drift between Windows
  worktrees and Linux CI runners.

### Tests

- Rechecked the pinned representative regression, all corpus tests, Python
  compilation, TypeScript, lint, unit tests, and the production build.

## [0.5.3.0] - 2026-07-30

### Fixed

- Made failed ophthalmology corpus pilots explain why candidates were rejected
  downstream without exposing document text, so acceptance failures can be
  diagnosed before another authorized run.
- Kept review-only license, identifier, and date conditions inside the bounded
  candidate audit trail while preserving strict language, open-science,
  relevance, and raw-record limits.
- Preserved aggregate reports and protected workflow artifacts when validation
  thresholds fail, including candidate coverage and source-exhaustion state.

### Tests

- Added a checksum-pinned synthetic representative fixture and regression
  coverage for downstream reasons, candidate thresholds, source exhaustion,
  missing identifiers, report loading, and cross-platform line endings.
- Rechecked all 33 corpus tests, Python compilation, workflow YAML, all 260
  frontend tests, TypeScript, lint, and the production build.

## [0.5.2.0] - 2026-07-30

### Fixed

- Changed the bounded ophthalmology corpus pilot to select eligible candidates
  after deterministic language, open-science, license, and basic-quality
  filtering while retaining a strict raw-record scan limit.
- Added an acceptance threshold that stops the pilot when too few documents
  qualify, and recorded raw, candidate, and prefilter counts in the manifest
  for reproducible review.

### Tests

- Added regression coverage for strict scan bounds, deterministic manifests,
  and empty, insufficient, and successful acceptance samples.
- Rechecked all 29 corpus tests, Python compilation, workflow YAML, all 260
  frontend tests, TypeScript, lint, and the production build.

## [0.5.1.0] - 2026-07-29

### Fixed

- Restored the complete deterministic `uv.lock` for the ViLu ophthalmology
  corpus pipeline after the merged lockfile was found to be truncated.
- Added strict UTF-8 and SHA-256 lockfile verification before the manual corpus
  workflow installs dependencies.

### Tests

- Rechecked lockfile integrity, the negative tamper path, all 26 corpus tests,
  all 260 frontend unit tests, TypeScript, lint, and the production build.

## [0.5.0.0] - 2026-07-29

### Added

- Added a reproducible ophthalmology corpus pipeline in `tools/vilu-corpus`
  for the first bounded pilot of Epic #91.
- Added fail-closed source schemas, RU/EN and Open Science selection rules,
  strict license review, taxonomy scoring, exact and MinHash/LSH
  deduplication, deterministic chunking, manifests, validation, and run
  reports.
- Added a manual-only GitHub Actions pilot that processes at most 1,000 source
  records and stores protected build artifacts for seven days.

### Security

- Pinned the Hugging Face source to an exact hexadecimal commit SHA and kept
  raw or cleaned document text out of logs, review queues, Git, the frontend,
  and production Supabase.
- Kept unknown licenses and malformed or ambiguous records in review or reject
  queues instead of admitting them to the accepted corpus.

### Tests

- Added unit and integration coverage for schema validation, selection,
  licensing, cleaning, deterministic deduplication, bounded chunking,
  manifests, and output validation.
- Rechecked 26 corpus tests with 86% coverage, all 260 frontend unit tests,
  TypeScript, lint, and the production build.

## [0.4.6.0] - 2026-07-28

### Fixed

- Separated ingestion feed origins from outbound produ×|¶‰ËkºwµçL‚‚ˆÈÈÈš^Y‚‹Hš[Üš]^™YİÜ™H›İ]\È[™Û™HØ[Èİ™\ˆY\˜Ú[ÙXœÚ]\È[ˆÙ™™\‚ˆš[™\ˆ™\ÜÛœÙ\ËÛÈ]™\H]˜Z[X›H™^\İ\Xİ[ÛˆØ[ˆ™XXÚH›ÙXİˆØ\™[œİXYÙˆ™Z[™ÈX\ÚÙYHHX[™]ÜHÛİ\˜ÙHT“‚‚ˆÈÈÈ\İÂ‚‹HYYYÙHÛÛ˜XİÛİ™\˜YÙH›Üˆ›İ]KÛ™K[™ÙXœÚ]H˜[˜XÚÈš[Üš]K‚‹HYY›ÙXİXØ\™Ûİ™\˜YÙH›ÜˆØY™H[˜[™ÛÛÙÛHX\È\İ[˜][ÛœË‚‹H™XÚXÚÙY[ŒÌH\İË\TØÜš\[[™H›ÙXİ[ÛˆZ[‚‚ˆÈÈÌŒHHŒ‹LËL‚‚ˆÈÈÈYY‚‹HYYØÚY[YÚ[™ÛK\Ûİ\˜ÙHÙ™™\ˆš[™\ˆ›ÙXİ[ÛˆÜ\˜][ÛœÈÚ]Bˆ›İ[™Y]™HØ[˜\K›Ü›X[^˜][Û‹X[ÚXÚÜË[™ÛX\ˆÛÜšÙ›İÈ[\Ë‚‹HYYÙ\šXÙK[Û›HX[™\Ü[™È›Üˆ]Hœ™\Ú™\ÜË\œÙ\ˆİXØÙ\ÜËˆ]X\˜[[™H›Û[YKœ™\ÚÙ™™\œËÜ[ˆ[˜ÚY[Ë[™İ[Y[œË‚‹HYY[ˆÜ\˜][ÛœÈ[˜›ÛÚÈÛİ™\š[™È›İXİYÛÛ™šYİ\˜][Û‹X[X[Ø[˜\BˆÚXÚÜË™XÛİ™\K[\œ\[Ûˆ[™[™Ë[™›Û˜XÚË‚‚ˆÈÈÈÚ[™ÙY‚‹H›İXİYXXÚÛİ\˜ÙHœ›ÛHİ™\›\[™È]Y]YYÜˆ[›š[™È[™Ù\İ[Ûˆ›ØœÈ]ˆ›İHÛÜšÙ›İÈ[™]X˜\ÙH^Y\œË‚‹HYY›İ[™Y™]HÚ]^Û™[X[˜XÚÛÙ™ˆ[™š]\ˆ›ÜˆØ[˜\Kˆ›Ü›X[^˜][Û‹[™X[XÚXÚÈ˜Z[\™\Ë‚‹H[Z]Y›ÙXİ[ÛˆÜ™Y[X[ÈÈH^Xİ][Ûˆİ\]™\]Z\™\È[K‚‚ˆÈÈÈ\İÂ‚‹HYYØÚY[\ˆÜ\˜][ÛœÈ\İÈ[™ÔS[YÜ˜][ÛˆÛİ™\˜YÙH›ÜˆXİ]™K\[‚ˆ^Û\Ú]š]KÛİ\˜ÙHX[Ûİ[\œËX[[\Ë[™”È\›Z\ÜÚ[ÛœË‚‹H™XÚXÚÙY[ŒH\İË\TØÜš\[ÔS[YÜ˜][Ûˆ\İË[™Bˆ›ÙXİ[ÛˆZ[‚‚ˆÈÈÌŒŒ×HHŒ‹LËL‚‚ˆÈÈÈš^Y‚‹H[İÙYHÙ™™\ˆš[™\ˆYÙHTHÈ]][XØ]Hœ›İÜÙ\ˆ™\]Y\İÈÚ]›İˆİ\X˜\ÙHYØXŞH[›Û[[İ\ÈÙ^\È[™İ\œ™[X›\ÚX›HÙ^\Ë‚‹HÙ\ÙXÜ™]THÙ^\È^ÛYYÚ[Hİ\Ü[™ÈX›\ÚX›KZÙ^H›İ][Ûˆœ›ÛBˆİ\X˜\ÙH]›Ü›HY]Y]K‚‚ˆÈÈÈ\İÂ‚‹HYYÛÛ\]Xš[]HÛİ™\˜YÙH›ÜˆYØXŞKİ\œ™[›İ]Y[™ÙXÜ™]Ù^Bˆ›Ü›X]È[™™XÚXÚÙY[ŒH\İË\TØÜš\[™H›ÙXİ[ÛˆZ[‚‚ˆÈÈÌŒŒ—HHŒ‹LËL‚‚ˆÈÈÈYY‚‹HYYHÙ\šXÙK\›ÛK[Û›HÙ™™\ˆš[™\ˆ›ÙXİ›Ú™Xİ[Ûˆ[™™\œÚ[Û™Yˆ™XY[Û›HYÙHTH›Üˆœ™\ÚX›\ÚYÙ™™\œÈ[™Z[š[][HÛÛ™š\›YYšXÙ\Ë‚‹HYY›ÙXİXØ\™İ]\È›ÜˆØY[™Ë[˜]˜Z[X›H]K\œ›ÜœË™\šYšYYˆÙ™™\ˆÛİ\˜Ù\Ë]˜Z[Xš[]Kİ\œ™[˜ÚY\Ë[™ÙXœÚ]KÛ™KÜˆ›İ]HXİ[ÛœË‚‚ˆÈÈÈÙXİ\š]B‚‹HÙ\Ü\˜][Û˜[Ù™™\ˆš[™\ˆX›\È™Z[™HYÙH‘‘‹Ú]İšXİ™\]Y\İˆ˜[Y][Û‹ÜšYÚ[ˆÛÛ›ÛË›İ[™Y˜]H[Z][™Ë[™›Èœ›İÜÙ\ˆXØÙ\ÜÈÂˆHÙ\šXÙK\›ÛHÜ™Y[X[‚‹H^ÛYY]X\˜[[™Y[œX›\ÚYİ[K[™^\™YØœÙ\˜][ÛœÈœ›ÛBˆ›ÙXİXØ\™™\İ[Ë‚‚ˆÈÈÈ\İÂ‚‹HYYTHÛÛ˜XİYÙH[YÜ˜][Û‹œ›Û[™İ]K[™ÔS\›Z\ÜÚ[Û‚ˆÛİ™\˜YÙH›ÜˆHÙ™™\ˆš[™\ˆ›ÙXİXØ\™›İË‚‹H™XÚXÚÙY\TØÜš\[[Œ[š][™[YÜ˜][Ûˆ\İËÚXÚÛİ]ˆÛÛ˜XİËÔSZYÜ˜][ÛœË[™H›ÙXİ[ÛˆZ[‚‚ˆÈÈÌŒŒWHHŒ‹LËLB‚ˆÈÈÈYY‚‹HYY]\›Z[š\İXÈÙ™™\ˆš[™\ˆ›Ü›X[^˜][Ûˆ›ÜˆšXÙKİ\œ™[˜ŞKˆ]˜Z[Xš[]K›ÙXİY[]KØ][ÙÈX]Ú[™Ë[™Ì‹Zİ\ˆÈËY^Bˆœ™\Ú™\ÜÈÛ\ÜÚYšXØ][Û‹‚‹HYYH›İ[™Y›Ü›X[^˜][Ûˆ[›™\ˆÛÛ›™XİYÈH\›İ™Y[™Ù\İ[Û‚ˆØ[˜\KÚ]^Xİ[X]ÚX›XØ][Ûˆ[™™]šY]ÈÜˆ]X\˜[[™H›İ][™È›Ü‚ˆ[XšYİ[İ\Ë[›ÛX[İ\Ë[™[˜[YØœÙ\˜][ÛœË‚‹HYYÙ\šXÙK\›ÛK[Û›HÔSÛÛ˜XİÈ›Üˆ[™[™È˜]Ú\ËY[\İ[™]šY]ÂˆÛÜšË]ÛZXÈÙ™™\ˆX›XØ][Û‹[™]Y]YÛÛ\\˜X›HÜ]ÜˆY\™ÙHXİ[ÛœË‚‚ˆÈÈÈÙXİ\š]B‚‹HÙ\šX[^™YX›XØ][Ûˆ\ˆÙÚXØ[Ù™™\ˆÈ™]™[ÛÛ˜İ\œ™[šXÙKX[›ÛX[Bˆ\\ÜÙ\Ë[™›Ü˜ÙYÛİ\˜ÙK[X\šÙ]XÚØYÙH›İ[™\šY\Ë[™™]Z[™YØ[š]^™YˆÛİ\˜ÙHT“ÈÛ›HY\ˆ™[[İš[™ÈÙ[œÚ]]™H]Y\H\˜[Y]\œÈ[™œ˜YÛY[Ë‚‹HÙ\[›Ü›X[^˜][Ûˆ]]][ÛœÈ[˜]˜Z[X›HÈœ›İÜÙ\ˆ›Û\È[™™\Ù\™Yˆ[[]]X›H˜]Ë[ØœÙ\˜][Ûˆ›İ™[˜[˜ÙH›Üˆ]™\HX›\ÚYšXÙHÜˆ™]šY]Ë‚‚ˆÈÈÈ\İÂ‚‹HYYš^\™K[›™\‹[™ÔS[YÜ˜][ÛˆÛİ™\˜YÙH›Üˆ^Xİ[™^BˆX]Ú[™ËX[›Ü›YY[œ][XšYİZ]Kœ™\Ú™\ÜË™]HY[\İ[˜ŞKX\šÙ]ˆ›İ[™\šY\ËPÓË›İ™[˜[˜ÙK[™Ü]ÜˆY\™ÙH™YÜ™\ÜÚ[ÛœË‚‚ˆÈÈÌŒŒHHŒ‹LËLB‚ˆÈÈÈYY‚‹HYYHÙ™™\ˆš[™\ˆ[™Ù\İ[Ûˆ[[YHÚ]\ÛÛ]YÛİ\˜ÙHY\\œËˆY[\İ[˜]ÈØœÙ\˜][ÛœË\œÙ\ˆ]X\˜[[™K[™[ˆXØÛİ[[™Ë‚‹HYY›İ[™YÛİ\˜ÙHXØÙ\ÜÈÚ]^XİÈ[İÛ\İË›Ø›İÈ[™\›\ÂˆØ]\ËÔÔ‘ˆ›İXİ[Û‹˜]H[™ÛÛ˜İ\œ™[˜ŞH[Z]Ë[Y[İ]Ë™\ÜÛœÙK\Ú^™Bˆ[Z]Ë[™™]H˜XÚÛÙ™‹‚‹HYYHš^\™K[Û›HØ[˜\KH›İXİYX[X[]™KXØ[˜\HÛÜšÙ›İËÛİ\˜ÙBˆÛ˜›Ø\™[™ÈİZY[˜ÙK[™ÙXİ\š]H[™Y\\ˆÛÛ˜XİÛİ™\˜YÙK‚‚ˆÈÈÈ\İÂ‚‹H™XÚXÚÙYˆ[™Ù\İ[ÛˆÙXİ\š]H[™ÛÛ˜Xİ\İËİšXİ\TØÜš\›ÜˆBˆ[[YKH[MÍ‹]\İ[š]İZ]K[ÚXÚÛİ]ÛÛ˜XİË[™Bˆ›ÙXİ[ÛˆZ[‚‹H™XÛÜ™Y›İ\ˆ™KY^\İ[™ÈÛ›İÛYÙH\ÜÚ\İ[L‘H^Xİ][Ûˆ˜Z[\™\ÂˆÙ\\˜][NÈ\È™[X\ÙHÙ\È›İÚ[™ÙH]ÈRHÜˆ˜XÚÙ[™‚‚ˆÈÈÌŒËŒŒ×HHŒ‹LËL‚ˆÈÈÈYY‚‹HYYH›Ü›X[^™Yİ\X˜\ÙH›İ[™][Ûˆ›ÜˆÙ™™\ˆš[™\ˆX\šÙ]ËÛİ\˜Ù\ËˆİÜ™\Ë›ÙXİËØœÙ\˜][ÛœËšXÙ\Ëœ™\Ú™\ÜË[™[™Ù\İ[Ûˆ[œË‚‹HYY“ÈÛXÚY\Ë[™^\Ë[[]]X›H˜]ÈØœÙ\˜][ÛœË›İXİYÔSÙX\˜Úˆ[˜İ[ÛœËÚ\™Y\TØÜš\ÛÛ˜XİË[™ÔS[YÜ˜][ÛˆÛİ™\˜YÙK‚‹HYYÜ\˜][Û˜[Øİ[Y[][Ûˆ›ÜˆHÙ™™\ˆš[™\ˆ]H›İ[™\Kˆ™][[Û‹ÙXİ\š]H[Ù[\İ[™Ë[™›Û˜XÚË‚‚ˆÈÈÈ\İÂ‚‹H™XÚXÚÙY\TØÜš\[[š]\İË›ÙXİ[ÛˆZ[ÛÛ˜Xİ\İË[™ˆHÙ™™\ˆš[™\ˆÔSÙXİ\š]H[˜\šX[Ë‚‚ˆÈÈÌŒËŒŒ—HHŒ‹LËLBƒBˆÈÈÈÚ[™ÙYBƒB‹Hİ[™\™^™YHÛYHYÙHÛˆH]\›Z[š\İXÈ\šËÛYÚÙXİ[ÛˆØY[˜ÙKƒB‹HYYHÜXØ[Ü˜š]ÈÜšYÈ›İİ\™˜XÙ\È[™™\İÜ™Y™XYX›CBˆ\ÙÜ˜\H[™ÛÛ›ÛÈ[ˆHÛ›İÛYÙKÚİØØ\ÙK[™\Ú›Ø\™ÙXİ[ÛœËƒBƒBˆÈÈÈš^YBƒB‹H™[[İ™Y]HØ\ØØYHİ™\œšY\È]›][™Y\šÈÙXİ[ÛœÈ[ÈH›[šÃBˆYÚİ\™˜XÙH[™XYHÙXİ[ÛˆX™[È[™Xİ[ÛœÈY™™Xİ]™[H[š\ÚX›KƒB‹HÛÛœÛÛY]YH™[X\ÙHÔÔÈÛÈHš[˜[ØY[˜ÙH[\È]™HÛ™HÛİ\˜ÙHÙƒBˆ]ƒBƒBˆÈÈÈ\İÃBƒB‹H™XÚXÚÙY\TØÜš\[[š]\İË›ÙXİ[ÛˆZ[[™HÛYHYÙCBˆ]MÎL[™ÌŒÚ]İ]Üš^›Û[İ™\™›İËƒBƒBˆÈÈÌŒËŒŒWHHŒ‹LËL‚ˆÈÈÈÚ[™ÙY‚‹H[šYšYY\šÈ\›È[Y[œÚ[ÛœËØ\›K[YÚİ\™˜XÙ\Ë›Ü™\™Y[˜İ[Û˜[Ø\™Ëˆ\ÙÜ˜\HØØ[K[™™\ÜÛœÚ]™HÜXÚ[™ÈXÜ›ÜÜÈÜXØ[Ü˜š]ÈYÙ\Ë‚‹HÛ\šYšYYHİÜ™HØØ]ÜˆX\[™™Y\ÚYÛ™YÛÛ\Xİ[™[Û›İÛYÙBˆ\ÜÚ\İ[ÛÛ\ÜÙ\œÈ\È[›Z\İZØX›HÛÛ™\œØ][Û˜[[\™˜XÙ\Ë‚‚ˆÈÈÈš^Y‚‹HYYÛÜšÚ[™È›Øİ\ÈİŒLŒLŒ[™[Z[™È^\˜Ú\ÙH[Ù\ÈÚ]\İ[˜İˆ[œİXİ[ÛœË[Y\œË[™[İ[Ûˆ™Z]š[Ü‹‚‹H™]™[YHİÜ™HØØ]Üˆİ™\›^Hœ›ÛHÛÛY[™ÈÚ]˜]šYØ][Û‹‚‹HXYHHØ][ÙÈš\Ú]\™\\˜][ÛˆXİ[Ûˆ]˜Z[X›H[™›İ]Y[™š[š\ÚYˆ™\\˜][ÛˆÈHYXØ]Y™XÛİ™\˜X›H8 '[ˆ]™[ÜY[8 'HYÙK‚‚ˆÈÈÈ\İÂ‚‹H™XÚXÚÙY\TØÜš\[MH[š]\İË›ÙXİ[ÛˆZ[™\ÜÛœÚ]™Bˆ^[İ]Ë^\˜Ú\ÙHİÚ]Ú[™ËİÜ™HØØ]Ü‹Ø][ÙÈ˜]šYØ][Û‹[™\ÜÚ\İ[ˆØY[™ËÙ\œ›Üˆİ]\Ë‚‚ˆÈÈÌŒËŒŒHHŒ‹LËLŒÂ‚ˆÈÈÈYY‚‹HYYH™X]\™KY›YÙÙY•KÑSˆÛ›İÛYÙH\ÜÚ\İ[Ú]ØØ[[Û›H\İÜKˆ™]šY]ÙYÚ]][ÛœËØY™HXœİ[[Û‹\™Ù[İZY[˜ÙK[™š]˜XŞKYš[\™Yˆ[˜[]XÜË‚‹HYY\ÛÛ]Yİ™XİÜˆ™]šY]˜[İÜ˜YÙKHÙ\™\‹[Û›HYÙH[˜İ[Û‹ˆÙ\\˜]HÚ][™][[[™İX[[X™Y[™È›İšY\ˆY\\œË[™Bˆ˜Z[XÛÜÙY™]šY]ÙYÛİ\˜ÙH™YÚ\İKÚ[™^\‹‚‹HYY\ÚİÜÛ[Øš[H\İË›İšY\ˆ[™Ú]][ÛˆÛÛ˜XİÛİ™\˜YÙKÙXÜ™]ˆ›İ[™\HØØ[›š[™Ë[™Ü\˜][Û˜[Øİ[Y[][Ûˆ›Üˆ™]šY]È›Ûİ][™ˆ›Û˜XÚË‚‹HYYHÜXØ[Ü˜š]ÈH\ÚYÛˆŞ\İ[HXÜ›ÜÜÈHÛYHYÙKK[Û‹ˆš\Ú[Ûˆ˜XÚÙ\‹Ø][ÙË›ÙXİ]Z[Z\ÜÚ[Û‹œ˜[™İÜ™HØØ]Ü‹ˆ\Ú›Ø\™[™Û›İÛYÙH\ÜÚ\İ[^\šY[˜Ù\Ë‚‹HYY™]\ØX›H]ÛZXÈXY[™ÜËÜXØ[Ü˜š][İ[Û‹™\ÜÛœÚ]™H^[İ]ËˆİXİ\™Y\ÜÚ\İ[[œİÙ\œË[™ÛÛœÚ\İ[™^\İ\˜]šYØ][Û‹‚‚ˆÈÈÈÚ[™ÙY‚‹HZYÜ˜]YÚ\™Y\ÙÜ˜\KÛÛÜ‹ÜXÚ[™Ë›Øİ\Ë[İ[Û‹[™[Øš[Bˆ™Z]š[ÜˆÈHÜXØ[Ü˜š]ÈH›ÙXİ[\Ë‚‹HİÚ]ÚYÛ›İÛYÙH\ÜÚ\İ[Ù[™\˜][Ûˆ[™[X™Y[™ÜÈÈHœ™YBˆÛİY›\™HÛÜšÙ\œÈRHÛÛ™šYİ\˜][ÛˆÚ[H™\Ù\š[™ÈHİ\X˜\ÙH™]šY]˜[ˆ[™ØY™]H›İ[™\šY\Ë‚‚ˆÈÈÈš^Y‚‹HÙ\H\ÜÚ\İ[›İ]H[™ÛYHÚYÙ][˜]˜Z[X›HÚ[ˆH™X]\™H›YÈ\Âˆ\ØX›Y‚‹H™]™[Y›İšY\ˆXYÛ›ÜİXÜÈœ›ÛHÜ›ÜÜÚ[™ÈHX›XÈYÙH[˜İ[Ûˆ\œ›Ü‚ˆ›İ[™\K‚‹HÛÜœ™XİY\ÜÚ\İ[İYÙÙ\İ[Ûˆİ™\™›İË™XYX›H›ÙKXÛÜHÚ^š[™ËˆXØÙ\ÜÚXš[]H[İ[Ûˆ™Z]š[Ü‹[™Ş\š[XÈXY[™È˜XÚÚ[™Ë‚‚ˆÈÈÈ\İÂ‚‹H^[™Y›İ]K›İšY\‹\ÜÚ\İ[İÜ™HØØ]Ü‹]ÛZXÒXY[™Ë™X]\™Bˆ›YË™\ÜÛœÚ]™K[™\œ›Ü‹\İ]H™YÜ™\ÜÚ[ÛˆÛİ™\˜YÙK‚‚ˆÈÈÌŒ‹ŒŒWHHŒ‹LËLŒ‚ˆÈÈÈÚ[™ÙY‚‹HYY™YÜ™\ÜÚ[ÛˆÛİ™\˜YÙH]ÙY\ÈÚXÚÛİ]ÛÛXİİZY[˜ÙH[Bˆ[™Û\ÚY\ˆHİ\İÛY\ˆİÚ]Ú\È[™İXYÙ\Ë‚‹HÛ\šYšYY]H^YHX\ÛY[^\šY[˜ÙH™[XZ[œÈY[ˆ[[Bˆ\š[Ü˜š][›ÙXİÜXÚYšXØ][Ûˆ™XÙZ]™\ÈHÚYÛ™YÛØXÚ\Ú[Û‹‚‚ˆÈÈÌŒ‹ŒŒHHŒ‹LËLŒ‚ˆÈÈÈYY‚‹HYYœ›İÜÙ\‹\ÚYHİZYYØ[Y\˜HØ\\™HÈK[ÛˆÚ]]™HYYXT\Bˆ™YY˜XÚÈ›Üˆ\İ[˜ÙKXY]™[Ù[\š[™Ë[™Û™KY˜XÙHœ˜[Z[™Ë‚‹HÙ\Ø\\™Yœ˜[Y\ÈØØ[[™›İ]YØ[Y\˜H”QÜÈ›İYÚHØ[YBˆ]]ËYš]\[[™H\È\ØYYİÜËÚ]•KÑSˆ[™[Øš[HÛİ™\˜YÙK‚‹HYYHİX\™YØØ[[Û›H^YHX\^\šY[˜ÙHÚ]ÛX\ˆ]X[]Hİ]\ËˆÛÚÜÛÛ\\š\ÛÛˆ[™İXYÙKØØ[\İÜK[™š]˜XŞK\ØY™H[˜[]XÜË‚‹HYY™[X\ÙHØ]\È[™]]ÛX]Y›İ[™\HÚXÚÜÈ]ÙY\^YHX\Y[‚ˆ[[]È›ÙXİ]šY[˜ÙK[™Ûİ™\›˜[˜ÙH™\]Z\™[Y[È\™H\›İ™Y‚‹HYY›Øİ\ÙY™YÜ™\ÜÚ[ÛˆÛİ™\˜YÙH›ÜˆØ[Y\˜HÛX[\œ›İÜÙ\ˆ˜[˜XÚÜËˆ›Øİ\È™\İÜ˜][Û‹\XØ]HØ\\™H™]™[[Û‹]\İ\İÈÚ[œË[™ˆ^YHX\İÜ˜YÙH[™™\İ[[™[™Ë‚‚ˆÈÈÈÚ[™ÙY‚‹HXYHHÙ[XİYK[ÛˆØÙ[˜\š[È™[XZ[ˆš\ÚX›H[™›ÙÜ˜[[X]XØ[BˆÙ[XİYÚ[HHİ\İÛY\ˆÛÛ[Y\È›İYÚHš][™È›İË‚‚ˆÈÈÈš^Y‚‹H™]™[YØ[Y\˜Hİ™X[\Èœ›ÛH™[XZ[š[™ÈXİ]™HY\ˆ^X˜XÚÈ\œ›ÜœÈÜ‚ˆX[ÙÈÛÜİ\™K‚‹H™]™[Yİ[H˜XÙKX[˜[\Ú\È™\İ[Èœ›ÛH™\XÚ[™ÈH™]Ù\ˆ\ØYYÜ‚ˆØ\\™YİË‚‹H[œİ\™Y[\Ü˜\HØ[Y\˜Hœ˜[Y\È\™H[Ø^\È™[X\ÙY[™]™H[˜[\Ú\Âˆ]]ÛX]XØ[H™]šY\ÈY\ˆ[ˆ[™^XİY˜Z[\™K‚‚ˆÈÈÌŒKŒŒHHŒ‹LËLNB‚ˆÈÈÈYY‚‹HYYHİX\™Y^YHX\Üš[›İ[™][Ûˆ™X]\™H›YË\Y]X[]Kˆ[™™\™[˜ÙK™[˜ÚX\šËÛİ™\›˜[˜ÙK[™ÛËÛ›ËYÛÈÛÛ˜XİÈÚ]]]ÛX]Y\İË‚‹HYYH\š[Ü˜š][\˜Ú]Xİ\™Kš]˜]HS™\ÜÚ]ÜH›İ[™\KÛÛ[‹\Ù]ˆÛİ™\›˜[˜ÙK\Y˜XİX[šY™\İ™[˜ÚX\šÈ[\]\Ë™]šY]ÈXœšXË[™Ûİ\˜ÙBˆXÚšXØ[ÜXÚYšXØ][Ûˆ™\]Z\™Y›Üˆ[ˆ]Y]X›H™\ÙX\˜ÚÜZÙK‚‹HYYH›ÙXİ[Û‹X›İ[™\HÚXÚÈ]ÙY\È^YHX\\ØX›Y[œ›İ]Y[™ˆœ™YHÙˆÙ\™\‹\ÚYHS\[™[˜ÚY\È[[H™[X\ÙHØ]\È\™H\›İ™Y‚‚ˆÈÈÈÚ[™ÙY‚‹H[\›İ™Y\ÜÚX[ˆ[™[™Û\ÚØØ[^˜][ÛˆÙˆK[ÛˆØÙ[˜\š[ÜËœ˜[YH]Z[ËˆÚXÚÛİ]\ÙHØ\Ù\Ë[™š\Ú[Û‹XØ\™HX™[Ë‚‹H\™[™YHS\İ›İ[™\HH™]\›š[™ÈØ[š]^™Y[™™\™[˜ÙHØš™XİÈ[™ˆ™Z™Xİ[™È[\ÜÜÚX›H™[˜ÚX\šÈÛİ[Ë™YØ]]™H][˜ŞK[™™YÜ™\ÜÚ[Ûˆ]K‚‚ˆÈÈÈš^Y‚‹H™]™[Y[šÛ›İÛˆS™\ÜÛœÙHšY[È[™[\›˜[XYÈ]Hœ›ÛHÜ›ÜÜÚ[™ÈBˆ˜[Y]Y^YHX\[™™\™[˜ÙH›İ[™\K‚‹H™]™[Y[˜ÛÛ\]H\Y˜XİX[šY™\İÈ[™[˜[Y™[˜ÚX\šÈØ[\\Èœ›ÛBˆ›ÙXÚ[™ÈH˜[ÙHÛÈXÚ\Ú[Û‹‚‚ˆÈÈ[œ™[X\ÙY‚‹H\™[™YHÙ\šXÙKXÚXÚÛİ]™[X\ÙHØ]Nˆ\›Z[˜[^[Y[™]šY\È›İÈ›İ]HY[\İ[˜ŞHÙ^\ËHXY[™Ú[[™›Ü˜Ù\ÈÜšYÚ[‹Ø]]ÜÚ^™KÜ˜]H›İ[™\šY\Ë[™[H˜[˜XÚÈ›İXİÈZ^Y]™\œÚ[Ûˆ›Ûİ]Ë‚‹H™[[İ™Y\œÛÛ˜[ÛÛXİ˜[Y\Èœ›ÛH[H˜[˜XÚÈT“È[™YYİšXİÙ\™\‹\ÚYH˜[Y][Ûˆ›Üˆ]™\HÙ[XİYYœ˜[YHšY[‚‹H™[[İ™YÛÛXİ]Hœ›ÛHHK[Ûˆ[H˜[˜XÚÈ[™˜[Y]YØØ[KÛÛXİÚ[›™[Ûİ\˜ÙHYÙK[™UHšY[È]HYÙH›İ[™\K‚‚ˆÈÈÈYY‚‹Hš]\İÔ™XXİ\İ[™ÈXœ˜\HÛİ™\˜YÙH›ÜˆÚXÚÛİ]˜[Y][Û‹XYÜ^[Y[Ü˜Ú\İ˜][Û‹™]HY[]K[™›İ[™Y^[Y[\İ]\ÈÛ[™Ë‚‹H^]ÜšYÚ•KÑSˆ\ÚİÜ[™TÛ™K\›Ùš[HÚXÚÛİ]İ™\™›İÈÚXÚÜË‚‹HØY™HH•Pˆ^[Y[\İÛÛİ\ˆÚ]Ù\™\‹[İÛ™YšXÚ[™ËY[\İ[[[Ü™X][Û‹Ü\]YHİ]\ÈÚÙ[œË[™•KÑSˆ™]\›‹İXØÙ\ÜË[™˜Z[\™HYÙ\Ë‚‹HX›XË\ØY™H^[Y[İ]\ÈYÙH[˜İ[Ûˆ[™›ÜØ\™[Û›H]X˜\ÙH\™[š[™ÈZYÜ˜][Û‹‚‹H[™Ú[™Y\š[™È[˜›ÛÚÈ›ÜˆH[›™Y[ÛÒØ\ÜØH[YÜ˜][Û‹[˜ÛY[™È\˜Ú]Xİ\™KTHÛÛ˜XİË^[Y[İ]\ËÙXİ\š]H›İ[™\šY\Ë\İX]š^›Ûİ][™›Û˜XÚË‚‹H]™[Ü\ˆ^\šY[˜ÙH™]šY]È™\Ü›ÜˆHİ\œ™[U”œ˜[˜Ú‚‹H›ÙXİVÜ˜\\ˆ›ÜˆYYXT\K\İÙ\™Y]]ËYš]K[Û‹‚‹H›İ]HÛ[ÚÙK]\İØÜš\›ÜˆÙ^H\YÙ\È[™X›XÈÑSÈš[\Ë‚‹H]™[Ü\ˆ]ZXÚÜİ\ÛÛšX][™ÈİZYK[š\›Û›Y[[\]K[™K[ÛˆPHÚXÚÛ\İ‚‚ˆÈÈÈÚ[™ÙY‚‹H˜[œÚY[^[Y[Z[[™]H›İÈ™]\Ù\ÈHİXØÙ\ÜÙ[XY[™ÜšYÚ[˜[Y[\İ[˜ŞHÙ^NÈ™]HY\ˆH\›Z[˜[˜Z[YÜˆØ[˜Ù[Yİ]\ÈÙY\ÈHXY]›İ]\ÈHÙ^K‚‹H[™[™È^[Y[İ]\È›İÈÚXÚÜÈ]‹KL[™ŒÙXÛÛ™Ë[ˆ^ÜÙ\ÈHX[X[™Yœ™\Ú‚‹H^[Y[\™\İ[›İ]\È\™H^ÛYYœ›ÛHÙX\˜Ú[™^[™È[™™]™\ˆ™X]Hœ›İÜÙ\ˆ™Y\™Xİ\È›ÛÙˆÙˆ^[Y[‚‹H^[Y[[˜[]XÜÈ™XÛÜ™Û›HXÚšXØ[[›™[İ]\È[™™]™\ˆ^[Y[ÚÙ[œÈÜˆ\œÛÛ˜[]K‚‹H]]ËYš]K[ÛˆÛÜH›İÈ\Ù\Èİ\İÛY\‹Y˜XÚ[™È[™İXYÙH[œİXYÙˆ[\[Y[][Ûˆ[™İXYÙK‚‹Hœ˜[YH\ÜÙ]Øİ[Y[][Ûˆ›İÈ\Ù\È›ÛİYÛXZ[ˆ]È›ÜˆÎ‹Ëİš[KœİÜ™KØ‚‚ˆÈÈÈÛ›İÛ‚‚‹H™X[Ú\™Ú[™È™[XZ[œÈ\ØX›Y[[HÙ\™\ˆİÛœÈÙ™™\ˆšXÚ[™Ë[ÛÒØ\ÜØHÙXšÛÚÜÈ\™H™\šYšYY[™H^[Y[Yš[š][ÛˆÙˆÛ™H\ÈÛÛ\]K‚‹HH›Ú™Xİİ\œ™[H\È›Û‹X›ØÚÚ[™È˜\İ™Yœ™\Ú[Ø\›š[™ÜÈ[ˆ^\İ[™ÈÛÛ^[™Û›İÛYÙKX˜\ÙHš[\Ë‚‹H›ÙXİ[ÛˆZ[Ø[ˆ™YY›Ü›X[›ØÙ\ÜÈ\›Z\ÜÚ[ÛœÈÛˆÚ[™İÜÈ™XØ]\ÙHš]KÙ\ØZ[İ\ÈHÚ[›ØÙ\ÜË‚‚ˆÈÈŒ‹L‹LŒÂ‚ˆÈÈÈYY‚‹HYYXT\H˜XÙH[™X\šÙ\ˆ[YÜ˜][Ûˆ›Üˆœ›İÜÙ\‹\ÚYH˜XÙH[™X\šÈ]Xİ[Û‹‚‹H]]ËYš]œ˜[YHXÙ[Y[˜\ÙYÛˆ^YHÜÚ][Û‹œšYÙHÜÚ][Û‹[™˜XÙK]ÚY[Ë‚‹H[œİ\ÜYRPËÒRQˆ[™[™È›Üˆœ›İÜÙ\ˆİÈ\ØYË‚‹HÜ[Û˜[˜XÙK[[™X\šÈİ™\›^HY[ˆHY˜][‚‹H™[X\ÙH›İNˆØÜËÜ™[X\ÙK[YYX\\KX]]ËYš]›Y‚‚ˆÈÈÈÚ[™ÙY‚‹HK[Ûˆ›İÈ›İÈœ˜[Y\ÈYYXT\H\È4$4,´`´/´/ô/´`t,4-4.´,4/´/ô`4,4,´bØ‚‹H˜XÙKYš]ØÛÜ™H\È[šÙYÈH]]ËYš]™\İ[‚‹H\ØYYİÜÈ™[XZ[ˆØØ[ÈHœ›İÜÙ\ˆ[™\™H›İÙ[ÈHšSHÙ\™\‹‚‚ˆÈÈŒ‹L‹LN‚ˆÈÈÈYY‚‹HšSHÛ›İÛYÙH˜\ÙHYÙ\È›Üˆ˜XÙKYš]ØÛÜ™Kœ˜[YHÚ^™KYÚ™\ØÜš\[ÛœËÛ›[™HK[Ûˆ[Z]Ë˜XÙHÚ\K[™RHÛİ\˜ÙH™Y™\™[˜Ù\Ë‚‹H›Ø›İËÚ][X\[[™\Ë‚‹HÚ]XˆYÙ\Èİ\İÛKYÛXZ[ˆÙ]\›Üˆš[KœİÜ™X‚‹HX[™^Y]šXØH[YÜ˜][ÛˆÚ]ØY™H[˜[]XÜËY]™[š[\š[™Ë‚‚ˆÈÈÈÚ[™ÙY‚‹H\Ş[Y[˜\ÙH[İ™YÈ›ÛİÛXZ[ˆ]È›ÜˆÎ‹Ëİš[KœİÜ™KØ‚