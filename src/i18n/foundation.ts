import type { Language } from './translations';

const en = {
  loading: 'Loading your workspace…',
  signInRequired: 'Sign in to continue',
  signInAction: 'Sign in',
  accessDenied: 'You do not have access to this workspace.',
  unavailableTitle: 'This workspace is not enabled yet',
  unavailableBody: 'The secure ViLu foundation is ready, but this screen will arrive in a later slice.',
  backHome: 'Back to ViLu',
  roles: {
    employee: 'Employee',
    employer: 'Employer',
    provider: 'Clinical partner',
  },
  employeeNav: { today: 'Today' },
} as const;

type TranslationShape<T> = T extends string
  ? string
  : { [K in keyof T]: TranslationShape<T[K]> };

const ru = {
  loading: 'Загружаем рабочее пространство…',
  signInRequired: 'Войдите, чтобы продолжить',
  signInAction: 'Войти',
  accessDenied: 'У вас нет доступа к этому рабочему пространству.',
  unavailableTitle: 'Рабочее пространство пока не включено',
  unavailableBody: 'Защищённый фундамент ViLu готов, а этот экран появится в следующем срезе.',
  backHome: 'Вернуться в ViLu',
  roles: {
    employee: 'Сотрудник',
    employer: 'Работодатель',
    provider: 'Клинический партнёр',
  },
  employeeNav: { today: 'Сегодня' },
} as const satisfies TranslationShape<typeof en>;

export const foundationTranslations: Record<Language, TranslationShape<typeof en>> = { en, ru };
export type FoundationTranslations = TranslationShape<typeof en>;
