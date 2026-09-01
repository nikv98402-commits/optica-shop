import { describe, expect, it } from 'vitest';
import type { OrganizationMembership } from '../../contexts/AuthContext';
import type { OrganizationFeatureKey } from '../../config/features';
import { isWorkspaceFeatureEnabled, selectActiveWorkspace } from '../foundationRouting';

const employerOrganizationId = 'employer-pilot';
const providerOrganizationId = 'provider-pilot';
const nonPilotOrganizationId = 'employer-other';

const enabledByOrganization: Record<string, OrganizationFeatureKey[]> = {
  [employerOrganizationId]: [
    'vilu_auth_v2',
    'vilu_employee_flow_v2',
    'vilu_passport_profile_v2',
    'vilu_employer_outcomes_v2',
  ],
  [providerOrganizationId]: ['vilu_auth_v2', 'vilu_provider_queue_v2'],
};

const isEnabled = (feature: OrganizationFeatureKey, organizationId?: string) =>
  Boolean(organizationId && enabledByOrganization[organizationId]?.includes(feature));

const employeeMembership: OrganizationMembership = {
  organizationId: employerOrganizationId,
  organizationName: 'Pilot employer',
  organizationType: 'employer',
  role: 'employee',
};
const employerMembership: OrganizationMembership = {
  ...employeeMembership,
  role: 'employer_admin',
};
const providerMembership: OrganizationMembership = {
  organizationId: providerOrganizationId,
  organizationName: 'Pilot provider',
  organizationType: 'provider',
  role: 'provider_staff',
};

describe('closed pilot workspace access', () => {
  it('binds the employee and employer roles to the exact employer pilot organization', () => {
    const employee = selectActiveWorkspace([employeeMembership], employerOrganizationId, ['employee'], isEnabled);
    const employer = selectActiveWorkspace([employerMembership], employerOrganizationId, ['employer_admin'], isEnabled);

    expect(isWorkspaceFeatureEnabled(employee, 'vilu_employee_flow_v2', isEnabled)).toBe(true);
    expect(isWorkspaceFeatureEnabled(employee, 'vilu_passport_profile_v2', isEnabled)).toBe(true);
    expect(isWorkspaceFeatureEnabled(employer, 'vilu_employer_outcomes_v2', isEnabled)).toBe(true);
    expect(selectActiveWorkspace([employeeMembership], providerOrganizationId, ['employee'], isEnabled)).toBeNull();
    expect(selectActiveWorkspace([employerMembership], providerOrganizationId, ['employer_admin'], isEnabled)).toBeNull();
  });

  it('binds provider staff to the exact provider pilot organization', () => {
    const provider = selectActiveWorkspace([providerMembership], providerOrganizationId, ['provider_staff'], isEnabled);

    expect(isWorkspaceFeatureEnabled(provider, 'vilu_provider_queue_v2', isEnabled)).toBe(true);
    expect(selectActiveWorkspace([providerMembership], employerOrganizationId, ['provider_staff'], isEnabled)).toBeNull();
  });

  it('keeps non-pilot organizations and cross-role surfaces fail-closed', () => {
    const nonPilotMembership: OrganizationMembership = {
      ...employeeMembership,
      organizationId: nonPilotOrganizationId,
      organizationName: 'Other employer',
    };

    expect(selectActiveWorkspace([nonPilotMembership], nonPilotOrganizationId, ['employee'], isEnabled)).toBeNull();
    expect(selectActiveWorkspace([employeeMembership], employerOrganizationId, ['employer_admin'], isEnabled)).toBeNull();
    expect(selectActiveWorkspace([providerMembership], providerOrganizationId, ['employee'], isEnabled)).toBeNull();
  });

  it('does not combine a role from one organization with flags from another', () => {
    const workspace = selectActiveWorkspace(
      [employeeMembership, { ...employeeMembership, organizationId: nonPilotOrganizationId }],
      nonPilotOrganizationId,
      ['employee'],
      isEnabled,
    );

    expect(workspace).toBeNull();
  });
});
