import { ArrowRight, BookOpen, CheckCircle2, ExternalLink, ShieldCheck } from 'lucide-react';
import { useEffect } from 'react';

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
];

export function getKnowledgePage(slug: string) {
  return knowledgePages.find((page) => page.slug === slug);
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
  useEffect(() => {
    document.title = page.title;
    setMeta('description', page.meta);
    setLink('canonical', `${siteUrl}/${page.slug}`);

    const scriptId = 'vilu-json-ld';
    document.getElementById(scriptId)?.remove();
    const script = document.createElement('script');
    script.id = scriptId;
    script.type = 'application/ld+json';
    script.text = JSON.stringify(articleJsonLd(page));
    document.head.appendChild(script);

    return () => {
      document.getElementById(scriptId)?.remove();
    };
  }, [page]);

  return (
    <div className="min-h-screen bg-[#fffaf2]">
      <section className="border-b border-slate-900/10 bg-[#f7f1e8] px-4 py-12 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <a href="/" className="inline-flex items-center gap-2 text-sm font-black text-[#315c56]">
            <BookOpen size={16} /> ViLu Knowledge Base
          </a>
          <h1 className="mt-5 text-4xl font-black leading-[1.02] tracking-tight text-slate-950 md:text-6xl">{page.h1}</h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-600">{page.meta}</p>
          <div className="mt-7 flex flex-wrap gap-3 text-sm font-bold text-slate-500">
            <span className="rounded-full bg-white px-4 py-2 ring-1 ring-slate-900/10">Автор: ViLu</span>
            <span className="rounded-full bg-white px-4 py-2 ring-1 ring-slate-900/10">Обновлено: {updatedAt}</span>
          </div>
        </div>
      </section>

      <main className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <article className="space-y-7">
          <ContentBlock title="Короткий ответ" text={page.shortAnswer} />
          <ContentBlock title="Определение" text={page.definition} />

          {page.table && (
            <section className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-900/5">
              <h2 className="text-2xl font-black tracking-tight">Таблица</h2>
              <div className="mt-5 overflow-hidden rounded-2xl border border-slate-900/10">
                {page.table.map(([term, description]) => (
                  <div key={term} className="grid gap-2 border-b border-slate-900/10 p-4 last:border-b-0 md:grid-cols-[220px_1fr]">
                    <strong>{term}</strong>
                    <p className="leading-7 text-slate-600">{description}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          <ListBlock title="Как использовать" items={page.steps} />
          <ListBlock title="Ограничения" items={page.limits} tone="warning" />
          <ContentBlock title="Пример" text={page.example} />
          <ContentBlock title="Что делать дальше" text={page.next} />
          {page.slug === 'ai-source' && <AiSourceOperations />}

          <section className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-900/5">
            <h2 className="text-2xl font-black tracking-tight">FAQ</h2>
            <div className="mt-5 grid gap-4">
              {page.faq.map(([question, answer]) => (
                <div key={question} className="rounded-2xl bg-stone-50 p-5">
                  <h3 className="font-black">{question}</h3>
                  <p className="mt-2 leading-7 text-slate-600">{answer}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[2rem] bg-slate-950 p-6 text-white shadow-2xl shadow-slate-900/20">
            <ShieldCheck className="mb-4 text-[#f5b25f]" />
            <h2 className="text-2xl font-black tracking-tight">Дисклеймер</h2>
            <p className="mt-3 leading-7 text-white/70">
              Материалы ViLu дают предварительную справочную оценку и не являются медицинской рекомендацией. Финальную посадку оправы, рецепт, PD, совместимость линз и комфорт должен проверять специалист очно.
            </p>
          </section>
        </article>

        <aside className="space-y-6 lg:sticky lg:top-28 lg:h-fit">
          <section className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-900/5">
            <h2 className="text-xl font-black tracking-tight">Основные страницы</h2>
            <div className="mt-4 grid gap-2">
              {knowledgePages.map((item) => (
                <a key={item.slug} href={`/${item.slug}`} className={`rounded-2xl px-4 py-3 text-sm font-bold transition ${item.slug === page.slug ? 'bg-[#315c56] text-white' : 'bg-stone-100 text-slate-700 hover:bg-stone-200'}`}>
                  {item.h1}
                </a>
              ))}
            </div>
          </section>

          <section className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-900/5">
            <h2 className="text-xl font-black tracking-tight">Источники</h2>
            <div className="mt-4 grid gap-3">
              {page.sources.map((source) => (
                <a key={source.url} href={source.url} target="_blank" rel="noreferrer" className="flex items-start gap-2 rounded-2xl bg-stone-100 p-3 text-sm font-bold text-[#315c56] hover:bg-stone-200">
                  <ExternalLink className="mt-0.5 shrink-0" size={15} /> {source.label}
                </a>
              ))}
            </div>
          </section>

          <button onClick={() => onNavigate('tryon')} className="flex w-full items-center justify-center gap-2 rounded-full bg-[#f5b25f] px-6 py-4 text-xs font-black uppercase tracking-[0.14em] text-slate-950 transition hover:bg-white">
            Пройти онлайн-примерку <ArrowRight size={16} />
          </button>
        </aside>
      </main>
    </div>
  );
}

function AiSourceOperations() {
  const weeklyQueries = [
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

  return (
    <>
      <section className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-900/5">
        <h2 className="text-2xl font-black tracking-tight">Что смотреть в аналитике</h2>
        <p className="mt-3 leading-7 text-slate-600">
          В Search Console переходы из AI Overviews и AI Mode нужно анализировать как часть общего search traffic и Performance report. Отдельно в веб-аналитике стоит смотреть referrer-домены AI и поисковых систем.
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {['chatgpt.com', 'perplexity.ai', 'gemini.google.com', 'google.com', 'yandex.ru', 'bing.com', 'copilot.microsoft.com'].map((item) => (
            <div key={item} className="rounded-2xl bg-stone-100 p-4 font-bold text-slate-700">{item}</div>
          ))}
        </div>
      </section>

      <section className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-900/5">
        <h2 className="text-2xl font-black tracking-tight">Prompt tracking раз в неделю</h2>
        <div className="mt-5 overflow-hidden rounded-2xl border border-slate-900/10">
          {weeklyQueries.map((query) => (
            <div key={query} className="grid gap-2 border-b border-slate-900/10 p-4 last:border-b-0 md:grid-cols-[minmax(0,1fr)_220px]">
              <span className="font-bold">{query}</span>
              <span className="text-sm text-slate-500">ChatGPT / Perplexity / Gemini / Яндекс Нейро</span>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-900/5">
        <h2 className="text-2xl font-black tracking-tight">План на 7 дней</h2>
        <div className="mt-5 grid gap-3">
          {[
            ['День 1', 'robots.txt, sitemap.xml, llms.txt, canonical URLs, title/meta, деплой на vilu.store.'],
            ['День 2', 'Главная source-page: /face-fit-score.'],
            ['День 3', 'Intent-страницы: /kak-vybrat-razmer-opravy и /pd-i-oprava.'],
            ['День 4', 'Страницы: /primerit-ochki-online и /oprava-pri-vysokih-dioptriyah.'],
            ['День 5', 'JSON-LD: Article, FAQPage, BreadcrumbList, Organization, WebSite, HowTo.'],
            ['День 6', 'AI-source page: /ai-source.'],
            ['День 7', 'Внешнее распространение: 2-3 поста и первые упоминания у партнеров.'],
          ].map(([day, text]) => (
            <div key={day} className="grid gap-2 rounded-2xl bg-stone-50 p-4 md:grid-cols-[120px_1fr]">
              <strong>{day}</strong>
              <p className="leading-7 text-slate-600">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-900/5">
        <h2 className="text-2xl font-black tracking-tight">Что не делать</h2>
        <div className="mt-5 grid gap-3">
          {[
            'Не генерировать 200 одинаковых SEO-страниц.',
            'Не делать городские doorway pages без уникального контента.',
            'Не обещать медицинские рекомендации.',
            'Не писать, что ViLu точно определяет PD.',
            'Не обещать, что оправа подходит на 100%.',
            'Не прятать текст для LLM или поисковых ботов.',
            'Не копировать чужие тексты.',
            'Не блокировать OAI-SearchBot и ждать появления в ChatGPT Search.',
          ].map((item) => (
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
