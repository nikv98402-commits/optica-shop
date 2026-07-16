import { ArrowLeft, CheckCircle2, CreditCard, Package, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { formatPrice, getProductById } from '../data/products';
import { AnalyticsEvent, trackEvent } from '../lib/analyticsEvents';
import { createPaymentIntent, getPaymentIdempotencyKey } from '../services/paymentService';

interface CheckoutProps {
  productId: string;
  onBack: () => void;
}

const copy = {
  ru: {
    back: 'Назад в каталог',
    kicker: 'Оформление',
    title: 'Подготовка к визиту',
    name: 'Имя',
    namePlaceholder: 'Анна',
    phone: 'Телефон',
    receiving: 'Получение оправы',
    pickup: 'Самовывоз',
    pickupHint: 'Примерка и настройка в салоне',
    courier: 'Курьер',
    courierHint: 'Доставка согласовывается после примерки',
    disclosure: 'Оправа пока не оплачивается. Сейчас вы тестируете только услугу подготовки визита за 429 ₽; реальные списания отключены.',
    order: 'Ваш выбор',
    sunglasses: 'Солнцезащитные очки',
    contactLenses: 'Контактные линзы',
    frameWithLenses: 'Оправа + базовые линзы',
    frame: 'Ориентир по оправе',
    delivery: 'Доставка',
    frameEstimate: 'Стоимость оправы уточняется перед визитом',
    service: 'Подготовка визита',
    servicePrice: 'К тестовой оплате',
    processing: 'Готовим переход...',
    confirm: 'Перейти к тестовой оплате 429 ₽',
    trust: 'Деньги не спишутся. На следующем экране можно проверить успешный и неуспешный сценарии.',
    error: 'Не удалось открыть тестовую оплату. Попробуйте еще раз.',
  },
  en: {
    back: 'Back to catalog',
    kicker: 'Checkout',
    title: 'Prepare your visit',
    name: 'Name',
    namePlaceholder: 'Anna',
    phone: 'Phone',
    receiving: 'Frame fulfillment',
    pickup: 'Store pickup',
    pickupHint: 'Fitting and adjustment in store',
    courier: 'Courier',
    courierHint: 'Delivery is arranged after the fitting',
    disclosure: 'The frame is not being charged now. You are testing only the 429 RUB visit-preparation service; real charges are disabled.',
    order: 'Your selection',
    sunglasses: 'Sunglasses',
    contactLenses: 'Contact lenses',
    frameWithLenses: 'Frame + basic lenses',
    frame: 'Frame estimate',
    delivery: 'Delivery',
    frameEstimate: 'Frame price is confirmed before the visit',
    service: 'Visit preparation',
    servicePrice: 'Test payment total',
    processing: 'Preparing the next step...',
    confirm: 'Continue to 429 RUB test payment',
    trust: 'No money will be charged. The next screen lets you test successful and failed outcomes.',
    error: 'Could not open the test payment. Please try again.',
  },
};

export function Checkout({ productId, onBack }: CheckoutProps) {
  const { language } = useLanguage();
  const text = copy[language];
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  const [delivery, setDelivery] = useState<'store' | 'courier'>('store');
  const product = getProductById(productId) ?? getProductById('aurora-crystal');

  const basePrice = product?.price ?? 12990;
  const servicePrice = delivery === 'courier' ? 490 : 0;

  const handlePayment = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    setPaymentError('');

    const result = await createPaymentIntent({
      offerCode: 'visit_preparation_v1',
      sourcePage: '/products',
      idempotencyKey: getPaymentIdempotencyKey(),
    });

    if (!result.ok) {
      setPaymentError(text.error);
      setIsProcessing(false);
      return;
    }

    trackEvent(AnalyticsEvent.PaymentCheckoutOpened, {
      offer_code: result.data.offerCode,
      provider_mode: result.data.providerMode,
      source: 'product_checkout',
    });

    if (result.data.checkoutUrl) {
      window.location.href = result.data.checkoutUrl;
      return;
    }

    window.location.href = `${result.data.returnUrl}${result.data.returnUrl.includes('?') ? '&' : '?'}demoStatus=pending`;
  };

  return (
    <div className="kinetic-surface min-h-screen px-6 py-12">
      <div className="mx-auto max-w-5xl">
        <button onClick={onBack} className="mb-10 inline-flex items-center gap-2 text-sm font-black uppercase tracking-[0.18em] text-vilu-ink/55 transition hover:text-vilu-ink">
          <ArrowLeft size={18} /> {text.back}
        </button>

        <div className="grid gap-10 lg:grid-cols-[1fr_380px]">
          <section className="rounded-[2rem] bg-vilu-card p-7 shadow-sm ring-1 ring-vilu-ink/10 md:p-10">
            <p className="kinetic-label text-vilu-green">{text.kicker}</p>
            <h1 className="mt-3 text-5xl font-black tracking-tight">{text.title}</h1>

            <div className="mt-10 grid gap-4">
              <label className="grid gap-2">
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-vilu-ink/40">{text.name}</span>
                <input className="rounded-2xl border border-vilu-ink/10 bg-vilu-paper px-5 py-4 font-bold outline-none transition focus:border-vilu-lime" placeholder={text.namePlaceholder} />
              </label>
              <label className="grid gap-2">
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-vilu-ink/40">{text.phone}</span>
                <input className="rounded-2xl border border-vilu-ink/10 bg-vilu-paper px-5 py-4 font-bold outline-none transition focus:border-vilu-lime" placeholder="+7 900 000-00-00" />
              </label>
            </div>

            <div className="mt-8">
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-vilu-ink/40">{text.receiving}</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <button onClick={() => setDelivery('store')} className={`rounded-3xl border-2 p-5 text-left transition ${delivery === 'store' ? 'border-vilu-lime bg-vilu-lime text-vilu-ink' : 'border-vilu-ink/10 bg-vilu-paper text-vilu-ink'}`}><strong>{text.pickup}</strong><span className="mt-1 block text-sm opacity-65">{text.pickupHint}</span></button>
                <button onClick={() => setDelivery('courier')} className={`rounded-3xl border-2 p-5 text-left transition ${delivery === 'courier' ? 'border-vilu-lime bg-vilu-lime text-vilu-ink' : 'border-vilu-ink/10 bg-vilu-paper text-vilu-ink'}`}><strong>{text.courier}</strong><span className="mt-1 block text-sm opacity-65">{text.courierHint}</span></button>
              </div>
            </div>

            <div className="mt-8 rounded-3xl bg-vilu-ink p-5 text-vilu-paper">
              <div className="flex gap-3">
                <ShieldCheck className="mt-1 text-vilu-lime" size={22} />
                <p className="text-sm leading-6">{text.disclosure}</p>
              </div>
            </div>
          </section>

          <aside className="h-fit rounded-[2rem] bg-vilu-ink p-7 text-vilu-paper shadow-2xl shadow-vilu-ink/20 ring-1 ring-vilu-lime/20">
            <h2 className="text-2xl font-black tracking-tight">{text.order}</h2>
            <div className="mt-6 flex gap-4 rounded-3xl bg-vilu-paper/10 p-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-vilu-paper/10"><Package /></div>
              <div><strong>{product?.name ?? 'Aurora Crystal'}</strong><p className="mt-1 text-sm text-vilu-paper/60">{product?.category === 'sunglasses' ? text.sunglasses : product?.category === 'contact_lenses' ? text.contactLenses : text.frameWithLenses}</p></div>
            </div>

            <div className="mt-6 space-y-4 border-t border-white/10 pt-6 text-sm">
              <div className="flex justify-between gap-4"><span className="text-vilu-paper/60">{text.frame}</span><strong>{formatPrice(basePrice)}</strong></div>
              <div className="flex justify-between gap-4"><span className="text-vilu-paper/60">{text.delivery}</span><strong>{servicePrice ? formatPrice(servicePrice) : '0 ₽'}</strong></div>
              <p className="border-t border-white/10 pt-4 text-xs leading-5 text-vilu-paper/60">{text.frameEstimate}</p>
              <div className="flex justify-between gap-4 border-t border-white/10 pt-5"><span>{text.service}</span><strong>429 ₽</strong></div>
              <div className="flex justify-between gap-4 text-2xl"><span>{text.servicePrice}</span><strong>429 ₽</strong></div>
            </div>

            <button onClick={handlePayment} disabled={isProcessing} className="mt-8 flex w-full items-center justify-center gap-2 rounded-full bg-vilu-lime px-6 py-4 text-sm font-black uppercase tracking-[0.18em] text-vilu-ink transition hover:bg-vilu-card disabled:cursor-not-allowed disabled:opacity-60">
              {isProcessing ? text.processing : <><CreditCard size={18} /> {text.confirm}</>}
            </button>

            <div className="mt-6 flex gap-3 text-xs leading-5 text-vilu-paper/60"><CheckCircle2 className="shrink-0 text-vilu-lime" size={18} /> {text.trust}</div>
            {paymentError && <p role="alert" className="mt-4 rounded-2xl bg-red-950/40 p-4 text-sm text-white">{paymentError}</p>}
          </aside>
        </div>
      </div>
    </div>
  );
}
