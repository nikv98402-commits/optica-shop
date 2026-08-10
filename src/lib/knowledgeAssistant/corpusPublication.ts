export const CORPUS_EMBEDDING_PROVIDER = 'cloudflare-workers-ai' as const;
export const CORPUS_EMBEDDING_MODEL = '@cf/qwen/qwen3-embedding-0.6b' as const;
export const CORPUS_EMBEDDING_DIMENSIONS = 1024 as const;

export interface CorpusPublication {
  corpusVersion: string;
  datasetRevision: string;
  manifestSha256: string;
  configSha256: string;
  taxonomyVersion: string;
  taxonomySha256: string;
  licensePolicyVersion: string;
  chunkPolicyVersion: string;
  embeddingProvider: typeof CORPUS_EMBEDDING_PROVIDER;
  embeddingModel: typeof CORPUS_EMBEDDING_MODEL;
  embeddingDimensions: typeof CORPUS_EMBEDDING_DIMENSIONS;
  approvedAt: string;
  approvedByRole: 'owner-editor';
}

export interface ApprovedCorpusPublication extends CorpusPublication {
  protectedArtifactSha256: string;
  expectedSourceCount: number;
  expectedChunkCount: number;
}
