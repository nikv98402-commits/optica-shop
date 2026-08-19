import { Link, Outlet, useLocation, useParams } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { foundationTranslations } from '../i18n/foundation';

export function RoleLayout({ role }: { role: 'employee' | 'employer' | 'provider' }) {
  const { language } = useLanguage();
  const { locale = language } = useParams();
  const location = useLocation();
  const copy = foundationTranslations[language];
  const pathSegments = location.pathname.split('/');
  pathSegments[1] = locale === 'en' ? 'ru' : 'en';
  const languageTarget = `${pathSegments.join('/')}${location.search}${location.hash}`;
  return (
    <div className="optical-signal-page min-h-screen">
      <header className="border-b border-vilu-line bg-vilu-paper/95 px-6 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link className="text-2xl font-black" to="/">ViLu</Link>
          <span className="optical-eyebrow">{copy.roles[role]}</span>
          <Link className="optical-button optical-button--secondary" to={languageTarget}>
            {locale === 'en' ? 'RU' : 'EN'}
          </Link>
        </div>
      </header>
      <Outlet />
    </div>
  );
}
