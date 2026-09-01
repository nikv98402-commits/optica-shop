import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { organizationFeatureKeys } from '../src/config/features';

const provision = readFileSync('supabase/runbooks/vilu_closed_pilot_provision.sql', 'utf8');
const disable = readFileSync('supabase/runbooks/vilu_closed_pilot_disable.sql', 'utf8');

describe('closed pilot operator runbooks', () => {
  it('fails transactionally and validates Auth users before persistent inserts', () => {
    expect(provision).toContain('\\set ON_ERROR_STOP on');
    expect(provision.indexOf('begin;')).toBeLessThan(provision.indexOf('insert into public.organizations'));
    expect(provision.indexOf('from auth.users')).toBeLessThan(provision.indexOf('insert into public.organizations'));
    expect(provision).toContain('All three pilot Auth users must exist before provisioning');
    expect(provision).toContain('commit;');
  });

  it('is replay-safe and never enables organization features', () => {
    expect(provision.match(/on conflict/gi)).toHaveLength(3);
    expect(provision).not.toMatch(/set\s+enabled\s*=\s*true/i);
    expect(provision).not.toMatch(/values[\s\S]*?,\s*true\s*\)/i);
    for (const feature of organizationFeatureKeys) expect(provision).toContain(feature);
  });

  it('keeps psql values out of dollar-quoted assertion blocks', () => {
    const blocks = [...provision.matchAll(/do \$[a-z_]+\$([\s\S]*?)\$[a-z_]+\$;/g)].map((match) => match[1]);
    expect(blocks.length).toBeGreaterThan(0);
    for (const block of blocks) expect(block).not.toContain(":'");
  });

  it('has a data-preserving rollback that only disables known feature rows', () => {
    const statements = disable.replace(/^--.*$/gm, '');
    expect(disable).toMatch(/update public\.organization_feature_flags/i);
    expect(disable).toMatch(/set enabled = false/i);
    expect(statements).not.toMatch(/\bdelete\b|\btruncate\b|\bdrop\b/i);
    expect(disable).toContain('Employer organization ID is not the provisioned closed-pilot organization');
    expect(disable).toContain('Provider organization ID is not the provisioned closed-pilot organization');
    expect(disable.indexOf('do $preflight$')).toBeLessThan(disable.indexOf('update public.organization_feature_flags'));
    for (const feature of organizationFeatureKeys) expect(disable).toContain(feature);
  });

  it('contains no committed credentials or real account identifiers', () => {
    for (const sql of [provision, disable]) {
      expect(sql).not.toMatch(/@[a-z0-9.-]+\.[a-z]{2,}/i);
      expect(sql).not.toMatch(/service_role|supabase_service_role_key|password\s*=/i);
    }
  });
});
