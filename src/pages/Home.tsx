import { ArrowRight, CalendarDays, CheckCircle2, Handshake, MapPin } from 'lucide-react';
import { AtomicHeading } from '../components/home/AtomicHeading';
import { CompactKnowledgeAssistant } from '../components/home/CompactKnowledgeAssistant';
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
    trustItems: ['Фото остается в браузере', 'Face-fit score', 'Салоны после подбора'],
    mockupEyebrow: 'ViLu примерка',
    mockupFlow: 'Фото → Score → Салон',
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
    missionTitle: 'Vision Access Program',
    missionBody: 'ViLu начинает с подбора очков и навигации к оптике. Долгосрочно мы хотим помогать расширять доступ к проверке зрения и очкам через партнеров.',
    missionCta: 'Узнать о миссии',
    missionTrust: ['Без донатов в MVP', 'Без диагноза', 'Партнерская модель доступа']
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
    missionTitle: 'Vision Access Program',
    missionBody: 'ViLu starts with eyewear selection and routing to optical stores. Long term, we want to help expand access to eye checks and glasses through partners.',
    missionCta: 'Learn about the mission',
    missionTrust: ['No donations in MVP', 'No diagnosis', 'Partner access model']
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
          <CompactKnowledgeAssistant language={language} onNavigate={onNavigate} />
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
              <small>Face-fit score · Aurora 03</small>
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
            <p className="orbits-kicker">Забота о зрении</p>
            <AtomicHeading as="h2" lines={['До визита', 'без лишней', 'тревоги']} className="orbits-heading" />
          </div>
          <div className="orbits-copy-panel">
            <span className="orbits-index">01 / ПОНЯТЬ</span>
            <p>ViLu помогает подготовиться к проверке зрения и выбору очков: объясняет ограничения онлайн-примерки, собирает вопросы для специалиста и показывает следующий шаг.</p>
            <div className="orbits-actions">
              <button onClick={() => { trackEvent(AnalyticsEvent.VisionCareFaceFitClicked, { source: 'home_vision_care' }); onNavigate('vision-care'); }}>Забота о зрении <ArrowRight size={16} /></button>
              <button className="is-secondary" onClick={() => onNavigate('face-fit-score')}>Face-fit score</button>
            </div>
          </div>
        </div>
      </section>

      <section className="orbits-section orbits-section--dark">
        <div className="orbits-dark-field" aria-hidden="true" />
        <div className="orbits-section__grid mx-auto max-w-7xl">
          <div>
            <p className="orbits-kicker">ViLu Проверка зрения</p>
            <AtomicHeading as="h2" lines={['Self-check', 'перед очной', 'проверкой']} className="orbits-heading" />
            <p className="orbits-description">Короткий сценарий без диагноза. Ответы остаются в браузере и помогают понять, стоит ли запланировать очную проверку.</p>
          </div>
          <div className="orbits-checklist">
            {['Не измеряет диоптрии', 'Не ставит диагноз', 'Не отправляет ответы в аналитику'].map((label, index) => (
              <div key={label}><span>0{index + 1}</span><CheckCircle2 size={18} />{label}</div>
            ))}
            <button onClick={() => { trackEvent(AnalyticsEvent.EyeCheckOpened, { source: 'home_card' }); onNavigate('eyecheck'); }}>Пройти self-check <ArrowRight size={16} /></button>
          </div>
        </div>
      </section>

      <section className="orbits-section orbits-section--mission">
        <div className="orbits-section__grid mx-auto max-w-7xl">
          <div>
            <span className="orbits-symbol"><Handshake size={22} /></span>
            <p className="orbits-kicker">{copy.missionEyebrow}</p>
            <AtomicHeading as="h2" lines={['Vision Access', 'Program']} className="orbits-heading" />
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
            <p className="orbits-kicker">База знаний ViLu</p>
            <AtomicHeading as="h2" lines={['Методология', 'которую', 'можно', 'проверить']} className="orbits-heading" />
            <p className="orbits-description">Размер оправы, PD, сильные диоптрии и ограничения онлайн-примерки — простым языком и с источниками.</p>
          </div>
          <div className="orbits-library">
            {[
              ['Face-fit score', '/face-fit-score'], ['Размер оправы 52-18-140', '/kak-vybrat-razmer-opravy'],
              ['PD и выбор оправы', '/pd-i-oprava'], ['Сильные диоптрии', '/oprava-pri-vysokih-dioptriyah'],
              ['Онлайн-примерка', '/primerit-ochki-online'], ['Форма лица', '/podbor-opravy-po-forme-lica'],
              ['Забота о зрении', '/vision-care'], ['Проверка зрения ViLu', '/eye-check'],
            ].map(([label, href], index) => <a key={href} href={href}><span>{String(index + 1).padStart(2, '0')}</span><strong>{label}</strong><ArrowRight size={15} /></a>)}
          </div>
        </div>
      </section>

      <section className="orbits-section orbits-section--showcase">
        <div className="mx-auto max-w-7xl">
          <div className="orbits-showcase-head">
            <div><p className="orbits-kicker">Витрина</p><AtomicHeading as="h2" lines={['Оправы для', 'первой', 'примерки']} className="orbits-heading" /></div>
            <button onClick={() => onNavigate('products')}>Все модели <ArrowRight size={17} /></button>
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
            <p className="orbits-kicker">Кабинет зрения ViLu</p>
            <AtomicHeading as="h2" lines={['Забота', 'продолжается']} className="orbits-heading" />
            <p className="orbits-description">Личный кабинет помогает помнить следующий шаг для себя и близких, не превращаясь в медицинскую карту.</p>
            <div className="orbits-dashboard-tools">
              <div><CalendarDays size={19} /><span><strong>Напоминания</strong><small>Осмотр, замена линз, повтор заказа</small></span></div>
              <div><MapPin size={19} /><span><strong>Салоны рядом</strong><small>Удобная точка для очной примерки</small></span></div>
            </div>
          </div>
          {featuredLens && (
            <article className="orbits-lens-card">
              <div className="orbits-lens-visual"><span>Подписка месяца</span><img src={featuredLens.image_url} alt={featuredLens.name} /></div>
              <div><small>{featuredLens.brand_name}</small><h3>{featuredLens.name}</h3><p>{featuredLens.description}</p><footer><strong>{formatPrice(featuredLens.subscription_price ?? featuredLens.price)}</strong><button onClick={() => onNavigate('product', featuredLens.id)}>Выбрать <ArrowRight size={15} /></button></footer></div>
            </article>
          )}
        </div>
      </section>
    </div>
  );
}
