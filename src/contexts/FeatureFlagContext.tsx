import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { publicFeatures, type OrganizationFeatureKey } from '../config/features';
import { useAuth } from './AuthContext';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

type OrganizationFlags = Record<string, Partial<Record<OrganizationFeatureKey, boolean>>>;

interface FeatureFlagContextValue {
  loading: boolean;
  isEnabled: (key: OrganizationFeatureKey, organizationId?: string) => boolean;
}

const FeatureFlagContext = createContext<FeatureFlagContextValue | undefined>(undefined);

export function FeatureFlagProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [flags, setFlags] = useState<OrganizationFlags>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const organizationIds = user?.memberships.map(({ organizationId }) => organizationId) ?? [];
    if (!isSupabaseConfigured || organizationIds.length === 0) {
      setFlags({});
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    void (async () => {
      try {
        const { data, error } = await supabase.from('organization_feature_flags')
          .select('organization_id, feature_key, enabled')
          .in('organization_id', organizationIds);
        if (!active) return;
        if (error) {
          setFlags({});
          return;
        }
        const next: OrganizationFlags = {};
        for (const row of data ?? []) {
          next[row.organization_id] ??= {};
          next[row.organization_id][row.feature_key as OrganizationFeatureKey] = row.enabled;
        }
        setFlags(next);
      } catch {
        if (active) setFlags({});
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [user]);

  const value = useMemo<FeatureFlagContextValue>(() => ({
    loading,
    isEnabled: (key, organizationId) => publicFeatures.organization[key]
      && (organizationId ? flags[organizationId]?.[key] === true : Object.values(flags).some((organization) => organization[key] === true)),
  }), [flags, loading]);

  return <FeatureFlagContext.Provider value={value}>{children}</FeatureFlagContext.Provider>;
}

// Context hooks intentionally live beside their provider to keep the contract private.
// eslint-disable-next-line react-refresh/only-export-components
export function useFeatureFlags() {
  const context = useContext(FeatureFlagContext);
  if (!context) throw new Error('useFeatureFlags must be used within FeatureFlagProvider');
  return context;
}
