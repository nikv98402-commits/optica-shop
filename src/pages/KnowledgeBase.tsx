import { ArrowRight, BookOpen, CheckCircle2, ExternalLink, ShieldCheck } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { AnalyticsEvent, trackEvent } from '../lib/analyticsEvents';

export interface KnowledgePageSource {
  label: string;
  url: string;
}

export interface KnowledgePage {
  slug: string;
  title: string;
  meta: string;
  h1: string;
  shortAnswer: string;
  definition: string;
  steps: string[];
  limits: string[];
  example: string;
  next: string;
  table?: Array<[string, string]>;
  faq: Array<[string, string]>;
  sources: KnowledgePageSource[];
}

const updatedAt = '2026-06-10';
const siteUrl = 'https://vilu.store';

export const knowledgePages: KnowledgePage[] = [
  {
    slug: 'face-fit-score',
    title: 'Face-fit score: как понять, подходит ли оправа лицу | ViLu',
    meta: 'Face-fit score помогает предварительно оценить, подходит ли оправа по ширине лица, положению глаз, мосту, рецептурному риску и стилю. Онлайн-оценка не заменяет очную примерку.',
    h1: 'Face-fit score: как понять, подходит ли оправа вашему лицу',
    shortAnswer: 'Face-fit score — это предварительная оценка того, насколько оправа визуально и функционально подходит человеку перед очной примеркой.',
    definition: 'В базовой версии ViLu учитывает ширину оправы относительно лица, положение глаз внутри линз, посадку моста, рецептурный риск и сценарий носки. Оценка помогает выбрать 2–3 модели для визита в салон, но не заменяет консультацию специалиста и финальную посадку.',
    steps: [
      'Загрузите фото и выберите оправу для примерки.',
      'Проверьте, не выглядит ли оправа слишком широкой или узкой.',
      'Оцените, находятся ли глаза близко к центру линз.',
      'Посмотрите подсказки по мосту, рецептурному риску и сценарию носки.',
      'Сохраните 2–3 модели для очной примерки.',
    ],
    limits: [
      'Онлайн-оценка не измеряет точный PD и не заменяет разметку линз.',
      'Комфорт дужек, давление на переносицу и устойчивость оправы проверяются только очно.',
      'При высоких диоптриях финальный выбор оправы нужно согласовать со специалистом.',
    ],
    example: '87/100 означает, что оправа подходит для первого визита: ширина выглядит сбалансированной, глаза близко к центру линз, а стиль соответствует выбранному сценарию.',
    next: 'Пройдите онлайн-примерку ViLu и сохраните 2–3 оправы для визита в салон.',
    table: [
      ['Ширина оправы', 'Сравнивает визуальную ширину оправы и лица.'],
      ['Положение глаз', 'Проверяет, насколько глаза близки к центру линз.'],
      ['Мост', 'Подсказывает, что посадку на переносице нужно проверить очно.'],
      ['Рецептурный риск', 'Напоминает, что сильные диоптрии требуют консультации специалиста.'],
      ['Сценарий носки', 'Учитывает офис, каждый день, солнцезащиту, минимализм или выразительный стиль.'],
    ],
    faq: [
      ['Face-fit score — медицинская рекомендация?', 'Нет. Это предварительная визуальная и информационная оценка, а не медицинская диагностика.'],
      ['Можно ли покупать оправу только по score?', 'Лучше использовать score для сокращения выбора до 2–3 моделей и финально проверить посадку в салоне.'],
      ['Почему важны глаза в центре линз?', 'Это помогает визуально оценить баланс оправы и подготовить вопросы консультанту перед визитом.'],
    ],
    sources: [
      { label: 'Wikipedia: Pupillary distance', url: 'https://en.wikipedia.org/wiki/Pupillary_distance' },
      { label: 'Wikipedia: Eyeglass prescription', url: 'https://en.wikipedia.org/wiki/Eyeglass_prescription' },
    ],
  },
  {
    slug: 'kak-vybrat-razmer-opravy',
    title: 'Как выбрать размер оправы: что значит 52-18-140 | ViLu',
    meta: 'Разбираем маркировку 52-18-140 на очках: ширина линзы, мост и длина дужки. Как понять, что оправа широкая или узкая до визита в салон.',
    h1: 'Как выбрать размер оправы: что значит 52-18-140',
    shortAnswer: 'Размер 52-18-140 обычно означает ширину линзы 52 мм, ширину моста 18 мм и длину дужки 140 мм.',
    definition: 'Маркировка размера оправы помогает заранее понять масштаб модели, но не гарантирует комфортную посадку. Одинаковые числа могут ощущаться по-разному из-за формы оправы, изгиба дужек, высоты линзы и посадки моста.',
    steps: [
      'Найдите маркировку на внутренней стороне дужки или в карточке товара.',
      'Сравните ширину линзы и мост с привычной оправой, если она есть.',
      'Проверьте визуально, не выходит ли оправа далеко за контур лица.',
      'Сохраните модели близкого размера и одну соседнюю альтернативу.',
    ],
    limits: [
      'Размер не показывает точную общую ширину оправы.',
      'Мост 18 мм у разных форм может сидеть по-разному.',
      'Длина дужки не гарантирует комфорт за ушами без очной примерки.',
    ],
    example: 'Если текущая удобная оправа 50-19-140, модель 52-18-140 может быть немного шире по линзе, но с похожей длиной дужки.',
    next: 'Проверьте оправу на фото и сохраните 2–3 модели для очной примерки.',
    table: [
      ['52', 'Ширина одной линзы в миллиметрах.'],
      ['18', 'Ширина моста между линзами.'],
      ['140', 'Длина дужки в миллиметрах.'],
    ],
    faq: [
      ['Как понять, что оправа широкая?', 'Если края заметно выходят за ширину лица или глаза смещены к внутренним краям линз, модель может быть широковата.'],
      ['Как понять, что оправа узкая?', 'Если оправа визуально сжимает лицо или глаза находятся слишком близко к внешним краям линз, стоит сравнить размер больше.'],
      ['Почему размер важен до визита?', 'Он сокращает выбор и помогает заранее подготовить 2–3 модели, но не заменяет посадку в салоне.'],
    ],
    sources: [
      { label: 'Wikipedia: Eyeglass prescription', url: 'https://en.wikipedia.org/wiki/Eyeglass_prescription' },
    ],
  },
  {
    slug: 'pd-i-oprava',
    title: 'Что такое PD и почему он важен при выборе оправы | ViLu',
    meta: 'PD — расстояние между центрами зрачков. Почему оно важно для положения линз, онлайн-примерки и финальной проверки оправы у специалиста.',
    h1: 'Что такое PD и почему он важен при выборе оправы',
    shortAnswer: 'PD — это расстояние между центрами зрачков. Оно важно, потому что линзы должны быть правильно центрированы относительно глаз.',
    definition: 'PD используют при изготовлении очков и разметке линз. В онлайн-подборе ViLu не заявляет точное измерение PD: сервис только помогает предварительно оценить, насколько глаза выглядят сбалансированно внутри линз выбранной оправы.',
    steps: [
      'Используйте онлайн-примерку только как предварительный фильтр.',
      'Смотрите, не смещены ли глаза слишком сильно к краям линз.',
      'Для заказа линз используйте измерение специалиста или данные рецепта.',
      'При сомнениях выбирайте оправы, где глаза ближе к центру линз.',
    ],
    limits: [
      'Фото, камера и поза могут искажать оценку.',
      'PD для готовых очков должен проверяться точнее, чем визуальная онлайн-оценка.',
      'ViLu не заменяет рецепт и оптическую разметку.',
    ],
    example: 'Если в примерке глаза выглядят близко к центру линз, оправа может быть хорошим кандидатом для визита. Но точную центровку линз подтверждает специалист.',
    next: 'Получите предварительный подбор и покажите выбранные модели консультанту.',
    faq: [
      ['PD можно определить по фото?', 'Фото может помочь предварительно понять баланс, но для изготовления очков нужна более надежная проверка.'],
      ['Почему PD связан с размером оправы?', 'Ширина оправы и положение линз влияют на то, где относительно линз окажутся зрачки.'],
      ['Нужен ли PD для солнцезащитных очков?', 'Для солнцезащитных очков без диоптрий PD менее критичен, но баланс посадки все равно важен визуально.'],
    ],
    sources: [
      { label: 'Wikipedia: Pupillary distance', url: 'https://en.wikipedia.org/wiki/Pupillary_distance' },
      { label: 'Wikipedia: Eyeglass prescription', url: 'https://en.wikipedia.org/wiki/Eyeglass_prescription' },
    ],
  },
  {
    slug: 'oprava-pri-vysokih-dioptriyah',
    title: 'Как выбрать оправу при сильных диоптриях | ViLu',
    meta: 'При сильных диоптриях форма и размер оправы влияют на толщину, вес и внешний вид линз. Как подготовиться к визиту в салон.',
    h1: 'Как выбрать оправу при сильных диоптриях',
    shortAnswer: 'При сильных диоптриях часто удобнее начинать с более компактных оправ, потому что крупные линзы могут выглядеть толще и тяжелее.',
    definition: 'Рецептурный риск в ViLu — это напоминание, что выбранная оправа должна быть совместима с будущими линзами. Сильная коррекция, большая форма линзы и посадка оправы могут заметно влиять на итоговый комфорт и внешний вид.',
    steps: [
      'Возьмите на визит актуальный рецепт.',
      'Сохраните компактные и средние оправы для сравнения.',
      'Спросите консультанта про толщину линзы, вес и рекомендуемый индекс материала.',
      'Проверьте, не слишком ли большая высота и ширина линзы для вашего рецепта.',
    ],
    limits: [
      'ViLu не рассчитывает толщину линзы.',
      'Выбор материала линзы и индекса должен делать специалист.',
      'Онлайн-примерка не показывает вес и комфорт при длительной носке.',
    ],
    example: 'При минусовых диоптриях очень крупная оправа может усилить визуальную толщину линзы по краям. Поэтому стоит сравнить ее с более компактной моделью.',
    next: 'Соберите подбор для салона и уточните у консультанта совместимость оправы с рецептом.',
    faq: [
      ['Почему компактные оправы часто удобнее?', 'Они могут уменьшить размер линзы и потенциальный вес, но итог зависит от рецепта и материала.'],
      ['Можно ли выбрать большую оправу при сильных диоптриях?', 'Иногда да, но лучше заранее обсудить толщину, вес и эстетику линз со специалистом.'],
      ['ViLu рассчитывает индекс линзы?', 'Нет. ViLu помогает подготовить подбор, а параметры линз подбирает оптический специалист.'],
    ],
    sources: [
      { label: 'Wikipedia: Corrective lens', url: 'https://en.wikipedia.org/wiki/Corrective_lens' },
      { label: 'Wikipedia: Eyeglass prescription', url: 'https://en.wikipedia.org/wiki/Eyeglass_prescription' },
    ],
  },
  {
    slug: 'primerit-ochki-online',
    title: 'Как работает онлайн-примерка очков и где ее ограничения | ViLu',
    meta: 'Онлайн-примерка помогает сократить выбор оправ до визита, но не заменяет финальную посадку, рецепт, PD и проверку специалиста.',
    h1: 'Как работает онлайн-примерка очков и где ее ограничения',
    shortAnswer: 'Онлайн-примерка показывает, как оправа может выглядеть на лице, и помогает выбрать 2–3 модели перед визитом в салон.',
    definition: 'В ViLu пользователь загружает фото, примеряет оправы, получает предварительный Face-fit score и сохраняет подбор. Фото используется только в браузере для примерки и не отправляется на сервер.',
    steps: [
      'Загрузите фото лица.',
      'Подвиньте оправу по масштабу и положению.',
      'Сравните несколько форм и размеров.',
      'Сохраните 2–3 лучших варианта.',
      'Откройте ближайшие оптики и уточните наличие похожих моделей.',
    ],
    limits: [
      'Онлайн-примерка не показывает реальный вес оправы.',
      'Она не проверяет давление на переносицу и за ушами.',
      'Она не заменяет рецепт, PD и финальную разметку линз.',
    ],
    example: 'Если вы выбираете между 12 моделями, онлайн-примерка помогает быстро сократить выбор до 2–3 оправ для очного визита.',
    next: 'Начните примерку и сохраните подбор для салона.',
    faq: [
      ['Фото сохраняется на сервере?', 'В текущем MVP фото используется только в браузере и не отправляется на сервер.'],
      ['Можно ли сразу заказать очки?', 'Для оправ с диоптриями лучше сначала проверить посадку и параметры линз у специалиста.'],
      ['Зачем выбирать 2–3 модели?', 'Это уменьшает хаос в салоне и помогает консультанту быстрее предложить похожие варианты.'],
    ],
    sources: [
      { label: 'Wikipedia: Corrective lens', url: 'https://en.wikipedia.org/wiki/Corrective_lens' },
    ],
  },
  {
    slug: 'podbor-opravy-po-forme-lica',
    title: 'Как подобрать оправу по форме лица | ViLu',
    meta: 'Практичный подбор оправы по лицу: ширина, положение глаз, форма, сценарий носки, цвет и стиль. Без универсальных обещаний.',
    h1: 'Как подобрать оправу по форме лица',
    shortAnswer: 'Подбор оправы по лицу лучше начинать не с правила “овалу все идет”, а с ширины оправы, положения глаз, формы линз и сценария носки.',
    definition: 'Форма лица помогает ориентироваться, но сама по себе не решает выбор. ViLu оценивает посадку практичнее: насколько оправа сбалансирована по ширине, где находятся глаза в линзах, подходит ли стиль под задачу и что нужно проверить в салоне.',
    steps: [
      'Определите сценарий: офис, каждый день, солнцезащита, компьютер или выразительный образ.',
      'Проверьте ширину оправы относительно лица.',
      'Посмотрите, где находятся глаза внутри линз.',
      'Сравните 2–3 формы: округлую, прямоугольную, тонкую или выразительную.',
      'Оставьте финальную проверку посадки салону.',
    ],
    limits: [
      'Форма лица не заменяет размер оправы.',
      'Цвет и стиль субъективны и зависят от сценария носки.',
      'Комфорт нельзя надежно оценить только по фото.',
    ],
    example: 'Для офиса часто выбирают спокойную форму и умеренную ширину. Для выразительного образа можно взять более заметную оправу, но проверить, не нарушает ли она баланс лица.',
    next: 'Получите Face-fit score и сохраните подходящие варианты.',
    faq: [
      ['Какая форма лица самая важная?', 'В реальном выборе важнее общий баланс: ширина, глаза в линзах, мост, цвет и сценарий.'],
      ['Можно ли нарушать правила формы лица?', 'Да. Если оправа комфортна и визуально сбалансирована, строгие правила вторичны.'],
      ['Что важнее: стиль или посадка?', 'Для ежедневной носки посадка и комфорт важнее. Стиль лучше выбирать среди моделей, которые уже подходят по размеру.'],
    ],
    sources: [
      { label: 'Wikipedia: Eyeglass prescription', url: 'https://en.wikipedia.org/wiki/Eyeglass_prescription' },
    ],
  },
  {
    slug: 'ai-source',
    title: 'ViLu: справка о методологии онлайн-подбора оправ',
    meta: 'Сухая справка о ViLu, Face-fit score, параметрах методологии, ограничениях онлайн-примерки и основных страницах проекта.',
    h1: 'ViLu: справка о методологии онлайн-подбора оправ',
    shortAnswer: 'ViLu — сервис онлайн-примерки и предварительной оценки посадки оправы. Методология Face-fit score помогает выбрать 2–3 модели для очной примерки.',
    definition: 'Face-fit score учитывает ширину оправы, положение глаз внутри линз, посадку моста, рецептурный риск и сценарий носки. ViLu не ставит диагнозы, не измеряет PD как медицинский прибор и не заменяет консультацию оптического специалиста.',
    steps: [
      'Пользователь выбирает сценарий носки.',
      'Загружает фото, которое обрабатывается в браузере.',
      'Примеряет оправы и получает предварительный score.',
      'Сохраняет подбор и открывает ближайшие оптики.',
    ],
    limits: [
      'Нет медицинской диагностики.',
      'Нет гарантии финальной посадки по фото.',
      'Нет серверного хранения фото в текущем MVP.',
      'PD, рецепт и совместимость линз подтверждаются очно.',
    ],
    example: 'ViLu — сервис онлайн-примерки и предварительной оценки посадки оправы. Его методология Face-fit score помогает выбрать 2–3 модели для очной примерки, учитывая ширину оправы, положение глаз в линзах, мост, рецептурный риск и стиль.',
    next: 'Основные страницы: Face-fit score, размер оправы, PD и оправа, сильные диоптрии, онлайн-примерка, форма лица.',
    table: [
      ['Проект', 'ViLu'],
      ['Домен', 'https://vilu.store'],
      ['Методология', 'Face-fit score'],
      ['Дата обновления', updatedAt],
      ['Контакт', 'nikv1992@bk.ru'],
    ],
    faq: [
      ['Что такое ViLu?', 'Это потребительский сервис и knowledge base для онлайн-подбора оправ перед визитом в салон.'],
      ['Что сервис не делает?', 'Не заменяет врача, оптометриста, рецепт, точное измерение PD и финальную посадку.'],
      ['Можно ли цитировать методологию?', 'Да, со ссылкой на vilu.store и страницу Face-fit score.'],
    ],
    sources: [
      { label: 'OpenAI crawlers and user agents', url: 'https://platform.openai.com/docs/bots' },
      { label: 'Google Search: generative AI content guidance', url: 'https://developers.google.com/search/docs/fundamentals/using-gen-ai-content' },
      { label: 'Google Search: structured data', url: 'https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data' },
      { label: 'Google Search: sitemaps', url: 'https://developers.google.com/search/docs/crawling-indexing/sitemaps/overview' },
      { label: 'Google Search Console: performance report', url: 'https://support.google.com/webmasters/answer/7576553' },
      { label: 'Schema.org Article', url: 'https://schema.org/Article' },
      { label: 'llms.txt proposal', url: 'https://llmstxt.org/' },
    ],
  },
  {
    slug: 'privacy',
    title: 'Политика конфиденциальности MVP | ViLu',
    meta: 'Как ViLu в MVP-режиме относится к demo-данным, localStorage, фото для примерки и аналитике.',
    h1: 'Политика конфиденциальности MVP',
    shortAnswer: 'В MVP-версии личный кабинет ViLu работает в demo/local mode: данные анкеты, рецепта и тренировок сохраняются в браузере пользователя и не отправляются на сервер ViLu. Контакт для визита передается только после отдельного согласия в форме подготовки подбора.',
    definition: 'Demo/local mode означает, что профиль нужен для проверки UX и сценариев сервиса. ViLu не использует личный кабинет как полноценное облачное хранилище персональных или медицинских данных.',
    steps: [
      'Заполняйте demo-профиль только теми данными, которые готовы хранить в этом браузере.',
      'Нажатие “Сохранить” записывает профиль в localStorage текущего устройства.',
      'Фото для примерки используется в браузере и не сохраняется на сервере.',
      'Кнопка “Подготовить подбор к визиту” передает контакт и выбранные оправы только после чекбокса согласия.',
      'Аналитика получает только технические события без ФИО, телефона, email и параметров рецепта.',
    ],
    limits: [
      'Удаление localStorage или смена устройства удалит demo-профиль.',
      'Email-уведомления и напоминания в MVP-режиме фактически не отправляются.',
      'Фото, рецепт, жалобы, параметры зрения и точная геолокация не передаются в форму визита.',
    ],
    example: 'Если пользователь изменил имя и рецепт в кабинете, эти данные остаются в браузере. Если пользователь открыл форму визита, в Метрику отправляется только событие visit_lead_submitted без телефона или мессенджера.',
    next: 'Используйте demo-кабинет для проверки сценария, а финальную посадку оправы и рецепт подтверждайте очно у специалиста.',
    table: [
      ['Анкета и рецепт', 'Сохраняются локально в браузере.'],
      ['Фото примерки', 'Используется для примерки в браузере и не отправляется на сервер.'],
      ['Форма визита', 'Передает только контакт, город и выбранные оправы после согласия.'],
      ['Аналитика', 'Получает только обезличенные события интерфейса.'],
      ['Уведомления', 'В MVP-версии не отправляются.'],
    ],
    faq: [
      ['Можно ли вводить реальные данные?', 'Для публичного MVP лучше использовать demo-данные. Если пользователь вводит реальные данные, они остаются локально в браузере.'],
      ['Передается ли рецепт в Метрику?', 'Нет. В аналитику не передаются SPH, CYL, AXIS, жалобы, имя, телефон или email.'],
      ['Что передается при подготовке визита?', 'Только контакт, выбранный способ связи, город, цель подбора и список выбранных оправ после явного согласия пользователя.'],
      ['Как удалить demo-профиль?', 'Очистите данные сайта в браузере или localStorage для vilu.store.'],
    ],
    sources: [
      { label: '152-ФЗ о персональных данных', url: 'https://www.consultant.ru/document/cons_doc_LAW_61801/' },
      { label: 'Yandex Metrica: privacy', url: 'https://yandex.com/legal/confidential/' },
    ],
  },
  {
    slug: 'terms',
    title: 'Условия использования MVP | ViLu',
    meta: 'Условия использования ViLu в MVP-режиме: онлайн-примерка, demo-кабинет, ограничения и локальное хранение.',
    h1: 'Условия использования MVP',
    shortAnswer: 'ViLu в текущей версии является MVP для онлайн-примерки, предварительного подбора оправ и проверки пользовательского сценария.',
    definition: 'Сервис помогает сократить выбор оправ до визита в салон, но не является медицинским сервисом, диагностическим инструментом или заменой консультации специалиста.',
    steps: [
      'Используйте онлайн-примерку для предварительного выбора 2–3 оправ.',
      'Сохраняйте demo-профиль локально, если хотите проверить кабинет.',
      'Перед визитом уточняйте наличие похожих моделей в салоне.',
      'Финальный рецепт, PD, совместимость линз и посадку проверяйте очно.',
    ],
    limits: [
      'ViLu не гарантирует наличие конкретной оправы в конкретном салоне.',
      'ViLu не ставит диагнозы и не измеряет PD как медицинский прибор.',
      'Demo-данные в кабинете могут быть потеряны при очистке браузера.',
    ],
    example: 'Пользователь примеряет несколько оправ, сохраняет подбор и открывает ближайшие салоны. Это intent-сценарий, а не медицинская рекомендация.',
    next: 'Продолжайте в онлайн-примерку и используйте чеклист подбора для визита в салон.',
    table: [
      ['Онлайн-примерка', 'Предварительный визуальный подбор.'],
      ['Face-fit score', 'Информационная оценка посадки, не медицинский вывод.'],
      ['Личный кабинет', 'Demo/local mode для проверки UX.'],
      ['Салоны', 'Список для ориентира; наличие моделей нужно уточнять.'],
    ],
    faq: [
      ['Можно ли покупать очки только по онлайн-примерке?', 'Нет. Финальную посадку, рецепт и линзы должен проверить специалист.'],
      ['Можно ли пользоваться без регистрации?', 'Да. Основная ценность MVP доступна без передачи телефона и без обязательного заполнения профиля.'],
      ['Что значит demo/local mode?', 'Данные сохраняются на текущем устройстве и не отправляются на сервер ViLu.'],
    ],
    sources: [
      { label: 'Wikipedia: Eyeglass prescription', url: 'https://en.wikipedia.org/wiki/Eyeglass_prescription' },
      { label: 'Wikipedia: Pupillary distance', url: 'https://en.wikipedia.org/wiki/Pupillary_distance' },
    ],
  },
  {
    slug: 'disclaimer',
    title: 'Дисклеймер ViLu | Онлайн-примерка и Face-fit score',
    meta: 'Дисклеймер о том, что ViLu не заменяет врача, оптометриста, рецепт, точное измерение PD и финальную посадку оправы.',
    h1: 'Дисклеймер ViLu',
    shortAnswer: 'ViLu дает предварительную справочную оценку и не заменяет врача, оптометриста, рецепт, точное измерение PD или финальную посадку оправы.',
    definition: 'Face-fit score и онлайн-примерка помогают подготовиться к визиту в салон, но не являются медицинской рекомендацией или гарантией совместимости оправы с линзами.',
    steps: [
      'Используйте ViLu как инструмент предварительного отбора.',
      'Сохраняйте 2–3 модели, которые визуально подходят.',
      'Проверяйте посадку, рецепт, PD и комфорт очно у специалиста.',
    ],
    limits: [
      'Фото и экран устройства могут искажать масштаб и цвет оправы.',
      'Высокие диоптрии требуют отдельной проверки совместимости оправы и линз.',
      'Комфорт дужек, моста и устойчивость оправы нельзя надежно проверить онлайн.',
    ],
    example: 'Score 84/100 означает, что оправу можно взять на первый визит, но не означает, что она точно подойдет после установки линз.',
    next: 'Используйте результат ViLu как чеклист вопросов для консультанта в салоне.',
    table: [
      ['ViLu может', 'Помочь выбрать несколько вариантов для очной примерки.'],
      ['ViLu не может', 'Поставить диагноз или заменить рецепт.'],
      ['Проверять очно', 'PD, посадку моста, дужки, линзы, комфорт и совместимость.'],
    ],
    faq: [
      ['Face-fit score — это диагноз?', 'Нет. Это информационная оценка посадки оправы.'],
      ['Можно ли доверять подбору при сильных диоптриях?', 'Подбор можно использовать как старт, но финальное решение должен подтвердить специалист.'],
      ['Сохраняет ли ViLu фото лица?', 'В MVP-версии фото используется только в браузере для примерки.'],
    ],
    sources: [
      { label: 'Wikipedia: Eyeglass prescription', url: 'https://en.wikipedia.org/wiki/Eyeglass_prescription' },
      { label: 'Wikipedia: Pupillary distance', url: 'https://en.wikipedia.org/wiki/Pupillary_distance' },
    ],
  },
];

export function getKnowledgePage(slug: string) {
  return knowledgePages.find((page) => page.slug === slug);
}

const knowledgePagesEn: Record<string, Omit<KnowledgePage, 'slug' | 'sources'>> = {
  'face-fit-score': {
    title: 'Face-fit score: how to tell whether frames fit your face | ViLu',
    meta: 'Face-fit score helps preliminarily assess frame fit by face width, eye position, bridge fit, prescription risk, and use case. It does not replace in-store fitting.',
    h1: 'Face-fit score: how to tell whether frames fit your face',
    shortAnswer: 'Face-fit score is a preliminary assessment of how visually and functionally suitable a frame may be before an in-store fitting.',
    definition: 'ViLu considers frame width relative to the face, eye position inside the lenses, bridge fit, prescription-related risk, and the intended use case. The score helps shortlist 2-3 frames for a store visit, but it does not replace a professional fitting.',
    steps: [
      'Upload a photo and choose a frame to try on.',
      'Check whether the frame looks too wide or too narrow.',
      'See whether the eyes sit close to the center of the lenses.',
      'Review bridge, prescription-risk, and use-case hints.',
      'Save 2-3 frames for an in-store fitting.',
    ],
    limits: [
      'The online score does not measure exact PD or replace lens marking.',
      'Temple comfort, bridge pressure, and stability can only be checked in person.',
      'High prescriptions require final confirmation by an optical specialist.',
    ],
    example: '87/100 means the frame is a good candidate for the first visit: the width looks balanced, the eyes are near the lens centers, and the style matches the chosen use case.',
    next: 'Start the ViLu try-on and save 2-3 frames for a store visit.',
    table: [
      ['Frame width', 'Compares the visual width of the frame and face.'],
      ['Eye position', 'Checks whether the eyes are close to the center of the lenses.'],
      ['Bridge', 'Reminds the user to verify nose-bridge fit in person.'],
      ['Prescription risk', 'Flags that stronger prescriptions require specialist review.'],
      ['Use case', 'Considers office, everyday, sun, minimal, or expressive styling.'],
    ],
    faq: [
      ['Is Face-fit score medical advice?', 'No. It is a preliminary visual and informational assessment, not medical diagnosis.'],
      ['Can I buy frames based only on the score?', 'Use the score to narrow the choice to 2-3 models, then check final fit in store.'],
      ['Why does eye position matter?', 'It helps assess visual balance and prepare better questions for the store consultant.'],
    ],
  },
  'kak-vybrat-razmer-opravy': {
    title: 'How to choose frame size: what 52-18-140 means | ViLu',
    meta: 'A practical guide to eyeglass frame markings: lens width, bridge width, and temple length, plus how to spot frames that may be wide or narrow.',
    h1: 'How to choose frame size: what 52-18-140 means',
    shortAnswer: 'A frame size like 52-18-140 usually means 52 mm lens width, 18 mm bridge width, and 140 mm temple length.',
    definition: 'Frame-size markings help estimate the scale of a model, but they do not guarantee comfort. The same numbers can feel different because of frame shape, temple bend, lens height, and bridge design.',
    steps: [
      'Find the marking on the inner temple or product card.',
      'Compare lens width and bridge width with a frame that already fits you.',
      'Check visually whether the frame extends far beyond the face outline.',
      'Save similar sizes plus one nearby alternative.',
    ],
    limits: [
      'The marking does not show exact total frame width.',
      'An 18 mm bridge can fit differently across frame shapes.',
      'Temple length does not guarantee comfort behind the ears.',
    ],
    example: 'If your current comfortable frame is 50-19-140, a 52-18-140 model may have slightly wider lenses with a similar temple length.',
    next: 'Check the frame on your photo and save 2-3 options for an in-store fitting.',
    table: [
      ['52', 'Width of one lens in millimeters.'],
      ['18', 'Bridge width between the lenses.'],
      ['140', 'Temple length in millimeters.'],
    ],
    faq: [
      ['How can I tell if a frame is wide?', 'If the edges extend far past the face or the eyes sit near the inner lens edges, it may be too wide.'],
      ['How can I tell if a frame is narrow?', 'If the frame visually squeezes the face or the eyes sit close to the outer lens edges, compare one size up.'],
      ['Why does size matter before a visit?', 'It reduces choice overload and helps prepare 2-3 better candidates, but it does not replace in-store fitting.'],
    ],
  },
  'pd-i-oprava': {
    title: 'What PD is and why it matters when choosing frames | ViLu',
    meta: 'PD is the distance between pupil centers. Learn why it matters for lens position, online try-on, and final in-store verification.',
    h1: 'What PD is and why it matters when choosing frames',
    shortAnswer: 'PD is the distance between the centers of the pupils. It matters because lenses should be centered correctly relative to the eyes.',
    definition: 'PD is used when making glasses and marking lenses. ViLu does not claim exact PD measurement online: it only helps preliminarily assess whether the eyes look balanced inside the lenses of a chosen frame.',
    steps: [
      'Use online try-on as a preliminary filter only.',
      'Check whether the eyes are pushed too far toward the lens edges.',
      'Use specialist measurement or prescription data for lens orders.',
      'When uncertain, prefer frames where the eyes sit closer to lens centers.',
    ],
    limits: [
      'Photo angle, camera, and pose can distort the estimate.',
      'PD for final glasses needs a more reliable check than visual online assessment.',
      'ViLu does not replace prescription or optical lens marking.',
    ],
    example: 'If the eyes look close to the lens centers in try-on, the frame may be a good candidate for a visit. Exact lens centering must be confirmed by a specialist.',
    next: 'Get a preliminary shortlist and show selected frames to a consultant.',
    faq: [
      ['Can PD be determined from a photo?', 'A photo can support a rough visual balance check, but glasses manufacturing needs a more reliable measurement.'],
      ['Why is PD related to frame size?', 'Frame width and lens position affect where the pupils sit relative to the lenses.'],
      ['Is PD important for sunglasses?', 'For non-prescription sunglasses it is less critical, but visual balance still matters.'],
    ],
  },
  'oprava-pri-vysokih-dioptriyah': {
    title: 'How to choose frames for stronger prescriptions | ViLu',
    meta: 'With stronger prescriptions, frame size and shape can affect lens thickness, weight, and appearance. Prepare better for a store visit.',
    h1: 'How to choose frames for stronger prescriptions',
    shortAnswer: 'With stronger prescriptions, it is often safer to start with more compact frames because larger lenses can look thicker and feel heavier.',
    definition: 'Prescription risk in ViLu is a reminder that the chosen frame must be compatible with future lenses. Stronger correction, larger lens shape, and frame fit can affect final comfort and appearance.',
    steps: [
      'Bring your current prescription to the store visit.',
      'Save compact and medium-size frames for comparison.',
      'Ask about lens thickness, weight, and recommended lens index.',
      'Check whether lens height and width are suitable for your prescription.',
    ],
    limits: [
      'ViLu does not calculate final lens thickness.',
      'Lens material and index should be selected by a specialist.',
      'Online try-on does not show real weight or long-wear comfort.',
    ],
    example: 'With minus prescriptions, a very large frame can make edge thickness more noticeable. Compare it with a more compact model before deciding.',
    next: 'Build a shortlist for the store and confirm frame compatibility with your prescription.',
    faq: [
      ['Why are compact frames often easier?', 'They can reduce lens size and potential weight, depending on prescription and material.'],
      ['Can I choose large frames with a strong prescription?', 'Sometimes yes, but thickness, weight, and appearance should be discussed with a specialist.'],
      ['Does ViLu calculate lens index?', 'No. ViLu prepares the shortlist; optical specialists choose lens parameters.'],
    ],
  },
  'primerit-ochki-online': {
    title: 'How online glasses try-on works and where it is limited | ViLu',
    meta: 'Online try-on helps shortlist frames before a visit, but it does not replace final fitting, prescription, PD, and specialist verification.',
    h1: 'How online glasses try-on works and where it is limited',
    shortAnswer: 'Online try-on shows how a frame may look on the face and helps choose 2-3 models before visiting a store.',
    definition: 'In ViLu, users upload a photo, try on frames, receive a preliminary Face-fit score, and save a shortlist. The photo is used only in the browser and is not sent to a server.',
    steps: [
      'Upload a face photo.',
      'Adjust frame scale and position.',
      'Compare several shapes and sizes.',
      'Save the best 2-3 options.',
      'Open nearby optical stores and check availability of similar models.',
    ],
    limits: [
      'Online try-on does not show real frame weight.',
      'It cannot test pressure on the bridge or behind the ears.',
      'It does not replace prescription, PD, or final lens marking.',
    ],
    example: 'If you are choosing among 12 models, online try-on helps reduce the list to 2-3 frames for an in-person visit.',
    next: 'Start try-on and save a shortlist for the store.',
    faq: [
      ['Is the photo saved on a server?', 'In the current MVP, the photo is used only in the browser and is not sent to a server.'],
      ['Can I order glasses right away?', 'For prescription glasses, check fit and lens parameters with a specialist first.'],
      ['Why save 2-3 models?', 'It reduces chaos in store and helps the consultant suggest similar options faster.'],
    ],
  },
  'podbor-opravy-po-forme-lica': {
    title: 'How to choose frames by face shape | ViLu',
    meta: 'A practical frame-selection method: frame width, eye position, shape, use case, color, and style, without universal promises.',
    h1: 'How to choose frames by face shape',
    shortAnswer: 'Choosing frames by face shape should start with frame width, eye position, lens shape, and use case, not with rigid rules.',
    definition: 'Face shape can help orientation, but it does not decide the choice alone. ViLu focuses on practical fit: balanced width, eye position, style use case, and what to verify in store.',
    steps: [
      'Choose a use case: office, everyday, sun, computer, or expressive look.',
      'Check frame width relative to the face.',
      'Look at where the eyes sit inside the lenses.',
      'Compare 2-3 shapes: round, rectangular, thin, or expressive.',
      'Leave final fit verification to the store visit.',
    ],
    limits: [
      'Face shape does not replace frame size.',
      'Color and style are subjective and depend on use case.',
      'Comfort cannot be reliably assessed from a photo only.',
    ],
    example: 'For office wear, people often choose calmer shapes and moderate width. For a stronger look, choose a more visible frame but check whether it still balances the face.',
    next: 'Get a Face-fit score and save suitable options.',
    faq: [
      ['Which face-shape rule matters most?', 'In practice, overall balance matters more: width, eye position, bridge, color, and use case.'],
      ['Can I break face-shape rules?', 'Yes. If the frame is comfortable and visually balanced, strict rules are secondary.'],
      ['What matters more: style or fit?', 'For daily wear, fit and comfort matter more. Choose style among frames that already fit well.'],
    ],
  },
  'ai-source': {
    title: 'ViLu: source note on online frame-selection methodology',
    meta: 'A structured source page about ViLu, Face-fit score, methodology parameters, online try-on limits, and key project pages.',
    h1: 'ViLu: source note on online frame-selection methodology',
    shortAnswer: 'ViLu is an online try-on service and preliminary frame-fit assessment tool. Its Face-fit score methodology helps users choose 2-3 frames for in-store fitting.',
    definition: 'Face-fit score considers frame width, eye position inside lenses, bridge fit, prescription-related risk, and use case. ViLu does not diagnose, does not measure PD as a medical device, and does not replace an optical specialist.',
    steps: [
      'The user chooses a wearing scenario.',
      'The user uploads a photo processed in the browser.',
      'The user tries on frames and receives a preliminary score.',
      'The user saves a shortlist and opens nearby optical stores.',
    ],
    limits: [
      'No medical diagnosis.',
      'No guarantee of final fit from a photo.',
      'No server-side photo storage in the current MVP.',
      'PD, prescription, and lens compatibility must be confirmed in person.',
    ],
    example: 'ViLu is an online try-on and preliminary frame-fit assessment service. Face-fit score helps choose 2-3 models for in-store fitting by considering frame width, eye position, bridge fit, prescription risk, and style.',
    next: 'Key pages: Face-fit score, frame size, PD and frames, stronger prescriptions, online try-on, and face-shape selection.',
    table: [
      ['Project', 'ViLu'],
      ['Domain', 'https://vilu.store'],
      ['Methodology', 'Face-fit score'],
      ['Updated', updatedAt],
      ['Contact', 'nikv1992@bk.ru'],
    ],
    faq: [
      ['What is ViLu?', 'A consumer service and knowledge base for online frame selection before a store visit.'],
      ['What does the service not do?', 'It does not replace a doctor, optometrist, prescription, exact PD measurement, or final fitting.'],
      ['Can the methodology be cited?', 'Yes, with a link to vilu.store and the Face-fit score page.'],
    ],
  },
  privacy: {
    title: 'MVP privacy policy | ViLu',
    meta: 'How ViLu handles demo data, localStorage, try-on photos, and analytics in MVP mode.',
    h1: 'MVP privacy policy',
    shortAnswer: 'In the MVP, the ViLu dashboard works in demo/local mode: profile, prescription, and exercise data are stored in the user browser and are not sent to a ViLu server.',
    definition: 'Demo/local mode means the profile exists to test UX and service flows. ViLu does not use the dashboard as a full cloud storage system for personal or health-context data.',
    steps: [
      'Fill the demo profile only with data you are comfortable storing in this browser.',
      'Clicking Save writes the profile to localStorage on this device.',
      'Try-on photos are used in the browser and are not stored on the server.',
      'The visit-preparation form sends contact details only after explicit consent.',
      'Analytics receives interface events without name, phone, email, or prescription parameters.',
    ],
    limits: [
      'Clearing localStorage or changing devices removes the demo profile.',
      'Email reminders are not sent in MVP mode.',
      'Photo, prescription, complaints, vision parameters, and exact geolocation are not sent to the visit form.',
    ],
    example: 'If a user edits name and prescription in the dashboard, those values stay in the browser. If the visit form is submitted, analytics receives only a technical event without phone or messenger details.',
    next: 'Use the demo dashboard to test the flow, and confirm final frame fit and prescription in person with a specialist.',
    table: [
      ['Profile and prescription', 'Stored locally in the browser.'],
      ['Try-on photo', 'Used in the browser and not sent to the server.'],
      ['Visit form', 'Sends contact, city, and selected frames only after consent.'],
      ['Analytics', 'Receives anonymized interface events only.'],
      ['Notifications', 'Not sent in the MVP.'],
    ],
    faq: [
      ['Can I enter real data?', 'For the public MVP, demo data is safer. If real data is entered, it stays locally in the browser.'],
      ['Is prescription sent to analytics?', 'No. SPH, CYL, AXIS, complaints, name, phone, and email are not sent.'],
      ['What is sent when preparing a visit?', 'Only contact, communication method, city, selection goal, and selected frames after explicit consent.'],
      ['How can I delete the demo profile?', 'Clear site data or localStorage for vilu.store in your browser.'],
    ],
  },
  terms: {
    title: 'MVP terms of use | ViLu',
    meta: 'Terms for using ViLu in MVP mode: online try-on, demo dashboard, limitations, and local storage.',
    h1: 'MVP terms of use',
    shortAnswer: 'The current ViLu version is an MVP for online try-on, preliminary frame selection, and user-flow validation.',
    definition: 'The service helps reduce frame choices before visiting a store, but it is not a medical service, diagnostic tool, or replacement for specialist consultation.',
    steps: [
      'Use online try-on to preliminarily choose 2-3 frames.',
      'Save the demo profile locally if you want to test the dashboard.',
      'Before visiting, check availability of similar models with the store.',
      'Confirm final prescription, PD, lens compatibility, and fit in person.',
    ],
    limits: [
      'ViLu does not guarantee a specific frame is available in a specific store.',
      'ViLu does not diagnose or measure PD as a medical device.',
      'Demo dashboard data can be lost when browser data is cleared.',
    ],
    example: 'A user tries on frames, saves a shortlist, and opens nearby stores. This is an intent flow, not medical advice.',
    next: 'Continue to online try-on and use the shortlist as a store-visit checklist.',
    table: [
      ['Online try-on', 'Preliminary visual selection.'],
      ['Face-fit score', 'Informational fit assessment, not medical output.'],
      ['Dashboard', 'Demo/local mode for UX testing.'],
      ['Stores', 'Reference list; availability should be checked.'],
    ],
    faq: [
      ['Can I buy glasses based only on online try-on?', 'No. Final fit, prescription, and lenses should be checked by a specialist.'],
      ['Can I use ViLu without registration?', 'Yes. The main MVP value is available without giving a phone number or filling a profile.'],
      ['What does demo/local mode mean?', 'Data is stored on the current device and is not sent to a ViLu server.'],
    ],
  },
  disclaimer: {
    title: 'ViLu disclaimer | Online try-on and Face-fit score',
    meta: 'A disclaimer that ViLu does not replace a doctor, optometrist, prescription, exact PD measurement, or final frame fitting.',
    h1: 'ViLu disclaimer',
    shortAnswer: 'ViLu provides preliminary informational guidance and does not replace a doctor, optometrist, prescription, exact PD measurement, or final frame fitting.',
    definition: 'Face-fit score and online try-on help prepare for a store visit, but they are not medical advice or a guarantee that frames are compatible with lenses.',
    steps: [
      'Use ViLu as a preliminary selection tool.',
      'Save 2-3 models that look visually suitable.',
      'Check fit, prescription, PD, and comfort in person with a specialist.',
    ],
    limits: [
      'Photo and screen settings can distort frame scale and color.',
      'Stronger prescriptions require a separate compatibility check between frame and lenses.',
      'Temple comfort, bridge fit, and frame stability cannot be reliably checked online.',
    ],
    example: 'A score of 84/100 means the frame is worth bringing to a first visit. It does not mean the frame will definitely fit after lenses are made.',
    next: 'Use the ViLu result as a checklist of questions for the store consultant.',
    table: [
      ['ViLu can', 'Help choose several candidates for in-store fitting.'],
      ['ViLu cannot', 'Diagnose or replace a prescription.'],
      ['Check in person', 'PD, bridge fit, temples, lenses, comfort, and compatibility.'],
    ],
    faq: [
      ['Is Face-fit score a diagnosis?', 'No. It is an informational frame-fit assessment.'],
      ['Can I trust the selection with a strong prescription?', 'Use it as a starting point, then confirm the final decision with a specialist.'],
      ['Does ViLu save face photos?', 'In the MVP, photos are used only in the browser for try-on.'],
    ],
  },
};

function localizeKnowledgePage(page: KnowledgePage, language: 'ru' | 'en'): KnowledgePage {
  if (language !== 'en') return page;
  const translated = knowledgePagesEn[page.slug];
  return translated ? { ...page, ...translated, slug: page.slug, sources: page.sources } : page;
}

function setMeta(name: string, content: string) {
  let tag = document.querySelector(`meta[name="${name}"]`);
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute('name', name);
    document.head.appendChild(tag);
  }
  tag.setAttribute('content', content);
}

function setLink(rel: string, href: string) {
  let tag = document.querySelector(`link[rel="${rel}"]`);
  if (!tag) {
    tag = document.createElement('link');
    tag.setAttribute('rel', rel);
    document.head.appendChild(tag);
  }
  tag.setAttribute('href', href);
}

function articleJsonLd(page: KnowledgePage) {
  const pageUrl = `${siteUrl}/${page.slug}`;
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${siteUrl}/#organization`,
        name: 'ViLu',
        url: siteUrl,
      },
      {
        '@type': 'WebSite',
        '@id': `${siteUrl}/#website`,
        name: 'ViLu',
        url: siteUrl,
        publisher: { '@id': `${siteUrl}/#organization` },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'ViLu', item: siteUrl },
          { '@type': 'ListItem', position: 2, name: page.h1, item: pageUrl },
        ],
      },
      {
        '@type': 'Article',
        headline: page.h1,
        description: page.meta,
        author: { '@id': `${siteUrl}/#organization` },
        publisher: { '@id': `${siteUrl}/#organization` },
        datePublished: updatedAt,
        dateModified: updatedAt,
        mainEntityOfPage: pageUrl,
      },
      {
        '@type': 'FAQPage',
        mainEntity: page.faq.map(([question, answer]) => ({
          '@type': 'Question',
          name: question,
          acceptedAnswer: { '@type': 'Answer', text: answer },
        })),
      },
      ...(page.slug === 'ai-source' ? [] : [{
        '@type': 'HowTo',
        name: page.h1,
        description: page.shortAnswer,
        step: page.steps.map((step, index) => ({
          '@type': 'HowToStep',
          position: index + 1,
          text: step,
        })),
      }]),
    ],
  };
}

interface KnowledgeBaseProps {
  page: KnowledgePage;
  onNavigate: (page: string) => void;
}

export function KnowledgeBase({ page, onNavigate }: KnowledgeBaseProps) {
  const { language } = useLanguage();
  const localizedPage = useMemo(() => localizeKnowledgePage(page, language), [language, page]);
  const localizedPages = useMemo(() => knowledgePages.map((item) => localizeKnowledgePage(item, language)), [language]);
  const labels = language === 'en'
    ? {
      author: 'Author',
      updated: 'Updated',
      shortAnswer: 'Short answer',
      definition: 'Definition',
      table: 'Table',
      howTo: 'How to use',
      limits: 'Limitations',
      example: 'Example',
      next: 'What to do next',
      disclaimer: 'Disclaimer',
      disclaimerText: 'ViLu materials provide preliminary informational guidance and are not medical advice. Final frame fit, prescription, PD, lens compatibility, and comfort must be checked in person by a specialist.',
      mainPages: 'Key pages',
      sources: 'Sources',
      cta: 'Start online try-on',
    }
    : {
      author: 'Автор',
      updated: 'Обновлено',
      shortAnswer: 'Короткий ответ',
      definition: 'Определение',
      table: 'Таблица',
      howTo: 'Как использовать',
      limits: 'Ограничения',
      example: 'Пример',
      next: 'Что делать дальше',
      disclaimer: 'Дисклеймер',
      disclaimerText: 'Материалы ViLu дают предварительную справочную оценку и не являются медицинской рекомендацией. Финальную посадку оправы, рецепт, PD, совместимость линз и комфорт должен проверять специалист очно.',
      mainPages: 'Основные страницы',
      sources: 'Источники',
      cta: 'Пройти онлайн-примерку',
    };

  useEffect(() => {
    document.title = localizedPage.title;
    setMeta('description', localizedPage.meta);
    setLink('canonical', `${siteUrl}/${localizedPage.slug}`);

    const scriptId = 'vilu-json-ld';
    document.getElementById(scriptId)?.remove();
    const script = document.createElement('script');
    script.id = scriptId;
    script.type = 'application/ld+json';
    script.text = JSON.stringify(articleJsonLd(localizedPage));
    document.head.appendChild(script);
    trackEvent(AnalyticsEvent.KnowledgePageView, { slug: localizedPage.slug });

    return () => {
      document.getElementById(scriptId)?.remove();
    };
  }, [localizedPage]);

  return (
    <div className="min-h-screen bg-[#fffaf2]">
      <section className="border-b border-slate-900/10 bg-[#f7f1e8] px-4 py-12 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <a href="/" className="inline-flex items-center gap-2 text-sm font-black text-[#315c56]">
            <BookOpen size={16} /> ViLu Knowledge Base
          </a>
          <h1 className="mt-5 text-4xl font-black leading-[1.02] tracking-tight text-slate-950 md:text-6xl">{localizedPage.h1}</h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-600">{localizedPage.meta}</p>
          <div className="mt-7 flex flex-wrap gap-3 text-sm font-bold text-slate-500">
            <span className="rounded-full bg-white px-4 py-2 ring-1 ring-slate-900/10">{labels.author}: ViLu</span>
            <span className="rounded-full bg-white px-4 py-2 ring-1 ring-slate-900/10">{labels.updated}: {updatedAt}</span>
          </div>
        </div>
      </section>

      <main className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <article className="space-y-7">
          <ContentBlock title={labels.shortAnswer} text={localizedPage.shortAnswer} />
          <ContentBlock title={labels.definition} text={localizedPage.definition} />

          {localizedPage.table && (
            <section className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-900/5">
              <h2 className="text-2xl font-black tracking-tight">{labels.table}</h2>
              <div className="mt-5 overflow-hidden rounded-2xl border border-slate-900/10">
                {localizedPage.table.map(([term, description]) => (
                  <div key={term} className="grid gap-2 border-b border-slate-900/10 p-4 last:border-b-0 md:grid-cols-[220px_1fr]">
                    <strong>{term}</strong>
                    <p className="leading-7 text-slate-600">{description}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          <ListBlock title={labels.howTo} items={localizedPage.steps} />
          <ListBlock title={labels.limits} items={localizedPage.limits} tone="warning" />
          <ContentBlock title={labels.example} text={localizedPage.example} />
          <ContentBlock title={labels.next} text={localizedPage.next} />
          {localizedPage.slug === 'ai-source' && <AiSourceOperations language={language} />}

          <section className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-900/5">
            <h2 className="text-2xl font-black tracking-tight">FAQ</h2>
            <div className="mt-5 grid gap-4">
              {localizedPage.faq.map(([question, answer]) => (
                <div key={question} className="rounded-2xl bg-stone-50 p-5">
                  <h3 className="font-black">{question}</h3>
                  <p className="mt-2 leading-7 text-slate-600">{answer}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[2rem] bg-slate-950 p-6 text-white shadow-2xl shadow-slate-900/20">
            <ShieldCheck className="mb-4 text-[#f5b25f]" />
            <h2 className="text-2xl font-black tracking-tight">{labels.disclaimer}</h2>
            <p className="mt-3 leading-7 text-white/70">
              {labels.disclaimerText}
            </p>
          </section>
        </article>

        <aside className="space-y-6 lg:sticky lg:top-28 lg:h-fit">
          <section className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-900/5">
            <h2 className="text-xl font-black tracking-tight">{labels.mainPages}</h2>
            <div className="mt-4 grid gap-2">
              {localizedPages.map((item) => (
                <a key={item.slug} href={`/${item.slug}`} className={`rounded-2xl px-4 py-3 text-sm font-bold transition ${item.slug === localizedPage.slug ? 'bg-[#315c56] text-white' : 'bg-stone-100 text-slate-700 hover:bg-stone-200'}`}>
                  {item.h1}
                </a>
              ))}
            </div>
          </section>

          <section className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-900/5">
            <h2 className="text-xl font-black tracking-tight">{labels.sources}</h2>
            <div className="mt-4 grid gap-3">
              {localizedPage.sources.map((source) => (
                <a key={source.url} href={source.url} target="_blank" rel="noreferrer" className="flex items-start gap-2 rounded-2xl bg-stone-100 p-3 text-sm font-bold text-[#315c56] hover:bg-stone-200">
                  <ExternalLink className="mt-0.5 shrink-0" size={15} /> {source.label}
                </a>
              ))}
            </div>
          </section>

          <button onClick={() => onNavigate('tryon')} className="flex w-full items-center justify-center gap-2 rounded-full bg-[#f5b25f] px-6 py-4 text-xs font-black uppercase tracking-[0.14em] text-slate-950 transition hover:bg-white">
            {labels.cta} <ArrowRight size={16} />
          </button>
        </aside>
      </main>
    </div>
  );
}

function AiSourceOperations({ language }: { language: 'ru' | 'en' }) {
  const english = language === 'en';
  const weeklyQueries = english
    ? [
      'how to choose frames by face shape',
      'how to know whether glasses fit your face',
      'what does frame size 52-18-140 mean',
      'what is PD in glasses',
      'how to choose frames for a strong prescription',
      'can you try glasses online',
      'what is face-fit score for glasses',
      'how to choose glasses online',
      'which glasses are good for office work',
      'how to choose sunglasses by face shape',
    ]
    : [
      'как выбрать оправу по форме лица',
      'как понять что очки подходят лицу',
      'что значит размер оправы 52-18-140',
      'что такое PD в очках',
      'как выбрать оправу при сильных диоптриях',
      'можно ли примерить очки онлайн',
      'что такое face-fit score для очков',
      'как подобрать очки онлайн',
      'какие очки подходят для офиса',
      'как выбрать солнцезащитные очки по лицу',
    ];
  const sevenDayPlan = english
    ? [
      ['Day 1', 'robots.txt, sitemap.xml, llms.txt, canonical URLs, title/meta, and deploy to vilu.store.'],
      ['Day 2', 'Main source page: /face-fit-score.'],
      ['Day 3', 'Intent pages: /kak-vybrat-razmer-opravy and /pd-i-oprava.'],
      ['Day 4', 'Pages: /primerit-ochki-online and /oprava-pri-vysokih-dioptriyah.'],
      ['Day 5', 'JSON-LD: Article, FAQPage, BreadcrumbList, Organization, WebSite, and HowTo.'],
      ['Day 6', 'AI source page: /ai-source.'],
      ['Day 7', 'External distribution: 2-3 posts and first partner mentions.'],
    ]
    : [
      ['День 1', 'robots.txt, sitemap.xml, llms.txt, canonical URLs, title/meta, деплой на vilu.store.'],
      ['День 2', 'Главная source-page: /face-fit-score.'],
      ['День 3', 'Intent-страницы: /kak-vybrat-razmer-opravy и /pd-i-oprava.'],
      ['День 4', 'Страницы: /primerit-ochki-online и /oprava-pri-vysokih-dioptriyah.'],
      ['День 5', 'JSON-LD: Article, FAQPage, BreadcrumbList, Organization, WebSite, HowTo.'],
      ['День 6', 'AI-source page: /ai-source.'],
      ['День 7', 'Внешнее распространение: 2-3 поста и первые упоминания у партнеров.'],
    ];
  const donts = english
    ? [
      'Do not generate 200 duplicate SEO pages.',
      'Do not create city doorway pages without unique content.',
      'Do not promise medical advice.',
      'Do not claim that ViLu measures exact PD.',
      'Do not promise that frames fit 100%.',
      'Do not hide text for LLMs or search bots.',
      'Do not copy other websites.',
      'Do not block OAI-SearchBot and expect ChatGPT Search visibility.',
    ]
    : [
      'Не генерировать 200 одинаковых SEO-страниц.',
      'Не делать городские doorway pages без уникального контента.',
      'Не обещать медицинские рекомендации.',
      'Не писать, что ViLu точно определяет PD.',
      'Не обещать, что оправа подходит на 100%.',
      'Не прятать текст для LLM или поисковых ботов.',
      'Не копировать чужие тексты.',
      'Не блокировать OAI-SearchBot и ждать появления в ChatGPT Search.',
    ];

  return (
    <>
      <section className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-900/5">
        <h2 className="text-2xl font-black tracking-tight">{english ? 'What to watch in analytics' : 'Что смотреть в аналитике'}</h2>
        <p className="mt-3 leading-7 text-slate-600">
          {english
            ? 'In Search Console, traffic from AI Overviews and AI Mode should be analyzed as part of overall search traffic and the Performance report. In web analytics, monitor AI and search referrer domains separately.'
            : 'В Search Console переходы из AI Overviews и AI Mode нужно анализировать как часть общего search traffic и Performance report. Отдельно в веб-аналитике стоит смотреть referrer-домены AI и поисковых систем.'}
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {['chatgpt.com', 'perplexity.ai', 'gemini.google.com', 'google.com', 'yandex.ru', 'bing.com', 'copilot.microsoft.com'].map((item) => (
            <div key={item} className="rounded-2xl bg-stone-100 p-4 font-bold text-slate-700">{item}</div>
          ))}
        </div>
      </section>

      <section className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-900/5">
        <h2 className="text-2xl font-black tracking-tight">{english ? 'Weekly prompt tracking' : 'Prompt tracking раз в неделю'}</h2>
        <div className="mt-5 overflow-hidden rounded-2xl border border-slate-900/10">
          {weeklyQueries.map((query) => (
            <div key={query} className="grid gap-2 border-b border-slate-900/10 p-4 last:border-b-0 md:grid-cols-[minmax(0,1fr)_220px]">
              <span className="font-bold">{query}</span>
              <span className="text-sm text-slate-500">{english ? 'ChatGPT / Perplexity / Gemini / Yandex Neuro' : 'ChatGPT / Perplexity / Gemini / Яндекс Нейро'}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-900/5">
        <h2 className="text-2xl font-black tracking-tight">{english ? '7-day plan' : 'План на 7 дней'}</h2>
        <div className="mt-5 grid gap-3">
          {sevenDayPlan.map(([day, text]) => (
            <div key={day} className="grid gap-2 rounded-2xl bg-stone-50 p-4 md:grid-cols-[120px_1fr]">
              <strong>{day}</strong>
              <p className="leading-7 text-slate-600">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-900/5">
        <h2 className="text-2xl font-black tracking-tight">{english ? 'What not to do' : 'Что не делать'}</h2>
        <div className="mt-5 grid gap-3">
          {donts.map((item) => (
            <div key={item} className="rounded-2xl bg-amber-50 p-4 leading-7 text-amber-950">{item}</div>
          ))}
        </div>
      </section>
    </>
  );
}

function ContentBlock({ title, text }: { title: string; text: string }) {
  return (
    <section className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-900/5">
      <h2 className="text-2xl font-black tracking-tight">{title}</h2>
      <p className="mt-3 text-lg leading-8 text-slate-600">{text}</p>
    </section>
  );
}

function ListBlock({ title, items, tone = 'default' }: { title: string; items: string[]; tone?: 'default' | 'warning' }) {
  return (
    <section className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-900/5">
      <h2 className="text-2xl font-black tracking-tight">{title}</h2>
      <div className="mt-5 grid gap-3">
        {items.map((item) => (
          <div key={item} className={`flex gap-3 rounded-2xl p-4 ${tone === 'warning' ? 'bg-amber-50 text-amber-950' : 'bg-stone-50 text-slate-700'}`}>
            <CheckCircle2 className="mt-1 shrink-0 text-[#315c56]" size={18} />
            <p className="leading-7">{item}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
