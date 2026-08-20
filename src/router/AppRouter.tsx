import { useEffect } from 'react';
import { Navigate, Outlet, Route, Routes, useLocation, useParams } from 'react-router-dom';
import App from '../App';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { buildLocaleRedirectTarget } from './foundationRouting';
import { FoundationPlaceholder } from './FoundationPlaceholder';
import { AuthGuard, FoundationGate, OrganizationFeatureGate, RoleGuard } from './guards';
import { RoleLayout } from './RoleLayout';
import { EmployeeFlowStateProvider } from '../features/employeeFlow/EmployeeFlowState';
import { EmployeeTodayPage } from '../features/employeeFlow/EmployeeTodayPage';
import { ScreeningResultPage } from '../features/employeeFlow/ScreeningResultPage';
import { ReferralPage } from '../features/employeeFlow/ReferralPage';

function LocaleBoundary() {
  const { locale } = useParams();
  const { language, setLanguage } = useLanguage();
  const { user, loading } = useAuth();
  const location = useLocation();
  useEffect(() => {
    if (locale === 'ru' || locale === 'en') setLanguage(locale);
  }, [locale, setLanguage]);
  if (locale === 'ru' || locale === 'en') return <Outlet />;
  if (loading) return null;
  return <Navigate to={buildLocaleRedirectTarget(location.pathname, location.search, location.hash, user?.locale ?? language)} replace />;
}

function SecureFoundation() {
  return <FoundationGate><AuthGuard><Outlet /></AuthGuard></FoundationGate>;
}

export function AppRouter() {
  return (
    <Routes>
      <Route path="/:locale/organizations/:organizationId" element={<LocaleBoundary />}>
        <Route element={<SecureFoundation />}>
          <Route path="employee" element={<RoleGuard roles={['employee']}><EmployeeFlowStateProvider><RoleLayout role="employee" /></EmployeeFlowStateProvider></RoleGuard>}>
            <Route index element={<OrganizationFeatureGate feature="vilu_employee_flow_v2"><EmployeeTodayPage /></OrganizationFeatureGate>} />
            <Route path="today" element={<OrganizationFeatureGate feature="vilu_employee_flow_v2"><EmployeeTodayPage /></OrganizationFeatureGate>} />
            <Route path="screenings/:screeningId/result" element={<OrganizationFeatureGate feature="vilu_employee_flow_v2"><ScreeningResultPage /></OrganizationFeatureGate>} />
            <Route path="referrals/:referralId" element={<OrganizationFeatureGate feature="vilu_employee_flow_v2"><ReferralPage /></OrganizationFeatureGate>} />
            <Route path="passport" element={<OrganizationFeatureGate feature="vilu_passport_profile_v2"><FoundationPlaceholder /></OrganizationFeatureGate>} />
            <Route path="profile" element={<OrganizationFeatureGate feature="vilu_passport_profile_v2"><FoundationPlaceholder /></OrganizationFeatureGate>} />
          </Route>
          <Route path="employer" element={<RoleGuard roles={['employer_admin']}><RoleLayout role="employer" /></RoleGuard>}>
            <Route path="outcomes" element={<OrganizationFeatureGate feature="vilu_employer_outcomes_v2"><FoundationPlaceholder /></OrganizationFeatureGate>} />
          </Route>
          <Route path="provider" element={<RoleGuard roles={['provider_staff']}><RoleLayout role="provider" /></RoleGuard>}>
            <Route path="queue" element={<OrganizationFeatureGate feature="vilu_provider_queue_v2"><FoundationPlaceholder /></OrganizationFeatureGate>} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<App />} />
    </Routes>
  );
}
