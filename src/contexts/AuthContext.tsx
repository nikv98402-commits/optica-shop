import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { createLocalId } from '../lib/id';

export interface DemoUser {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

interface StoredAccount extends DemoUser {
  password: string;
}

interface AuthResult {
  error: { message: string } | null;
}

interface AuthContextType {
  user: DemoUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signUp: (email: string, password: string, name?: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
}

const ACCOUNTS_KEY = 'visionlux_accounts';
const SESSION_KEY = 'visionlux_session_email';
const AuthContext = createContext<AuthContextType | undefined>(undefined);

function readAccounts(): StoredAccount[] {
  try {
    return JSON.parse(localStorage.getItem(ACCOUNTS_KEY) || '[]') as StoredAccount[];
  } catch {
    return [];
  }
}

function saveAccounts(accounts: StoredAccount[]) {
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
}

function publicUser(account: StoredAccount): DemoUser {
  return {
    id: account.id,
    email: account.email,
    name: account.name,
    createdAt: account.createdAt,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<DemoUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const sessionEmail = localStorage.getItem(SESSION_KEY);
    const account = readAccounts().find((item) => item.email === sessionEmail);
    if (account) setUser(publicUser(account));
    setLoading(false);
  }, []);

  const value = useMemo<AuthContextType>(() => ({
    user,
    loading,
    signIn: async (email: string, password: string) => {
      const normalizedEmail = email.trim().toLowerCase();
      const account = readAccounts().find((item) => item.email === normalizedEmail);

      if (!account || account.password !== password) {
        return { error: { message: 'Неверная почта или пароль.' } };
      }

      localStorage.setItem(SESSION_KEY, account.email);
      setUser(publicUser(account));
      return { error: null };
    },
    signUp: async (email: string, password: string, name?: string) => {
      const normalizedEmail = email.trim().toLowerCase();
      const accounts = readAccounts();

      if (accounts.some((item) => item.email === normalizedEmail)) {
        return { error: { message: 'Аккаунт с такой почтой уже существует.' } };
      }

      const account: StoredAccount = {
        id: createLocalId('account'),
        email: normalizedEmail,
        password,
        name: name?.trim() || normalizedEmail.split('@')[0] || 'Клиент VisionLux',
        createdAt: new Date().toISOString(),
      };

      saveAccounts([...accounts, account]);
      localStorage.setItem(SESSION_KEY, account.email);
      setUser(publicUser(account));
      return { error: null };
    },
    signOut: async () => {
      localStorage.removeItem(SESSION_KEY);
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
