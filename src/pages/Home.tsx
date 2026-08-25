import { ArrowRight, CalendarDays, CheckCircle2, Handshake, MapPin } from 'lucide-react';
import { AtomicHeading } from '../components/home/AtomicHeading';
import { CompactKnowledgeAssistant } from '../components/home/CompactKnowledgeAssistant';
import { publicFeatures } from '../config/features';
import { useLanguage } from '../contexts/LanguageContext';
import { demoProducts, formatPrice } from '../data/products';
import { AnalyticsEvent, trackEvent } from '../lib/analyticsEvents';

interface HomeProps {
  onNavigate: (page: string, productId?: string) => void;
}

const featuredFrames = demoProducts.filter((product) => product.featured && product.category !== 'contact_lenses').slice(0, 3);
const featuredLens = demoProducts.find((product) => product.category === 'contact_lenses');

const homeHeroCopy = {
  ru: {
    label: 'Навигатор по зрению',
    title: ['Понять', 'Выбрать', 'Позаботиться'],
    description: 'Ясный следующий шаг для себя, ребёнка или близкого.',
    startFitting: 'Начать примерку',
    viewCatalog: 'Смотреть каталог',
    trustItems: ['Фото остается в браузере', 'Оценка посадки', 'Салоны после подбора'],
    mockupEyebrow: 'ViLu примерка',
    mockupFlow: 'Фото → Оценка → Салон',
    fitScoreLabel: 'Оценка посадки',
    localOnly: 'локально',
    useCase: 'Офис / каждый день',
    fitResult: 'Результат посадки',
    fitSummary: 'Подходит для первого визита. Проверьте мост и ширину в салоне.',
    saved: 'Сохранено',
    savedCount: '2 из 3',
    photo: 'Фото',
    store: 'Салон',
    findStore: 'Найти салон после подбора',
    proofItems: ['Проверка зрения в салонах', 'Подбор линз по рецепту', 'Доставка и самовывоз'],
    missionEyebrow: 'Миссия',
    missionTitle: ['Программа', 'доступного зрения'],
    missionBody: 'ViLu начинает с подбора очков и навигации к оптике. Долгосрочно мы хотим помогать расширять доступ к проверке зрения и очкам через партнеров.',
    missionCta: 'Узнать о миссии',
    missionTrust: ['Без донатов в первой версии', 'Без диагноза', 'Партнерская модель доступа'],
    careKicker: 'Забота о зрении', careTitle: ['До визита', 'без лишней', 'тревоги'], careIndex: '01 / ПОНЯТЬ',
    careBody: 'ViLu помогает подготовиться к проверке зрения и выбору очков: объясняет ограничения онлайн-примерки, собирает вопросы для специалиста и показывает следующий шаг.', careCta: 'Забота о зрении',
    checkKicker: 'ViLu Проверка зрения', checkTitle: ['Самопроверка', 'перед очной', 'проверкой'], checkBody: 'Короткий сценарий без диагноза. Ответы остаются в браузере и помогают понять, стоит ли запланировать очную проверку.',
    checkItems: ['Не измеряет диоптрии', 'Не ставит диагноз', 'Не отправляет ответы в аналитику'], checkCta: 'Пройти самопроверку',
    knowledgeKicker: 'База знаний ViLu', knowledgeTitle: ['Методология', 'которую', 'можно', 'проверить'], knowledgeBody: 'Размер оправы, межзрачковое расстояние, сильные диоптрии и ограничения онлайн-примерки — простым языком и с источниками.',
    knowledgeItems: ['Оценка посадки', 'Размер оправы 52-18-140', 'Межзрачковое расстояние и выбор оправы', 'Сильные диоптрии', 'Онлайн-примерка', 'Форма лица', 'Забота о зрении', 'Проверка зрения ViLu'],
    showcaseKicker: 'Витрина', showcaseTitle: ['Оправы для', 'первой', 'примерки'], showcaseCta: 'Все модели',
    dashboardKicker: 'Кабинет зрения ViLu', dashboardTitle: ['Забота', 'продолжается'], dashboardBody: 'Личный кабинет помогает помнить следующий шаг для себя и близких, не превращаясь в медицинскую карту.',
    reminderTitle: 'Напоминания', reminderBody: 'Осмотр, замена линз, повтор заказа', storesTitle: 'Салоны рядом', storesBody: 'Удобная точка для очной примерки', monthlySubscription: 'Подписка месяца', choose: 'Выбрать'
  },
  en: {
    label: 'Vision navigator',
    title: ['Understand', 'Choose', 'Take care'],
    description: 'A clear next step for you, a child, or someone close.',
    startFitting: 'Start fitting',
    viewCatalog: 'View catalog',
    trustItems: ['Photo stays in browser', 'Face-fit score', 'Stores after fitting'],
    mockupEyebrow: 'ViLu try-on',
    mockupFlow: 'Photo → Score → Store',
    fitScoreLabel: 'Face-fit score',
    localOnly: 'Local only',
    useCase: 'Office / everyday',
    fitResult: 'Fit result',
    fitSummary: 'Good for the first visit. Check bridge fit and width in store.',
    saved: 'Saved',
    savedCount: '2 of 3',
    photo: 'Photo',
    store: 'Store',
    findStore: 'Find a store after fitting',
    proofItems: ['Eye checks in stores', 'Prescription lens selection', 'Delivery and pickup'],
    missionEyebrow: 'Mission',
    missionTitle: ['Vision Access', 'Program'],
    missionBody: 'ViLu starts with eyewear selection and routing to optical stores. Long term, we want to help expand access to eye checks and glasses through partners.',
    missionCta: 'Learn about the mission',
    missionTrust: ['No donations in MVP', 'No diagnosis', 'Partner access model'],
    careKicker: 'Vision care', careTitle: ['Before your visit', 'without unnecessary', 'worry'], careIndex: '01 / UNDERSTAND',
    careBody: 'ViLu helps you prepare for an eye check and choose glasses: it explains online try-on limits, collects questions for the specialist, and shows the next step.', careCta: 'Vision care',
    checkKicker: 'ViLu eye check', checkTitle: ['Self-check', 'before an in-person', 'eye check'], checkBody: 'A short, non-diagnostic flow. Answers stay in your browser and help you decide whether to schedule an in-person eye check.',
    checkItems: ['Does not measure prescription strength', 'Does not diagnose', 'Does not send answers to analytics'], checkCta: 'Take the self-check',
    knowledgeKicker: 'ViLu Knowledge Base', knowledgeTitle: ['A methodology', 'you can', 'verify'], knowledgeBody: 'Frame size, PD, high prescriptions, and online try-on limits — explained plainly and backed by sources.',
    knowledgeItems: ['Face-fit score', 'Frame size 52-18-140', 'PD and frame choice', 'High prescriptions', 'Online try-on', 'Face shape', 'Vision care', 'ViLu eye check'],
    showcaseKicker: 'Showcase', showcaseTitle: ['Frames for', 'your first', 'try-on'], showcaseCta: 'All models',
    dashboardKicker: 'ViLu vision profile', dashboardTitle: ['Care', 'continues'], dashboardBody: 'Your profile keeps the next step visible for you and your family without turning into a medical record.',
    reminderTitle: 'Reminders', reminderBody: 'Eye check, lens replacement, repeat order', storesTitle: 'Nearby stores', storesBody: 'A convenient place for an in-person fitting', monthlySubscription: 'Monthly subscription', choose: 'Choose'
  }
} as const;

export function Home({ onNavigate }: HomeProps) {
  const { language } = useLanguage();
  const copy = homeHeroCopy[language];

  return (
    <div className="overflow-hidden kinetic-surface">
      <section className="optical-hero">
        <div className="optical-hero__field" aria-hidden="true" />
        <div className="optical-hero__grid mx-auto max-w-7xl">
          <div className="optical-hero__copy">
            <p className="optical-hero__eyebrow">{copy.label}</p>
            <AtomicHeading lines={copy.title} className="optical-hero__title" />
            <p className="optical-hero__description">{copy.description}</p>
            <div className="optical-hero__actions">
              <button
                onClick={() => {
                  trackEvent(AnalyticsEvent.TryOnOpened, { source: 'home_hero' });
                  onNavigate('tryon');
                }}
                className="kinetic-cta"
              >
                {copy.startFitting} <ArrowRight size={17} />
              </button>
              <button onClick={() => onNavigate('products')} className="optical-hero__secondary">
                {copy.viewCatalog}
              </button>
            </div>
          </div>
          {publicFeatures.knowledgeAssistant && (
            <CompactKnowledgeAssistant language={language} onNavigate={onNavigate} />
          )}
        </div>
      </section>

      <section className="bg-vilu-ink px-6 py-8 text-vilu-paper">
        <div className="mx-auto grid max-w-7xl gap-4 text-sm font-semibold uppercase tracking-[0.18em] md:grid-cols-3">
          {copy.proofItems.map((item) => (
            <div key={item} className="flex items-center gap-3"><CheckCircle2 className="text-vilu-lime" size={20} /> {item}</div>
          ))}
        </div>
      </section>

      <section className="optical-journey">
        <div className="optical-journey__grid mx-auto max-w-7xl">
          <div className="optical-journey__copy">
            <p className="vilu-eyebrow">{language === 'ru' ? 'Подбор до салона' : 'Fit before store'}</p>
            <AtomicHeading
              as="h2"
              lines={language === 'ru' ? ['От ответа — к', 'уверенной', 'примерке'] : ['From an answer', 'to a confident', 'fitting']}
              className="optical-journey__title"
            />
            <p>
              {language === 'ru'
                ? 'Помощник объясняет. Примерка помогает выбрать. Салон подтверждает посадку и рецепт.'
                : 'The assistant explains. Try-on helps you choose. The store confirms fit and prescription.'}
            </p>
          </div>
          <div className="optical-journey__product">
            <div className="optical-journey__frame">
              <span>{copy.localOnly} · {copy.mockupEyebrow}</span>
              <div className="optical-journey__rings" aria-hidden="true" />
              <div className="optical-journey__glasses" aria-hidden="true">
                <i /><i /><b />
              </div>
            </div>
            <div className="optical-journey__score">
              <small>{copy.fitScoreLabel} · Aurora 03</small>
              <strong>84<i>/100</i></strong>
              <h3>{copy.useCase}</h3>
              <p>{copy.fitSummary}</p>
              <button
                type="button"
                onClick={() => {
                  trackEvent(AnalyticsEvent.TryOnOpened, { source: 'home_journey' });
                  onNavigate('tryon');
                }}
              >
                {copy.mockupFlow} <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="orbits-section orbits-section--care">
        <div className="orbits-section__grid mx-auto max-w-7xl">
          <div>
            <p className="orbits-kicker">{copy.careKicker}</p>
            <AtomicHeading as="h2" lines={copy.careTitle} className="orbits-heading" />
          </div>
          <div className="orbits-copy-panel">
            <span className="orbits-index">{copy.careIndex}</span>
            <p>{copy.careBody}</p>
            <div className="orbits-actions">
              <button onClick={() => { trackEvent(AnalyticsEvent.VisionCareFaceFitClicked, { source: 'home_vision_care' }); onNavigate('vision-care'); }}>{copy.careCta} <ArrowRight size={16} /></button>
              <button className="is-secondary" onClick={() => onNavigate('face-fit-score')}>{copy.fitScoreLabel}</button>
            </div>
          </div>
        </div>
      </section>

      <section className="orbits-section orbits-section--dark">
        <div className="orbits-dark-field" aria-hidden="true" />
        <div className="orbits-section__grid mx-auto max-w-7xl">
          <div>
            <p className="orbits-kicker">{copy.checkKicker}</p>
            <AtomicHeading as="h2" lines={copy.checkTitle} className="orbits-heading" />
            <p className="orbits-description">{copy.checkBody}</p>
          </div>
          <div className="orbits-checklist">
            {copy.checkItems.map((label, index) => (
              <div key={label}><span>0{index + 1}</span><CheckCircle2 size={18} />{label}</div>
            ))}
            <button onClick={() => { trackEvent(AnalyticsEvent.EyeCheckOpened, { source: 'home_card' }); onNavigate('eyecheck'); }}>{copy.checkCta} <ArrowRight size={16} /></button>
          </div>
        </div>
      </section>

      <section className="orbits-section orbits-section--mission">
        <div className="orbits-section__grid mx-auto max-w-7xl">
          <div>
            <span className="orbits-symbol"><Handshake size={22} /></span>
            <p className="orbits-kicker">{copy.missionEyebrow}</p>
            <AtomicHeading as="h2" lines={copy.missionTitle} className="orbits-heading" />
            <p className="orbits-description">{copy.missionBody}</p>
          </div>
          <div className="orbits-principles">
            {copy.missionTrust.map((item, index) => <div key={item}><span>0{index + 1}</span><strong>{item}</strong></div>)}
            <button onClick={() => { trackEvent(AnalyticsEvent.VisionAccessOpened, { source: 'home_mission_card' }); onNavigate('vision-access'); }}>{copy.missionCta} <ArrowRight size={16} /></button>
          </div>
        </div>
      </section>

      <section className="orbits-section orbits-section--knowledge">
        <div className="orbits-section__grid mx-auto max-w-7xl">
          <div>
            <p className="orbits-kicker">{copy.knowledgeKicker}</p>
            <AtomicHeading as="h2" lines={copy.knowledgeTitle} className="orbits-heading" />
            <p className="orbits-description">{copy.knowledgeBody}</p>
          </div>
          <div className="orbits-library">
            {['/face-fit-score', '/kak-vybrat-razmer-opravy', '/pd-i-oprava', '/oprava-pri-vysokih-dioptriyah', '/primerit-ochki-online', '/podbor-opravy-po-forme-lica', '/vision-care', '/eye-check']
              .map((href, index) => <a key={href} href={href}><span>{String(index + 1).padStart(2, '0')}</span><strong>{copy.knowledgeItems[index]}</strong><ArrowRight size={15} /></a>)}
          </div>
        </div>
      </section>

      <section className="orbits-section orbits-section--showcase">
        <div className="mx-auto max-w-7xl">
          <div className="orbits-showcase-head">
            <div><p className="orbits-kicker">{copy.showcaseKicker}</p><AtomicHeading as="h2" lines={copy.showcaseTitle} className="orbits-heading" /></div>
            <button onClick={() => onNavigate('products')}>{copy.showcaseCta} <ArrowRight size={17} /></button>
          </div>
          <div className="orbits-products">
            {featuredFrames.map((product, index) => (
              <article key={product.id}>
                <button onClick={() => onNavigate('product', product.id)}>
                  <div className="orbits-product-image"><span>0{index + 1}</span><img src={product.image_url} alt={product.name} /></div>
                  <div className="orbits-product-meta"><small>{product.brand_name}</small><h3>{product.name}</h3><p>{product.description}</p><strong>{formatPrice(product.price)}</strong></div>
                </button>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="care" className="orbits-section orbits-section--dashboard">
        <div className="orbits-dark-field" aria-hidden="true" />
        <div className="orbits-section__grid mx-auto max-w-7xl">
          <div>
            <p className="orbits-kicker">{copy.dashboardKicker}</p>
            <AtomicHeading as="h2" lines={copy.dashboardTitle} className="orbits-heading" />
            <p className="orbits-description">{copy.dashboardBody}</p>
            <div className="orbits-dashboard-tools">
              <div><CalendarDays size={19} /><span><strong>{copy.reminderTitle}</strong><small>{copy.reminderBody}</small></span></div>
              <div><MapPin size={19} /><span><strong>{copy.storesTitle}</strong><small>{copy.storesBody}</small></span></div>
            </div>
          </div>
          {featuredLens && (
            <article className="orbits-lens-card">
              <div className="orbits-lens-visual"><span>{copy.monthlySubscription}</span><img src={featuredLens.image_url} alt={featuredLens.name} /></div>
              <div><small>{featuredLens.brand_name}</small><h3>{featuredLens.name}</h3><p>{featuredLens.description}</p><footer><strong>{formatPrice(featuredLens.subscription_price ?? featuredLens.price)}</strong><button onClick={() => onNavigate('product', featuredLens.id)}>{copy.choose} <ArrowRight size={15} /></button></footer></div>
            </article>
          )}
        </div>
      </section>
    </div>
  );
}
