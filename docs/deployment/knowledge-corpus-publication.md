# Approved ophthalmology corpus publication

## Scope and status

This runbook implements GitHub #89. It prepares a reviewed corpus version for
the existing Knowledge Assistant index; it does not create a second RAG stack,
change the browser contract, tune retrieval, or enable production by itself.

The first approved version is pinned to:

- corpus version `ophthalmology-pilot-2026-08-10`;
- source `common-pile/pubmed` revision
  `648b8cfc93953ca0663a9c96a8d842a91b98fb64`;
- manifest SHA-256
  `8cdee30ea536d4f53524fcd5b50893191ee8763423fc27cc8d7449d17d49fd9f`;
- protected artifact digest
  `sha256:6f63485962b19269cdd7b7d459888ae4ec60289ecb6c761903e3ee322c050adf`;
- 301 owner-editor-approved `CC-BY-4.0` documents and 6,663 chunks;
- Cloudflare Workers AI model `@cf/qwen/qwen3-embedding-0.6b`, exactly 1024
  dimensions.

The complete text stays in the protected workflow artifact. Only approval
metadata is committed. Never copy `documents.jsonl`, parquet files, embeddings,
or generated publication payloads into Git, Pages, browser assets, logs, or
analytics.

## Database migration

Apply `20260810100000_add_approved_knowledge_corpus_publication.sql` only in a
separately approved deployment step. It:

1. creates a server-only manifest approval registry;
2. creates versioned staging/active publication metadata;
3. links corpus documents to the existing `knowledge_sources` lifecycle;
4. keeps staged, failed, rolled-back, and superseded versions out of
   `match_knowledge_chunks`;
5. grants publication and rollback RPCs only to `service_role`.

Run `supabase/tests/knowledge_corpus_publication.sql` against local Supabase
before any deployment. Browser roles must retain zero table and RPC privileges.

## Validate the protected artifact

Dry-run is the default and performs no provider or Supabase requests:

```bash
npm run knowledge:corpus -- \
  --artifact /protected/path/to/artifact \
  --artifact-sha256 6f63485962b19269cdd7b7d459888ae4ec60289ecb6c761903e3ee322c050adf
```

It fails closed unless the exact manifest is present in
`content/knowledge-assistant/approved-corpus-publications.json`, all manifest
file hashes match, the supplied GitHub Actions protected-artifact digest equals
the owner-editor-approved digest, accepted counts match, every accepted license
is allowlisted, and deterministic chunk reconstruction produces exactly 6,663
chunks. The whole-artifact digest is supplied explicitly because it belongs to
the protected workflow archive layer and cannot be reconstructed from the
extracted directory alone.

## Stage and activate separately

Live publication requires a separate production approval and server-only
environment variables:

```text
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
KNOWLEDGE_EMBEDDING_BASE_URL
KNOWLEDGE_EMBEDDING_API_KEY
KNOWLEDGE_EMBEDDING_MODEL=@cf/qwen/qwen3-embedding-0.6b
```

If the production endpoints are reachable only through a proxy, set
`HTTPS_PROXY` (preferred) or `HTTP_PROXY` to an `http://` or `https://` proxy
URL. The publisher uses the same proxy for Supabase and Cloudflare requests.

After staging approval, generate embeddings and upload a staging publication:

```bash
npm run knowledge:corpus -- \
  --artifact /protected/path/to/artifact \
  --artifact-sha256 6f63485962b19269cdd7b7d459888ae4ec60289ecb6c761903e3ee322c050adf \
  --checkpoint /protected/path/to/corpus-checkpoint.json \
  --stage-only
```

The command verifies both network endpoints before staging, uses 60-second
request timeouts, and retries embeddings and idempotent staging RPCs with
bounded backoff. It verifies the exact source and chunk counts and runs a
staging-only retrieval smoke test, but never activates the publication.
Retrieval continues to use the prior active version.

The checkpoint contains no corpus text or embeddings. Re-run the same command
with the same checkpoint to resume an interrupted upload. When `--checkpoint`
is omitted, the default is
`.gstack/corpus-checkpoints/<manifest-sha256>.json`.

Activation is a separate, explicitly approved operation:

```bash
npm run knowledge:corpus -- \
  --artifact /protected/path/to/artifact \
  --artifact-sha256 6f63485962b19269cdd7b7d459888ae4ec60289ecb6c761903e3ee322c050adf \
  --checkpoint /protected/path/to/corpus-checkpoint.json \
  --activate
```

Activation is intentionally non-retryable after a network failure because the
server may have committed the transaction even if the response was lost.
Inspect the publication state before deciding whether another activation
attempt is safe. A successful transaction marks the previous version
`superseded` and the staged version `active`.

Provider, validation, or staging failure leaves the previous active index
unchanged. Logs contain aggregate counts and stable failure categories, never
corpus text.

## Rollback

Rollback is server-only and always targets the immediate prior active version:

```sql
select public.rollback_knowledge_corpus_publication('<active-publication-id>');
```

The transaction marks the current version `rolled_back` and reactivates its
recorded predecessor. Verify the active row and run a bounded retrieval smoke
test afterward. Do not delete either version during incident response.

## Release checks

- approved manifest and protected artifact hashes match;
- all accepted documents have exact allowlisted licenses;
- reconstructed counts are 301 sources / 6,663 chunks;
- every embedding has 1024 finite values;
- SQL integration tests prove staging invisibility, atomic activation and
  rollback;
- anon/authenticated retain no corpus table/RPC privileges;
- existing ViLu-owned sources (`corpus_publication_id IS NULL`) remain
  retrievable;
- production publication remains disabled until its own explicit approval.
