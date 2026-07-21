# Knowledge Assistant deployment

## Default state

The feature is off unless the frontend is built with exactly:

```text
VITE_FEATURE_KNOWLEDGE_ASSISTANT=true
```

Missing, `false`, or any other value hides navigation and safely redirects
direct `/assistant` visits. Keep production off until preview acceptance is
signed.

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
   Supabase URL, and its anon key. Production must remain `false`.
9. Complete RU/EN desktop and 320 px mobile acceptance, urgent guidance,
   abstention, retry, citations, local clear, and secret scan.
10. Enable production only in a separate change after explicit safety,
    editorial, and product sign-off.

## Rollback

Rebuild with `VITE_FEATURE_KNOWLEDGE_ASSISTANT=false`. Do not destructively
roll back the shared database migration. Existing knowledge pages remain the
fallback. Provider configuration can be rotated without a frontend release.
