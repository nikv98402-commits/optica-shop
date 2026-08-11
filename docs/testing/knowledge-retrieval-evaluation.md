# Knowledge retrieval release gate

GitHub #86 evaluates the already published retrieval architecture from #89. It
does not publish a corpus, create embeddings, activate a publication, or change
the user-facing assistant.

## Pinned contract

- corpus manifest: `8cdee30ea536d4f53524fcd5b50893191ee8763423fc27cc8d7449d17d49fd9f`;
- embedding model: `@cf/qwen/qwen3-embedding-0.6b`;
- dimensions: `1024`;
- chunk policy: `chars-2400-overlap-240-v1`;
- retrieval depth: `8`;
- minimum `Recall@8`: `0.85`.

The versioned golden set contains 100 PII-free RU/EN cases, including ten
unanswerable controls. It stores questions and expected source IDs, never full
corpus documents.

## Local contract check

```powershell
npm run knowledge:retrieval:evaluate -- --fixture
npx vitest run scripts/lib/knowledge-retrieval-evaluation.test.ts scripts/knowledge-retrieval-migration.test.ts
```

The fixture run validates the golden-set schema, report shape, thresholds,
provenance rules, exact-quote contract, and abstention gate. It is not a quality
claim about live embeddings.

Run `supabase test db` with local Supabase active to execute the pgTAP boundary
test. The test proves that the evaluation RPC is service-role-only, manifest
pinned, active-publication-only, and fail-closed after approval revocation.

## Protected read-only evaluation

The `Knowledge retrieval evaluation` workflow has a protected manual job. It
requires the four server-side secrets documented in the workflow environment
and calls only `evaluate_knowledge_retrieval`. The report contains metrics and
failed case IDs; questions, retrieved chunk text, and full corpus text are not
written to the report or logs.

Passing requires all of the following:

- `Recall@8 >= 0.85` for answerable cases;
- every returned chunk belongs to the pinned, approved, active publication;
- exact evidence quotes pass the same normalization rule as runtime citations;
- all unanswerable controls abstain.

Do not run the protected job until the migration has been reviewed and applied
through the normal deployment workflow. The migration itself does not activate
or publish anything.
