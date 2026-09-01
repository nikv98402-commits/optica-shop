import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AppUser, OrganizationMembership } from '../../contexts/AuthContext';
import type { OrganizationFeatureKey } from '../../config/features';
import { OrganizationFeatureGate, RoleGuard } from '../guards';

const employerOrganizationId = '20000000-0000-4000-8000-000000000001';
const providerOrganizationId = '20000000-0000-4000-8000-000000000002';
const nonPilotOrganizationId = '20000000-0000-4000-8000-000000000003';

let activeUser: AppUser | null = null;
let flags: Record<string, OrganizationFeatureKey[]> = {};

vi.mock('../../contexts/AuthContext', async () => {
  const actual = await vi.importActual<typeof import('../../contexts/AuthContext')>('../../contexts/AuthContext');
  return { ...actual, useAuth: () => ({ user: activeUser, loading: false }) };
});
vi.mock('../../contexts/FeatureFlagContext', () => ({
  useFeatureFlags: () => ({
    loading: false,
    isEnabled: (feature: OrganizationFeatureKey, organizationId?: string) =>
      Boolean(organizationId && flags[organizationId]?.includes(feature)),
  }),
}));
vi.mock('../../contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en' }),
}));

function userWith(membership: OrganizationMembership): AppUser {
  return {
    id: `user-${membership.role}`,
    email: `${membership.role}@example.test`,
    name: membership.role,
    createdAt: '2026-08-31T00:00:00Z',
    locale: 'en',
    memberships: [membership],
  };
}

function renderGuardedRoute(path: string, roles: OrganizationMembership['role'][], feature: OrganizationFeatureKey) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route
          path="/:locale/organizations/:organizationId/*"
          element={(
            <RoleGuard roles={roles}>
              <OrganizationFeatureGate feature={feature}>
                <main>Pilot workspace</main>
              </OrganizationFeatureGate>
            </RoleGuard>
          )}
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe('closed pilot guards', () => {
  beforeEach(() => {
    activeUser = null;
    flags = {
      [employerOrganizationId]: [
        'vilu_auth_v2',
        'vilu_employee_flow_v2',
        'vilu_passport_profile_v2',
        'vilu_employer_outcomes_v2',
      ],
      [providerOrganizationId]: ['vilu_auth_v2', 'vilu_provider_queue_v2'],
    };
  });

  it.each([
    ['employee', employerOrganizationId, 'employee', 'vilu_employee_flow_v2'],
    ['employer_admin', employerOrganizationId, 'employer_admin', 'vilu_employer_outcomes_v2'],
    ['provider_staff', providerOrganizationId, 'provider_staff', 'vilu_provider_queue_v2'],
  ] as const)('renders the %s pilot workspace for its exact organization', (role, organizationId, allowedRole, feature) => {
    activeUser = userWith({
      organizationId,
      organizationName: 'Pilot',
      organizationType: role === 'provider_staff' ? 'provider' : 'employer',
      role,
    });

    renderGuardedRoute(`/en/organizations/${organizationId}/surface`, [allowedRole], feature);

    expect(screen.getByRole('main')).toHaveTextContent('Pilot workspace');
  });

  it('denies a pilot role when the route uses the other pilot organization', () => {
    activeUser = userWith({
      organizationId: employerOrganizationId,
      organizationName: 'Pilot employer',
      organizationType: 'employer',
      role: 'employee',
    });

    renderGuardedRoute(`/en/organizations/${providerOrganizationId}/provider/queue`, ['employee'], 'vilu_employee_flow_v2');

    expect(screen.getByRole('heading', { name: 'You do not have access to this workspace.' })).toBeInTheDocument();
    expect(screen.queryByText('Pilot workspace')).not.toBeInTheDocument();
  });

  it('denies an authenticated non-pilot member while its organization flags are absent', () => {
    activeUser = userWith({
      organizationId: nonPilotOrganizationId,
      organizationName: 'Other employer',
      organizationType: 'employer',
      role: 'employee',
    });

    renderGuardedRoute(`/ru/organizations/${nonPilotOrganizationId}/employee/today`, ['employee'], 'vilu_employee_flow_v2');

    expect(screen.getByRole('heading', { name: 'You do not have access to this workspace.' })).toBeInTheDocument();
    expect(screen.queryByText('Pilot workspace')).not.toBeInTheDocument();
  });

  it('does not borrow a feature from another organization for the same role', () => {
    activeUser = {
      ...userWith({
        organizationId: nonPilotOrganizationId,
        organizationName: 'Other employer',
        organizationType: 'employer',
        role: 'employee',
      }),
      memberships: [
        {
          organizationId: employerOrganizationId,
          organizationName: 'Pilot employer',
          organizationType: 'employer',
          role: 'employee',
        },
        {
          organizationId: nonPilotOrganizationId,
          organizationName: 'Other employer',
          organizationType: 'employer',
          role: 'employee',
        },
      ],
    };

    renderGuardedRoute(`/en/organizations/${nonPilotOrganizationId}/employee/today`, ['employee'], 'vilu_employee_flow_v2');

    expect(screen.getByRole('heading', { name: 'You do not have access to this workspace.' })).toBeInTheDocument();
  });
});
