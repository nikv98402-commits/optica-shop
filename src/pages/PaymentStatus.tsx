import { AlertCircle, ArrowRight, CheckCircle2, Clock3, RotateCcw, ShieldCheck } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { AnalyticsEvent, trackEvent } from '../lib/analyticsEvents';
import { getPaymentStatus, simulateLocalPaymentStatus } from '../services/paymentService';
import type { PaymentIntentStatus, PublicPaymentStatusResponse } from '../types/backend';

type PaymentPageMode = 'return' | 'success' | 'failed';

interface PaymentStatusProps {
  mode: PaymentPageMode;
  onNavigate: (page: string) => void;
}

const copy = {
  ru: {
    test: 'Тестовый режим',
    kicker: 'Подготовка визита',
    pendingTitle: 'Проверяем статус оплаты',
    pendingBody: 'Подтверждение может занять несколько секунд. Не закрывайте страницу.',
    successTitle: 'Оплата завершена',
    successBody: 'Подбор сохранен. На следующем этапе здесь появится подтвержденная подготовка визита.',
    demoSuccessTitle: 'Интерес сохранен',
    demoSuccessBody: 'Тест завершен: списания не было. Подбор сохранен, и вы можете продолжить подготовку к визиту.',
    failedTitle: 'Оплата не прошла',
    failedBody: 'Деньги не списаны. Можно вернуться к подбору или повторить попытку позже.',
    unknownTitle: 'Не удалось проверить оплату',
    unknownBody: 'Ссылка устарела или тестовый платеж не найден. Вернитесь к подбору.',
    price: 'Стоимость услуги',
    noCharge: 'Это тестовый контур: реальные платежи и банковские данные не обрабатываются.',
    back: 'Вернуться к подбору',
    retry: 'Проверить еще раз',
    demoSuccess: 'Показать успешный тест',
    demoFail: 'Показать неуспешный тест',
  },
  en: {
    test: 'Test mode',
    kicker: 'Visit preparation',
    pendingTitle: 'Checking payment status',
    pendingBody: 'Confirmation may take a few seconds. Please keep this page open.',
    successTitle: 'Payment completed',
    successBody: 'Your selection is saved. Verified visit preparation will appear here in the next stage.',
    demoSuccessTitle: 'Interest saved',
    demoSuccessBody: 'The test is complete: no charge was made. Your selection is saved so you can continue preparing for the visit.',
    failedTitle: 'Payment was not completed',
    failedBody: 'No money was charged. Return to your selection or try again later.',
    unknownTitle: 'Payment status unavailable',
    unknownBody: 'This link has expired or the test payment was not found. Return to your selection.',
    price: 'Service price',
    noCharge: 'This is a test contour: no real payments or bank card data are processed.',
    back: 'Back to selection',
    retry: 'Check again',
    demoSuccess: 'Show successful test',
    demoFail: 'Show failed test',
  },
};

function requestedStatus(mode: PaymentPageMode): PaymentIntentStatus | null {
  if (mode === 'success') return 'paid';
  if (mode === 'failed') return 'failed';
  return null;
}

export function PaymentStatus({ mode, onNavigate }: PaymentStatusProps) {
  const { language } = useLanguage();
  const text = copy[language];
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const publicToken = params.get('token') || '';
  const isDemo = publicToken.startsWith('demo_');
  const [receipt, setReceipt] = useState<PublicPaymentStatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState(mode === 'return');
  const [hasError, setHasError] = useState(false);

  const loadStatus = async () => {
    setIsLoading(true);
    setHasError(false);
    const result = await getPaymentStatus(publicToken);
    if (result.ok) {
      setReceipt(result.data);
      const event = result.data.status === 'paid'
        ? AnalyticsEvent.PaymentStatusPaid
        : result.data.status === 'cancelled'
          ? AnalyticsEvent.PaymentStatusCancelled
          : result.data.status === 'failed'
            ? AnalyticsEvent.PaymentStatusFailed
            : AnalyticsEvent.PaymentStatusPending;
      if (isDemo) {
        trackEvent(AnalyticsEvent.PaymentTestStatusViewed, { status: result.data.status, source: 'payment_result' });
      } else {
        trackEvent(event, { status: result.data.status, source: 'payment_result' });
      }
    } else {
      setHasError(true);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    const stateFromRoute = requestedStatus(mode);
    if (isDemo && stateFromRoute) simulateLocalPaymentStatus(publicToken, stateFromRoute);
    void loadStatus();
    // The token and mode are fixed for the lifetime of this route.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, publicToken]);

  useEffect(() => {
    const existing = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
    const previousContent = existing?.content;
    const meta = existing || document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex, nofollow, noarchive';
    if (!existing) document.head.appendChild(meta);

    return () => {
      if (existing && previousContent !== undefined) {
        existing.content = previousContent;
      } else {
        meta.remove();
      }
    };
  }, []);

  const status = receipt?.status;
  const success = status === 'paid';
  const failed = status === 'failed' || status === 'cancelled';
  const Icon = success ? CheckCircle2 : failed || hasError ? AlertCircle : Clock3;
  const title = hasError ? text.unknownTitle : success ? (isDemo ? text.demoSuccessTitle : text.successTitle) : failed ? text.failedTitle : text.pendingTitle;
  const body = hasError ? text.unknownBody : success ? (isDemo ? text.demoSuccessBody : text.successBody) : failed ? text.failedBody : text.pendingBody;

  const showDemoState = (next: 'success' | 'failed') => {
    const state: PaymentIntentStatus = next === 'success' ? 'paid' : 'failed';
    simulateLocalPaymentStatus(publicToken, state);
    window.location.href = `/payment/${next}?token=${encodeURIComponent(publicToken)}`;
  };

  return (
    <section className="min-h-[calc(100vh-5rem)] bg-vilu-cream px-4 py-10 text-vilu-ink md:py-16">
      <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[1fr_0.72fr]">
        <article className="rounded-[2rem] bg-vilu-paper p-6 ring-1 ring-vilu-ink/10 md:p-10">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-vilu-lime px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-vilu-ink">{text.test}</span>
            <span className="text-xs font-black uppercase tracking-[0.18em] text-vilu-green">{text.kicker}</span>
          </div>
          <Icon className="mt-10 text-vilu-green" size={52} aria-hidden="true" />
          <h1 className="mt-5 max-w-2xl text-4xl font-black tracking-tight md:text-6xl">{isLoading ? text.pendingTitle : title}</h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-vilu-ink/70 md:text-lg">{isLoading ? text.pendingBody : body}</p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <button type="button" onClick={() => onNavigate('tryon')} className="inline-flex items-center justify-center gap-2 rounded-full bg-vilu-lime px-6 py-4 text-xs font-black uppercase tracking-[0.12em] text-vilu-ink">
              {text.back} <ArrowRight size={16} />
            </button>
            {!success && !failed && !hasError && (
              <button type="button" onClick={() => void loadStatus()} className="inline-flex items-center justify-center gap-2 rounded-full bg-vilu-card px-6 py-4 text-xs font-black uppercase tracking-[0.12em] text-vilu-ink ring-1 ring-vilu-ink/10">
                <RotateCcw size={16} /> {text.retry}
              </button>
            )}
          </div>
        </article>

        <aside className="rounded-[2rem] bg-vilu-ink p-6 text-vilu-paper md:p-8">
          <ShieldCheck className="text-vilu-lime" size={34} aria-hidden="true" />
          <p className="mt-8 text-xs font-black uppercase tracking-[0.16em] text-vilu-lime">{text.price}</p>
          <p className="mt-2 text-5xl font-black">429 ₽</p>
          <p className="mt-6 text-sm leading-6 text-vilu-paper/75">{text.noCharge}</p>

          {isDemo && mode === 'return' && (
            <div className="mt-8 grid gap-3">
              <button type="button" onClick={() => showDemoState('success')} className="rounded-full bg-vilu-lime px-5 py-4 text-xs font-black uppercase tracking-[0.1em] text-vilu-ink">{text.demoSuccess}</button>
              <button type="button" onClick={() => showDemoState('failed')} className="rounded-full bg-vilu-paper px-5 py-4 text-xs font-black uppercase tracking-[0.1em] text-vilu-ink">{text.demoFail}</button>
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}
