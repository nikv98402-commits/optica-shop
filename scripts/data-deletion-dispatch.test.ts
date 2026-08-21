import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('data deletion dispatcher workflow', () => {
  it('does not mask an alertable batch failure with immediate HTTP retries', () => {
    const workflow = readFileSync('.github/workflows/data-deletion-dispatch.yml', 'utf8');
    expect(workflow).toContain('curl --fail-with-body');
    expect(workflow).not.toContain('--retry');
  });
});
