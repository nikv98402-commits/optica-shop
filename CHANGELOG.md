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
  diagnosed before anoÍûç«h‘éì¶»§q«^vlength).toBeGreaterThanOrEqual(40);
    expect(golden.cases.filter((entry: { locale: string }) => entry.locale === 'en').length).toBeGreaterThanOrEqual(40);
    expect(golden.cases.filter((entry: { safetyClass: string }) => entry.safetyClass === 'unanswerable')).toHaveLength(10);
  });

  it('passes the deterministic fixture contract', async () => {
    const golden = await loadGoldenSet(goldenPath);
    const report = await evaluateGoldenSet(golden, createFixtureRunner(golden));
    expect(report.passed).toBe(true);
    expect(report.metrics).toMatchObject({
      caseCount: 100,
      recallAt8: 1,
      approvedActiveChunkRate: 1,
      exactQuoteRate: 1,
      abstentionRate: 1,
    });
  });

  it('fails closed for wrong provenance, unsupported evidence, and missed abstention', async () => {
    const golden = await loadGoldenSet(goldenPath);
    const fixture = createFixtureRunner(golden);
    const report = await evaluateGoldenSet(golden, async (entry: { id: string; safetyClass: string }) => {
      const result = await fixture(entry);
      if (entry.id === 'ru-visual-acuity-01') {
        result.chunks[0].manifestSha256 = 'f'.repeat(64);
        result.response.claims[0].evidence[0].quote = 'not present in the reviewed chunk';
      }
      if (entry.id === 'ru-unanswerable-01') result.response.confidence = 'supported';
      return result;
    });
    expect(report.passed).toBe(false);
    expect(report.gates.approvedActiveOnly).toBe(false);
    expect(report.gates.exactQuotes).toBe(false);
    expect(report.gates.unanswerableAbstention).toBe(false);
  });

  it('fails when Recall@8 is below the release threshold and ignores a ninth-place hit', async () => {
    const golden = await loadGoldenSet(goldenPath);
    const fixture = createFixtureRunner(golden);
    let answerableSeen = 0;
    const report = await evaluateGoldenSet(golden, async (entry: { safetyClass: string; expectedSourceIds: string[] }) => {
      if (entry.safetyClass === 'unanswerable') return fixture(entry);
      answerableSeen += 1;
      if (answerableSeen > 76) {
        const result = await fixture(entry);
        result.chunks = [
          ...Array.from({ length: 8 }, (_, index) => ({
            ...result.chunks[0],
            chunkId: `miss-${answerableSeen}-${index}`,
            sourceId: '00000000-0000-4000-8000-000000000000',
          })),
          { ...result.chunks[0], chunkId: `ninth-${answerableSeen}` },
        ];
        result.response.claims[0].evidence[0] = {
          chunkId: result.chunks[0].chunkId,
          quote: result.chunks[0].content,
        };
        return result;
      }
      return fixture(entry);
    });
    expect(report.metrics.recallAt8).toBeLessThan(0.85);
    expect(report.gates.recallAt8).toBe(false);
    expect(report.passed).toBe(false);
  });

  it('maps the live embedding and RPC boundary without exposing mutation methods', async () => {
    const golden = await loadGoldenSet(goldenPath);
    const calls: unknown[] = [];
    const embed = async (texts: string[]) => {
      calls.push(['embed', texts]);
      return [Array.from({ length: 1024 }, () => 0.25)];
    };
    const rpc = async (name: string, params: Record<string, unknown>) => {
      calls.push(['rpc', name, params]);
      return [{
        chunk_id: 'chunk-live-1',
        source_id: golden.cases[0].expectedSourceIds[0],
        content: 'A reviewed live retrieval sentence is available.',
        manifest_sha256: golden.release.manifestSha256,
        publication_status: 'active',
      }];
    };
    const runCase = createLiveCaseRunner({ embed, rpc, goldenSet: golden });
    const result = await runCase(golden.cases[0]);
    expect(calls[0]).toEqual(['embed', [golden.cases[0].question]]);
    expect(calls[1]).toEqual(['rpc', 'evaluate_knowledge_retrieval', {
      query_embedding: Array.from({ length: 1024 }, () => 0.25),
      required_manifest_sha256: golden.release.manifestSha256,
      match_count: 8,
      similarity_threshold: 0.58,
    }]);
    expect(result.response.confidence).toBe('supported');
    expect(validateExactEvidence(result.response, result.chunks)).toBe(true);
  });

  it('keeps the evaluation exact-quote rule aligned with the runtime validator', () => {
    const chunks = [{
      chunkId: 'chunk-1', sourceId: 'source-1', sourceSlug: 'source', title: 'Source',
      url: 'https://example.test/source', publisher: 'Publisher', publishedAt: '2024-01-01',
      licenseCode: 'CC-BY-4.0', locale: 'en' as const, heading: 'Heading',
      content: 'A reviewed exact evidence sentence is available here.', similarity: 0.9,
    }];
    const supported = {
      claims: [{ text: 'Informational claim.', evidence: [{ chunkId: 'chunk-1', quote: 'exact evidence sentence' }] }],
    };
    expect(validateExactEvidence(supported, chunks)).toBe(true);
    expect(() => buildSupportedResponse(supported, chunks, 'en')).not.toThrow();
    const unsupported = {
      claims: [{ text: 'Informational claim.', evidence: [{ chunkId: 'chunk-1', quote: 'invented evidence text' }] }],
    };
    expect(validateExactEvidence(unsupported, chunks)).toBe(false);
    expect(() => buildSupportedResponse(unsupported, chunks, 'en')).toThrow(CitationValidationError);
  });

  it('rejects manifest drift and undersized golden sets', async () => {
    const golden = await loadGoldenSet(goldenPath);
    expect(() => validateGoldenSet({
      ...golden,
      release: { ...golden.release, manifestSha256: '0'.repeat(64) },
    })).toThrow('approved manifest');
    expect(() => validateGoldenSet({ ...golden, cases: golden.cases.slice(0, 99), families: [] }))
      .toThrow('at least 100');
  });
});
