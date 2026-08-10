import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createEmbeddingClient,
  createSupabaseRpcClient,
  loadApprovedArtifact,
  publishApprovedArtifact,
} from './lib/corpus-publication.mjs';

const root = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const args = process.argv.slice(2);
const artifactFlag = args.indexOf('--artifact');
const artifactSha256Flag = args.indexOf('--artifact-sha256');
if (artifactFlag < 0 || !args[artifactFlag + 1]
  || artifactSha256Flag < 0 || !args[artifactSha256Flag + 1]) {
  throw new Error('Usage: node scripts/publish-approved-corpus.mjs --artifact <protected-directory> --artifact-sha256 <workflow-artifact-digest> [--publish]');
}
const artifactDirectory = resolve(args[artifactFlag + 1]);
const observedArtifactSha256 = args[artifactSha256Flag + 1].replace(/^sha256:/, '');
const publish = args.includes('--publish');
const registryPath = resolve(root, 'content/knowledge-assistant/approved-corpus-publications.json');
const loaded = await loadApprovedArtifact(artifactDirectory, registryPath, { observedArtifactSha256 });

console.log(JSON.stringify({
  mode: publish ? 'publish' : 'dry-run',
  corpusVersion: loaded.approval.corpusVersion,
  manifestSha256: loaded.approval.manifestSha256,
  sourceCount: loaded.mappedDocuments.length,
  chunkCount: loaded.approval.expectedChunkCount,
  licenseCounts: loaded.stats.licenses,
}, null, 2));

if (publish) {
  const embedBatch = createEmbeddingClient({
    baseUrl: process.env.KNOWLEDGE_EMBEDDING_BASE_URL,
    apiKey: process.env.KNOWLEDGE_EMBEDDING_API_KEY,
    model: process.env.KNOWLEDGE_EMBEDDING_MODEL,
  });
  const rpc = createSupabaseRpcClient({
    url: process.env.SUPABASE_URL,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  });
  const publicationId = await publishApprovedArtifact(loaded, { embedBatch, rpc });
  console.log(JSON.stringify({ status: 'activated', publicationId }));
}
