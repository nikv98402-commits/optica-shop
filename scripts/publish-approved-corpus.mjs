import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  activateStagedPublication,
  createCheckpointStore,
  createEmbeddingClient,
  createSupabaseRpcClient,
  loadApprovedArtifact,
  stageApprovedArtifact,
} from './lib/corpus-publication.mjs';

const root = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const args = process.argv.slice(2);
const artifactFlag = args.indexOf('--artifact');
const artifactSha256Flag = args.indexOf('--artifact-sha256');
const checkpointFlag = args.indexOf('--checkpoint');
const stageOnly = args.includes('--stage-only');
const activate = args.includes('--activate');
if (artifactFlag < 0 || !args[artifactFlag + 1]
  || artifactSha256Flag < 0 || !args[artifactSha256Flag + 1]
  || (checkpointFlag >= 0 && !args[checkpointFlag + 1])
  || (stageOnly && activate)
  || args.includes('--publish')) {
  throw new Error('Usage: node scripts/publish-approved-corpus.mjs --artifact <protected-directory> --artifact-sha256 <workflow-artifact-digest> [--checkpoint <path>] [--stage-only | --activate]');
}
const artifactDirectory = resolve(args[artifactFlag + 1]);
const observedArtifactSha256 = args[artifactSha256Flag + 1].replace(/^sha256:/, '');
const registryPath = resolve(root, 'content/knowledge-assistant/approved-corpus-publications.json');
const loaded = await loadApprovedArtifact(artifactDirectory, registryPath, { observedArtifactSha256 });
const checkpointPath = checkpointFlag >= 0
  ? resolve(args[checkpointFlag + 1])
  : resolve(root, '.gstack/corpus-checkpoints', `${loaded.approval.manifestSha256}.json`);

console.log(JSON.stringify({
  mode: stageOnly ? 'stage-only' : activate ? 'activate' : 'dry-run',
  corpusVersion: loaded.approval.corpusVersion,
  manifestSha256: loaded.approval.manifestSha256,
  sourceCount: loaded.mappedDocuments.length,
  chunkCount: loaded.approval.expectedChunkCount,
  licenseCounts: loaded.stats.licenses,
  checkpointPath,
}, null, 2));

if (stageOnly || activate) {
  const checkpointStore = createCheckpointStore(checkpointPath);
  const rpc = createSupabaseRpcClient({
    url: process.env.SUPABASE_URL,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  });

  if (activate) {
    const publicationId = await activateStagedPublication(loaded, { rpc, checkpointStore });
    console.log(JSON.stringify({ status: 'activated', publicationId }));
  } else {
    const embedBatch = createEmbeddingClient({
      baseUrl: process.env.KNOWLEDGE_EMBEDDING_BASE_URL,
      apiKey: process.env.KNOWLEDGE_EMBEDDING_API_KEY,
      model: process.env.KNOWLEDGE_EMBEDDING_MODEL,
    });
    const result = await stageApprovedArtifact(loaded, {
      embedBatch,
      rpc,
      checkpointStore,
    });
    console.log(JSON.stringify({
      status: 'staged-and-verified',
      publicationId: result.publicationId,
      activationPerformed: false,
    }));
  }
}
