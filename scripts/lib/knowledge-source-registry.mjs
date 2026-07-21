import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

export const knownLicenses = new Set(['vilu-owned', 'cc-by', 'cc-by-nc-nd', 'link-only']);

export function licenseAllowsIndexedText(source) {
  return source.license === 'vilu-owned'
    || (source.license === 'cc-by' && source.adaptationAllowed === true && source.commercialUseAllowed === true)
    || (source.independentSummary === true && Boolean(source.document));
}

export function validateSourceMetadata(source) {
  const errors = [];
  for (const key of ['id', 'slug', 'title', 'url', 'publisher', 'language', 'license', 'reviewStatus']) {
    if (!source[key]) errors.push(`${source.slug || 'unknown'}: missing ${key}`);
  }
  if (!knownLicenses.has(source.license)) errors.push(`${source.slug}: unknown license`);
  if (source.reviewStatus !== 'approved') errors.push(`${source.slug}: source is not approved`);
  if (!source.reviewedAt || !source.reviewedByRole) errors.push(`${source.slug}: missing editorial review`);
  if (!['ru', 'en'].includes(source.language)) errors.push(`${source.slug}: invalid language`);
  try { new URL(source.url); } catch { errors.push(`${source.slug}: invalid URL`); }
  if (source.index !== false) {
    if (!source.document || !source.contentSha256) errors.push(`${source.slug}: indexed source needs document and hash`);
    if (!licenseAllowsIndexedText(source)) errors.push(`${source.slug}: license does not allow indexed text`);
    if (source.translatedFrom && source.adaptationAllowed !== true) errors.push(`${source.slug}: translation is an unapproved adaptation`);
  }
  return errors;
}

export function chunkMarkdown(content, maxCharacters = 1200) {
  const paragraphs = content.replace(/\r/g, '').split(/\n\s*\n/).map((part) => part.trim()).filter(Boolean);
  const chunks = [];
  let heading = '';
  let buffer = '';
  for (const paragraph of paragraphs) {
    if (paragraph.startsWith('#')) heading = paragraph.replace(/^#+\s*/, '');
    if (buffer && buffer.length + paragraph.length + 2 > maxCharacters) {
      chunks.push({ heading, content: buffer, tokenCount: Math.max(1, Math.ceil(buffer.length / 4)) });
      buffer = paragraph;
    } else {
      buffer = buffer ? `${buffer}\n\n${paragraph}` : paragraph;
    }
  }
  if (buffer) chunks.push({ heading, content: buffer, tokenCount: Math.max(1, Math.ceil(buffer.length / 4)) });
  return chunks;
}

export async function loadReviewedRegistry(registryPath) {
  const registry = JSON.parse(await readFile(registryPath, 'utf8'));
  if (registry.version !== 1 || !Array.isArray(registry.sources)) throw new Error('registry: invalid schema');
  const errors = registry.sources.flatMap(validateSourceMetadata);
  const indexed = [];
  for (const source of registry.sources) {
    if (source.index === false) continue;
    const documentPath = resolve(dirname(registryPath), source.document);
    const content = await readFile(documentPath, 'utf8');
    const hash = createHash('sha256').update(content).digest('hex');
    if (hash !== source.contentSha256) errors.push(`${source.slug}: content hash differs; editorial re-review required`);
    indexed.push({ ...source, content, chunks: chunkMarkdown(content) });
  }
  if (errors.length) throw new Error(errors.join('\n'));
  return { allSources: registry.sources, indexed };
}
