import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createEmbeddingClient, createSupabaseRpcClient } from './lib/corpus-publication.mjs';
import {
  createLiveCaseRunner,
  createFixtureRunner,
  evaluateGoldenSet,
  loadGoldenSet,
} from './lib/knowledge-retrieval-evaluation.mjs';

const root = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const args = process.argv.slice(2);
const fixture = args.includes('--fixture');
const outputFlag = args.indexOf('--output');
const outputPath = resolve(outputFlag >= 0 && args[outputFlag + 1]
  ? args[outputFlag + 1]
  : 'artifacts/knowledge-retrieval-evaluation.json');
const goldenSet = await loadGoldenSet(resolve(
  root,
  'content/knowledge-assistant/retrieval-golden-set-v1.json',
));

function requiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required for live retrieval evaluation`);
  return value;
}

function createLiveRunner() {
  const embed = createEmbeddingClient({
    baseUrl: requiredEnv('KNOWLEDGE_EMBEDDING_BASE_URL'),
    apiKey: requiredEnv('KNOWLEDGE_EMBEDDING_API_KEY'),
    model: goldenSet.release.embeddingModel,
  });
  const rpc = createSupabaseRpcClient({
    url: requiredEnv('SUPABASE_URL'),
    serviceRoleKey: requiredEnv('SUPABASE_SERVICE_ROLE_KEY'),
  });
  return createLiveCaseRunner({ embed, rpc, goldenSet });
}

const report = await evaluateGoldenSet(
  goldenSet,
  fixture ? createFixtureRunner(goldenSet) : createLiveRunner(),
);
await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({
  mode: fixture ? 'fixture-contract' : 'live-read-only',
  outputPath,
  passed: report.passed,
  metrics: report.metrics,
}, null, 2));
if (!report.passed) process.exitCode = 1;
