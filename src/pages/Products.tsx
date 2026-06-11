import { CheckCircle2, SlidersHorizontal, Truck } from 'lucide-react';
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

  return (
    <div className="min-h-screen bg-[#fffaf2]">
      <section className="border-b border-slate-900/10 bg-[#f7f1e8] px-6 py-16">
        <div className="mx-auto max-w-7xl">
          <p className="text-sm font-bold uppercase tracking-[0.24em] text-[#9a6933]">Каталог</p>
          <div className="mt-4 flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <h1 className="text-5xl font-black tracking-[-0.06em] text-slate-950 md:text-7xl">Очки, линзы, примерка.</h1>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">Выбирайте онлайн, откладывайте модели на примерку и забирайте в ближайшем салоне ViLu.</p>
            </div>
            <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-900/5">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">В примерке</p>
              <p className="mt-1 text-3xl font-black">{fittingCart.length} / 5</p>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-12 lg:grid-cols-[280px_1fr]">
        <aside className="lg:sticky lg:top-28 lg:h-fit">
          <div className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-900/5">
            <div className="mb-6 flex items-center gap-2 text-sm font-black uppercase tracking-[0.18em]"><SlidersHorizontal size={18} /> Фильтры</div>

            <div className="space-y-7">
              <div>
                <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Категория</p>
                <div className="flex flex-wrap gap-2 lg:flex-col">
                  {categories.map((category) => (
                    <button
                      key={category.id}
                      onClick={() => setCategoryFilter(category.id)}
                      className={`rounded-full px-4 py-2 text-left text-sm font-bold transition ${categoryFilter === category.id ? 'bg-slate-950 text-white' : 'bg-stone-100 text-slate-600 hover:bg-stone-200'}`}
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
                    <button key={brand.id} onClick={() => setBrandFilter(brand.id)} className={`rounded-2xl px-4 py-3 text-left text-sm font-bold transition ${brandFilter === brand.id ? 'bg-[#315c56] text-white' : 'bg-stone-100 text-slate-600 hover:bg-stone-200'}`}>{brand.name}</button>
                  ))}
                </div>
              </div>

              <button
                onClick={() => setOnlyFitting((value) => !value)}
                className={`flex w-full items-center justify-between rounded-3xl p-4 text-left transition ${onlyFitting ? 'bg-[#f5b25f] text-slate-950' : 'bg-slate-950 text-white'}`}
              >
                <span><strong className="block text-sm">Только для примерки</strong><span className="text-xs opacity-70">Без контактных линз</span></span>
                {onlyFitting ? <CheckCircle2 /> : <Truck />}
              </button>
            </div>
          </div>
        </aside>

        <section>
          <div className="mb-8 flex items-center justify-between border-b border-slate-900/10 pb-4">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-400">Найдено: {filteredProducts.length}</p>
            <button onClick={() => { setCategoryFilter('all'); setBrandFilter('all'); setOnlyFitting(false); }} className="text-sm font-bold text-[#315c56]">Сбросить</button>
          </div>

          <div className="grid gap-x-7 gap-y-10 sm:grid-cols-2 xl:grid-cols-3">
            {filteredProducts.map((product) => {
              const inFitting = fittingCart.includes(product.id);
              const canFit = product.category !== 'contact_lenses';

              return (
                <article key={product.id} className="group rounded-[2rem] bg-white p-4 shadow-sm ring-1 ring-slate-900/5 transition hover:-translate-y-1 hover:shadow-xl">
                  <button onClick={() => onNavigate('product', product.id)} className="block w-full text-left">
                    <div className="relative overflow-hidden rounded-[1.45rem] bg-stone-100">
                      <img src={product.image_url} alt={product.name} className="h-72 w-full object-cover transition duration-500 group-hover:scale-105" loading="lazy" />
                      <span className="absolute left-4 top-4 rounded-full bg-white/86 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] backdrop-blur">{productLabel(product)}</span>
                    </div>
                    <div className="px-2 pt-5">
                      <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-400">{product.brand_name}</p>
                      <div className="mt-2 flex items-start justify-between gap-4">
                        <h3 className="text-2xl font-black tracking-tight">{product.name}</h3>
                        <p className="whitespace-nowrap text-lg font-black">{formatPrice(product.price)}</p>
                      </div>
                      <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-600">{product.description}</p>
                    </div>
                  </button>

                  <div className="mt-5 grid gap-2 sm:grid-cols-2">
                    <button onClick={() => onNavigate('product', product.id)} className="rounded-full border border-slate-900/10 px-4 py-3 text-xs font-black uppercase tracking-[0.16em] transition hover:bg-slate-950 hover:text-white">Подробнее</button>
                    {canFit ? (
                      <button onClick={() => onToggleFitting(product.id)} className={`rounded-full px-4 py-3 text-xs font-black uppercase tracking-[0.16em] transition ${inFitting ? 'bg-[#315c56] text-white' : 'bg-[#f5b25f] text-slate-950 hover:bg-[#e5a34f]'}`}>{inFitting ? 'В примерке' : 'Примерить'}</button>
                    ) : (
                      <button onClick={() => onNavigate('product', product.id)} className="rounded-full bg-stone-100 px-4 py-3 text-xs font-black uppercase tracking-[0.16em] text-slate-600">Подписка</button>
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
