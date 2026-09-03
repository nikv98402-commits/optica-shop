import { Link, Outlet, useLocation, useParams } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { foundationTranslations } from '../i18n/foundation';

export function RoleLayout({ role }: { role: 'employee' | 'employer' | 'provider' }) {
  const { language } = useLanguage();
  const { locale = language, organizationId = '' } = useParams();
  const location = useLocation();
  const copy = foundationTranslations[language];
  const pathSegments = location.pathname.split('/');
  pathSegments[1] = locale === 'en' ? 'ru' : 'en';
  const languageTarget = `${pathSegments.join('/')}${location.search}${location.hash}`;
  const employeeRoot = `/${locale}/organizations/${organizationId}/employee`;
  return (
    <div className="optical-signal-page min-h-screen">
      <header className="employee-flow-header border-b border-vilu-line bg-vilu-paper/95 px-4 py-4 backdrop-blur md:px-6">
        <div className="employee-flow-header__inner mx-auto flex max-w-7xl items-center justify-between">
          <Link className="text-2xl font-black" to="/">ViLu</Link>
          {role === 'employee' ? <nav aria-label={copy.roles.employee}>
            <Link to={`${employeeRoot}/today`}>{foundationTranslations[language].employeeNav.today}</Link>
            <Link to={`${employeeRoot}/passport`}>{foundationTranslations[language].employeeNav.passport}</Link>
            <Link to={`${employeeRoot}/profile`}>{foundationTranslations[language].employeeNav.profile}</Link>
          </nav> : <span className="optical-eyebrow">{copy.roles[role]}</span>}
          <Link className="optical-button optical-button--secondary" to={languageTarget}>
            {locale === 'en' ? 'RU' : 'EN'}
          </Link>
        </div>
      </header>
      <Outlet />
    </div>
  );
}
