export type Locale = 'ru' | 'en';

export type LocalizedText = {
  ru: string;
  en: string;
};

export type VisionAccessFact = {
  id: string;
  value: LocalizedText;
  label: LocalizedText;
};

export type VisionAccessStep = {
  id: string;
  title: LocalizedText;
  body: LocalizedText;
};

export type VisionAccessPartnerCard = {
  id: string;
  title: LocalizedText;
  body: LocalizedText;
};

export type VisionAccessCounterMetric = {
  id: string;
  value: string;
  label: LocalizedText;
};

export const visionAccessHero = {
  eyebrow: {
    ru: 'ViLu Vision Access Program',
    en: 'ViLu Vision Access Program',
  },
  title: {
    ru: 'Доступ к зрению начинается с понятного маршрута',
    en: 'Access to vision starts with a clear route',
  },
  subtitle: {
    ru: 'Помогаем сделать базовую коррекцию зрения доступнее',
    en: 'Helping make basic vision correction more accessible',
  },
  body: {
    ru: 'ViLu начинает с онлайн-подбора очков, self-check и маршрутизации в оптики. Долгосрочно мы хотим связать пользователей, ритейл, клиники, фонды и NGO, чтобы больше людей могли вовремя пройти проверку зрения и получить доступ к очкам.',
    en: 'ViLu starts with online eyewear fitting, self-check, and routing to optical stores. Long term, we want to connect users, retailers, clinics, foundations, and NGOs so more people can get timely eye checks and access to glasses.',
  },
  primaryCta: {
    ru: 'Обсудить партнерство',
    en: 'Discuss partnership',
  },
  secondaryCta: {
    ru: 'Пройти Vision Tracker',
    en: 'Start Vision Tracker',
  },
};

export const visionAccessFacts: VisionAccessFact[] = [
  {
    id: 'global-impairment',
    value: { ru: '2,2 млрд+', en: '2.2B+' },
    label: {
      ru: 'людей в мире живут с нарушением зрения вблизи или вдаль.',
      en: 'people worldwide live with near or distance vision impairment.',
    },
  },
  {
    id: 'addressable',
    value: { ru: '1 млрд+', en: '1B+' },
    label: {
      ru: 'случаев можно было предотвратить или все еще можно скорректировать.',
      en: 'cases could have been prevented or can still be addressed.',
    },
  },
  {
    id: 'low-income-access',
    value: { ru: '2/3', en: '2/3' },
    label: {
      ru: 'людей, которым нужны очки в странах с низким доходом, не имеют к ним доступа.',
      en: 'of people who need glasses in low-income countries do not have access to them.',
    },
  },
  {
    id: 'productivity',
    value: { ru: '$411 млрд', en: '$411B' },
    label: {
      ru: 'оцениваются ежегодные потери производительности, связанные с нарушениями зрения.',
      en: 'in estimated annual productivity loss related to vision impairment.',
    },
  },
  {
    id: 'glasses-cost-effective',
    value: { ru: 'Очки', en: 'Glasses' },
    label: {
      ru: 'остаются одним из самых практичных способов коррекции рефракционных нарушений.',
      en: 'remain one of the most practical ways to correct refractive errors.',
    },
  },
];

export const visionAccessSteps: VisionAccessStep[] = [
  {
    id: 'detect-signal',
    title: { ru: 'Найти сигнал', en: 'Detect the signal' },
    body: {
      ru: 'Self-check и сценарии подбора помогают человеку понять, когда стоит запланировать очную проверку.',
      en: 'Self-check and fitting flows help a person understand when an in-person eye check may be worth scheduling.',
    },
  },
  {
    id: 'prepare-solution',
    title: { ru: 'Подготовить решение', en: 'Prepare the solution' },
    body: {
      ru: 'Онлайн-примерка и Face-fit score сокращают выбор до 2-3 оправ перед визитом.',
      en: 'Online try-on and Face-fit score narrow the choice to 2-3 frames before the visit.',
    },
  },
  {
    id: 'route-to-care',
    title: { ru: 'Довести до салона', en: 'Route to care' },
    body: {
      ru: 'ViLu показывает оптики после персонального подбора, а не как обычный справочник.',
      en: 'ViLu shows stores after personalized selection, not as a generic directory.',
    },
  },
  {
    id: 'expand-access',
    title: { ru: 'Расширять доступ', en: 'Expand access' },
    body: {
      ru: 'Партнеры могут помогать превращать намерение пользователя в проверку зрения, очки или субсидированную программу.',
      en: 'Partners can help turn user intent into an eye check, glasses, or a subsidized access program.',
    },
  },
];

export const visionAccessPartners: VisionAccessPartnerCard[] = [
  {
    id: 'retailers',
    title: { ru: 'Оптический ритейл', en: 'Optical retailers' },
    body: {
      ru: 'Получают пользователей, которые уже прошли подбор и понимают, что хотят проверить в салоне.',
      en: 'Receive users who already completed selection and know what they want to verify in store.',
    },
  },
  {
    id: 'clinics',
    title: { ru: 'Клиники', en: 'Clinics' },
    body: {
      ru: 'Могут принимать людей с понятным предварительным контекстом без передачи чувствительных данных.',
      en: 'Can receive people with clear preliminary context without sensitive data transfer.',
    },
  },
  {
    id: 'ngos',
    title: { ru: 'Фонды и NGO', en: 'NGOs and foundations' },
    body: {
      ru: 'Получают прозрачную модель маршрутизации и будущей отчетности, без фейковых сборов в MVP.',
      en: 'Get a transparent routing and future reporting model, without fake fundraising in the MVP.',
    },
  },
  {
    id: 'sponsors',
    title: { ru: 'Корпоративные партнеры', en: 'Corporate sponsors' },
    body: {
      ru: 'Могут поддерживать программы проверки зрения и базовой коррекции для сотрудников или сообществ.',
      en: 'Can support eye-check and basic correction programs for employees or communities.',
    },
  },
];

export const visionAccessCounters: VisionAccessCounterMetric[] = [
  {
    id: 'checks',
    value: '0',
    label: { ru: 'проверок зрения профинансировано через партнеров', en: 'eye checks funded through partners' },
  },
  {
    id: 'glasses',
    value: '0',
    label: { ru: 'пар очков выдано через программы доступа', en: 'pairs of glasses delivered through access programs' },
  },
  {
    id: 'partners',
    value: '0',
    label: { ru: 'подтвержденных партнерских программ', en: 'verified partner programs' },
  },
  {
    id: 'stage',
    value: 'Planning',
    label: { ru: 'стадия модели отчетности', en: 'reporting model stage' },
  },
];

export const visionAccessTrust = {
  whyTitle: {
    ru: 'Почему очки важны',
    en: 'Why glasses matter',
  },
  whyBody: {
    ru: 'Базовая коррекция зрения часто начинается не с сложной технологии, а с понятного пути: заметить проблему, пройти очную проверку, подобрать оправу и получить подходящие линзы. ViLu строит этот путь как consumer-friendly слой поверх оптик, клиник и будущих партнерских программ.',
    en: 'Basic vision correction often starts not with complex technology, but with a clear route: notice a problem, get an in-person eye check, choose a frame, and receive appropriate lenses. ViLu builds this route as a consumer-friendly layer across optical stores, clinics, and future partner programs.',
  },
  counterLabel: {
    ru: 'Планируемая модель отчетности',
    en: 'Planned reporting model',
  },
  counterNote: {
    ru: 'Мы не показываем фейковые результаты. В MVP счетчик обозначает будущую прозрачную модель отчетности для проверенных партнерских программ.',
    en: 'We do not show fake results. In the MVP, this counter describes a future transparent reporting model for verified partner programs.',
  },
  notDoTitle: {
    ru: 'Что мы не делаем в MVP',
    en: 'What we do not do in the MVP',
  },
  notDoItems: {
    ru: ['Не собираем пожертвования', 'Не обрабатываем платежи', 'Не ставим диагноз', 'Не используем бренд WHO', 'Не показываем фейковые истории'],
    en: ['No donations collected', 'No payment processing', 'No diagnosis', 'No WHO branding', 'No fake beneficiary stories'],
  },
  sourceNote: {
    ru: 'Факты основаны на справке WHO о слепоте и нарушениях зрения. ViLu не связан с WHO, не использует бренд WHO и не подразумевает endorsement.',
    en: 'Facts are based on the WHO fact sheet on blindness and visual impairment. ViLu is not affiliated with WHO, does not use WHO branding, and does not imply endorsement.',
  },
  sourceCta: {
    ru: 'Открыть источник WHO',
    en: 'Open WHO source',
  },
  ctaTitle: {
    ru: 'Хотите обсудить партнерскую модель доступа?',
    en: 'Want to discuss the access partnership model?',
  },
  ctaBody: {
    ru: 'Мы ищем партнеров среди оптик, клиник, фондов, NGO и компаний, которые хотят помогать людям проходить проверку зрения и получать базовую коррекцию.',
    en: 'We are looking for partners among optical retailers, clinics, foundations, NGOs, and companies that want to help people get eye checks and basic correction.',
  },
};
