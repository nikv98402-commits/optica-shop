import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

const EXPECTED_SOURCE_ID = '00000000-0000-4000-8000-000000000068';

describe('ViLu public catalog source migrations', () => {
  it('keeps the bounded workflow and reconciliation migration on the same stable source id', async () => {
    const [workflow, migration] = await Promise.all([
      readFile('.github/workflows/offer-finder-ingestion.yml', 'utf8'),
      readFile(
        'supabase/migrations/20260727090000_reconcile_vilu_public_catalog_source.sql',
        'utf8',
      ),
    ]);

    expect(workflow).toContain(EXPECTED_SOURCE_ID);
    expect(migration).toContain(EXPECTED_SOURCE_ID);
    expect(migration).toContain("adapter_key = 'vilu_public_catalog'");
    expect(migration).toContain('refusing unsafe rewrite');
  });

  it('preserves the bounded source policy while reconciling production state', async () => {
    const migration = await readFile(
      'supabase/migrations/20260727090000_reconcile_vilu_public_catalog_source.sql',
      'utf8',
    );

    expect(migration).toContain(`'["https://vilu.store"]'::jsonb`);
    expect(migration).toContain('rate_limit_per_minute = 1');
    expect(migration).toContain('concurrency_limit = 1');
    expect(migration).toContain('schedule_cron = NULL');
  });
});
