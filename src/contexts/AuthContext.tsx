import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import type { Language } from '../i18n/translations';
import { createSignUpPayload } from './authHelpers';

export type OrganizationRole = 'employee' | 'employer_admin' | 'provider_staff';

export interface OrganizationMembership {
  organizationId: string;
  organizationName: string;
  organizationType: 'employer' | 'provider';
  role: OrganizationRole;
}

export interface AppUser {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  locale: 'ru' | 'en';
  memberships: OrganizationMembership[];
}

export type AuthErrorCode = 'not_configured' | 'invalid_credentials' | 'signup_failed' | 'unexpected';

interface AuthResult {
  error: { code: AuthErrorCode } | null;
  confirmationRequired?: boolean;
}

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  configured: boolean;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signUp: (email: string, password: string, name?: string, locale?: Language) => Promise<AuthResult>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function loadAppUser(authUser: User): Promise<AppUser> {
  const [{ data: profile, error: profileError }, { data: memberships, error: membershipsError }] = await Promise.all([
    supabase.from('profiles').select('display_name, locale').eq('id', authUser.id).maybeSingle(),
    supabase
      .from('organization_memberships')
      .select('role, organization_id, organizations!inner(name, organization_type)')
      .eq('user_id', authUser.id)
      .eq('status', 'active'),
  ]);

  if (profileError) throw profileError;
  if (membershipsError) throw membershipsError;

  return {
    id: authUser.id,
    email: authUser.email ?? '',
    name: profile?.display_name || authUser.user_metadata.full_name || authUser.email?.split('@')[0] || 'ViLu',
    createdAt: authUser.created_at,
    locale: profile?.locale === 'en' ? 'en' : 'ru',
    memberships: (memberships ?? []).map((membership) => {
      const organization = Array.isArray(membership.organizations)
        ? membership.organizations[0]
        : membership.organizations;
      return {
        organizationId: membership.organization_id,
        organizationName: organization?.name ?? '',
        organizationType: organization?.organization_type === 'provider' ? 'provider' : 'employer',
        role: membership.role as OrganizationRole,
      };
    }),
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async (authUser: User | null) => {
    if (!authUser) {
      setUser(null);
      return;
    }
    setUser(await loadAppUser(authUser));
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    let active = true;
    void supabase.auth.getSession()
      .then(async ({ data, error }) => {
        if (!active) return;
        if (error) throw error;
        await refreshUser(data.session?.user ?? null);
      })
      .catch(() => {
        if (active) setUser(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      void refreshUser(session?.user ?? null)
        .catch(() => {
          if (active) setUser(null);
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    });

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, [refreshUser]);

  const value = useMemo<AuthContextType>(() => ({
    user,
    loading,
    configured: isSupabaseConfigured,
    signIn: async (email: string, password: string) => {
      if (!isSupabaseConfigured) return { error: { code: 'not_configured' } };
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
      return { error: error ? { code: 'invalid_credentials' } : null };
    },
    signUp: async (email: string, password: string, name?: string, locale: Language = 'ru') => {
      if (!isSupabaseConfigured) return { error: { code: 'not_configured' } };
      const { data, error } = await supabase.auth.signUp(createSignUpPayload(email, password, name, locale));
      return {
        error: error ? { code: 'signup_failed' } : null,
        confirmationRequired: !error && !data.session,
      };
    },
    signOut: async () => {
      if (isSupabaseConfigured) await supabase.auth.signOut();
      setUser(null);
    },
  }), [loading, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
