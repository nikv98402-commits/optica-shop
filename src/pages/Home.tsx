import { ArrowRight, CalendarDays, CheckCircle2, Eye, MapPin, MapPinned, Route, Sparkles } from 'lucide-react';
import { demoProducts, formatPrice } from '../data/products';
import { AnalyticsEvent, trackEvent } from '../lib/analyticsEvents';

interface HomeProps {
  onNavigate: (page: string, productId?: string) => void;
}

const featuredFrames = demoProducts.filter((product) => product.featured && product.category !== 'contact_lenses').slice(0, 3);
const featuredLens = demoProducts.find((product) => product.category === 'contact_lenses');

export function Home({ onNavigate }: HomeProps) {
  return (
    <div className="overflow-hidden kinetic-surface">
      <section className="relative px-4 py-12 sm:px-6 md:py-16">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_18%,rgba(216,239,79,0.14),transparent_30%),linear-gradient(180deg,#07110d_0%,#0b1511_100%)]" />

        <div className="relative mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.9fr)]">
          <div className="min-w-0">
            <div className="kinetic-label mb-6">
              <Sparkles size={14} /> Примерка. Score. Салон.
            </div>
            <h1 className="kinetic-headline max-w-3xl text-[3.2rem] font-black leading-[0.88] text-vilu-paper sm:text-6xl lg:text-8xl">
              Примерь. Оцени. Иди в салон.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-vilu-paper/84">
              Загрузите фото, получите Face-fit score, сохраните 2-3 оправы и откройте ближайшие салоны для финальной примерки.
            </p>
            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <button
                onClick={() => {
                  trackEvent(AnalyticsEvent.TryOnOpened, { source: 'home_hero' });
                  onNavigate('tryon');
                }}
                className="group kinetic-cta rounded-full px-8 py-4 text-sm font-black uppercase tracking-[0.14em] transition hover:-translate-y-0.5 hover:bg-vilu-card focus:outline-none focus-visible:ring-4 focus-visible:ring-vilu-lime/40"
              >
                Начать примерку <ArrowRight className="ml-2 inline transition group-hover:translate-x-1" size={18} />
              </button>
              <button
                onClick={() => onNavigate('products')}
                className="rounded-full border border-vilu-paper/22 bg-vilu-paper/8 px-8 py-4 text-sm font-black uppercase tracking-[0.14em] text-vilu-paper backdrop-blur transition hover:bg-vilu-paper hover:text-vilu-ink focus:outline-none focus-visible:ring-4 focus-visible:ring-vilu-lime/40"
              >
                Смотреть каталог
              </button>
            </div>
            <div className="mt-8 grid gap-3 text-sm font-bold text-vilu-paper sm:grid-cols-3">
              {['Фото остается в браузере', 'Face-fit score', 'Салоны после подбора'].map((label) => (
                <div key={label} className="rounded-2xl bg-vilu-ink/72 px-4 py-3 shadow-sm ring-1 ring-vilu-paper/15 backdrop-blur">
                  <CheckCircle2 className="mb-2 text-vilu-lime" size={18} />
                  {label}
                </div>
              ))}
            </div>
          </div>

          <div className="relative min-w-0">
            <div className="absolute -inset-4 rounded-[2.25rem] bg-vilu-lime/24 blur-2xl" />
            <div className="relative overflow-hidden rounded-[2rem] border border-vilu-paper/14 bg-vilu-cream p-4 shadow-2xl shadow-vilu-ink/30 sm:p-5">
              <div className="rounded-[1.6rem] bg-vilu-paper p-4 ring-1 ring-vilu-ink/10 sm:p-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-vilu-green">ViLu примерка</p>
                    <p className="mt-1 text-2xl font-black text-vilu-ink">Фото → Score → Салон</p>
                  </div>
                  <div className="rounded-full bg-vilu-lime px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-vilu-ink">локально</div>
                </div>

                <div className="mt-5 grid gap-4 sm:grid-cols-[1.05fr_0.95fr]">
                  <div className="rounded-[1.4rem] bg-vilu-cream p-4 shadow-sm ring-1 ring-vilu-ink/10">
                    <div className="flex h-48 items-center justify-center rounded-[1.15rem] bg-vilu-ink">
                      <div className="relative h-24 w-64 max-w-full text-vilu-green">
                        <div className="absolute left-4 top-2 h-20 w-24 rounded-[2.2rem] border-[10px] border-current bg-white/90 shadow-xl shadow-vilu-green/10" />
                        <div className="absolute right-4 top-2 h-20 w-24 rounded-[2.2rem] border-[10px] border-current bg-white/90 shadow-xl shadow-vilu-green/10" />
                        <div className="absolute left-1/2 top-[2.9rem] h-3 w-14 -translate-x-1/2 rounded-full bg-current" />
                      </div>
                    </div>
                    <div className="mt-4 flex items-end justify-between gap-3">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.16em] text-vilu-ink/42">Aurora Crystal</p>
                        <p className="mt-1 text-lg font-black text-vilu-ink">Офис / каждый день</p>
                      </div>
                      <span className="rounded-full bg-vilu-lime px-3 py-2 text-xs font-black text-vilu-ink">49-19-140</span>
                    </div>
                  </div>

                  <div className="grid gap-3">
                    <div className="rounded-[1.4rem] bg-vilu-ink p-4 text-vilu-paper">
                      <p className="text-xs font-bold uppercase tracking-[0.16em] text-vilu-lime">Результат посадки</p>
                      <div className="mt-2 flex items-end gap-2">
                        <span className="text-5xl font-black tracking-tight">84</span>
                        <span className="pb-2 text-sm font-bold text-vilu-paper/60">/100</span>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-vilu-paper/72">Подходит для первого визита. Проверьте мост и ширину в салоне.</p>
                    </div>
                    <div className="rounded-[1.4rem] bg-vilu-cream p-4 ring-1 ring-vilu-ink/10">
                      <div className="flex items-center justify-between text-sm font-black">
                        <span>Сохранено</span>
                        <span className="text-vilu-green">2 из 3</span>
                      </div>
                      <div className="mt-3 grid grid-cols-3 gap-2">
                        <span className="h-2 rounded-full bg-vilu-lime" />
                        <span className="h-2 rounded-full bg-vilu-lime" />
                        <span className="h-2 rounded-full bg-vilu-ink/12" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2 text-center text-[11px] font-black uppercase tracking-[0.1em] text-vilu-ink/55">
                  <span className="rounded-2xl bg-vilu-cream py-3 ring-1 ring-vilu-ink/10"><Eye className="mx-auto mb-1 text-vilu-green" size={15} />Фото</span>
                  <span className="rounded-2xl bg-vilu-cream py-3 text-vilu-green ring-1 ring-vilu-green/10"><Sparkles className="mx-auto mb-1" size={15} />Score</span>
                  <span className="rounded-2xl bg-vilu-cream py-3 ring-1 ring-vilu-ink/10"><MapPinned className="mx-auto mb-1 text-vilu-green" size={15} />Салон</span>
                </div>

                <div className="mt-4 flex items-center justify-between rounded-2xl bg-vilu-lime px-4 py-3 text-vilu-ink">
                  <span className="text-sm font-black">Найти салон после подбора</span>
                  <Route size={17} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-vilu-ink px-6 py-8 text-vilu-paper">
        <div className="mx-auto grid max-w-7xl gap-4 text-sm font-semibold uppercase tracking-[0.18em] md:grid-cols-3">
          <div className="flex items-center gap-3"><CheckCircle2 className="text-vilu-lime" size={20} /> Проверка зрения в салонах</div>
          <div className="flex items-center gap-3"><CheckCircle2 className="text-vilu-lime" size={20} /> Подбор линз по рецепту</div>
          <div className="flex items-center gap-3"><CheckCircle2 className="text-vilu-lime" size={20} /> Доставка и самовывоз</div>
        </div>
      </section>

      <section className="bg-vilu-paper px-6 py-16">
        <div className="mx-auto grid max-w-7xl gap-8 rounded-[2rem] border border-vilu-line bg-vilu-card p-6 shadow-sm md:grid-cols-[0.9fr_1.1fr] md:p-10">
          <div>
            <p className="vilu-eyebrow">Забота о зрении</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-vilu-ink md:text-5xl">Забота о зрении до визита в салон</h2>
          </div>
          <div>
            <p className="text-base leading-8 text-vilu-ink/72">
              ViLu помогает подготовиться к проверке зрения и выбору очков: онлайн-примерка, предварительный Face-fit score, чеклист для визита и оптики рядом. Это справочный lifestyle-сценарий, а не диагностика и не замена консультации специалиста.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                onClick={() => {
                  trackEvent(AnalyticsEvent.VisionCareFaceFitClicked, { source: 'home_vision_care' });
                  onNavigate('vision-care');
                }}
                className="rounded-full bg-vilu-lime px-6 py-3 text-xs font-black uppercase tracking-[0.14em] text-vilu-ink transition hover:bg-vilu-ink hover:text-vilu-paper"
              >
                Забота о зрении
              </button>
              <button
                onClick={() => onNavigate('face-fit-score')}
                className="rounded-full border border-vilu-ink/18 bg-vilu-paper px-6 py-3 text-xs font-black uppercase tracking-[0.14em] text-vilu-ink transition hover:border-vilu-lime hover:bg-vilu-lime"
              >
                Face-fit score
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-vilu-paper px-6 py-16">
        <div className="mx-auto grid max-w-7xl gap-8 rounded-[2rem] bg-vilu-ink p-6 text-vilu-paper shadow-2xl shadow-vilu-ink/20 md:grid-cols-[1fr_0.9fr] md:p-10">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-vilu-lime">ViLu Проверка зрения</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight md:text-5xl">Self-check перед очной проверкой</h2>
            <p className="mt-5 max-w-3xl text-base font-semibold leading-8 text-vilu-paper/72">
              Короткий сценарий без диагноза: зрительная нагрузка, детские признаки, сравнение глаз и Amsler-гайд. Ответы остаются в браузере, а результат помогает понять, стоит ли запланировать очную проверку.
            </p>
          </div>
          <div className="rounded-[1.5rem] bg-vilu-paper/8 p-5 ring-1 ring-vilu-paper/12">
            <div className="grid gap-3 text-sm font-bold text-vilu-paper/82">
              {['Не измеряет диоптрии', 'Не ставит диагноз', 'Не отправляет ответы в аналитику'].map((label) => (
                <div key={label} className="flex items-center gap-3 rounded-2xl bg-vilu-paper/8 p-4">
                  <CheckCircle2 className="text-vilu-lime" size={18} />
                  {label}
                </div>
              ))}
            </div>
            <button
              onClick={() => {
                trackEvent(AnalyticsEvent.EyeCheckOpened, { source: 'home_card' });
                onNavigate('eyecheck');
              }}
              className="mt-5 w-full rounded-full bg-vilu-lime px-6 py-4 text-sm font-black uppercase tracking-[0.14em] text-vilu-ink transition hover:bg-vilu-card"
            >
              Пройти self-check
            </button>
          </div>
        </div>
      </section>

      <section className="bg-vilu-paper px-6 py-16">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
          <div>
            <p className="vilu-eyebrow">База знаний ViLu</p>
            <h2 className="mt-3 text-4xl font-black md:text-5xl">Методология подбора оправ, которую можно процитировать</h2>
            <p className="mt-5 text-base leading-8 vilu-muted">
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
              ['Забота о зрении', '/vision-care'],
              ['Проверка зрения ViLu', '/eye-check'],
            ].map(([label, href]) => (
              <a key={href} href={href} className="rounded-2xl bg-vilu-card p-5 font-black text-vilu-ink ring-1 ring-vilu-line transition hover:bg-vilu-ink hover:text-vilu-lime">
                {label}
              </a>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-vilu-cream px-6 py-24 md:py-32">
        <div className="mx-auto max-w-7xl">
          <div className="mb-14 flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <p className="vilu-eyebrow">Витрина</p>
              <h2 className="mt-3 max-w-2xl text-4xl font-black md:text-6xl">Хиты, которые хочется примерить первыми</h2>
            </div>
            <button onClick={() => onNavigate('products')} className="inline-flex items-center gap-2 font-bold text-vilu-green">
              Все модели <ArrowRight size={18} />
            </button>
          </div>

          <div className="grid gap-7 md:grid-cols-3">
            {featuredFrames.map((product) => (
              <article key={product.id} className="group rounded-[2rem] bg-vilu-card p-4 shadow-sm ring-1 ring-vilu-line transition hover:-translate-y-1 hover:shadow-xl">
                <button onClick={() => onNavigate('product', product.id)} className="block w-full text-left">
                  <div className="overflow-hidden rounded-[1.5rem] bg-vilu-paper">
                    <img src={product.image_url} alt={product.name} className="h-80 w-full object-cover transition duration-500 group-hover:scale-105" />
                  </div>
                  <div className="p-3">
                    <p className="mt-4 text-xs font-bold uppercase tracking-[0.22em] text-vilu-ink/42">{product.brand_name}</p>
                    <h3 className="mt-2 text-2xl font-black tracking-tight">{product.name}</h3>
                    <p className="mt-3 line-clamp-2 text-sm leading-6 vilu-muted">{product.description}</p>
                    <p className="mt-5 text-xl font-black">{formatPrice(product.price)}</p>
                  </div>
                </button>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="care" className="bg-vilu-ink px-6 py-24 text-vilu-paper md:py-32">
        <div className="mx-auto grid max-w-7xl gap-12 md:grid-cols-[0.9fr_1.1fr] md:items-center">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.24em] text-vilu-lime">Кабинет зрения ViLu</p>
            <h2 className="mt-4 text-4xl font-black md:text-6xl">Линзы по подписке и личный кабинет зрения</h2>
            <p className="mt-6 text-lg leading-8 text-vilu-paper/75">
              Подписка помогает не вспоминать о покупке линз в последний момент: мы привозим запас вовремя, а в кабинете можно хранить рецепт и дату следующего осмотра.
            </p>
            <div className="mt-10 grid gap-4 sm:grid-cols-2">
              <div className="rounded-3xl bg-vilu-paper/10 p-6"><CalendarDays className="mb-4 text-vilu-lime" /><strong>Напоминания</strong><p className="mt-2 text-sm text-vilu-paper/70">Осмотр, замена линз, повтор заказа.</p></div>
              <div className="rounded-3xl bg-vilu-paper/10 p-6"><MapPin className="mb-4 text-vilu-lime" /><strong>Салоны рядом</strong><p className="mt-2 text-sm text-vilu-paper/70">Выберите удобную точку для примерки.</p></div>
            </div>
          </div>

          {featuredLens && (
            <div className="rounded-[2.5rem] bg-vilu-card p-5 text-vilu-ink shadow-2xl">
              <img src={featuredLens.image_url} alt={featuredLens.name} className="h-80 w-full rounded-[2rem] object-cover" />
              <div className="p-5">
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-vilu-green">Подписка месяца</p>
                <h3 className="mt-2 text-3xl font-black tracking-tight">{featuredLens.name}</h3>
                <p className="mt-3 vilu-muted">{featuredLens.description}</p>
                <div className="mt-6 flex items-end justify-between rounded-3xl bg-vilu-paper p-5">
                  <div><p className="text-xs uppercase tracking-[0.2em] text-vilu-ink/55">от</p><p className="text-3xl font-black">{formatPrice(featuredLens.subscription_price ?? featuredLens.price)}</p></div>
                  <button onClick={() => onNavigate('product', featuredLens.id)} className="rounded-full bg-vilu-ink px-6 py-3 text-xs font-bold uppercase tracking-[0.18em] text-vilu-paper">Выбрать</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
