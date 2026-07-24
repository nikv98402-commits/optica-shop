import {
  ArrowLeft,
  Check,
  CheckCircle2,
  CreditCard,
  MapPin,
  Package,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { buildLeadFormUrl, hasLeadForm } from '../config/leads';
import { useLanguage } from '../contexts/LanguageContext';
import { opticsDirectory } from '../data/opticsDirectory';
import { AnalyticsEvent, trackEvent } from '../lib/analyticsEvents';
import { submitVisitLead } from '../services/leadService';
import { createPaymentIntent, getPaymentIdempotencyKey } from '../services/paymentService';
import {
  readServiceCheckoutAttempt,
  saveServiceCheckoutAttempt,
  saveServiceCheckoutDraft,
} from '../services/serviceCheckout';
import type {
  ContactChannel,
  ServiceCheckoutAttempt,
  ServiceCheckoutDraft,
  ServiceCheckoutStorePreference,
} from '../types/backend';

interface CheckoutProps {
  draft: ServiceCheckoutDraft | null;
  onDraftChange: (draft: ServiceCheckoutDraft) => void;
  onBack: () => void;
}

const CONSENT_VERSION = 'personal-data-consent-v1-2026-07';
const PRIVACY_VERSION = 'privacy-v1-2026-07';

const copy = {
  ru: {
    back: 'Вернуться к выбору',
    kicker: 'Подготовка визита',
    title: 'Ваш подбор для салона',
    subtitle: 'Проверьте 1–3 оправы, выберите удобный вариант салона и оставьте контакт. Оправа и линзы сейчас не оплачиваются.',
    expiredTitle: 'Подбор не найден',
    expiredBody: 'Выберите хотя бы одну оправу в каталоге или сохраните ее после онлайн-примерки.',
    openCatalog: 'Открыть каталог',
    selection: '1. Ваш подбор',
    selectionHint: 'До 3 оправ. Можно удалить лишний вариант перед продолжением.',
    remove: 'Удалить',
    framePrice: 'Цена оправы',
    inStore: 'уточняется в салоне',
    service: '2. Что входит в сервис за 429 ₽',
    deliverables: [
      'Короткий список из 1–3 выбранных оправ.',
      'Сводка для консультанта: модели, размеры, сценарий и предварительный Face-fit score.',
      'Чеклист проверки ширины, моста и комфорта во время очной примерки.',
      'Следующий шаг для согласования салона и деталей визита.',
    ],
    limitation: 'Наличие похожих моделей и финальная посадка подтверждаются в салоне. Сервис не включает оправу, линзы, резерв или медицинскую проверку.',
    store: '3. Где удобнее примерить',
    exactStore: 'Выбрать салон',
    cityOnly: 'Выбрать только город',
    later: 'Определиться позже',
    city: 'Город',
    storeLabel: 'Салон',
    storeHint: 'Геолокация здесь не запрашивается.',
    contact: '4. Контакт для подготовки',
    name: 'Имя (необязательно)',
    namePlaceholder: 'Анна',
    channel: 'Способ связи',
    contactValue: 'Телефон или мессенджер',
    contactPlaceholder: '+7 900 000-00-00 или @username',
    consent: 'Я согласен(на) на обработку персональных данных для подготовки подбора к визиту.',
    privacy: 'Политика конфиденциальности',
    summary: 'Итого',
    summaryFrame: 'Оправа',
    summaryFrameValue: 'цена уточняется в салоне',
    summaryService: 'Подготовка визита',
    summaryNow: 'К списанию сейчас',
    testBadge: 'Тестовый контур',
    testDisclosure: 'Реального списания нет. Банковские данные не запрашиваются.',
    submit: 'Перейти к тестовой оплате 429 ₽',
    submittingLead: 'Сохраняем заявку...',
    creatingPayment: 'Открываем тестовую оплату...',
    required: 'Укажите контакт и подтвердите согласие.',
    contactRequired: 'Укажите телефон, email или имя пользователя в мессенджере.',
    consentRequired: 'Подтвердите согласие, чтобы продолжить.',
    leadError: 'Не удалось сохранить заявку. Проверьте соединение и повторите попытку.',
    leadFallback: 'Backend недоступен. Открываем резервную форму заявки.',
    paymentError: 'Заявка сохранена, но тестовую оплату открыть не удалось. Повторите попытку.',
    retryPayment: 'Повторить открытие оплаты 429 ₽',
    requestLocked: 'Заявка сохранена. Данные зафиксированы; повторная кнопка откроет только ту же тестовую оплату.',
    storageWarning: 'Браузер не разрешил сохранить подбор. Не закрывайте страницу до завершения теста.',
    safe: 'Контакт отправляется только после согласия и не сохраняется в браузере, URL или аналитике.',
  },
  en: {
    back: 'Back to selection',
    kicker: 'Visit preparation',
    title: 'Your in-store shortlist',
    subtitle: 'Review 1–3 frames, choose a convenient store preference, and enter a contact. The frame and lenses are not charged now.',
    expiredTitle: 'No selection found',
    expiredBody: 'Choose at least one frame in the catalog or save it after the online try-on.',
    openCatalog: 'Open catalog',
    selection: '1. Your selection',
    selectionHint: 'Up to 3 frames. Remove any option you do not want to include.',
    remove: 'Remove',
    framePrice: 'Frame price',
    inStore: 'confirmed in store',
    service: '2. What the 429 RUB service includes',
    deliverables: [
      'A shortlist of 1–3 selected frames.',
      'A consultant summary with models, sizes, use case, and preliminary Face-fit score.',
      'An in-store checklist for width, bridge fit, and comfort.',
      'A next step for confirming the store and visit details.',
    ],
    limitation: 'Similar-model availability and final fit are confirmed in store. The service does not include frames, lenses, reservation, or a medical check.',
    store: '3. Where would you like to try them',
    exactStore: 'Choose a store',
    cityOnly: 'Choose a city only',
    later: 'Choose later',
    city: 'City',
    storeLabel: 'Store',
    storeHint: 'Checkout does not request geolocation.',
    contact: '4. Contact for preparation',
    name: 'Name (optional)',
    namePlaceholder: 'Anna',
    channel: 'Contact method',
    contactValue: 'Phone or messenger',
    contactPlaceholder: '+7 900 000-00-00 or @username',
    consent: 'I consent to personal-data processing for preparing my in-store shortlist.',
    privacy: 'Privacy policy',
    summary: 'Summary',
    summaryFrame: 'Frame',
    summaryFrameValue: 'price confirmed in store',
    summaryService: 'Visit preparation',
    summaryNow: 'Amount charged now',
    testBadge: 'Test contour',
    testDisclosure: 'No real charge is made. Bank details are not requested.',
    submit: 'Continue to 429 RUB test payment',
    submittingLead: 'Saving the request...',
    creatingPayment: 'Opening test payment...',
    required: 'Enter a contact and confirm consent.',
    contactRequired: 'Enter a phone number, email, or messenger username.',
    consentRequired: 'Confirm consent to continue.',
    leadError: 'Could not save the request. Check your connection and try again.',
    leadFallback: 'The backend is unavailable. Opening the fallback request form.',
    paymentError: 'The request is saved, but test payment could not be opened. Try again.',
    retryPayment: 'Retry 429 RUB test payment',
    requestLocked: 'Request saved. Details are locked; retry opens only the same test payment.',
    storageWarning: 'The browser could not save the shortlist. Keep this page open until the test is complete.',
    safe: 'Contact is sent only after consent and is never stored in the browser, URL, or analytics.',
  },
};

const useCaseCopy: Record<string, { ru: string; en: string }> = {
  'Для офиса': { ru: 'Для офиса', en: 'For office' },
  'На каждый день': { ru: 'На каждый день', en: 'Everyday' },
  'Солнцезащитные': { ru: 'Солнцезащитные', en: 'Sunglasses' },
  'Для компьютера': { ru: 'Для компьютера', en: 'For computer' },
  'Выразительная оправа': { ru: 'Выразительная оправа', en: 'Statement frame' },
  'Минимализм': { ru: 'Минимализм', en: 'Minimalism' },
};

function formatUseCase(value: string | undefined, language: 'ru' | 'en') {
  if (!value) return '';
  const match = useCaseCopy[value] ?? Object.values(useCaseCopy).find((entry) => entry.en === value);
  return match?.[language] ?? value;
}

function errorCode(reason: string) {
  return ['backend_disabled', 'privacy_payload_rejected', 'validation_failed', 'request_failed'].includes(reason)
    ? reason
    : 'unknown';
}

export function Checkout({ draft, onDraftChange, onBack }: CheckoutProps) {
  const { language } = useLanguage();
  const text = copy[language];
  const [customerName, setCustomerName] = useState('');
  const [contactValue, setContactValue] = useState('');
  const [contactChannel, setContactChannel] = useState<ContactChannel>('telegram');
  const [consent, setConsent] = useState(false);
  const [stage, setStage] = useState<'idle' | 'lead' | 'payment'>('idle');
  const [error, setError] = useState('');
  const [storageWarning, setStorageWarning] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const [checkoutAttempt, setCheckoutAttempt] = useState<ServiceCheckoutAttempt | null>(
    () => draft ? readServiceCheckoutAttempt(draft.createdAt) : null,
  );
  const leadIdRef = useRef('');
  const leadCapabilityTokenRef = useRef('');
  const idempotencyKeyRef = useRef('');
  const openedRef = useRef(false);
  const contactInputRef = useRef<HTMLInputElement>(null);
  const consentInputRef = useRef<HTMLInputElement>(null);
  const requestLocked = checkoutAttempt !== null;
  const draftCreatedAt = draft?.createdAt ?? '';

  const cities = useMemo(
    () => Array.from(new Set(opticsDirectory.map((optic) => optic.city))).sort((a, b) => a.localeCompare(b, 'ru')),
    [],
  );
  const selectedCity = draft?.storePreference.mode === 'later'
    ? cities[0] ?? 'Москва'
    : draft?.storePreference.city ?? cities[0] ?? 'Москва';
  const storesInCity = opticsDirectory.filter((optic) => optic.city === selectedCity);

  useEffect(() => {
    if (!draft || openedRef.current) return;
    openedRef.current = true;
    trackEvent(AnalyticsEvent.ServiceCheckoutOpened, {
      source: draft.sourcePage,
      selected_frame_count: draft.selectedFrames.length,
      locale: language,
      offer_code: 'visit_preparation_v1',
    });
    trackEvent(AnalyticsEvent.ServiceCheckoutSelectionViewed, {
      source: draft.sourcePage,
      selected_frame_count: draft.selectedFrames.length,
      locale: language,
    });
  }, [draft, language]);

  useEffect(() => {
    const restored = draftCreatedAt ? readServiceCheckoutAttempt(draftCreatedAt) : null;
    leadIdRef.current = restored?.leadId ?? '';
    leadCapabilityTokenRef.current = restored?.paymentCapabilityToken ?? '';
    idempotencyKeyRef.current = restored?.idempotencyKey ?? '';
    setCheckoutAttempt(restored);
  }, [draftCreatedAt]);

  const updateDraft = (next: ServiceCheckoutDraft) => {
    if (requestLocked) return;
    onDraftChange(next);
    setStorageWarning(!saveServiceCheckoutDraft(next));
  };

  const updateStorePreference = (storePreference: ServiceCheckoutStorePreference) => {
    if (!draft || requestLocked) return;
    const next = { ...draft, storePreference };
    updateDraft(next);
    trackEvent(AnalyticsEvent.ServiceCheckoutStoreSelected, {
      source: draft.sourcePage,
      store_choice_mode: storePreference.mode,
      locale: language,
    });
  };

  const removeFrame = (frameId: string) => {
    if (!draft || requestLocked || draft.selectedFrames.length <= 1) return;
    updateDraft({
      ...draft,
      selectedFrames: draft.selectedFrames.filter((frame) => frame.frameId !== frameId),
    });
  };

  const submit = async () => {
    if (!draft || stage !== 'idle') return;
    const contactInvalid = !checkoutAttempt && contactValue.trim().length < 3;
    const consentInvalid = !checkoutAttempt && !consent;
    if (!checkoutAttempt && (contactInvalid || consentInvalid)) {
      setShowValidation(true);
      setError(text.required);
      requestAnimationFrame(() => {
        if (contactInvalid) contactInputRef.current?.focus();
        else consentInputRef.current?.focus();
      });
      return;
    }

    setShowValidation(false);
    setError('');
    trackEvent(AnalyticsEvent.ServiceCheckoutSubmitStarted, {
      source: draft.sourcePage,
      selected_frame_count: draft.selectedFrames.length,
      store_choice_mode: draft.storePreference.mode,
      locale: language,
      offer_code: 'visit_preparation_v1',
    });

    if (!leadIdRef.current) {
      setStage('lead');
      trackEvent(AnalyticsEvent.ServiceCheckoutContactCompleted, {
        source: draft.sourcePage,
        selected_frame_count: draft.selectedFrames.length,
        store_choice_mode: draft.storePreference.mode,
        locale: language,
      });

      const lead = await submitVisitLead({
        locale: language,
        customerName: customerName.trim() || undefined,
        contactValue: contactValue.trim(),
        contactChannel,
        city: draft.storePreference.mode === 'later' ? undefined : draft.storePreference.city,
        preferredStoreId: draft.storePreference.mode === 'store' ? draft.storePreference.storeId : undefined,
        preferredStoreName: draft.storePreference.mode === 'store' ? draft.storePreference.storeName : undefined,
        consentPersonalData: true,
        consentVersion: CONSENT_VERSION,
        privacyVersion: PRIVACY_VERSION,
        sourcePage: draft.sourcePage,
        selectedFrames: draft.selectedFrames.map((frame) => ({
          frameId: frame.frameId,
          frameName: frame.frameName,
          frameBrand: frame.frameBrand,
          frameCategory: frame.frameCategory,
          frameSize: frame.frameSize,
          framePriceRub: frame.framePriceRub,
          fitScore: frame.fitScore,
          useCase: frame.useCase,
        })),
      });

      if (!lead.ok) {
        setStage('idle');
        const leadFormUrl = buildLeadFormUrl({
          city: draft.storePreference.mode === 'later' ? undefined : draft.storePreference.city,
          contact_method: contactChannel,
          selected_count: draft.selectedFrames.length,
          frames: draft.selectedFrames.map((frame) => frame.frameName).join(', '),
          source: draft.sourcePage,
        });
        if (hasLeadForm() && leadFormUrl) {
          window.open(leadFormUrl, '_blank', 'noopener,noreferrer');
          setError(text.leadFallback);
          trackEvent(AnalyticsEvent.ServiceCheckoutSubmitFailed, {
            source: draft.sourcePage,
            selected_frame_count: draft.selectedFrames.length,
            store_choice_mode: draft.storePreference.mode,
            locale: language,
            error_code: 'tally_fallback',
          });
          return;
        }
        setError(text.leadError);
        trackEvent(AnalyticsEvent.ServiceCheckoutSubmitFailed, {
          source: draft.sourcePage,
          selected_frame_count: draft.selectedFrames.length,
          store_choice_mode: draft.storePreference.mode,
          locale: language,
          error_code: errorCode(lead.reason),
        });
        return;
      }

      const attempt: ServiceCheckoutAttempt = {
        version: 1,
        draftCreatedAt: draft.createdAt,
        leadId: lead.data.leadId,
        paymentCapabilityToken: lead.data.paymentCapabilityToken,
        idempotencyKey: getPaymentIdempotencyKey(),
      };
      leadIdRef.current = attempt.leadId;
      leadCapabilityTokenRef.current = attempt.paymentCapabilityToken;
      idempotencyKeyRef.current = attempt.idempotencyKey;
      setCheckoutAttempt(attempt);
      setStorageWarning(!saveServiceCheckoutAttempt(attempt));
    }

    setStage('payment');
    const payment = await createPaymentIntent({
      offerCode: 'visit_preparation_v1',
      leadId: leadIdRef.current,
      leadCapabilityToken: leadCapabilityTokenRef.current,
      sourcePage: draft.sourcePage,
      idempotencyKey: idempotencyKeyRef.current,
    });

    if (!payment.ok) {
      setStage('idle');
      setError(text.paymentError);
      trackEvent(AnalyticsEvent.ServiceCheckoutSubmitFailed, {
        source: draft.sourcePage,
        selected_frame_count: draft.selectedFrames.length,
        store_choice_mode: draft.storePreference.mode,
        locale: language,
        error_code: errorCode(payment.reason),
      });
      return;
    }

    trackEvent(AnalyticsEvent.PaymentCheckoutOpened, {
      offer_code: payment.data.offerCode,
      provider_mode: payment.data.providerMode,
      source: draft.sourcePage,
    });
    window.location.href = payment.data.checkoutUrl
      ?? `${payment.data.returnUrl}${payment.data.returnUrl.includes('?') ? '&' : '?'}demoStatus=pending`;
  };

  if (!draft || draft.selectedFrames.length === 0) {
    return (
      <section className="kinetic-surface min-h-[calc(100vh-5rem)] px-4 py-12 text-vilu-ink">
        <div className="mx-auto max-w-3xl rounded-[2rem] bg-vilu-card p-8 text-center ring-1 ring-vilu-line md:p-12">
          <Package className="mx-auto text-vilu-green" size={46} />
          <h1 className="mt-5 text-4xl font-black tracking-tight">{text.expiredTitle}</h1>
          <p className="mx-auto mt-4 max-w-xl leading-7 text-vilu-ink/65">{text.expiredBody}</p>
          <button type="button" onClick={onBack} className="mt-8 rounded-full bg-vilu-lime px-7 py-4 text-xs font-black uppercase tracking-[0.14em] text-vilu-ink">
            {text.openCatalog}
          </button>
        </div>
      </section>
    );
  }

  const submitButtonLabel = stage === 'lead'
    ? text.submittingLead
    : stage === 'payment'
      ? text.creatingPayment
      : checkoutAttempt
        ? text.retryPayment
        : text.submit;

  return (
    <div className="kinetic-surface min-h-screen px-4 py-10 text-vilu-ink md:px-6 md:py-14">
      <div className="mx-auto max-w-6xl">
        <button type="button" onClick={onBack} className="mb-8 inline-flex items-center gap-2 text-sm font-black uppercase tracking-[0.14em] text-vilu-paper/70 transition hover:text-vilu-paper">
          <ArrowLeft size={18} /> {text.back}
        </button>

        <header className="max-w-3xl text-vilu-paper">
          <p className="kinetic-label text-vilu-lime">{text.kicker}</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight text-vilu-paper md:text-6xl">{text.title}</h1>
          <p className="mt-5 text-base leading-7 text-vilu-paper/76 md:text-lg">{text.subtitle}</p>
        </header>

        <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_380px] lg:items-start">
          <div className="space-y-6">
            <section className="rounded-[2rem] bg-vilu-card p-5 ring-1 ring-vilu-line md:p-8">
              <h2 className="text-2xl font-black tracking-tight">{text.selection}</h2>
              <p className="mt-2 text-sm leading-6 text-vilu-ink/60">{text.selectionHint}</p>
              <div className="mt-6 grid gap-4">
                {draft.selectedFrames.map((frame) => (
                  <article key={frame.frameId} className="grid gap-4 rounded-3xl bg-vilu-paper p-4 ring-1 ring-vilu-line sm:grid-cols-[92px_1fr_auto] sm:items-center">
                    <div className="flex h-24 items-center justify-center overflow-hidden rounded-2xl bg-vilu-card">
                      {frame.imageUrl
                        ? <img src={frame.imageUrl} alt="" className="h-full w-full object-cover" />
                        : <Package className="text-vilu-green" />}
                    </div>
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.14em] text-vilu-green">{frame.frameBrand || 'ViLu'}</p>
                      <h3 className="mt-1 text-xl font-black">{frame.frameName}</h3>
                      <p className="mt-2 text-sm text-vilu-ink/60">
                        {[frame.frameSize, formatUseCase(frame.useCase, language), frame.fitScore ? `Face-fit ${frame.fitScore}/100` : ''].filter(Boolean).join(' · ')}
                      </p>
                      <p className="mt-2 text-xs font-bold text-vilu-ink/55">{text.framePrice}: {text.inStore}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFrame(frame.frameId)}
                      disabled={requestLocked || draft.selectedFrames.length <= 1}
                      className="inline-flex items-center justify-center gap-2 rounded-full bg-vilu-card px-4 py-3 text-xs font-black uppercase tracking-[0.1em] text-vilu-ink ring-1 ring-vilu-line disabled:cursor-not-allowed disabled:opacity-35"
                    >
                      <Trash2 size={15} /> {text.remove}
                    </button>
                  </article>
                ))}
              </div>
            </section>

            <section className="rounded-[2rem] bg-vilu-ink p-5 text-vilu-paper ring-1 ring-vilu-lime/20 md:p-8">
              <h2 className="text-2xl font-black tracking-tight">{text.service}</h2>
              <ol className="mt-6 grid gap-3 sm:grid-cols-2">
                {text.deliverables.map((item, index) => (
                  <li key={item} className="flex gap-3 rounded-2xl bg-vilu-paper/7 p-4 text-sm leading-6">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-vilu-lime font-black text-vilu-ink">{index + 1}</span>
                    {item}
                  </li>
                ))}
              </ol>
              <p className="mt-5 text-sm leading-6 text-vilu-paper/68">{text.limitation}</p>
            </section>

            <section className="rounded-[2rem] bg-vilu-card p-5 ring-1 ring-vilu-line md:p-8">
              <h2 className="text-2xl font-black tracking-tight">{text.store}</h2>
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                {([
                  ['store', text.exactStore],
                  ['city', text.cityOnly],
                  ['later', text.later],
                ] as const).map(([mode, label]) => (
                  <button
                    type="button"
                    key={mode}
                    disabled={requestLocked}
                    onClick={() => {
                      if (mode === 'later') updateStorePreference({ mode: 'later' });
                      else if (mode === 'city') updateStorePreference({ mode: 'city', city: selectedCity });
                      else {
                        const firstStore = storesInCity[0] ?? opticsDirectory[0];
                        updateStorePreference({ mode: 'store', city: firstStore.city, storeId: firstStore.id, storeName: firstStore.name });
                      }
                    }}
                    className={`rounded-2xl p-4 text-left text-sm font-black transition ring-1 disabled:cursor-not-allowed disabled:opacity-65 ${
                      draft.storePreference.mode === mode
                        ? 'bg-vilu-lime text-vilu-ink ring-vilu-lime'
                        : 'bg-vilu-paper text-vilu-ink ring-vilu-line'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {draft.storePreference.mode !== 'later' && (
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <label className="grid gap-2">
                    <span className="text-xs font-black uppercase tracking-[0.14em] text-vilu-ink/55">{text.city}</span>
                    <select
                      value={selectedCity}
                      disabled={requestLocked}
                      onChange={(event) => {
                        const city = event.target.value;
                        if (draft.storePreference.mode === 'city') updateStorePreference({ mode: 'city', city });
                        else {
                          const firstStore = opticsDirectory.find((optic) => optic.city === city);
                          if (firstStore) updateStorePreference({ mode: 'store', city, storeId: firstStore.id, storeName: firstStore.name });
                        }
                      }}
                      className="rounded-2xl border border-vilu-line bg-vilu-paper px-4 py-4 font-bold outline-none focus:border-vilu-lime"
                    >
                      {cities.map((city) => <option key={city} value={city}>{city}</option>)}
                    </select>
                  </label>
                  {draft.storePreference.mode === 'store' && (
                    <label className="grid gap-2">
                      <span className="text-xs font-black uppercase tracking-[0.14em] text-vilu-ink/55">{text.storeLabel}</span>
                      <select
                        value={draft.storePreference.storeId}
                        disabled={requestLocked}
                        onChange={(event) => {
                          const store = opticsDirectory.find((optic) => optic.id === event.target.value);
                          if (store) updateStorePreference({ mode: 'store', city: store.city, storeId: store.id, storeName: store.name });
                        }}
                        className="rounded-2xl border border-vilu-line bg-vilu-paper px-4 py-4 font-bold outline-none focus:border-vilu-lime"
                      >
                        {storesInCity.map((store) => <option key={store.id} value={store.id}>{store.name} — {store.address}</option>)}
                      </select>
                    </label>
                  )}
                </div>
              )}
              <p className="mt-4 flex items-center gap-2 text-sm text-vilu-ink/58"><MapPin size={16} /> {text.storeHint}</p>
            </section>

            <section data-testid="checkout-contact-step" className="rounded-[2rem] bg-vilu-card p-5 ring-1 ring-vilu-line md:p-8">
              <h2 className="text-2xl font-black tracking-tight">{text.contact}</h2>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2">
                  <span className="text-xs font-black uppercase tracking-[0.14em] text-vilu-ink/55">{text.name}</span>
                  <input disabled={requestLocked} value={customerName} onChange={(event) => setCustomerName(event.target.value)} placeholder={text.namePlaceholder} autoComplete="name" className="rounded-2xl border border-vilu-line bg-vilu-paper px-4 py-4 font-bold outline-none focus:border-vilu-lime disabled:cursor-not-allowed disabled:opacity-65" />
                </label>
                <label className="grid gap-2">
                  <span className="text-xs font-black uppercase tracking-[0.14em] text-vilu-ink/55">{text.channel}</span>
                  <select disabled={requestLocked} value={contactChannel} onChange={(event) => setContactChannel(event.target.value as ContactChannel)} className="rounded-2xl border border-vilu-line bg-vilu-paper px-4 py-4 font-bold outline-none focus:border-vilu-lime disabled:cursor-not-allowed disabled:opacity-65">
                    <option value="telegram">Telegram</option>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="phone">{language === 'ru' ? 'Телефон' : 'Phone'}</option>
                    <option value="email">Email</option>
                  </select>
                </label>
              </div>
              <label className="mt-4 grid gap-2">
                <span className="text-xs font-black uppercase tracking-[0.14em] text-vilu-ink/55">{text.contactValue}</span>
                <input
                  ref={contactInputRef}
                  disabled={requestLocked}
                  value={contactValue}
                  onChange={(event) => setContactValue(event.target.value)}
                  placeholder={text.contactPlaceholder}
                  autoComplete={contactChannel === 'email' ? 'email' : 'tel'}
                  aria-invalid={showValidation && contactValue.trim().length < 3}
                  aria-describedby={showValidation && contactValue.trim().length < 3 ? 'checkout-contact-error' : undefined}
                  className="rounded-2xl border border-vilu-line bg-vilu-paper px-4 py-4 font-bold outline-none focus:border-vilu-lime disabled:cursor-not-allowed disabled:opacity-65 aria-[invalid=true]:border-red-600 aria-[invalid=true]:ring-2 aria-[invalid=true]:ring-red-600/20"
                />
                {showValidation && contactValue.trim().length < 3 && (
                  <span id="checkout-contact-error" className="text-sm font-bold text-red-700">{text.contactRequired}</span>
                )}
              </label>
              <label className={`mt-5 flex cursor-pointer items-start gap-3 rounded-2xl bg-vilu-paper p-4 ring-1 ${showValidation && !consent ? 'ring-2 ring-red-600/70' : 'ring-vilu-line'}`}>
                <input
                  ref={consentInputRef}
                  disabled={requestLocked}
                  type="checkbox"
                  checked={consent}
                  onChange={(event) => setConsent(event.target.checked)}
                  aria-invalid={showValidation && !consent}
                  aria-describedby={showValidation && !consent ? 'checkout-consent-error' : undefined}
                  className="mt-1 h-5 w-5 accent-vilu-lime"
                />
                <span className="text-sm leading-6">{text.consent} <a href="/privacy" className="font-black text-vilu-green underline">{text.privacy}</a></span>
              </label>
              {showValidation && !consent && (
                <p id="checkout-consent-error" className="mt-2 text-sm font-bold text-red-700">{text.consentRequired}</p>
              )}
              <p className="mt-4 flex gap-2 text-sm leading-6 text-vilu-ink/60"><ShieldCheck className="mt-0.5 shrink-0 text-vilu-green" size={18} /> {text.safe}</p>
              <button
                data-testid="checkout-primary-cta"
                type="button"
                onClick={() => void submit()}
                disabled={stage !== 'idle'}
                className="mt-6 flex min-h-14 w-full items-center justify-center gap-2 rounded-full bg-vilu-lime px-5 py-4 text-center text-xs font-black uppercase tracking-[0.12em] text-vilu-ink transition hover:bg-vilu-ink hover:text-vilu-paper disabled:cursor-wait disabled:opacity-65"
              >
                <CreditCard size={17} />
                {submitButtonLabel}
              </button>
              <p className="mt-3 flex gap-2 text-xs leading-5 text-vilu-ink/62">
                <CheckCircle2 className="shrink-0 text-vilu-green" size={17} />
                {text.testDisclosure}
              </p>
              {storageWarning && <p className="mt-4 rounded-2xl bg-vilu-paper p-4 text-xs leading-5 text-vilu-ink ring-1 ring-vilu-line">{text.storageWarning}</p>}
              {error && <p role="alert" className="mt-4 rounded-2xl bg-red-50 p-4 text-sm font-bold leading-6 text-red-800 ring-1 ring-red-200">{error}</p>}
              {requestLocked && (
                <p className="mt-4 rounded-2xl bg-vilu-lime/20 p-4 text-sm font-bold leading-6 text-vilu-ink ring-1 ring-vilu-lime/45">
                  {text.requestLocked}
                </p>
              )}
            </section>
          </div>

          <aside className="rounded-[2rem] bg-vilu-ink p-6 text-vilu-paper ring-1 ring-vilu-lime/20 lg:sticky lg:top-28 md:p-8">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-2xl font-black">{text.summary}</h2>
              <span className="rounded-full bg-vilu-lime px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-vilu-ink">{text.testBadge}</span>
            </div>
            <div className="mt-7 space-y-4 text-sm">
              <div className="flex justify-between gap-4"><span className="text-vilu-paper/65">{text.summaryFrame}</span><strong className="text-right">{text.summaryFrameValue}</strong></div>
              <div className="flex justify-between gap-4 border-t border-white/10 pt-4"><span className="text-vilu-paper/65">{text.summaryService}</span><strong>429 ₽</strong></div>
              <div className="flex justify-between gap-4 border-t border-white/10 pt-5 text-xl"><span>{text.summaryNow}</span><strong>429 ₽</strong></div>
            </div>
            <button
              type="button"
              aria-label={language === 'ru' ? 'Быстрый переход к тестовой оплате' : 'Quick access to test payment'}
              onClick={() => void submit()}
              disabled={stage !== 'idle'}
              className="mt-7 flex min-h-14 w-full items-center justify-center gap-2 rounded-full bg-vilu-lime px-5 py-4 text-center text-xs font-black uppercase tracking-[0.12em] text-vilu-ink transition hover:bg-vilu-paper disabled:cursor-wait disabled:opacity-65"
            >
              <CreditCard size={17} />
              {submitButtonLabel}
            </button>
            <p className="mt-4 flex gap-2 text-xs leading-5 text-vilu-paper/68"><CheckCircle2 className="shrink-0 text-vilu-lime" size={17} /> {text.testDisclosure}</p>
            <div className="mt-6 grid gap-2 border-t border-white/10 pt-5 text-xs text-vilu-paper/62">
              {text.deliverables.slice(0, 3).map((item) => <p key={item} className="flex gap-2"><Check size={15} className="shrink-0 text-vilu-lime" /> {item}</p>)}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
