import { CheckCircle2, Eye, MapPinned, Route, SlidersHorizontal, Sparkles, Truck } from 'lucide-react';
import { useMemo, useState } from 'react';
import { demoProducts, formatPrice } from '../data/products';
import { Product } from '../types';

interface ProductsProps {
  onNavigate: (page: string, productId?: string) => void;
  fittingCart: string[];
  onToggleFitting: (id: string) => void;
}

const categories = [
  { id: 'all', name: 'Все' },
  { id: 'eyeglasses', name: 'Оправы' },
  { id: 'sunglasses', name: 'Солнцезащитные' },
  { id: 'contact_lenses', name: 'Линзы' },
];

export function Products({ onNavigate, fittingCart, onToggleFitting }: ProductsProps) {
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [brandFilter, setBrandFilter] = useState<string>('all');
  const [onlyFitting, setOnlyFitting] = useState(false);

  const filteredProducts = useMemo(() => {
    return demoProducts.filter((product) => {
      const categoryMatches = categoryFilter === 'all' || product.category === categoryFilter;
      const brandMatches = brandFilter === 'all' || product.brand_type === brandFilter;
      const fittingMatches = !onlyFitting || product.category !== 'contact_lenses';
      return categoryMatches && brandMatches && fittingMatches;
    });
  }, [brandFilter, categoryFilter, onlyFitting]);

  const productLabel = (product: Product) => {
    if (product.category === 'contact_lenses') return 'Контактные линзы';
    if (product.category === 'sunglasses') return 'Солнцезащитные очки';
    return 'Оправа';
  };

  const flowSteps = [
    { label: 'Фото', value: 'в браузере', icon: Eye },
    { label: 'Score', value: 'предварительно', icon: Sparkles },
    { label: 'Салон', value: 'после подбора', icon: MapPinned },
  ];

  return (
    <div className="min-h-screen bg-vilu-paper">
      <section className="border-b border-vilu-line bg-vilu-cream px-4 py-12 sm:px-6 sm:py-14">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(340px,420px)] lg:items-end">
          <div className="min-w-0">
            <p className="text-sm font-bold uppercase tracking-[0.24em] text-vilu-clay">Каталог + подбор</p>
            <h1 className="mt-4 max-w-4xl text-[2.5rem] font-black leading-[1.08] text-vilu-ink sm:text-5xl lg:text-6xl">Выберите оправы, проверьте посадку и идите в салон с коротким списком.</h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">Каталог работает как лаборатория подбора: сохраните 2-3 модели, получите ориентир по стилю и откройте ближайшие оптики для финальной примерки.</p>
          </div>

          <div className="rounded-[2rem] bg-white p-5 shadow-xl shadow-slate-900/10 ring-1 ring-vilu-line">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">В примерке</p>
                <p className="mt-1 text-4xl font-black text-vilu-ink">{fittingCart.length} / 5</p>
              </div>
              <div className="rounded-full bg-vilu-mist px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-vilu-green">Face-fit ready</div>
            </div>
            <div className="mt-5 grid gap-2">
              {flowSteps.map(({ label, value, icon: Icon }) => (
                <div key={label} className="flex min-h-[56px] items-center justify-between gap-3 rounded-2xl bg-vilu-paper px-4 py-3">
                  <span className="flex items-center gap-2 text-sm font-black text-vilu-ink"><Icon className="text-vilu-green" size={17} /> {label}</span>
                  <span className="text-xs font-bold text-slate-500">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-10 sm:px-6 sm:py-12 lg:grid-cols-[280px_1fr]">
        <aside className="lg:sticky lg:top-28 lg:h-fit">
          <div className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-vilu-line">
            <div className="mb-6 flex items-center gap-2 text-sm font-black uppercase tracking-[0.18em] text-vilu-ink"><SlidersHorizontal size={18} /> Лаборатория</div>

            <div className="space-y-7">
              <div>
                <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Категория</p>
                <div className="flex flex-wrap gap-2 lg:flex-col">
                  {categories.map((category) => (
                    <button
                      key={category.id}
                      onClick={() => setCategoryFilter(category.id)}
                      className={`rounded-full px-4 py-2 text-left text-sm font-bold transition focus:outline-none focus-visible:ring-4 focus-visible:ring-vilu-green/20 ${categoryFilter === category.id ? 'bg-vilu-ink text-white' : 'bg-vilu-paper text-slate-600 hover:bg-vilu-mist'}`}
                    >
                      {category.name}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Бренд</p>
                <div className="grid gap-2">
                  {[
                    { id: 'all', name: 'Все бренды' },
                    { id: 'our_brand', name: 'ViLu' },
                    { id: 'partner_brand', name: 'Партнерские' },
                  ].map((brand) => (
                    <button key={brand.id} onClick={() => setBrandFilter(brand.id)} className={`rounded-2xl px-4 py-3 text-left text-sm font-bold transition focus:outline-none focus-visible:ring-4 focus-visible:ring-vilu-green/20 ${brandFilter === brand.id ? 'bg-vilu-green text-white' : 'bg-vilu-paper text-slate-600 hover:bg-vilu-mist'}`}>{brand.name}</button>
                  ))}
                </div>
              </div>

              <button
                onClick={() => setOnlyFitting((value) => !value)}
                className={`flex w-full items-center justify-between rounded-3xl p-4 text-left transition focus:outline-none focus-visible:ring-4 focus-visible:ring-vilu-amber/40 ${onlyFitting ? 'bg-vilu-amber text-vilu-ink' : 'bg-vilu-ink text-white'}`}
              >
                <span><strong className="block text-sm">Только для примерки</strong><span className="text-xs opacity-70">Без контактных линз</span></span>
                {onlyFitting ? <CheckCircle2 /> : <Truck />}
              </button>
            </div>
          </div>
        </aside>

        <section>
          <div className="mb-8 flex items-center justify-between border-b border-vilu-line pb-4">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-400">Найдено: {filteredProducts.length}</p>
            <button onClick={() => { setCategoryFilter('all'); setBrandFilter('all'); setOnlyFitting(false); }} className="text-sm font-bold text-vilu-green focus:outline-none focus-visible:ring-4 focus-visible:ring-vilu-green/20">Сбросить</button>
          </div>

          <div className="grid gap-x-7 gap-y-10 sm:grid-cols-2 xl:grid-cols-3">
            {filteredProducts.map((product) => {
              const inFitting = fittingCart.includes(product.id);
              const canFit = product.category !== 'contact_lenses';

              return (
                <article key={product.id} className="group flex min-h-[520px] flex-col rounded-[2rem] bg-white p-4 shadow-sm ring-1 ring-vilu-line transition hover:-translate-y-1 hover:shadow-xl">
                  <button onClick={() => onNavigate('product', product.id)} className="block w-full flex-1 text-left focus:outline-none focus-visible:ring-4 focus-visible:ring-vilu-green/20">
                    <div className="relative overflow-hidden rounded-[1.45rem] bg-stone-100">
                      <img src={product.image_url} alt={product.name} className="h-72 w-full object-cover transition duration-500 group-hover:scale-105" loading="lazy" />
                      <span className="absolute left-4 top-4 rounded-full bg-white/86 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] backdrop-blur">{productLabel(product)}</span>
                      {canFit && <span className="absolute bottom-4 right-4 inline-flex items-center gap-1 rounded-full bg-vilu-ink px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-white"><Route size={13} /> до салона</span>}
                    </div>
                    <div className="px-2 pt-5">
                      <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-400">{product.brand_name}</p>
                      <div className="mt-2 flex items-start justify-between gap-4">
                        <h3 className="min-h-[64px] text-2xl font-black tracking-tight text-vilu-ink">{product.name}</h3>
                        <p className="whitespace-nowrap text-lg font-black">{formatPrice(product.price)}</p>
                      </div>
                      <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-600">{product.description}</p>
                      {canFit && (
                        <div className="mt-4 grid grid-cols-3 gap-2 text-center text-[11px] font-black uppercase tracking-[0.1em] text-slate-500">
                          <span className="rounded-xl bg-vilu-paper py-2">Фото</span>
                          <span className="rounded-xl bg-vilu-mist py-2 text-vilu-green">Score</span>
                          <span className="rounded-xl bg-vilu-paper py-2">Салон</span>
                        </div>
                      )}
                    </div>
                  </button>

                  <div className="mt-5 grid gap-2 sm:grid-cols-2">
                    <button onClick={() => onNavigate('product', product.id)} className="rounded-full border border-vilu-line px-4 py-3 text-xs font-black uppercase tracking-[0.16em] text-vilu-ink transition hover:bg-vilu-ink hover:text-white focus:outline-none focus-visible:ring-4 focus-visible:ring-vilu-green/20">Подробнее</button>
                    {canFit ? (
                      <button onClick={() => onToggleFitting(product.id)} className={`rounded-full px-4 py-3 text-xs font-black uppercase tracking-[0.16em] transition focus:outline-none focus-visible:ring-4 focus-visible:ring-vilu-amber/40 ${inFitting ? 'bg-vilu-green text-white' : 'bg-vilu-amber text-vilu-ink hover:bg-vilu-amber/90'}`}>{inFitting ? 'В примерке' : 'Примерить'}</button>
                    ) : (
                      <button onClick={() => onNavigate('product', product.id)} className="rounded-full bg-stone-100 px-4 py-3 text-xs font-black uppercase tracking-[0.16em] text-slate-600 focus:outline-none focus-visible:ring-4 focus-visible:ring-vilu-green/20">Подписка</button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
