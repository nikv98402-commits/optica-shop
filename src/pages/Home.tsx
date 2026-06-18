import { ArrowRight, CalendarDays, CheckCircle2, MapPin, Sparkles } from 'lucide-react';
import { demoProducts, formatPrice } from '../data/products';
import { AnalyticsEvent, trackEvent } from '../lib/analyticsEvents';

interface HomeProps {
  onNavigate: (page: string, productId?: string) => void;
}

const featuredFrames = demoProducts.filter((product) => product.featured && product.category !== 'contact_lenses').slice(0, 3);
const featuredLens = demoProducts.find((product) => product.category === 'contact_lenses');

export function Home({ onNavigate }: HomeProps) {
  return (
    <div className="overflow-hidden bg-vilu-cream">
      <section className="relative px-6 py-14 md:py-20">
        <div className="absolute inset-0 bg-gradient-to-br from-vilu-cream via-vilu-paper to-vilu-mist" />

        <div className="relative mx-auto grid max-w-7xl items-center gap-12 md:grid-cols-[1fr_0.95fr]">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-slate-900/10 bg-white/70 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-slate-700 backdrop-blur">
              <Sparkles size={14} /> Онлайн-подбор и оптики рядом
            </div>
            <h1 className="max-w-3xl text-4xl font-black leading-[1.04] text-vilu-ink sm:text-5xl md:text-6xl">
              Подберите очки онлайн и найдите, где примерить похожие рядом.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-700">
              Загрузите фото, выберите 2-3 подходящих стиля и получите список ближайших оптик для финальной примерки.
            </p>
            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <button
                onClick={() => {
                  trackEvent(AnalyticsEvent.TryOnOpened, { source: 'home_hero' });
                  onNavigate('tryon');
                }}
                className="group rounded-full bg-vilu-ink px-8 py-4 text-sm font-bold uppercase tracking-[0.14em] text-white transition hover:-translate-y-0.5 hover:bg-vilu-green"
              >
                Начать подбор <ArrowRight className="ml-2 inline transition group-hover:translate-x-1" size={18} />
              </button>
              <button
                onClick={() => onNavigate('products')}
                className="rounded-full border border-vilu-ink/20 bg-white/70 px-8 py-4 text-sm font-bold uppercase tracking-[0.14em] text-vilu-ink backdrop-blur transition hover:bg-white"
              >
                Смотреть каталог
              </button>
            </div>
            <div className="mt-8 grid gap-3 text-sm font-bold text-slate-700 sm:grid-cols-3">
              {['Фото остается в браузере', 'Face-fit score', 'Оптики после подбора'].map((label) => (
                <div key={label} className="rounded-2xl bg-white/70 px-4 py-3 ring-1 ring-slate-900/10">
                  <CheckCircle2 className="mb-2 text-vilu-green" size={18} />
                  {label}
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="absolute -left-5 top-7 h-full w-full rotate-[-4deg] rounded-[1.75rem] bg-vilu-green" />
            <div className="relative overflow-hidden rounded-[1.75rem] bg-white p-4 shadow-2xl shadow-slate-900/20">
              <img
                src="https://images.unsplash.com/photo-1509695507497-903c140c43b0?auto=format&fit=crop&w=1100&q=80"
                alt="Премиальная оправа ViLu"
                className="h-[420px] w-full rounded-[1.35rem] object-cover"
              />
              <div className="absolute bottom-8 left-8 right-8 rounded-[1.25rem] bg-white/88 p-5 backdrop-blur-xl">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-vilu-green">Путь пользователя</p>
                <p className="mt-2 text-2xl font-black">Подбор - салоны рядом</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">Сначала выбираете оправы, потом открываете маршрут, звонок или мессенджер.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-vilu-ink px-6 py-8 text-white">
        <div className="mx-auto grid max-w-7xl gap-4 text-sm font-semibold uppercase tracking-[0.18em] md:grid-cols-3">
          <div className="flex items-center gap-3"><CheckCircle2 className="text-vilu-amber" size={20} /> Проверка зрения в салонах</div>
          <div className="flex items-center gap-3"><CheckCircle2 className="text-vilu-amber" size={20} /> Подбор линз по рецепту</div>
          <div className="flex items-center gap-3"><CheckCircle2 className="text-vilu-amber" size={20} /> Доставка и самовывоз</div>
        </div>
      </section>

      <section className="bg-white px-6 py-16">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.24em] text-vilu-clay">ViLu Knowledge Base</p>
            <h2 className="mt-3 text-4xl font-black md:text-5xl">Методология подбора оправ, которую можно процитировать</h2>
            <p className="mt-5 text-base leading-8 text-slate-600">
              Разбираем Face-fit score, размер оправы, PD, сильные диоптрии и ограничения онлайн-примерки простым языком.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              ['Face-fit score', '/face-fit-score'],
              ['Размер оправы 52-18-140', '/kak-vybrat-razmer-opravy'],
              ['PD и выбор оправы', '/pd-i-oprava'],
              ['Сильные диоптрии', '/oprava-pri-vysokih-dioptriyah'],
              ['Онлайн-примерка', '/primerit-ochki-online'],
              ['Форма лица', '/podbor-opravy-po-forme-lica'],
            ].map(([label, href]) => (
              <a key={href} href={href} className="rounded-2xl bg-stone-100 p-5 font-black text-slate-800 transition hover:bg-vilu-mist hover:text-vilu-green">
                {label}
              </a>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-24 md:py-32">
        <div className="mx-auto max-w-7xl">
          <div className="mb-14 flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.24em] text-vilu-clay">Витрина</p>
              <h2 className="mt-3 max-w-2xl text-4xl font-black md:text-6xl">Хиты, которые хочется примерить первыми</h2>
            </div>
            <button onClick={() => onNavigate('products')} className="inline-flex items-center gap-2 font-bold text-vilu-green">
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

      <section id="care" className="bg-vilu-green px-6 py-24 text-white md:py-32">
        <div className="mx-auto grid max-w-7xl gap-12 md:grid-cols-[0.9fr_1.1fr] md:items-center">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.24em] text-vilu-amber">Vision Hub</p>
            <h2 className="mt-4 text-4xl font-black md:text-6xl">Линзы по подписке и личный кабинет зрения</h2>
            <p className="mt-6 text-lg leading-8 text-white/75">
              Подписка помогает не вспоминать о покупке линз в последний момент: мы привозим запас вовремя, а в кабинете можно хранить рецепт и дату следующего осмотра.
            </p>
            <div className="mt-10 grid gap-4 sm:grid-cols-2">
              <div className="rounded-3xl bg-white/10 p-6"><CalendarDays className="mb-4 text-vilu-amber" /><strong>Напоминания</strong><p className="mt-2 text-sm text-white/70">Осмотр, замена линз, повтор заказа.</p></div>
              <div className="rounded-3xl bg-white/10 p-6"><MapPin className="mb-4 text-vilu-amber" /><strong>Салоны рядом</strong><p className="mt-2 text-sm text-white/70">Выберите удобную точку для примерки.</p></div>
            </div>
          </div>

          {featuredLens && (
            <div className="rounded-[2.5rem] bg-white p-5 text-vilu-ink shadow-2xl">
              <img src={featuredLens.image_url} alt={featuredLens.name} className="h-80 w-full rounded-[2rem] object-cover" />
              <div className="p-5">
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-vilu-green">Подписка месяца</p>
                <h3 className="mt-2 text-3xl font-black tracking-tight">{featuredLens.name}</h3>
                <p className="mt-3 text-slate-600">{featuredLens.description}</p>
                <div className="mt-6 flex items-end justify-between rounded-3xl bg-stone-100 p-5">
                  <div><p className="text-xs uppercase tracking-[0.2em] text-slate-500">от</p><p className="text-3xl font-black">{formatPrice(featuredLens.subscription_price ?? featuredLens.price)}</p></div>
                  <button onClick={() => onNavigate('product', featuredLens.id)} className="rounded-full bg-vilu-ink px-6 py-3 text-xs font-bold uppercase tracking-[0.18em] text-white">Выбрать</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
