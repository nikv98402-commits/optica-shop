import { ArrowLeft, Check, ShieldCheck, Sparkles, Truck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { VirtualTryOn } from '../components/VirtualTryOn';
import { formatPrice, getOfferFinderBrandName, getProductById } from '../data/products';
import { useLanguage } from '../contexts/LanguageContext';
import type { ServiceCheckoutFrame } from '../types/backend';
import { AtomicHeading } from '../components/home/AtomicHeading';
import { OpticalOrbits } from '../components/home/OpticalOrbits';
import {
  formatOfferPrice,
  searchProductOffers,
  type ProductOfferSearchResult,
} from '../lib/offerFinder/contracts';

interface ProductDetailProps {
  productId: string;
  onNavigate: (page: string) => void;
  onStartCheckout: (frame: ServiceCheckoutFrame) => void;
}

export function ProductDetail({ productId, onNavigate, onStartCheckout }: ProductDetailProps) {
  const { language } = useLanguage();
  const product = getProductById(productId);
  const [purchaseType, setPurchaseType] = useState<'one-time' | 'subscription'>('subscription');
  const [offerState, setOfferState] = useState<
    | { status: 'loading' }
    | { status: 'ready'; result: ProductOfferSearchResult }
    | { status: 'error' }
  >({ status: 'loading' });

  useEffect(() => {
    if (!product) return;
    const controller = new AbortController();
    setOfferState({ status: 'loading' });
    searchProductOffers({
      market: 'RU',
      product: product.name,
      brand: getOfferFinderBrandName(product),
      signal: controller.signal,
    }).then(
      (result) => setOfferState({ status: 'ready', result }),
      (error: unknown) => {
        if (!(error instanceof DOMException && error.name === 'AbortError')) {
          setOfferState({ status: 'error' });
        }
      },
    );
    return () => controller.abort();
  }, [product]);

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
  const titleWords = product.name.trim().split(/\s+/);
  const titleLines = titleWords.length > 1
    ? [titleWords.slice(0, -1).join(' '), titleWords[titleWords.length - 1]]
    : [product.name];

  return (
    <div className="product-orbits-page">
      <div className="product-orbits-page__orbits"><OpticalOrbits /></div>
      <div className="product-orbits-shell">
        <button onClick={() => onNavigate('products')} className="product-orbits-back">
          <ArrowLeft size={18} /> Назад в каталог
        </button>

        <div className="product-orbits-layout">
          <div className="product-orbits-gallery">
            <img src={product.image_url} alt={product.name} className="product-orbits-gallery__image" />
          </div>

          <div className="product-orbits-info">
            <p className="kinetic-label text-vilu-lime">{product.brand_name}</p>
            <AtomicHeading lines={titleLines} className="product-orbits-heading" />
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
              <div className="product-orbits-purchase">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.22em] text-vilu-green">Итого</p>
                  <p className="mt-1 text-4xl font-black">{formatPrice(activePrice)}</p>
                </div>
                {product.category !== 'contact_lenses' ? (
                  <div className="product-orbits-actions">
                    <button
                      type="button"
                      onClick={() => onNavigate('tryon')}
                      className="product-orbits-action product-orbits-action--secondary"
                    >
                      {language === 'ru' ? 'Онлайн-примерка' : 'Online try-on'}
                      <Sparkles size={16} />
                    </button>
                    <button
                      onClick={() => onStartCheckout({
                      frameId: product.id,
                      frameName: product.name,
                      frameBrand: product.brand_name,
                      frameCategory: product.category,
                      framePriceRub: product.price,
                      imageUrl: product.image_url,
                    })}
                      className="product-orbits-action product-orbits-action--primary"
                    >
                      {language === 'ru' ? 'Подготовить визит' : 'Prepare a visit'}
                    </button>
                  </div>
                ) : (
                  <button onClick={() => onNavigate('products')} className="rounded-full bg-vilu-paper px-6 py-4 text-xs font-black uppercase tracking-[0.18em] text-vilu-ink">
                    {language === 'ru' ? 'Вернуться в каталог' : 'Back to catalog'}
                  </button>
                )}
              </div>
            </div>

            <section
              aria-labelledby="offer-finder-product-heading"
              className="mt-6 rounded-[1.75rem] border border-vilu-paper/20 bg-vilu-paper/5 p-5 text-vilu-paper"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-vilu-lime">
                    Offer Finder · Россия
                  </p>
                  <h2 id="offer-finder-product-heading" className="mt-2 text-2xl font-extrabold">
                    Подтверждённые предложения
                  </h2>
                </div>
                {offerState.status === 'ready' && offerState.result.minimumConfirmedPrice && (
                  <span className="rounded-full bg-vilu-lime px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-vilu-ink">
                    Минимальная цена
                  </span>
                )}
              </div>

              {offerState.status === 'loading' && (
                <div role="status" className="mt-5 animate-pulse rounded-2xl border border-vilu-paper/15 p-4 text-vilu-paper/65">
                  Проверяем актуальные цены и наличие…
                </div>
              )}
              {offerState.status === 'error' && (
                <div role="alert" className="mt-5 rounded-2xl border border-vilu-paper/15 p-4">
                  <p className="font-bold">Не удалось проверить предложения</p>
                  <p className="mt-1 text-sm text-vilu-paper/65">
                    Цена товара выше остаётся доступна. Попробуйте обновить страницу позже.
                  </p>
                </div>
              )}
              {offerState.status === 'ready' && offerState.result.offers.length === 0 && (
                <div className="mt-5 rounded-2xl border border-vilu-paper/15 p-4">
                  <p className="font-bold">Свежих предложений пока нет</p>
                  <p className="mt-1 text-sm text-vilu-paper/65">
                    Мы показываем только цены, подтверждённые не более 72 часов назад.
                  </p>
                </div>
              )}
              {offerState.status === 'ready' && offerState.result.offers.length > 0 && (
                <div className="mt-5 grid gap-3">
                  {offerState.result.offers.slice(0, 3).map((offer) => {
                    const actionHref = offer.nextAction?.kind === 'phone'
                      ? `tel:${offer.nextAction.value}`
                      : offer.nextAction?.kind === 'route'
                        ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(offer.nextAction.value)}`
                        : offer.nextAction?.value;
                    const actionLabel = offer.nextAction?.kind === 'phone'
                      ? 'Позвонить'
                      : offer.nextAction?.kind === 'route'
                        ? 'Маршрут'
                        : 'На сайт';
                    return (
                      <article key={offer.offerId} className="rounded-2xl border border-vilu-paper/15 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="font-extrabold">{offer.merchantName}</p>
                            <p className="mt-1 text-sm text-vilu-paper/60">
                              Источник: {offer.source} · проверено{' '}
                              {new Intl.DateTimeFormat(language === 'ru' ? 'ru-RU' : 'en-GB', {
                                dateStyle: 'medium',
                                timeStyle: 'short',
                              }).format(new Date(offer.lastVerifiedAt))}
                            </p>
                          </div>
                          <strong className="text-xl">
                            {formatOfferPrice(offer.amountMinor, offer.currency, language === 'ru' ? 'ru-RU' : 'en-GB')}
                          </strong>
                        </div>
                        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                          <span className="text-sm text-vilu-paper/70">
                            {offer.availability === 'in_stock' ? 'В наличии' : 'Под заказ'}
                            {offer.storeName ? ` · ${offer.storeName}` : ''}
                          </span>
                          {actionHref && (
                            <a
                              href={actionHref}
                              target={offer.nextAction?.kind === 'phone' ? undefined : '_blank'}
                              rel={offer.nextAction?.kind === 'phone' ? undefined : 'noreferrer'}
                              className="rounded-full border border-vilu-lime px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-vilu-lime transition hover:bg-vilu-lime hover:text-vilu-ink"
                            >
                              {actionLabel}
                            </a>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
              <p className="mt-4 text-xs leading-5 text-vilu-paper/50">
                Цена и наличие не гарантируются: подтвердите их на сайте, по телефону или в салоне перед визитом.
              </p>
            </section>

            <div className="mt-8 grid gap-4 text-sm font-semibold leading-6 text-vilu-paper/70 sm:grid-cols-2">
              <div className="flex gap-3"><Truck className="mt-1 text-vilu-lime" size={20} /> Бесплатная доставка в салон или курьером от 7 000 ₽.</div>
              <div className="flex gap-3"><ShieldCheck className="mt-1 text-vilu-lime" size={20} /> Линзы и покрытия подбираются по вашему рецепту.</div>
              <div className="flex gap-3"><Check className="mt-1 text-vilu-lime" size={20} /> Можно отложить модель и примерить в салоне.</div>
              <div className="flex gap-3"><Check className="mt-1 text-vilu-lime" size={20} /> Возврат оправы в течение 14 дней.</div>
            </div>
          </div>

          <div className="product-orbits-tryon">
            <VirtualTryOn product={product} />
          </div>
        </div>
      </div>
    </div>
  );
}
import '../styles/routeStyles';
