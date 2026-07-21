# Knowledge Assistant architecture

## Scope

`/assistant` is a feature-flagged supplement to the existing ViLu knowledge
pages. It does not change try-on, Face-fit score, Eye Map, profile, checkout,
payments, store locator, canonical metadata, or existing knowledge slugs.

## Data flow

1. The browser sends only the current query, `ru`/`en`, up to six bounded
   recent turns, and allowlisted preferences to `knowledge-assistant`.
2. The Edge Function validates a 16 KB JSON request, applies a content-free
   rate key, and runs deterministic urgent-language classification.
3. Non-urgent queries are embedded with the configured multilingual
   1024-dimensional provider.
4. `match_knowledge_chunks` returns at most eight chunks whose sources remain
   editorially approved and above the server-owned similarity threshold.
5. Qwen receives only policy, preferences, recent context, and retrieved
   chunks with opaque source ids.
6. Model JSON is treated as untrusted. Every substantive claim must cite an id
   in the retrieved set. One correction retry is allowed; otherwise the service
   abstains.
7. The browser renders numbered sources and stores history and preferences in
   versioned `localStorage` only.

## Trust boundaries

- Browser input cannot choose prompts, provider URLs/models, source ids,
  thresholds, or database credentials.
- `SUPABASE_SERVICE_ROLE_KEY` and provider keys are Supabase Secrets and must
  never use the `VITE_` prefix.
- Browser roles have no policy or grants for `knowledge_sources` or
  `knowledge_chunks`; only `service_role` can execute the retrieval RPC.
- Source text is indexable only after registry license and review gates pass.
- Request/response bodies are never logged. Operational errors contain only a
  stable category.
- Analytics accepts coarse enums and ids only. Raw query, answer, health text,
  contact data, prescriptions, images, chat history, and user URLs are dropped.

## Failure behavior

- Missing provider configuration or provider outage: `502`, local draft kept,
  retry shown.
- Retrieval/database outage: `503`, local draft kept, retry shown.
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
