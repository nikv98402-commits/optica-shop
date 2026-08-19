import { Link } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { foundationTranslations } from '../i18n/foundation';

export function FoundationPlaceholder() {
  const { language } = useLanguage();
  const copy = foundationTranslations[language];
  return (
    <main className="mx-auto grid min-h-[70vh] max-w-7xl place-items-center px-6 py-16">
      <section className="optical-card max-w-2xl">
        <p className="optical-eyebrow">Slice 0</p>
        <h1 className="mt-3 text-3xl font-extrabold md:text-5xl">{copy.unavailableTitle}</h1>
        <p className="mt-5 text-lg text-vilu-ink/65">{copy.unavailableBody}</p>
        <Link className="optical-button mt-8 inline-flex" to="/">{copy.backHome}</Link>
      </section>
    </main>
  );
}
