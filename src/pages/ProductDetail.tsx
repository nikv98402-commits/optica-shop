import { ArrowLeft, Check, ShieldCheck, Truck } from 'lucide-react';
import { useState } from 'react';
import { VirtualTryOn } from '../components/VirtualTryOn';
import { formatPrice, getProductById } from '../data/products';
import { useLanguage } from '../contexts/LanguageContext';
import type { ServiceCheckoutFrame } from '../types/backend';

interface ProductDetailProps {
  productId: string;
  onNavigate: (page: string) => void;
  onStartCheckout: (frame: ServiceCheckoutFrame) => void;
}

export function ProductDetail({ productId, onNavigate, onStartCheckout }: ProductDetailProps) {
  const { language } = useLanguage();
  const product = getProductById(productId);
  const [purchaseType, setPurchaseType] = useState<'one-time' | 'subscription'>('subscription');

  if (!product) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center bg-vilu-paper px-6 text-center">
        <div>
          <h1 className="text-4xl font-black tracking-tight">Модель не найдена</h1>
          <button onClick={() => onNavigate('products')} className="mt-6 rounded-full bg-vilu-ink px-6 py-3 text-sm font-bold uppercase tracking-[0.18em] text-vilu-paper transition hover:bg-vilu-lime hover:text-vilu-ink">Вернуться в каталог</button>
        </div>
      </div>
    );
  }

  const canSubscribe = product.category === 'contact_lenses' && Boolean(product.subscription_price);
  const activePrice = canSubscribe && purchaseType === 'subscription' ? product.subscription_price ?? product.price : product.price;

  return (
    <div className="kinetic-surface min-h-screen px-6 py-12">
      <div className="mx-auto max-w-7xl">
        <button onClick={() => onNavigate('products')} className="mb-10 inline-flex items-center gap-2 text-sm font-black uppercase tracking-[0.18em] text-vilu-ink/55 transition hover:text-vilu-ink">
          <ArrowLeft size={18} /> Назад в каталог
        </button>

        <div className="grid gap-12 lg:grid-cols-[1fr_0.9fr] lg:items-start">
          <div className="rounded-[2rem] bg-vilu-card p-4 shadow-sm ring-1 ring-vilu-ink/10">
            <img src={product.image_url} alt={product.name} className="h-[560px] w-full rounded-[2rem] object-cover" />
            <VirtualTryOn product={product} />
          </div>

          <div className="rounded-[2rem] bg-vilu-ink p-7 text-vilu-paper shadow-2xl shadow-vilu-ink/20 ring-1 ring-vilu-lime/20 md:p-10">
            <p className="kinetic-label text-vilu-lime">{product.brand_name}</p>
            <h1 className="mt-4 text-5xl font-black tracking-tight md:text-6xl">{product.name}</h1>
            <p className="mt-6 text-lg font-semibold leading-8 text-vilu-paper/70">{product.description}</p>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              <div className="rounded-3xl bg-vilu-paper/10 p-4"><p className="text-xs uppercase tracking-[0.18em] text-vilu-lime">Наличие</p><strong>{product.stock} шт.</strong></div>
              <div className="rounded-3xl bg-vilu-paper/10 p-4"><p className="text-xs uppercase tracking-[0.18em] text-vilu-lime">Гарантия</p><strong>12 мес.</strong></div>
              <div className="rounded-3xl bg-vilu-paper/10 p-4"><p className="text-xs uppercase tracking-[0.18em] text-vilu-lime">Примерка</p><strong>{product.category === 'contact_lenses' ? 'Нет' : 'Да'}</strong></div>
            </div>

            {canSubscribe && (
              <div className="mt-8 space-y-3">
                <button onClick={() => setPurchaseType('subscription')} className={`flex w-full items-center justify-between rounded-3xl border-2 p-5 text-left transition ${purchaseType === 'subscription' ? 'border-vilu-lime bg-vilu-lime text-vilu-ink' : 'border-white/10 bg-vilu-paper/5 text-vilu-paper'}`}>
                  <span><strong className="block">Подписка Кабинет зрения ViLu</strong><span className="text-sm opacity-70">Ежемесячная доставка и напоминания</span></span>
                  <span className="text-xl font-black">{formatPrice(product.subscription_price ?? product.price)}</span>
                </button>
                <button onClick={() => setPurchaseType('one-time')} className={`flex w-full items-center justify-between rounded-3xl border-2 p-5 text-left transition ${purchaseType === 'one-time' ? 'border-vilu-lime bg-vilu-lime text-vilu-ink' : 'border-white/10 bg-vilu-paper/5 text-vilu-paper'}`}>
                  <span><strong className="block">Разовая покупка</strong><span className="text-sm opacity-70">Одна упаковка без автопродления</span></span>
                  <span className="text-xl font-black">{formatPrice(product.price)}</span>
                </button>
              </div>
            )}

            <div className="mt-10 rounded-[2rem] bg-vilu-card p-6 text-vilu-ink">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.22em] text-vilu-green">Итого</p>
                  <p className="mt-1 text-4xl font-black">{formatPrice(activePrice)}</p>
                </div>
                {product.category !== 'contact_lenses' ? (
                  <button
                    onClick={() => onStartCheckout({
                      frameId: product.id,
                      frameName: product.name,
                      frameBrand: product.brand_name,
                      frameCategory: product.category,
                      framePriceRub: product.price,
                      imageUrl: product.image_url,
                    })}
                    className="rounded-full bg-vilu-lime px-6 py-4 text-xs font-black uppercase tracking-[0.18em] text-vilu-ink transition hover:bg-vilu-ink hover:text-vilu-paper"
                  >
                    {language === 'ru' ? 'Подготовить визит' : 'Prepare a visit'}
                  </button>
                ) : (
                  <button onClick={() => onNavigate('products')} className="rounded-full bg-vilu-paper px-6 py-4 text-xs font-black uppercase tracking-[0.18em] text-vilu-ink">
                    {language === 'ru' ? 'Вернуться в каталог' : 'Back to catalog'}
                  </button>
                )}
              </div>
            </div>

            <div className="mt-8 grid gap-4 text-sm font-semibold leading-6 text-vilu-paper/70 sm:grid-cols-2">
              <div className="flex gap-3"><Truck className="mt-1 text-vilu-lime" size={20} /> Бесплатная доставка в салон или курьером от 7 000 ₽.</div>
              <div className="flex gap-3"><ShieldCheck className="mt-1 text-vilu-lime" size={20} /> Линзы и покрытия подбираются по вашему рецепту.</div>
              <div className="flex gap-3"><Check className="mt-1 text-vilu-lime" size={20} /> Можно отложить модель и примерить в салоне.</div>
              <div className="flex gap-3"><Check className="mt-1 text-vilu-lime" size={20} /> Возврат оправы в течение 14 дней.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
