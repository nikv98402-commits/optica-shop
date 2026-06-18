import { ArrowLeft, Check, ShieldCheck, Truck } from 'lucide-react';
import { useState } from 'react';
import { VirtualTryOn } from '../components/VirtualTryOn';
import { formatPrice, getProductById } from '../data/products';

interface ProductDetailProps {
  productId: string;
  onNavigate: (page: string) => void;
}

export function ProductDetail({ productId, onNavigate }: ProductDetailProps) {
  const product = getProductById(productId);
  const [purchaseType, setPurchaseType] = useState<'one-time' | 'subscription'>('subscription');

  if (!product) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center bg-[#fffaf2] px-6 text-center">
        <div>
          <h1 className="text-4xl font-black tracking-tight">Модель не найдена</h1>
          <button onClick={() => onNavigate('products')} className="mt-6 rounded-full bg-slate-950 px-6 py-3 text-sm font-bold uppercase tracking-[0.18em] text-white">Вернуться в каталог</button>
        </div>
      </div>
    );
  }

  const canSubscribe = product.category === 'contact_lenses' && Boolean(product.subscription_price);
  const activePrice = canSubscribe && purchaseType === 'subscription' ? product.subscription_price ?? product.price : product.price;

  return (
    <div className="min-h-screen bg-[#fffaf2] px-6 py-12">
      <div className="mx-auto max-w-7xl">
        <button onClick={() => onNavigate('products')} className="mb-10 inline-flex items-center gap-2 text-sm font-bold uppercase tracking-[0.18em] text-slate-500 transition hover:text-slate-950">
          <ArrowLeft size={18} /> Назад в каталог
        </button>

        <div className="grid gap-12 lg:grid-cols-[1fr_0.9fr] lg:items-start">
          <div className="rounded-[2.5rem] bg-white p-4 shadow-sm ring-1 ring-slate-900/5">
            <img src={product.image_url} alt={product.name} className="h-[560px] w-full rounded-[2rem] object-cover" />
            <VirtualTryOn product={product} />
          </div>

          <div className="rounded-[2.5rem] bg-white p-7 shadow-sm ring-1 ring-slate-900/5 md:p-10">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#9a6933]">{product.brand_name}</p>
            <h1 className="mt-4 text-5xl font-black text-slate-950 md:text-6xl">{product.name}</h1>
            <p className="mt-6 text-lg leading-8 text-slate-600">{product.description}</p>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              <div className="rounded-3xl bg-stone-100 p-4"><p className="text-xs uppercase tracking-[0.18em] text-slate-400">Наличие</p><strong>{product.stock} шт.</strong></div>
              <div className="rounded-3xl bg-stone-100 p-4"><p className="text-xs uppercase tracking-[0.18em] text-slate-400">Гарантия</p><strong>12 мес.</strong></div>
              <div className="rounded-3xl bg-stone-100 p-4"><p className="text-xs uppercase tracking-[0.18em] text-slate-400">Примерка</p><strong>{product.category === 'contact_lenses' ? 'Нет' : 'Да'}</strong></div>
            </div>

            {canSubscribe && (
              <div className="mt-8 space-y-3">
                <button onClick={() => setPurchaseType('subscription')} className={`flex w-full items-center justify-between rounded-3xl border-2 p-5 text-left transition ${purchaseType === 'subscription' ? 'border-[#315c56] bg-[#eef5f1]' : 'border-slate-900/10'}`}>
                  <span><strong className="block">Подписка Vision Hub</strong><span className="text-sm text-slate-500">Ежемесячная доставка и напоминания</span></span>
                  <span className="text-xl font-black">{formatPrice(product.subscription_price ?? product.price)}</span>
                </button>
                <button onClick={() => setPurchaseType('one-time')} className={`flex w-full items-center justify-between rounded-3xl border-2 p-5 text-left transition ${purchaseType === 'one-time' ? 'border-[#315c56] bg-[#eef5f1]' : 'border-slate-900/10'}`}>
                  <span><strong className="block">Разовая покупка</strong><span className="text-sm text-slate-500">Одна упаковка без автопродления</span></span>
                  <span className="text-xl font-black">{formatPrice(product.price)}</span>
                </button>
              </div>
            )}

            <div className="mt-10 rounded-[2rem] bg-slate-950 p-6 text-white">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.22em] text-white/50">Итого</p>
                  <p className="mt-1 text-4xl font-black">{formatPrice(activePrice)}</p>
                </div>
                <button onClick={() => onNavigate('checkout')} className="rounded-full bg-[#f5b25f] px-6 py-4 text-xs font-black uppercase tracking-[0.18em] text-slate-950 transition hover:bg-white">Оформить</button>
              </div>
            </div>

            <div className="mt-8 grid gap-4 text-sm leading-6 text-slate-600 sm:grid-cols-2">
              <div className="flex gap-3"><Truck className="mt-1 text-[#315c56]" size={20} /> Бесплатная доставка в салон или курьером от 7 000 ₽.</div>
              <div className="flex gap-3"><ShieldCheck className="mt-1 text-[#315c56]" size={20} /> Линзы и покрытия подбираются по вашему рецепту.</div>
              <div className="flex gap-3"><Check className="mt-1 text-[#315c56]" size={20} /> Можно отложить модель и примерить в салоне.</div>
              <div className="flex gap-3"><Check className="mt-1 text-[#315c56]" size={20} /> Возврат оправы в течение 14 дней.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
