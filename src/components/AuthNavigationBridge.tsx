import { useEffect } from 'react';
import { AuthProvider, useAuth } from '../contexts/AuthContext';

export interface AuthNavigationSession {
  userName: string;
  signOut: () => Promise<void>;
}

interface AuthNavigationBridgeProps {
  onSessionChange: (session: AuthNavigationSession | null) => void;
}

function AuthNavigationObserver({ onSessionChange }: AuthNavigationBridgeProps) {
  const { user, loading, signOut } = useAuth();

  useEffect(() => {
    if (loading) return;
    onSessionChange(user ? { userName: user.name, signOut } : null);
  }, [loading, onSessionChange, signOut, user]);

  return null;
}

export function AuthNavigationBridge(props: AuthNavigationBridgeProps) {
  return (
    <AuthProvider>
      <AuthNavigationObserver {...props} />
    </AuthProvider>
  );
}
