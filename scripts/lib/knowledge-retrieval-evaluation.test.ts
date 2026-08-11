import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildSupportedResponse, CitationValidationError } from '../../supabase/functions/_shared/knowledge-assistant/citations.ts';
import {
  APPROVED_MANIFEST_SHA256,
  createFixtureRunner,
  createLiveCaseRunner,
  evaluateGoldenSet,
  loadGoldenSet,
  validateExactEvidence,
  validateGoldenSet,
} from './knowledge-retrieval-evaluation.mjs';

const goldenPath = resolve('content/knowledge-assistant/retrieval-golden-set-v1.json');

describe('knowledge retrieval release gate', () => {
  it('loads a pinned, bilingual 100-case golden set', async () => {
    const golden = await loadGoldenSet(goldenPath);
    expect(golden.release.manifestSha256).toBe(APPROVED_MANIFEST_SHA256);
    expect(golden.cases).toHaveLength(100);
    expect(golden.cases.filter((entry: { locale: string }) => entry.locale === 'ru').length).toBeGreaterThanOrEqual(40);
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
