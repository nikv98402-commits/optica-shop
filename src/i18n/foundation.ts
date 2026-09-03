import type { Language } from './translations';

const en = {
  loading: 'Loading your workspace…',
  signInRequired: 'Sign in to continue',
  signInBody: 'Use your ViLu account to return to the secure workspace.',
  signInAction: 'Sign in',
  accessDenied: 'You do not have access to this workspace.',
  accessDeniedBody: 'Check the organization link or return to the ViLu home page.',
  unavailableTitle: 'This workspace is not enabled yet',
  unavailableBody: 'The secure ViLu foundation is ready, but this screen will arrive in a later slice.',
  backHome: 'Back to ViLu',
  roles: {
    employee: 'Employee',
    employer: 'Employer',
    provider: 'Clinical partner',
  },
  employeeNav: { today: 'Today', passport: 'Vision passport', profile: 'Profile' },
} as const;

type TranslationShape<T> = T extends string
  ? string
  : { [K in keyof T]: TranslationShape<T[K]> };

const ru = {
  loading: 'Загружаем рабочее пространство…',
  signInRequired: 'Войдите, чтобы продолжить',
  signInBody: 'Используйте аккаунт ViLu, чтобы вернуться в защищённое рабочее пространство.',
  signInAction: 'Войти',
  accessDenied: 'У вас нет доступа к этому рабочему пространству.',
  accessDeniedBody: 'Проверьте ссылку организации или вернитесь на главную страницу ViLu.',
  unavailableTitle: 'Рабочее пространство пока не включено',
  unavailableBody: 'Защищённый фундамент ViLu готов, а этот экран появится в следующем срезе.',
  backHome: 'Вернуться в ViLu',
  roles: {
    employee: 'Сотрудник',
    employer: 'Работодатель',
    provider: 'Клинический партнёр',
  },
  employeeNav: { today: 'Сегодня', passport: 'Паспорт зрения', profile: 'Профиль' },
} as const satisfies TranslationShape<typeof en>;

export const foundationTranslations: Record<Language, TranslationShape<typeof en>> = { en, ru };
export type FoundationTranslations = TranslationShape<typeof en>;
