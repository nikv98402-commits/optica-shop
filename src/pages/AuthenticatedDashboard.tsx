import { AuthProvider } from '../contexts/AuthContext';
import { Dashboard } from './Dashboard';
import '../styles/routeStyles';

interface AuthenticatedDashboardProps {
  onNavigate: (page: string) => void;
  onOpenStores: () => void;
}

export function AuthenticatedDashboard(props: AuthenticatedDashboardProps) {
  return <AuthProvider><Dashboard {...props} /></AuthProvider>;
}
