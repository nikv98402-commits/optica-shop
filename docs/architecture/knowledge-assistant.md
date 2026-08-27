# Knowledge Assistant architecture

## Scope

`/assistant` is a feature-flagged supplement to the existing ViLu knowledge
pages. It does not change try-on, Face-fit score, Eye Map, profile, checkout,
payments, store locator, canonical metadata, or existing knowledge slugs.

## Data flow

1. The browser sends only the current query, `ru`/`en`, up to six bounded
   recent turns, and allowlisted preferences to `knowledge-assistant`.
2. The Edge Function validates a 16 KB JSON request and runs deterministic
   urgent-language classification.
3. Normal requests consume an atomic Supabase rate-limit bucket keyed by a
   short salted hash; no raw IP address is stored.
4. One server-owned deadline bounds the complete request. Each rate-limit,
   embedding, retrieval, chat, correction, and external-source stage receives
   only its remaining budget and an abort signal.
5. Non-urgent queries are embedded with the configured multilingual
   1024-dimensional provider.
6. `match_knowledge_chunks` returns at most eight chunks whose sources remain
   editorially approved and above the server-owned similarity threshold.
7. The configured Cloudflare Workers AI chat model receives only policy,
   preferences, recent context, and retrieved chunks with opaque source ids.
8. Model JSON is treated as untrusted. Every claim must provide a retrieved
   chunk id and an exact supporting quote. The server verifies the quote and
   derives citations from the chunk. One correction retry is allowed only when
   enough request budget remains.
9. Approved link-only sources are returned as clearly separated external
   reading and never enter model context.
10. The browser renders numbered sources and stores history and preferences in
   versioned `localStorage` only.

Approved external corpus releases reuse the same `knowledge_sources` and
`knowledge_chunks` tables. Corpus rows are linked to a version that is built in
`staging`; retrieval includes them only after exact manifest counts pass and a
single transaction marks that version `active`. Existing ViLu-owned sources
remain unversioned and continue to use their original editorial lifecycle.

## Trust boundaries

- Browser input cannot choose prompts, provider URLs/models, source ids,
  thresholds, or database credentials.
- `SUPABASE_SERVICE_ROLE_KEY` and provider keys are Supabase Secrets and must
  never use the `VITE_` prefix.
- Browser roles have no policy or grants for `knowledge_sources` or
  `knowledge_chunks`; only `service_role` can execute the retrieval RPC.
- Source text is indexable only after registry license and review gates pass.
- Corpus publication additionally requires an exact, non-revoked
  owner-editor manifest approval stored in the server-only approval registry.
- Staging, failed, superseded, and rolled-back corpus versions are excluded
  inside the retrieval RPC, not by browser input.
- The indexer creates all embeddings before a transactional RPC replaces live
  chunks, so a provider failure cannot empty a published source.
- Request/response bodies are never logged. Operational errors contain only a
  stable category. Stage timing logs contain only the stage, status, duration,
  and remaining budget; they never contain prompts, answers, retrieved text,
  tokens, keys, or secrets.
- Analytics accepts coarse enums and ids only. Raw query, answer, health text,
  contact data, prescriptions, images, chat history, and user URLs are dropped.

## Failure behavior

- Missing provider configuration or provider outage: `502`, local draft kept,
  retry shown.
- Retrieval/database outage: `503`, local draft kept, retry shown.
- Request deadline exhausted: `504`, active provider/database work is aborted,
  local draft kept, retry shown, and no late response is rendered.
- No supporting chunk: HTTP 200 abstention without model generation.
- Invalid model JSON/citation: one correction, then abstention.
- Urgent red flag: deterministic urgent guidance, even if providers are down.
- Rollback: set `VITE_FEATURE_KNOWLEDGE_ASSISTANT=false`; isolated database
  objects may remain dormant.

## Provider replacement

`EmbeddingProvider` and `ChatProvider` are independent interfaces under
`supabase/functions/_shared/knowledge-assistant`. OpenAI-compatible managed
inference can be replaced with self-hosted vLLM without changing the public
browser contract. The embedding model must remain multilingual and output
exactly 1024 dimensions unless a reviewed migration changes the schema.
