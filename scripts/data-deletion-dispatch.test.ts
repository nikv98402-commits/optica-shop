import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('data deletion dispatcher workflow', () => {
  it('does not mask an alertable batch failure with immediate HTTP retries', () => {
    const workflow = readFileSync('.github/workflows/data-deletion-dispatch.yml', 'utf8');
    expect(workflow).toContain('curl --fail-with-body');
    expect(workflow).not.toContain('--retry');
  });

  it('uses a dedicated secret and lets the function authenticate before creating its service client', () => {
    const workflow = readFileSync('.github/workflows/data-deletion-dispatch.yml', 'utf8');
    const config = readFileSync('supabase/config.toml', 'utf8');
    expect(workflow).toContain('secrets.DATA_DELETION_DISPATCH_SECRET');
    expect(workflow).toContain('test -n "$DATA_DELETION_DISPATCH_SECRET"');
    expect(workflow).toContain('--header "Authorization: Bearer $DATA_DELETION_DISPATCH_SECRET"');
    expect(workflow).toContain('curl --fail-with-body');
    expect(workflow).not.toContain('secrets.SUPABASE_SERVICE_ROLE_KEY');
    expect(config).toMatch(/\[functions\.process-data-deletion\]\s+verify_jwt = false/);
  });
});
