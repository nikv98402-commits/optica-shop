import { ArrowLeft, CheckCircle2, CreditCard, Package, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { formatPrice, getProductById } from '../data/products';
import { useAuth } from '../contexts/AuthContext';
import { createLocalId } from '../lib/id';

interface CheckoutProps {
  productId: string;
  onBack: () => void;
  onSuccess: () => void;
}

const PURCHASES_KEY = 'visionlux_purchase_history';

export function Checkout({ productId, onBack, onSuccess }: CheckoutProps) {
  const { user } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [delivery, setDelivery] = useState<'store' | 'courier'>('store');
  const product = getProductById(productId) ?? getProductById('aurora-crystal');

  const basePrice = product?.price ?? 12990;
  const servicePrice = delivery === 'courier' ? 490 : 0;
  const totalAmount = basePrice + servicePrice;

  const handlePayment = () => {
    setIsProcessing(true);
    window.setTimeout(() => {
      if (product) {
        const current = JSON.parse(localStorage.getItem(PURCHASES_KEY) || '[]') as Array<Record<string, string>>;
        localStorage.setItem(PURCHASES_KEY, JSON.stringify([
          {
            id: createLocalId('purchase'),
            productId: product.id,
            category: product.category,
            brandName: product.brand_name,
            userId: user?.id ?? 'demo',
            purchasedAt: new Date().toISOString(),
          },
          ...current,
        ].slice(0, 20)));
      }
      setIsProcessing(false);
      onSuccess();
    }, 1200);
  };

  return (
    <div className="kinetic-surface min-h-screen px-6 py-12">
      <div className="mx-auto max-w-5xl">
        <button onClick={onBack} className="mb-10 inline-flex items-center gap-2 text-sm font-black uppercase tracking-[0.18em] text-vilu-ink/55 transition hover:text-vilu-ink">
          <ArrowLeft size={18} /> Назад в каталог
        </button>

        <div className="grid gap-10 lg:grid-cols-[1fr_380px]">
          <section className="rounded-[2rem] bg-vilu-card p-7 shadow-sm ring-1 ring-vilu-ink/10 md:p-10">
            <p className="kinetic-label text-vilu-green">Checkout</p>
            <h1 className="mt-3 text-5xl font-black tracking-tight">Оформление заказа</h1>

            <div className="mt-10 grid gap-4">
              <label className="grid gap-2">
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-vilu-ink/40">Имя</span>
                <input className="rounded-2xl border border-vilu-ink/10 bg-vilu-paper px-5 py-4 font-bold outline-none transition focus:border-vilu-lime" placeholder="Анна" />
              </label>
              <label className="grid gap-2">
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-vilu-ink/40">Телефон</span>
                <input className="rounded-2xl border border-vilu-ink/10 bg-vilu-paper px-5 py-4 font-bold outline-none transition focus:border-vilu-lime" placeholder="+7 900 000-00-00" />
              </label>
            </div>

            <div className="mt-8">
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-vilu-ink/40">Получение</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <button onClick={() => setDelivery('store')} className={`rounded-3xl border-2 p-5 text-left transition ${delivery === 'store' ? 'border-vilu-lime bg-vilu-lime text-vilu-ink' : 'border-vilu-ink/10 bg-vilu-paper text-vilu-ink'}`}><strong>Самовывоз</strong><span className="mt-1 block text-sm opacity-65">Примерка и настройка в салоне</span></button>
                <button onClick={() => setDelivery('courier')} className={`rounded-3xl border-2 p-5 text-left transition ${delivery === 'courier' ? 'border-vilu-lime bg-vilu-lime text-vilu-ink' : 'border-vilu-ink/10 bg-vilu-paper text-vilu-ink'}`}><strong>Курьер</strong><span className="mt-1 block text-sm opacity-65">Доставка по городу за 1-2 дня</span></button>
              </div>
            </div>

            <div className="mt-8 rounded-3xl bg-vilu-ink p-5 text-vilu-paper">
              <div className="flex gap-3">
                <ShieldCheck className="mt-1 text-vilu-lime" size={22} />
                <p className="text-sm leading-6">Это demo-оформление: платежная интеграция не подключена, но сценарий заказа уже показывает будущую логику магазина.</p>
              </div>
            </div>
          </section>

          <aside className="h-fit rounded-[2rem] bg-vilu-ink p-7 text-vilu-paper shadow-2xl shadow-vilu-ink/20 ring-1 ring-vilu-lime/20">
            <h2 className="text-2xl font-black tracking-tight">Ваш заказ</h2>
            <div className="mt-6 flex gap-4 rounded-3xl bg-vilu-paper/10 p-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-vilu-paper/10"><Package /></div>
              <div><strong>{product?.name ?? 'Aurora Crystal'}</strong><p className="mt-1 text-sm text-vilu-paper/60">{product?.category === 'sunglasses' ? 'Солнцезащитные очки' : product?.category === 'contact_lenses' ? 'Контактные линзы' : 'Оправа + базовые линзы'}</p></div>
            </div>

            <div className="mt-6 space-y-4 border-t border-white/10 pt-6 text-sm">
              <div className="flex justify-between"><span className="text-vilu-paper/60">Товар</span><strong>{formatPrice(basePrice)}</strong></div>
              <div className="flex justify-between"><span className="text-vilu-paper/60">Доставка</span><strong>{servicePrice ? formatPrice(servicePrice) : '0 ₽'}</strong></div>
              <div className="flex justify-between border-t border-white/10 pt-5 text-2xl"><span>Итого</span><strong>{formatPrice(totalAmount)}</strong></div>
            </div>

            <button onClick={handlePayment} disabled={isProcessing} className="mt-8 flex w-full items-center justify-center gap-2 rounded-full bg-vilu-lime px-6 py-4 text-sm font-black uppercase tracking-[0.18em] text-vilu-ink transition hover:bg-vilu-card disabled:cursor-not-allowed disabled:opacity-60">
              {isProcessing ? 'Создаем заказ...' : <><CreditCard size={18} /> Подтвердить</>}
            </button>

            <div className="mt-6 flex gap-3 text-xs leading-5 text-vilu-paper/60"><CheckCircle2 className="shrink-0 text-vilu-lime" size={18} /> После подтверждения менеджер ViLu свяжется для уточнения рецепта и времени примерки.</div>
          </aside>
        </div>
      </div>
    </div>
  );
}
