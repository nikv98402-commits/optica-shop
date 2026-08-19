import { useLanguage } from '../contexts/LanguageContext';
import { strictTranslations } from '../i18n/translations';

export function useTranslation() {
  const { language } = useLanguage();
  return strictTranslations[language];
}
