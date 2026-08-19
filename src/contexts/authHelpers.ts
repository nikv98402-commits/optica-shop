import type { Language } from '../i18n/translations';

export function createSignUpPayload(email: string, password: string, name: string | undefined, locale: Language) {
  return {
    email: email.trim().toLowerCase(),
    password,
    options: { data: { full_name: name?.trim() || null, locale } },
  };
}
