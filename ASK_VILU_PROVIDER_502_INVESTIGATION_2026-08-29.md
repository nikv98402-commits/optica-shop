# Ask ViLu production HTTP 502 investigation

Date: 2026-08-29  
Production project: `ygdjkeqdzcibgbuasjak`  
Edge Function: `knowledge-assistant`, version 39, `ACTIVE`  
Source: `origin/main` at `fdca846`

## Scope and safety

This was a read-only investigation. No production configuration, code, migrations,
data, feature flags, or deletion workflows were changed. Request and response text,
retrieved passages, tokens, API keys, secret values, and provider credentials were
not logged or retained.

## Symptom

The post-PR #124 deployment can return a valid grounded response, but intermittently
returns HTTP 502 `provider_unavailable`. The deployment can start successfully, so
this is distinct from the earlier Edge Runtime startup failure.

## Evidence

### Deployment and configuration

- Function version 39 is active.
- Every required `KNOWLEDGE_CHAT_*`, `KNOWLEDGE_EMBEDDING_*`,
  `KNOWLEDGE_ALLOWED_ORIGINS`, and `RATE_LIMIT_SALT` secret name is present.
- Those custom secrets were last updated on 2026-07-23. Supabase does not reveal
  existing secret values, so the exact current model identifier cannot be independently
  read back. Repository deployment documentation specifies
  `@cf/meta/llama-3.1-8b-instruct-fast` for chat and
  `@cf/qwen/qwen3-embedding-0.6b` for embeddings.
- Missing configuration is ruled out for the observed failures: requests reach the
  chat stage and successful calls occur with the same deployed function and secrets.

### Production request series

The original post-deploy canary produced 7 HTTP 200 responses and 5 HTTP 502
responses. Three immediate diagnostic retries also returned HTTP 502.

A subsequent 16-request structural series produced:

- 4 HTTP 200 responses with a valid application contract and citations;
- 11 HTTP 502 responses classified as `stage=chat`,
  `reason=invalid_response`;
- 1 client-side 30-second transport timeout.

Every classified 502 had the same safe response shape:

- root: object;
- choices: non-empty array;
- message: object;
- content: non-empty string;
- content length: 724–1,141 characters;
- provider HTTP status and provider error code: absent, because the upstream request
  itself was HTTP-successful.

A balanced two-attempt matrix using the same supported topic produced:

| Locale | Viewport | HTTP 200 | HTTP 502 | Duration range |
| --- | --- | ---: | ---: | --- |
| RU | desktop | 0 | 2 | 3.4–6.5 s |
| RU | mobile 390×844 | 0 | 2 | 3.2–5.0 s |
| EN | desktop | 2 | 0 | 2.6–3.5 s |
| EN | mobile 390×844 | 2 | 0 | 2.5–5.3 s |

Viewport and client user agent do not affect the server pipeline. Locale and prompt
content do affect model output compliance. Earlier mixed-question series also showed
some EN failures, so the defect is not exclusively Russian, but Russian reproduced it
deterministically in the balanced sample.

### Pipeline elimination

- Embedding and retrieval complete before the chat stage; otherwise the function
  could not report a chat-stage provider error.
- The failures complete well below the shared 18-second server deadline and are not
  `request_timeout`/HTTP 504.
- Content is far below the 32,000-character response ceiling.
- The upstream HTTP request succeeds and returns the expected OpenAI-compatible
  envelope. This is not an upstream 4xx/5xx, expired token, quota response, missing
  `choices`, or `content=null` case.
- Retry correctly does not run: the deployed policy retries only the proven transient
  `content=null` shape, while these failures contain a non-empty string.

## Root cause

`knowledge-assistant` requests `response_format: { type: "json_object" }`. That asks
the model for a JSON object but does not describe or enforce the nested ViLu
`claims[].text/evidence[].chunkId/quote` contract. The configured chat model sometimes
returns an HTTP-successful string that fails `parseModelAnswer` or
`validModelAnswer`, especially for the reproduced RU prompt. The adapter then maps
this contract violation to the broad public error `provider_unavailable`.

This is a model-output contract failure at the chat boundary, not provider
unavailability in the network/configuration sense. Current content-free diagnostics
prove the boundary and response shape, but intentionally cannot distinguish malformed
JSON syntax from valid JSON with the wrong nested schema.

Cloudflare's current Workers AI documentation supports JSON Schema mode and recommends
passing the schema in `response_format`. It also states that models cannot always
satisfy a requested schema, so the existing server-side validation must remain
fail-closed: <https://developers.cloudflare.com/workers-ai/features/json-mode/>.

## Minimal proposed correction

1. Change only the chat request from `json_object` to a strict `json_schema` that
   encodes the existing `ModelAnswer` contract, including required fields, arrays,
   non-empty strings, and no unexpected properties where supported.
2. Keep `parseModelAnswer`, exact-evidence citation validation, size limits, deadline,
   and the `content=null`-only retry unchanged.
3. Add a content-free validation category such as `json_syntax` versus
   `contract_shape` to diagnostics. Do not log model content.
4. Add provider contract tests and a live RU/EN acceptance matrix. The release gate
   should require repeated success for the same RU prompt that reproduced 0/4.

Do not retry arbitrary non-null strings. Retrying invalid content would multiply cost
and latency without fixing the contract and would weaken the deliberately narrow retry
policy.

## Confidence and limitations

Confidence: high that the active failure is chat output contract non-compliance;
medium that JSON Schema mode alone will eliminate every failure until verified against
the exact production model. The exact stored model secret cannot be read back from
Supabase, and privacy-safe telemetry cannot reveal whether each rejected string failed
JSON parsing or nested schema validation.

## Status

`DONE_WITH_CONCERNS`: root cause boundary is proven and a minimal correction is
identified, but no production or code change was authorized in this investigation.
