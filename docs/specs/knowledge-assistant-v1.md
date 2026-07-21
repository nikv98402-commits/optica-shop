# ViLu Knowledge Assistant v1

## Goal

Add a feature-flagged RU/EN assistant that answers eyewear and general vision
education questions from reviewed ViLu material. It must not diagnose,
interpret prescriptions or images, prescribe treatment, or expose private
profile data.

## User contract

- Route: `/assistant`, visible only with `VITE_FEATURE_KNOWLEDGE_ASSISTANT=true`.
- Input: a question, locale, at most six bounded recent turns, and allowlisted
  answer preferences.
- Output: a concise answer, numbered citations, related ViLu pages, confidence,
  and a safety state.
- History and preferences remain in versioned browser `localStorage` and can be
  cleared by the user.
- Link-only sources are displayed separately as external reading. They are not
  placed into retrieval context, quoted, translated, or used as evidence.

## Safety and evidence

- Urgent red-flag phrases return deterministic guidance without calling the
  database or model provider.
- Diagnosis, prescription/image interpretation, and treatment requests are
  refused deterministically.
- Every generated claim must include one or more retrieved chunk IDs and an
  exact supporting quote from each chunk.
- The server validates that every quote is present in its referenced chunk and
  derives public citations from those chunks. A source ID alone is not proof.
- Invalid evidence gets one correction attempt; a second failure returns an
  abstention.

## Architecture

1. The browser invokes a Supabase Edge Function.
2. The function validates and classifies the request.
3. A salted IP hash is consumed by an atomic, database-backed rate limiter.
4. An embedding provider creates a 1024-dimensional multilingual vector.
5. A service-role RPC retrieves at most eight approved, indexable chunks.
6. An OpenAI-compatible chat provider returns strict claim/evidence JSON.
7. The server validates exact evidence and returns rendered citations.
8. Approved link-only sources are appended as external reading metadata.

Provider interfaces are replaceable; Qwen through an OpenAI-compatible API is
the initial chat target. Provider keys, service-role credentials, prompts,
thresholds, and source text remain server-side.

## Source lifecycle

- `content/knowledge-assistant/sources.json` is the reviewed source registry.
- Indexed documents require an approved license, editorial review metadata,
  and an exact SHA-256 hash.
- `knowledge:index:dry` validates all metadata, licenses, documents, and hashes.
- A live indexing run creates every embedding before it calls the transactional
  source replacement RPC. Existing chunks remain available if embedding or
  validation fails.
- Link-only sources store metadata with `indexable=false` and no body/hash.

## Privacy and trust boundaries

- Never send raw prompts, answers, images, health text, prescriptions, contact
  data, profile fields, or chat history to analytics.
- Never expose service-role or model-provider secrets under a `VITE_` variable.
- Browser roles have no access to source, chunk, or rate-limit tables.
- Operational logs contain stable error categories only, never request bodies.

## Failure behavior

- Invalid/oversized request: `400`/`413`.
- Rate exceeded: `429`.
- Retrieval or rate-limit storage unavailable: `503` and no model call.
- Model provider unavailable: `502`.
- No supporting source or invalid corrected evidence: HTTP 200 abstention.
- Frontend feature off: navigation hidden and direct route redirected.

## Acceptance criteria

- RU/EN assistant UI works on 320 px mobile and desktop without horizontal
  overflow.
- Exact-quote evidence, unknown chunk, missing evidence, urgent, refusal,
  abstention, retry, local clear, and analytics privacy have automated tests.
- Source dry run, boundary scan, typecheck, lint, unit tests, and production
  build pass.
- Preview rollout verifies rate limiting, source links, provider outage, and
  rollback before production enablement.
