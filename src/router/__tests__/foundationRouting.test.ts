import { describe, expect, it } from 'vitest';
import type { OrganizationMembership } from '../../contexts/AuthContext';
import { buildLocaleRedirectTarget, isWorkspaceFeatureEnabled, selectActiveWorkspace } from '../foundationRouting';

const memberships: OrganizationMembership[] = [
  { organizationId: 'employee-org', organizationName: 'Employee org', organizationType: 'employer', role: 'employee' },
  { organizationId: 'admin-org', organizationName: 'Admin org', organizationType: 'employer', role: 'employer_admin' },
];

describe('Slice 0 routing boundaries', () => {
  it('does not combine a role from one organization with a feature from another', () => {
    const enabled = (feature: string, organizationId?: string) =>
      feature === 'vilu_auth_v2' || (feature === 'vilu_employer_outcomes_v2' && organizationId === 'employee-org');
    const workspace = selectActiveWorkspace(memberships, 'admin-org', ['employer_admin'], enabled);

    expect(workspace).toEqual({ organizationId: 'admin-org', role: 'employer_admin' });
    expect(isWorkspaceFeatureEnabled(workspace, 'vilu_employer_outcomes_v2', enabled)).toBe(false);
  });

  it('selects the explicit organization when the same role exists in two organizations', () => {
    const duplicateRoleMemberships: OrganizationMembership[] = [
      { organizationId: 'org-b', organizationName: 'Organization B', organizationType: 'employer', role: 'employee' },
      { organizationId: 'org-a', organizationName: 'Organization A', organizationType: 'employer', role: 'employee' },
    ];
    const enabled = (feature: string, organizationId?: string) =>
      feature === 'vilu_auth_v2' && (organizationId === 'org-a' || organizationId === 'org-b');

    expect(selectActiveWorkspace(duplicateRoleMemberships, 'org-a', ['employee'], enabled))
      .toEqual({ organizationId: 'org-a', role: 'employee' });
    expect(selectActiveWorkspace([...duplicateRoleMemberships].reverse(), 'org-a', ['employee'], enabled))
      .toEqual({ organizationId: 'org-a', role: 'employee' });
  });

  it('denies a role when the explicit organization does not own that membership', () => {
    const enabled = (feature: string) => feature === 'vilu_auth_v2';

    expect(selectActiveWorkspace(memberships, 'employee-org', ['employer_admin'], enabled)).toBeNull();
    expect(selectActiveWorkspace(memberships, undefined, ['employee'], enabled)).toBeNull();
  });

  it('preserves a deep link while replacing an unknown locale with the profile locale', () => {
    expect(buildLocaleRedirectTarget('/fr/organizations/org-a/employee/passport', '?tab=history', '#latest', 'en'))
      .toBe('/en/organizations/org-a/employee/passport?tab=history#latest');
  });

  it('gates Passport and Profile with the feature flag from the explicit active organization', () => {
    const sameRoleMemberships: OrganizationMembership[] = [
      { organizationId: 'org-a', organizationName: 'A', organizationType: 'employer', role: 'employee' },
      { organizationId: 'org-b', organizationName: 'B', organizationType: 'employer', role: 'employee' },
    ];
    const enabled = (feature: string, organizationId?: string) =>
      feature === 'vilu_auth_v2' || (feature === 'vilu_passport_profile_v2' && organizationId === 'org-b');
    const orgA = selectActiveWorkspace(sameRoleMemberships, 'org-a', ['employee'], enabled);
    const orgB = selectActiveWorkspace(sameRoleMemberships, 'org-b', ['employee'], enabled);

    expect(orgA).toEqual({ organizationId: 'org-a', role: 'employee' });
    expect(orgB).toEqual({ organizationId: 'org-b', role: 'employee' });
    expect(isWorkspaceFeatureEnabled(orgA, 'vilu_passport_profile_v2', enabled)).toBe(false);
    expect(isWorkspaceFeatureEnabled(orgB, 'vilu_passport_profile_v2', enabled)).toBe(true);
  });
});
