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

1. Apply `20260721100000_create_knowledge_assistant.sql`. Confirm the atomic
   rate-limit and source-replacement RPCs are executable only by `service_role`.
2. Deploy the `knowledge-assistant` Edge Function with request-body logging
   disabled.
3. Run `npm run knowledge:index:dry`; obtain editorial approval.
4. Run `npm run knowledge:index` from a trusted environment. This writes
   link-only metadata and replaces each indexed source transactionally.
5. Build preview with the feature flag enabled.
6. Complete RU/EN desktop and 320 px mobile acceptance, urgent guidance,
   abstention, retry, citations, local clear, and secret scan.
7. Enable production only after safety and editorial sign-off.

## Rollback

Rebuild with `VITE_FEATURE_KNOWLEDGE_ASSISTANT=false`. Do not destructively
roll back the shared database migration. Existing knowledge pages remain the
fallback. Provider configuration can be rotated without a frontend release.
