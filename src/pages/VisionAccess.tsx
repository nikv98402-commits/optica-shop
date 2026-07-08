import { ArrowRight, BarChart3, CheckCircle2, ExternalLink, Handshake, ShieldCheck, Sparkles } from 'lucide-react';
import { useEffect } from 'react';
import {
  visionAccessCounters,
  visionAccessFacts,
  visionAccessHero,
  visionAccessPartners,
  visionAccessSteps,
  visionAccessTrust,
} from '../data/visionAccessContent';
import { useLanguage } from '../contexts/LanguageContext';
import { AnalyticsEvent, trackEvent } from '../lib/analyticsEvents';

interface VisionAccessProps {
  onNavigate: (page: string) => void;
}

const whoSourceUrl = 'https://www.who.int/ru/news-room/fact-sheets/detail/blindness-and-visual-impairment';
const partnerMailto = 'mailto:partners@vilu.store?subject=ViLu%20Vision%20Access%20Program';

function setMeta(name: string, content: string) {
  let tag = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
  if (!tag) {
    tag = document.createElement('meta');
    tag.name = name;
    document.head.appendChild(tag);
  }
  tag.content = content;
}

function setLink(rel: string, href: string) {
  let tag = document.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!tag) {
    tag = document.createElement('link');
    tag.rel = rel;
    document.head.appendChild(tag);
  }
  tag.href = href;
}

export function VisionAccess({ onNavigate }: VisionAccessProps) {
  const { language } = useLanguage();
  const locale = language;

  useEffect(() => {
    document.title =
      language === 'en'
        ? 'ViLu Vision Access Program | Access to eye checks and glasses'
        : 'ViLu Vision Access Program | Доступ к проверке зрения и очкам';
    setMeta(
      'description',
      language === 'en'
        ? 'ViLu explains a long-term access model for eye checks, eyewear selection, and partner routing to optical stores and clinics.'
        : 'ViLu объясняет долгосрочную модель доступа к проверке зрения, подбору очков и партнерской маршрутизации в оптики и клиники.',
    );
    setLink('canonical', 'https://vilu.store/vision-access');
    trackEvent(AnalyticsEvent.VisionAccessOpened, { source: 'page', locale });
    trackEvent(AnalyticsEvent.VisionAccessCounterViewed, { section: 'planned_reporting', locale });
  }, [language, locale]);

  const discussPartnership = (source: string) => {
    trackEvent(AnalyticsEvent.VisionAccessPartnerCtaClicked, { source, cta_type: 'mailto', locale });
    window.location.href = partnerMailto;
  };

  const openTracker = () => {
    trackEvent(AnalyticsEvent.VisionAccessTrackerCtaClicked, { source: 'hero', cta_type: 'internal', locale });
    onNavigate('vision-tracker');
  };

  const openWhoSource = () => {
    trackEvent(AnalyticsEvent.VisionAccessWhoSourceClicked, { source: 'who_facts', locale });
    window.open(whoSourceUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="overflow-hidden bg-vilu-paper text-vilu-ink">
      <section className="relative px-4 py-14 text-vilu-paper sm:px-6 md:py-20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_14%,rgba(216,239,79,0.18),transparent_31%),linear-gradient(180deg,#07110d_0%,#0b1511_100%)]" />
        <div className="relative mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1fr_0.86fr] lg:items-center">
          <div>
            <div className="kinetic-label mb-6 border-vilu-lime/40 bg-vilu-lime/10 text-vilu-lime">
              <Sparkles size={14} /> {visionAccessHero.eyebrow[locale]}
            </div>
            <h1 className="max-w-4xl text-[3rem] font-black leading-[0.9] tracking-[-0.08em] text-vilu-paper sm:text-6xl lg:text-8xl">
              {visionAccessHero.title[locale]}
            </h1>
            <p className="mt-6 max-w-2xl text-2xl font-black leading-tight text-vilu-lime md:text-3xl">
              {visionAccessHero.subtitle[locale]}
            </p>
            <p className="mt-5 max-w-3xl text-base font-semibold leading-8 text-vilu-paper/78 md:text-lg">
              {visionAccessHero.body[locale]}
            </p>
            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <button
                onClick={() => discussPartnership('hero')}
                className="rounded-full bg-vilu-lime px-8 py-4 text-sm font-black uppercase tracking-[0.14em] text-vilu-ink transition hover:-translate-y-0.5 hover:bg-vilu-paper focus:outline-none focus-visible:ring-4 focus-visible:ring-vilu-lime/40"
              >
                {visionAccessHero.primaryCta[locale]} <ArrowRight className="ml-2 inline" size={18} />
              </button>
              <button
                onClick={openTracker}
                className="rounded-full border border-vilu-paper/28 bg-vilu-paper/8 px-8 py-4 text-sm font-black uppercase tracking-[0.14em] text-vilu-paper transition hover:bg-vilu-paper hover:text-vilu-ink focus:outline-none focus-visible:ring-4 focus-visible:ring-vilu-lime/40"
              >
                {visionAccessHero.secondaryCta[locale]}
              </button>
            </div>
          </div>

          <div className="rounded-[2rem] border border-vilu-paper/16 bg-vilu-paper/8 p-5 shadow-2xl shadow-vilu-ink/30 backdrop-blur">
            <div className="rounded-[1.5rem] bg-vilu-paper p-5 text-vilu-ink">
              <div className="flex items-center gap-3">
                <ShieldCheck className="text-vilu-green" />
                <p className="text-xs font-black uppercase tracking-[0.2em] text-vilu-green">
                  {language === 'en' ? 'Safe MVP boundary' : 'Безопасная граница MVP'}
                </p>
              </div>
              <h2 className="mt-4 text-3xl font-black tracking-[-0.04em]">
                {language === 'en' ? 'No donations. No diagnosis. No fake impact.' : 'Без донатов. Без диагноза. Без фейкового impact.'}
              </h2>
              <p className="mt-4 text-base font-semibold leading-7 text-vilu-ink/70">
                {language === 'en'
                  ? 'This page explains the partnership model before any fundraising, payment, or medical data flow exists.'
                  : 'Эта страница объясняет партнерскую модель до появления сборов, платежей или обработки медицинских данных.'}
              </p>
              <div className="mt-6 grid gap-3">
                {visionAccessTrust.notDoItems[locale].slice(0, 3).map((item) => (
                  <div key={item} className="flex items-center gap-3 rounded-2xl bg-vilu-cream p-4 text-sm font-black">
                    <CheckCircle2 className="text-vilu-lime" size={18} />
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-vilu-paper px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="vilu-eyebrow">{language === 'en' ? 'Global context' : 'Глобальный контекст'}</p>
              <h2 className="mt-3 max-w-3xl text-4xl font-black tracking-[-0.05em] text-vilu-ink md:text-6xl">
                {language === 'en' ? 'Vision access is still a basic global gap' : 'Доступ к зрению все еще базовый глобальный разрыв'}
              </h2>
            </div>
            <button
              onClick={openWhoSource}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-vilu-ink/16 bg-vilu-card px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-vilu-ink transition hover:bg-vilu-lime"
            >
              {visionAccessTrust.sourceCta[locale]} <ExternalLink size={15} />
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-5">
            {visionAccessFacts.map((fact) => (
              <article key={fact.id} className="rounded-[1.5rem] border border-vilu-line bg-vilu-card p-5">
                <p className="text-3xl font-black tracking-[-0.06em] text-vilu-green">{fact.value[locale]}</p>
                <p className="mt-3 text-sm font-semibold leading-6 text-vilu-ink/70">{fact.label[locale]}</p>
              </article>
            ))}
          </div>

          <p className="mt-5 max-w-4xl text-sm font-semibold leading-6 text-vilu-ink/60">
            {visionAccessTrust.sourceNote[locale]}
          </p>
        </div>
      </section>

      <section className="bg-vilu-ink px-4 py-16 text-vilu-paper sm:px-6">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-vilu-lime">
              {language === 'en' ? 'Access wedge' : 'Wedge доступа'}
            </p>
            <h2 className="mt-3 text-4xl font-black tracking-[-0.05em] text-vilu-paper md:text-6xl">
              {visionAccessTrust.whyTitle[locale]}
            </h2>
            <p className="mt-5 text-base font-semibold leading-8 text-vilu-paper/76">
              {visionAccessTrust.whyBody[locale]}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {visionAccessSteps.map((step, index) => (
              <article key={step.id} className="rounded-[1.5rem] border border-vilu-paper/12 bg-vilu-paper/8 p-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-vilu-lime text-sm font-black text-vilu-ink">
                  {index + 1}
                </div>
                <h3 className="mt-5 text-2xl font-black tracking-[-0.04em] text-vilu-paper">{step.title[locale]}</h3>
                <p className="mt-3 text-sm font-semibold leading-6 text-vilu-paper/70">{step.body[locale]}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-vilu-cream px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8">
            <p className="vilu-eyebrow">{language === 'en' ? 'Partner model' : 'Партнерская модель'}</p>
            <h2 className="mt-3 max-w-3xl text-4xl font-black tracking-[-0.05em] text-vilu-ink md:text-6xl">
              {language === 'en' ? 'Who can expand access with ViLu' : 'Кто может расширять доступ вместе с ViLu'}
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-4">
            {visionAccessPartners.map((partner) => (
              <article key={partner.id} className="rounded-[1.5rem] border border-vilu-line bg-vilu-card p-5">
                <Handshake className="text-vilu-lime" size={28} />
                <h3 className="mt-5 text-xl font-black tracking-[-0.04em] text-vilu-ink">{partner.title[locale]}</h3>
                <p className="mt-3 text-sm font-semibold leading-6 text-vilu-ink/68">{partner.body[locale]}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-vilu-paper px-4 py-16 sm:px-6">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-stretch">
          <div className="rounded-[2rem] bg-vilu-ink p-6 text-vilu-paper md:p-8">
            <div className="flex items-center gap-3">
              <BarChart3 className="text-vilu-lime" />
              <p className="text-xs font-black uppercase tracking-[0.2em] text-vilu-lime">
                {visionAccessTrust.counterLabel[locale]}
              </p>
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {visionAccessCounters.map((metric) => (
                <article key={metric.id} className="rounded-[1.4rem] bg-vilu-paper/8 p-5 ring-1 ring-vilu-paper/12">
                  <p className="text-4xl font-black tracking-[-0.06em] text-vilu-paper">{metric.value}</p>
                  <p className="mt-2 text-sm font-semibold leading-6 text-vilu-paper/72">{metric.label[locale]}</p>
                </article>
              ))}
            </div>
            <p className="mt-5 text-sm font-semibold leading-6 text-vilu-paper/68">
              {visionAccessTrust.counterNote[locale]}
            </p>
          </div>

          <div className="rounded-[2rem] border border-vilu-line bg-vilu-card p-6 md:p-8">
            <p className="vilu-eyebrow">{language === 'en' ? 'Trust boundary' : 'Граница доверия'}</p>
            <h2 className="mt-3 text-3xl font-black tracking-[-0.04em] text-vilu-ink">
              {visionAccessTrust.notDoTitle[locale]}
            </h2>
            <div className="mt-6 grid gap-3">
              {visionAccessTrust.notDoItems[locale].map((item) => (
                <div key={item} className="flex items-center gap-3 rounded-2xl bg-vilu-cream p-4 text-sm font-black text-vilu-ink">
                  <CheckCircle2 className="text-vilu-lime" size={18} />
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-vilu-ink px-4 py-16 text-vilu-paper sm:px-6">
        <div className="mx-auto flex max-w-5xl flex-col items-start gap-6 rounded-[2rem] border border-vilu-paper/12 bg-vilu-paper/8 p-6 md:p-10">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-vilu-lime">Partnership</p>
          <h2 className="max-w-3xl text-4xl font-black tracking-[-0.05em] text-vilu-paper md:text-6xl">
            {visionAccessTrust.ctaTitle[locale]}
          </h2>
          <p className="max-w-3xl text-base font-semibold leading-8 text-vilu-paper/72">
            {visionAccessTrust.ctaBody[locale]}
          </p>
          <div className="flex flex-col gap-4 sm:flex-row">
            <button
              onClick={() => discussPartnership('footer')}
              className="rounded-full bg-vilu-lime px-8 py-4 text-sm font-black uppercase tracking-[0.14em] text-vilu-ink transition hover:bg-vilu-paper"
            >
              {visionAccessHero.primaryCta[locale]} <ArrowRight className="ml-2 inline" size={18} />
            </button>
            <button
              onClick={() => {
                trackEvent(AnalyticsEvent.VisionAccessTryOnCtaClicked, { source: 'footer', cta_type: 'internal', locale });
                onNavigate('tryon');
              }}
              className="rounded-full border border-vilu-paper/24 bg-vilu-paper/8 px-8 py-4 text-sm font-black uppercase tracking-[0.14em] text-vilu-paper transition hover:bg-vilu-paper hover:text-vilu-ink"
            >
              {language === 'en' ? 'Open try-on' : 'Открыть примерку'}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
