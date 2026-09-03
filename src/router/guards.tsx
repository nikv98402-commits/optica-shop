import { createContext, useContext, useState, type ReactNode } from 'react';
import { Link, Navigate, useLocation, useParams } from 'react-router-dom';
import { publicFeatures } from '../config/features';
import { useAuth, type OrganizationRole } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { foundationTranslations } from '../i18n/foundation';
import { AuthModal } from '../components/AuthModal';
import { useFeatureFlags } from '../contexts/FeatureFlagContext';
import type { OrganizationFeatureKey } from '../config/features';
import { isWorkspaceFeatureEnabled, selectActiveWorkspace, type ActiveWorkspace } from './foundationRouting';

const ActiveWorkspaceContext = createContext<ActiveWorkspace | null>(null);

export function FoundationGate({ children }: { children: ReactNode }) {
  return publicFeatures.viluFoundation && publicFeatures.organization.vilu_auth_v2
    ? children
    : <Navigate to="/" replace />;
}

export function AuthGuard({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const { language } = useLanguage();
  const copy = foundationTranslations[language];
  const location = useLocation();
  const [authOpen, setAuthOpen] = useState(false);

  if (loading) return <GuardMessage title={copy.loading} />;
  if (!user) {
    return <>
      <GuardMessage title={copy.signInRequired} description={copy.signInBody} actionLabel={copy.signInAction} onAction={() => setAuthOpen(true)} />
      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} mode="login" />
      <input type="hidden" name="returnTo" value={`${location.pathname}${location.search}${location.hash}`} />
    </>;
  }
  return children;
}

export function RoleGuard({ roles, children }: { roles: OrganizationRole[]; children: ReactNode }) {
  const { user } = useAuth();
  const { organizationId: activeOrganizationId } = useParams<{ organizationId: string }>();
  const { language } = useLanguage();
  const { loading, isEnabled } = useFeatureFlags();
  if (loading) return <GuardMessage title={foundationTranslations[language].loading} />;
  const workspace = selectActiveWorkspace(user?.memberships ?? [], activeOrganizationId, roles, isEnabled);
  return workspace
    ? <ActiveWorkspaceContext.Provider value={workspace}>{children}</ActiveWorkspaceContext.Provider>
    : <GuardMessage title={foundationTranslations[language].accessDenied} description={foundationTranslations[language].accessDeniedBody} backLabel={foundationTranslations[language].backHome} />;
}

export function OrganizationFeatureGate({ feature, children }: { feature: OrganizationFeatureKey; children: ReactNode }) {
  const { user } = useAuth();
  const { language } = useLanguage();
  const { loading, isEnabled } = useFeatureFlags();
  const workspace = useContext(ActiveWorkspaceContext);
  if (loading) return <GuardMessage title={foundationTranslations[language].loading} />;
  const enabled = Boolean(user) && isWorkspaceFeatureEnabled(workspace, feature, isEnabled);
  return enabled ? children : <GuardMessage title={foundationTranslations[language].unavailableTitle} />;
}

function GuardMessage({ title, description, actionLabel, backLabel, onAction }: { title: string; description?: string; actionLabel?: string; backLabel?: string; onAction?: () => void }) {
  return (
    <main className="optical-signal-page grid min-h-screen place-items-center px-6">
      <section className="optical-card max-w-xl text-center" aria-live="polite">
        <p className="optical-eyebrow">ViLu</p>
        <h1 className="mt-3 text-3xl font-extrabold">{title}</h1>
        {description && <p className="guard-message__description">{description}</p>}
        {actionLabel && onAction && <button className="optical-button mt-6" onClick={onAction}>{actionLabel}</button>}
        {backLabel && <Link className="optical-button optical-button--secondary mt-6 inline-flex" to="/">{backLabel}</Link>}
      </section>
    </main>
  );
}
