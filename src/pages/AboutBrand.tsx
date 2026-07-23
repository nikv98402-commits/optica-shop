import {
  ArrowRight,
  BookOpenCheck,
  Eye,
  Glasses,
  MapPin,
  MessageCircleQuestion,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { useEffect } from 'react';
import { AtomicHeading } from '../components/home/AtomicHeading';
import { OpticalOrbits } from '../components/home/OpticalOrbits';
import { useLanguage } from '../contexts/LanguageContext';
import { publicFeatures } from '../config/features';
import { AnalyticsEvent, trackEvent } from '../lib/analyticsEvents';

interface AboutBrandProps {
  onNavigate: (page: string) => void;
}

const copy = {
  ru: {
    eyebrow: 'О бренде ViLu',
    title: ['Понять', 'Выбрать', 'Позаботиться'],
    lead: 'ViLu снимает страх непонимания и превращает заботу о зрении в ясный следующий шаг — для себя, ребёнка или близкого.',
    primary: 'Спросить ViLu',
    secondary: 'Начать примерку',
    systemLabel: 'Единая экосистема',
    systemTitle: ['От вопроса', 'до уверенного', 'действия'],
    systemBody: 'Каждый инструмент решает одну часть пути. Вместе они помогают не потеряться между информацией, выбором оправы и очным визитом.',
    principlesLabel: 'Принципы ViLu',
    principlesTitle: ['Технология', 'без лишней', 'тревоги'],
    principles: [
      ['Понятно', 'Объясняем простым языком и показываем источники.'],
      ['Безопасно', 'Не ставим диагноз и не заменяем специалиста.'],
      ['Практично', 'Каждый ответ заканчивается понятным следующим шагом.'],
    ],
    finalTitle: 'Начните с того, что сейчас непонятно.',
    finalBody: 'Помощник подскажет, что можно сделать онлайн, а что важно подтвердить на очной проверке.',
  },
  en: {
    eyebrow: 'About ViLu',
    title: ['Understand', 'Choose', 'Take care'],
    lead: 'ViLu removes the fear of not understanding and turns vision care into a clear next step — for you, a child, or someone close.',
    primary: 'Ask ViLu',
    secondary: 'Start try-on',
    systemLabel: 'One ecosystem',
    systemTitle: ['From a question', 'to confident', 'action'],
    systemBody: 'Each tool solves one part of the journey. Together they connect information, frame choice, and an in-person visit.',
    principlesLabel: 'ViLu principles',
    principlesTitle: ['Technology', 'without extra', 'anxiety'],
    principles: [
      ['Clear', 'We explain in plain language and show sources.'],
      ['Safe', 'We do not diagnose or replace a professional.'],
      ['Practical', 'Every answer ends with a clear next step.'],
    ],
    finalTitle: 'Start with what feels unclear right now.',
    finalBody: 'The assistant explains what can be done online and what should be confirmed in person.',
  },
} as const;

export function AboutBrand({ onNavigate }: AboutBrandProps) {
  const { language } = useLanguage();
  const text = copy[language];

  useEffect(() => {
    document.title = language === 'ru'
      ? 'О бренде ViLu | Понять, выбрать, позаботиться'
      : 'About ViLu | Understand, choose, take care';
  }, [language]);

  const openAssistant = (source: string) => {
    trackEvent(AnalyticsEvent.AssistantOpened, { source });
    onNavigate('assistant');
  };

  const ecosystem = language === 'ru'
    ? [
        { id: 'assistant', index: '01', title: 'Knowledge Assistant', body: 'Отвечает по проверенным материалам и объясняет следующий шаг.', icon: MessageCircleQuestion, action: 'Спросить', page: 'assistant' },
        { id: 'tracker', index: '02', title: 'Трекер зрения', body: 'Помогает заметить сигнал и подготовиться к очной проверке.', icon: Eye, action: 'Открыть', page: 'eyecheck' },
        { id: 'tryon', index: '03', title: 'Онлайн-примерка', body: 'Сокращает выбор до нескольких оправ до визита в салон.', icon: Glasses, action: 'Примерить', page: 'tryon' },
        { id: 'catalog', index: '04', title: 'Каталог', body: 'Даёт спокойно сравнить форму, посадку и сценарий использования.', icon: BookOpenCheck, action: 'Сравнить', page: 'products' },
        { id: 'stores', index: '05', title: 'Салоны', body: 'Подтверждают посадку, параметры рецепта и финальный выбор.', icon: MapPin, action: 'Подготовиться', page: 'products' },
      ]
    : [
        { id: 'assistant', index: '01', title: 'Knowledge Assistant', body: 'Answers from verified materials and explains the next step.', icon: MessageCircleQuestion, action: 'Ask', page: 'assistant' },
        { id: 'tracker', index: '02', title: 'Vision Tracker', body: 'Helps notice a signal and prepare for an in-person check.', icon: Eye, action: 'Open', page: 'eyecheck' },
        { id: 'tryon', index: '03', title: 'Online try-on', body: 'Narrows the choice to a few frames before a store visit.', icon: Glasses, action: 'Try on', page: 'tryon' },
        { id: 'catalog', index: '04', title: 'Catalog', body: 'Makes it easy to compare shape, fit, and intended use.', icon: BookOpenCheck, action: 'Compare', page: 'products' },
        { id: 'stores', index: '05', title: 'Stores', body: 'Confirm fit, prescription parameters, and the final choice.', icon: MapPin, action: 'Prepare', page: 'products' },
      ];

  const openEcosystemItem = (item: typeof ecosystem[number]) => {
    if (item.id === 'assistant') {
      openAssistant('about_ecosystem');
      return;
    }
    if (item.id === 'tryon') trackEvent(AnalyticsEvent.TryOnOpened, { source: 'about_ecosystem' });
    if (item.id === 'tracker') trackEvent(AnalyticsEvent.EyeCheckOpened, { source: 'about_ecosystem' });
    onNavigate(item.page);
  };

  return (
    <div className="about-orbits-page">
      <section className="about-orbits-hero">
        <div className="about-orbits-hero__orbits"><OpticalOrbits /></div>
        <div className="about-orbits-hero__grid">
          <div>
            <p className="about-orbits-eyebrow"><Sparkles size={14} /> {text.eyebrow}</p>
            <AtomicHeading lines={text.title} className="about-orbits-heading" />
            <p className="about-orbits-lead">{text.lead}</p>
            <div className="about-orbits-actions">
              {publicFeatures.knowledgeAssistant && (
                <button onClick={() => openAssistant('about_hero')} className="about-orbits-primary">
                  {text.primary} <ArrowRight size={17} />
                </button>
              )}
              <button
                onClick={() => {
                  trackEvent(AnalyticsEvent.TryOnOpened, { source: 'about_hero' });
                  onNavigate('tryon');
                }}
                className="about-orbits-secondary"
              >
                {text.secondary}
              </button>
            </div>
          </div>
          <div className="about-orbits-promise">
            <span>ViLu / 01</span>
            <p>{language === 'ru' ? 'Не медицинская карта.' : 'Not a medical record.'}</p>
            <span>ViLu / 02</span>
            <p>{language === 'ru' ? 'Не диагноз.' : 'Not a diagnosis.'}</p>
            <span>ViLu / 03</span>
            <p>{language === 'ru' ? 'Навигатор к следующему действию.' : 'A navigator to the next action.'}</p>
          </div>
        </div>
      </section>

      <section className="about-orbits-ecosystem">
        <div className="about-orbits-shell">
          <div className="about-orbits-section-head">
            <div>
              <p className="orbits-kicker">{text.systemLabel}</p>
              <AtomicHeading as="h2" lines={text.systemTitle} className="about-orbits-section-heading" />
            </div>
            <p>{text.systemBody}</p>
          </div>
          <div className="about-orbits-system-grid">
            {ecosystem.map((item) => {
              const Icon = item.icon;
              return (
                <article key={item.id} className={`about-orbits-system-card about-orbits-system-card--${item.id}`}>
                  <header><span>{item.index}</span><Icon size={22} /></header>
                  <h3>{item.title}</h3>
                  <p>{item.body}</p>
                  <button type="button" onClick={() => openEcosystemItem(item)}>
                    {item.action} <ArrowRight size={15} />
                  </button>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="about-orbits-principles">
        <div className="about-orbits-shell about-orbits-principles__grid">
          <div>
            <p className="orbits-kicker">{text.principlesLabel}</p>
            <AtomicHeading as="h2" lines={text.principlesTitle} className="about-orbits-section-heading is-light" />
          </div>
          <div className="about-orbits-principles__list">
            {text.principles.map(([title, body], index) => (
              <article key={title}>
                <span>0{index + 1}</span>
                <ShieldCheck size={20} />
                <div><h3>{title}</h3><p>{body}</p></div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="about-orbits-final">
        <div className="about-orbits-final__card">
          <p className="orbits-kicker">Knowledge Assistant</p>
          <h2>{text.finalTitle}</h2>
          <p>{text.finalBody}</p>
          {publicFeatures.knowledgeAssistant && (
            <button type="button" onClick={() => openAssistant('about_footer')}>
              {text.primary} <ArrowRight size={17} />
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
