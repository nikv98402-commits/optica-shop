import { ArrowRight, CalendarDays, CheckCircle2, MapPin, Sparkles } from 'lucide-react';
import { demoProducts, formatPrice } from '../data/products';

interface HomeProps {
  onNavigate: (page: string, productId?: string) => void;
}

const featuredFrames = demoProducts.filter((product) => product.featured && product.category !== 'contact_lenses').slice(0, 3);
const featuredLens = demoProducts.find((product) => product.category === 'contact_lenses');

export function Home({ onNavigate }: HomeProps) {
  return (
    <div className="overflow-hidden bg-[#f7f1e8]">
      <section className="relative min-h-[calc(100vh-5rem)] px-6 py-16 md:py-24">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(245,178,95,0.36),transparent_32%),radial-gradient(circle_at_82%_28%,rgba(90,123,121,0.22),transparent_30%),linear-gradient(135deg,#f7f1e8_0%,#fffaf2_58%,#e9d8bf_100%)]" />
        <div className="absolute left-8 top-24 hidden h-72 w-72 rounded-full border border-slate-900/10 md:block" />
        <div className="absolute bottom-16 right-10 hidden h-44 w-44 rounded-full bg-slate-900/5 md:block" />

        <div className="relative mx-auto grid max-w-7xl items-center gap-14 md:grid-cols-[1.05fr_0.95fr]">
          <div>
            <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-slate-900/10 bg-white/60 px-4 py-2 text-xs font-bold uppercase tracking-[0.24em] text-slate-700 backdrop-blur">
              <Sparkles size={14} /> Онлайн-подбор и оптики рядом
            </div>
            <h1 className="max-w-4xl text-5xl font-black leading-[0.95] tracking-[-0.06em] text-slate-950 md:text-8xl">
              Подберите очки онлайн и найдите, где примерить похожие рядом.
            </h1>
            <p className="mt-8 max-w-2xl text-lg leading-8 text-slate-700 md:text-xl">
              Загрузите фото, выберите 2-3 подходящих стиля и получите список ближайших оптик для финальной примерки.
            </p>
            <div className="mt-10 flex flex-col gap-4 sm:flex-row">
              <button
                onClick={() => onNavigate('tryon')}
                className="group rounded-full bg-slate-950 px-8 py-4 text-sm font-bold uppercase tracking-[0.2em] text-white transition hover:-translate-y-0.5 hover:bg-[#315c56]"
              >
                Начать подбор <ArrowRight className="ml-2 inline transition group-hover:translate-x-1" size={18} />
              </button>
              <button
                onClick={() => onNavigate('products')}
                className="rounded-full border border-slate-950/20 bg-white/60 px-8 py-4 text-sm font-bold uppercase tracking-[0.2em] text-slate-950 backdrop-blur transition hover:bg-white"
              >
                Смотреть каталог
              </button>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -left-6 top-8 h-full w-full rotate-[-5deg] rounded-[3rem] bg-[#315c56]" />
            <div className="relative overflow-hidden rounded-[3rem] bg-white p-4 shadow-2xl shadow-slate-900/20">
              <img
                src="https://images.unsplash.com/photo-1509695507497-903c140c43b0?auto=format&fit=crop&w=1100&q=80"
                alt="Премиальная оправа VisionLux"
                className="h-[520px] w-full rounded-[2.4rem] object-cover"
              />
              <div className="absolute bottom-8 left-8 right-8 rounded-[2rem] bg-white/86 p-5 backdrop-blur-xl">
                <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#315c56]">Примерка в салоне</p>
                <p className="mt-2 text-2xl font-black tracking-tight">До 5 оправ бесплатно</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-slate-950 px-6 py-8 text-white">
        <div className="mx-auto grid max-w-7xl gap-4 text-sm font-semibold uppercase tracking-[0.18em] md:grid-cols-3">
          <div className="flex items-center gap-3"><CheckCircle2 className="text-[#f5b25f]" size={20} /> Проверка зрения в салонах</div>
          <div className="flex items-center gap-3"><CheckCircle2 className="text-[#f5b25f]" size={20} /> Подбор линз по рецепту</div>
          <div className="flex items-center gap-3"><CheckCircle2 className="text-[#f5b25f]" size={20} /> Доставка и самовывоз</div>
        </div>
      </section>

      <section className="px-6 py-24 md:py-32">
        <div className="mx-auto max-w-7xl">
          <div className="mb-14 flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.24em] text-[#9a6933]">Витрина</p>
              <h2 className="mt-3 max-w-2xl text-4xl font-black tracking-[-0.05em] md:text-6xl">Хиты, которые хочется примерить первыми</h2>
            </div>
            <button onClick={() => onNavigate('products')} className="inline-flex items-center gap-2 font-bold text-[#315c56]">
              Все модели <ArrowRight size={18} />
            </button>
          </div>

          <div className="grid gap-7 md:grid-cols-3">
            {featuredFrames.map((product) => (
              <article key={product.id} className="group rounded-[2rem] bg-white p-4 shadow-sm ring-1 ring-slate-900/5 transition hover:-translate-y-1 hover:shadow-xl">
                <button onClick={() => onNavigate('product', product.id)} className="block w-full text-left">
                  <div className="overflow-hidden rounded-[1.5rem] bg-stone-100">
                    <img src={product.image_url} alt={product.name} className="h-80 w-full object-cover transition duration-500 group-hover:scale-105" />
                  </div>
                  <div className="p-3">
                    <p className="mt-4 text-xs font-bold uppercase tracking-[0.22em] text-slate-400">{product.brand_name}</p>
                    <h3 className="mt-2 text-2xl font-black tracking-tight">{product.name}</h3>
                    <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-600">{product.description}</p>
                    <p className="mt-5 text-xl font-black">{formatPrice(product.price)}</p>
                  </div>
                </button>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="care" className="bg-[#315c56] px-6 py-24 text-white md:py-32">
        <div className="mx-auto grid max-w-7xl gap-12 md:grid-cols-[0.9fr_1.1fr] md:items-center">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.24em] text-[#f5b25f]">Vision Hub</p>
            <h2 className="mt-4 text-4xl font-black tracking-[-0.05em] md:text-6xl">Линзы по подписке и личный кабинет зрения</h2>
            <p className="mt-6 text-lg leading-8 text-white/75">
              Подписка помогает не вспоминать о покупке линз в последний момент: мы привозим запас вовремя, а в кабинете можно хранить рецепт и дату следующего осмотра.
            </p>
            <div className="mt-10 grid gap-4 sm:grid-cols-2">
              <div className="rounded-3xl bg-white/10 p-6"><CalendarDays className="mb-4 text-[#f5b25f]" /><strong>Напоминания</strong><p className="mt-2 text-sm text-white/70">Осмотр, замена линз, повтор заказа.</p></div>
              <div className="rounded-3xl bg-white/10 p-6"><MapPin className="mb-4 text-[#f5b25f]" /><strong>Салоны рядом</strong><p className="mt-2 text-sm text-white/70">Выберите удобную точку для примерки.</p></div>
            </div>
          </div>

          {featuredLens && (
            <div className="rounded-[2.5rem] bg-white p-5 text-slate-950 shadow-2xl">
              <img src={featuredLens.image_url} alt={featuredLens.name} className="h-80 w-full rounded-[2rem] object-cover" />
              <div className="p-5">
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#315c56]">Подписка месяца</p>
                <h3 className="mt-2 text-3xl font-black tracking-tight">{featuredLens.name}</h3>
                <p className="mt-3 text-slate-600">{featuredLens.description}</p>
                <div className="mt-6 flex items-end justify-between rounded-3xl bg-stone-100 p-5">
                  <div><p className="text-xs uppercase tracking-[0.2em] text-slate-500">от</p><p className="text-3xl font-black">{formatPrice(featuredLens.subscription_price ?? featuredLens.price)}</p></div>
                  <button onClick={() => onNavigate('product', featuredLens.id)} className="rounded-full bg-slate-950 px-6 py-3 text-xs font-bold uppercase tracking-[0.18em] text-white">Выбрать</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
