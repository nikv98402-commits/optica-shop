import type { OrganizationMembership, OrganizationRole } from '../contexts/AuthContext';
import type { OrganizationFeatureKey } from '../config/features';
import type { Language } from '../i18n/translations';

export interface ActiveWorkspace {
  organizationId: string;
  role: OrganizationRole;
}

type FeatureCheck = (key: OrganizationFeatureKey, organizationId?: string) => boolean;

export function selectActiveWorkspace(
  memberships: OrganizationMembership[],
  activeOrganizationId: string | undefined,
  roles: OrganizationRole[],
  isEnabled: FeatureCheck,
): ActiveWorkspace | null {
  if (!activeOrganizationId) return null;
  const membership = memberships.find(({ organizationId, role }) =>
    organizationId === activeOrganizationId
    && roles.includes(role)
    && isEnabled('vilu_auth_v2', organizationId));
  return membership ? { organizationId: membership.organizationId, role: membership.role } : null;
}

export function isWorkspaceFeatureEnabled(
  workspace: ActiveWorkspace | null,
  feature: OrganizationFeatureKey,
  isEnabled: FeatureCheck,
) {
  return workspace !== null && isEnabled(feature, workspace.organizationId);
}

export function buildLocaleRedirectTarget(pathname: string, search: string, hash: string, locale: Language) {
  const segments = pathname.split('/');
  segments[1] = locale;
  return `${segments.join('/')}${search}${hash}`;
}
