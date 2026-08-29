# Knowledge Assistant deployment

## Frontend state

The feature is available only when the frontend is built with exactly:

```text
VITE_FEATURE_KNOWLEDGE_ASSISTANT=true
```

Missing, `false`, or any other value hides navigation and safely redirects
direct `/assistant` visits. The current GitHub Pages workflow explicitly sets
this value to `true`; preview or rollback builds may still set it to `false`.
This flag is separate from every `VITE_FEATURE_VILU_*` protected-workspace flag.

## Server-only configuration

Configure these with Supabase Secrets, never in frontend `.env` or GitHub Pages:

```text
KNOWLEDGE_CHAT_BASE_URL
KNOWLEDGE_CHAT_API_KEY
KNOWLEDGE_CHAT_MODEL
KNOWLEDGE_EMBEDDING_BASE_URL
KNOWLEDGE_EMBEDDING_API_KEY
KNOWLEDGE_EMBEDDING_MODEL
KNOWLEDGE_ALLOWED_ORIGINS
RATE_LIMIT_SALT
```

The indexer additionally needs `SUPABASE_URL` and
`SUPABASE_SERVICE_ROLE_KEY` in its controlled server environment.

The Edge Function pins `npm:@supabase/supabase-js@2.50.0` in
`supabase/functions/knowledge-assistant/index.ts`. Keep its function-specific
`deno.json` and frozen `deno.lock` together; do not replace the npm import with
an `esm.sh` dependency chain.

## Deadline and observability

The Edge Function owns one 18-second deadline for the complete Ask ViLu
pipeline. Rate limiting, embedding, retrieval, chat, citation correction, and
external-source loading use bounded slices of that shared budget and propagate
abort signals to supported provider and Supabase requests. The browser also
aborts its invocation when its client timeout expires. These limits are
code-owned safety boundaries, not deployment secrets or environment settings.

An exhausted server deadline returns HTTP `504` with `request_timeout`. Monitor
`knowledge_assistant_stage_timing` for the stage, status, duration, and remaining
budget. This event is intentionally structural: do not add prompts, answers,
retrieved text, token values, keys, or secrets to it. Bounded numeric provider
usage counts, `finishReason`, `maxTokensReached`, response shape and validation
category are permitted because they contain no model content. A `504` should
leave the user's draft available for retry and must not produce a late answer
in the browser.

## Free Cloudflare Workers AI configuration

Cloudflare Workers AI exposes OpenAI-compatible chat and embedding endpoints,
so the existing provider adapters do not require a code fork. On the Workers
Free plan, configure the Supabase secrets as follows, replacing
`<CLOUDFLARE_ACCOUNT_ID>` and `<CLOUDFLARE_API_TOKEN>` with values from
Cloudflare Workers AI -> Use REST API:

```text
KNOWLEDGE_CHAT_BASE_URL=https://api.cloudflare.com/client/v4/accounts/<CLOUDFLARE_ACCOUNT_ID>/ai/v1
KNOWLEDGE_CHAT_API_KEY=<CLOUDFLARE_API_TOKEN>
KNOWLEDGE_CHAT_MODEL=@cf/meta/llama-3.1-8b-instruct-fast
KNOWLEDGE_EMBEDDING_BASE_URL=https://api.cloudflare.com/client/v4/accounts/<CLOUDFLARE_ACCOUNT_ID>/ai/v1
KNOWLEDGE_EMBEDDING_API_KEY=<CLOUDFLARE_API_TOKEN>
KNOWLEDGE_EMBEDDING_MODEL=@cf/qwen/qwen3-embedding-0.6b
```

The chat model must support strict JSON Schema response formatting for the
existing `ModelAnswer` contract. The multilingual embedding model returns the
1024 dimensions required by the database schema.
Use the same embedding model for live queries and indexing. If the existing
index was produced by a different embedding model, run
`npm run knowledge:index` before enabling the assistant.

## Preview rollout

Use a dedicated Supabase project and a dedicated Vercel Preview deployment.
Never point preview service-role credentials at production. The full acceptance
contract is in `docs/specs/knowledge-assistant-preview-rollout.md`.

1. Apply `20260721100000_create_knowledge_assistant.sql`. Confirm the atomic
   rate-limit and source-replacement RPCs are executable only by `service_role`.
2. Deploy the `knowledge-assistant` Edge Function with request-body logging
   disabled.
3. Configure `KNOWLEDGE_PREVIEW_ORIGIN` in the trusted operator environment and
   include the same origin in `KNOWLEDGE_ALLOWED_ORIGINS`.
4. Run `npm run knowledge:preview:check` to reject mixed preview/production
   configuration before making network calls.
5. Run `npm run knowledge:index:dry`; obtain editorial approval.
6. Run `npm run knowledge:index` from a trusted environment. This writes
   link-only metadata and replaces each indexed source transactionally.
7. Run `npm run knowledge:preview:check:live`. It requires exactly six approved
   ViLu-owned indexed sources, 1024-dimensional embeddings, and at least one
   citation in the smoke answer.
8. Build Vercel Preview with `VITE_FEATURE_KNOWLEDGE_ASSISTANT=true`, the preview
   Supabase URL, and its anon key. Do not change the production build flag as
   part of preview acceptance.
9. Complete RU/EN desktop and 320 px mobile acceptance, urgent guidance,
   abstention, retry, citations, local clear, and secret scan.
10. Enable production only in a separate change after explicit safety,
    editorial, and product sign-off.

## Production deployment and verification

From the reviewed `main` commit, verify the function module and deploy only the
function named below:

```powershell
cd supabase/functions/knowledge-assistant
deno check --frozen index.ts
cd ../../..
npx --yes supabase@2.115.0 functions deploy knowledge-assistant --project-ref <project-ref>
```

After deployment, perform read-only RU/EN checks on desktop and mobile
390×844. Verify supported, abstention and timeout paths; citations; HTTP status;
console errors; and that structural diagnostics contain no prompt, answer,
retrieved text, token value, API key or secret. Numeric usage counters and
content-free shape/validation categories may be present. Also verify direct
load and reload with history from the opposite locale, legacy-v1 fail-closed
cleanup, persistence of valid shared preferences, and RU→EN→RU during an
unfinished request without a late answer.

Do not apply database migrations, enable protected-workspace feature flags or
start data-deletion processing as part of an Ask ViLu-only deployment.

## Rollback

Rebuild with `VITE_FEATURE_KNOWLEDGE_ASSISTANT=false`. Do not destructively
roll back the shared database migration. Existing knowledge pages remain the
fallback. Provider configuration can be rotated without a frontend release.
