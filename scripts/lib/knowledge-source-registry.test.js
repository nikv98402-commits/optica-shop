import { describe, expect, it } from 'vitest';
import {
  chunkMarkdown,
  licenseAllowsIndexedText,
  normalizeKnowledgeContent,
  validateSourceMetadata,
} from './knowledge-source-registry.mjs';

const base = {
  id: 'id', slug: 'source', title: 'Title', url: 'https://example.com', publisher: 'Publisher', language: 'en',
  license: 'vilu-owned', adaptationAllowed: true, commercialUseAllowed: true, reviewStatus: 'approved',
  reviewedAt: '2026-07-21T00:00:00Z', reviewedByRole: 'editor', document: 'doc.md', contentSha256: 'hash',
};

describe('knowledge source licensing', () => {
  it('allows owned and commercial CC BY source text', () => {
    expect(licenseAllowsIndexedText(base)).toBe(true);
    expect(licenseAllowsIndexedText({ ...base, license: 'cc-by' })).toBe(true);
  });
  it('blocks ND, link-only and unknown source bodies', () => {
    expect(licenseAllowsIndexedText({ ...base, license: 'cc-by-nc-nd', adaptationAllowed: false })).toBe(false);
    expect(licenseAllowsIndexedText({ ...base, license: 'link-only', adaptationAllowed: false })).toBe(false);
    expect(validateSourceMetadata({ ...base, license: 'mystery' })).toContain('source: unknown license');
  });
  it('blocks translation when adaptation is forbidden', () => {
    expect(validateSourceMetadata({ ...base, license: 'link-only', adaptationAllowed: false, translatedFrom: 'en' }))
      .toContain('source: translation is an unapproved adaptation');
  });
  it('allows only HTTPS source links rendered by the client', () => {
    expect(validateSourceMetadata({ ...base, url: 'http://example.com' }))
      .toContain('source: source URL must use HTTPS');
    expect(validateSourceMetadata({ ...base, url: 'javascript:alert(1)' }))
      .toContain('source: source URL must use HTTPS');
    expect(validateSourceMetadata(base)).not.toContain('source: source URL must use HTTPS');
  });
  it('chunks reviewed markdown deterministically', () => {
    expect(chunkMarkdown('# A\n\nFirst.\n\nSecond.', 12).map((chunk) => chunk.content)).toEqual(['# A\n\nFirst.', 'Second.']);
  });
  it('normalizes Windows line endings before hashing and chunking', () => {
    expect(normalizeKnowledgeContent('# A\r\n\r\nFirst.\r\n')).toBe('# A\n\nFirst.\n');
    expect(chunkMarkdown('# A\r\n\r\nFirst.')).toEqual(chunkMarkdown('# A\n\nFirst.'));
  });
});
