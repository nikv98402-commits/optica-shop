import {
  Calendar,
  CheckCircle2,
  Clock3,
  Glasses,
  HeartPulse,
  LineChart,
  Mail,
  MapPin,
  Phone,
  Play,
  Save,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Target,
  UserRound,
} from 'lucide-react';
import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';
import { AuthModal } from '../components/AuthModal';
import { VirtualTryOn } from '../components/VirtualTryOn';
import { useAuth } from '../contexts/AuthContext';
import { demoProducts, formatPrice } from '../data/products';
import { createLocalId } from '../lib/id';
import { AnalyticsEvent, trackEvent } from '../lib/analyticsEvents';

interface DashboardProps {
  onNavigate?: (page: string, productId?: string) => void;
}

interface PurchaseHistoryItem {
  id: string;
  productId: string;
  category: 'sunglasses' | 'contact_lenses' | 'eyeglasses';
  brandName: string;
  userId: string;
  purchasedAt: string;
}

interface ClientProfile {
  fullName: string;
  phone: string;
  city: string;
  birthDate: string;
  lastExamDate: string;
  nextExamDate: string;
  complaints: string;
  leftSph: string;
  leftCyl: string;
  leftAxis: string;
  rightSph: string;
  rightCyl: string;
  rightAxis: string;
}

interface TrainingSession {
  id: string;
  title: string;
  duration: number;
  completedAt: string;
}

const defaultProfile: ClientProfile = {
  fullName: 'Demo user',
  phone: '+7 000 000-00-00',
  city: 'Москва',
  birthDate: '',
  lastExamDate: '2026-04-20',
  nextExamDate: '2026-10-20',
  complaints: 'Усталость глаз после работы за ноутбуком',
  leftSph: '-1.25',
  leftCyl: '-0.50',
  leftAxis: '90',
  rightSph: '-1.00',
  rightCyl: '-0.25',
  rightAxis: '85',
};

const exercises = [
  {
    id: 'focus-dot',
    title: 'Фокус-точка',
    duration: 30,
    description: 'Следите за движущейся точкой, не поворачивая голову. Помогает снять спазм аккомодации.',
  },
  {
    id: 'twenty-rule',
    title: '20-20-20',
    duration: 20,
    description: 'Каждые 20 минут смотрите на дальний объект. Короткая пауза для снижения зрительной нагрузки.',
  },
  {
    id: 'palming',
    title: 'Пальминг',
    duration: 45,
    description: 'Закройте глаза ладонями и расслабьте мышцы. Хорошо после длительной работы за экраном.',
  },
];

const ads = [
  {
    title: 'Скидка 15% на вторую пару',
    text: 'Добавьте солнцезащитные линзы к рабочей оправе и получите персональную скидку.',
    action: 'Подобрать пару',
  },
  {
    title: 'Кабинет зрения ViLu Premium',
    text: 'Подписка на линзы, напоминания об осмотре и консультация оптометриста в одном пакете.',
    action: 'Узнать больше',
  },
];

function profileStorageKey(userId: string) {
  return `visionlux_client_profile_${userId}`;
}

function sessionsStorageKey(userId: string) {
  return `visionlux_training_sessions_${userId}`;
}

const PURCHASES_KEY = 'visionlux_purchase_history';

function readJson<T>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) as T : fallback;
  } catch {
    return fallback;
  }
}

function daysBetween(date: string) {
  const target = new Date(date);
  const today = new Date();
  return Math.max(0, Math.ceil((target.getTime() - today.getTime()) / 86400000));
}

function calculateStrainScore(profile: ClientProfile, sessions: TrainingSession[]) {
  const complaintLoad = profile.complaints.trim().length > 0 ? 18 : 0;
  const trainingBonus = Math.min(24, sessions.length * 6);
  const examBonus = profile.nextExamDate ? 12 : 0;
  return Math.max(18, Math.min(92, 64 + complaintLoad - trainingBonus - examBonus));
}

export function Dashboard({ onNavigate }: DashboardProps) {
  const { user, signIn, signUp, signOut } = useAuth();
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('signup');
  const [authOpen, setAuthOpen] = useState(false);
  const [profile, setProfile] = useState<ClientProfile>(defaultProfile);
  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [purchaseHistory, setPurchaseHistory] = useState<PurchaseHistoryItem[]>([]);
  const [saved, setSaved] = useState(false);
  const [activeExerciseId, setActiveExerciseId] = useState(exercises[0].id);
  const [isTraining, setIsTraining] = useState(false);
  const [timer, setTimer] = useState(exercises[0].duration);

  const activeExercise = exercises.find((item) => item.id === activeExerciseId) ?? exercises[0];

  useEffect(() => {
    if (!user) return;
    setProfile(readJson(profileStorageKey(user.id), defaultProfile));
    setSessions(readJson(sessionsStorageKey(user.id), []));
    setPurchaseHistory(readJson(PURCHASES_KEY, []).filter((item: PurchaseHistoryItem) => item.userId === user.id || item.userId === 'demo'));
    trackEvent(AnalyticsEvent.DashboardOpened, { mode: 'demo_local' });
  }, [user]);

  useEffect(() => {
    if (!isTraining) setTimer(activeExercise.duration);
  }, [activeExercise.duration, isTraining]);

  useEffect(() => {
    if (!isTraining) return;

    if (timer === 0) {
      const session: TrainingSession = {
        id: createLocalId('training'),
        title: activeExercise.title,
        duration: activeExercise.duration,
        completedAt: new Date().toISOString(),
      };
      setSessions((current) => [session, ...current].slice(0, 8));
      setIsTraining(false);
      setTimer(activeExercise.duration);
      return;
    }

    const interval = window.setInterval(() => setTimer((value) => value - 1), 1000);
    return () => window.clearInterval(interval);
  }, [activeExercise.duration, activeExercise.title, isTraining, timer]);

  useEffect(() => {
    if (!user) return;
    localStorage.setItem(sessionsStorageKey(user.id), JSON.stringify(sessions));
  }, [sessions, user]);

  const stats = useMemo(() => {
    const strainScore = calculateStrainScore(profile, sessions);
    const trainingProgress = Math.min(100, sessions.length * 20);
    const nextExamDays = profile.nextExamDate ? daysBetween(profile.nextExamDate) : 0;
    const prescriptionReady = [profile.leftSph, profile.rightSph].filter(Boolean).length * 50;
    return { strainScore, trainingProgress, nextExamDays, prescriptionReady };
  }, [profile, sessions]);

  const tryOnRecommendations = useMemo(() => {
    const purchasedTryOnCategories = new Set(
      purchaseHistory
        .map((item) => item.category)
        .filter((category) => category === 'eyeglasses' || category === 'sunglasses'),
    );
    const purchasedBrands = new Set(purchaseHistory.map((item) => item.brandName));
    const categories = purchasedTryOnCategories.size > 0 ? purchasedTryOnCategories : new Set(['eyeglasses', 'sunglasses']);

    return demoProducts
      .filter((product) => categories.has(product.category))
      .sort((first, second) => Number(purchasedBrands.has(second.brand_name)) - Number(purchasedBrands.has(first.brand_name)))
      .slice(0, 3);
  }, [purchaseHistory]);

  const updateProfile = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target;
    setProfile((current) => ({ ...current, [name]: value }));
    setSaved(false);
  };

  const saveProfile = (event: FormEvent) => {
    event.preventDefault();
    if (!user) return;
    localStorage.setItem(profileStorageKey(user.id), JSON.stringify(profile));
    trackEvent(AnalyticsEvent.ProfileSavedLocal, { mode: 'local_storage' });
    if (profile.leftSph || profile.rightSph || profile.leftCyl || profile.rightCyl || profile.leftAxis || profile.rightAxis) {
      trackEvent(AnalyticsEvent.RecipeCompleted, { mode: 'local_storage' });
    }
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  };

  const openDemoProfile = async () => {
    const demoEmail = 'demo@vilu.store';
    const demoPassword = 'demo-local-mode';
    const signupResult = await signUp(demoEmail, demoPassword, 'Demo user');

    if (signupResult.error) {
      await signIn(demoEmail, demoPassword);
    }
  };

  const openAuth = (mode: 'login' | 'signup') => {
    setAuthMode(mode);
    setAuthOpen(true);
  };

  if (!user) {
    return (
      <div className="kinetic-surface min-h-screen px-6 py-16">
        <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[0.95fr_1.05fr]">
          <section className="text-vilu-paper">
            <p className="kinetic-label">Личный кабинет</p>
            <h1 className="kinetic-headline mt-4 text-4xl text-vilu-paper sm:text-5xl md:text-6xl">Ваш центр управления зрением.</h1>
            <p className="mt-7 max-w-2xl text-lg font-semibold leading-8 text-vilu-paper/80">
              Создайте demo-аккаунт, сохраните рецепт, контактные данные, график осмотров и проверьте тренажеры для глаз. Все данные сохраняются локально в браузере.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <button onClick={openDemoProfile} className="rounded-full bg-vilu-lime px-8 py-4 text-sm font-black uppercase tracking-[0.18em] text-vilu-ink transition hover:bg-vilu-card">Открыть demo-кабинет</button>
              <button onClick={() => openAuth('signup')} className="rounded-full border border-vilu-paper/30 bg-vilu-paper/10 px-8 py-4 text-sm font-black uppercase tracking-[0.18em] text-vilu-paper transition hover:bg-vilu-paper hover:text-vilu-ink">Создать demo-кабинет</button>
              <button onClick={() => openAuth('login')} className="rounded-full border border-vilu-ink/15 bg-vilu-card px-8 py-4 text-sm font-black uppercase tracking-[0.18em] text-vilu-ink transition hover:bg-vilu-paper">Войти</button>
            </div>
            <p className="mt-4 max-w-xl text-sm font-semibold leading-6 text-vilu-paper/70">
              Demo-режим можно открыть без реальных персональных данных. Профиль хранится только на этом устройстве.
            </p>
          </section>

          <section className="rounded-[2rem] bg-vilu-ink p-5 text-vilu-paper shadow-2xl shadow-vilu-ink/25 ring-1 ring-vilu-lime/20">
            <div className="rounded-[1.6rem] bg-[radial-gradient(circle_at_top_right,rgba(233,255,70,0.18),transparent_35%),linear-gradient(135deg,#122019,#07120b)] p-7 md:p-10">
              <div className="grid gap-4 sm:grid-cols-2">
                {[
                  ['Рецепт', 'SPH / CYL / AXIS'],
                  ['Осмотры', 'Напоминания и история'],
                  ['Тренажеры', 'Фокус, пальминг, 20-20-20'],
                  ['Рекомендации', 'Подбор линз и оправ'],
                ].map(([title, text]) => (
                  <div key={title} className="rounded-3xl bg-vilu-paper/10 p-5 backdrop-blur">
                    <CheckCircle2 className="mb-4 text-vilu-lime" />
                    <h3 className="font-black">{title}</h3>
                    <p className="mt-2 text-sm text-vilu-paper/65">{text}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>

        <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} mode={authMode} />
      </div>
    );
  }

  return (
    <div className="kinetic-surface min-h-screen px-6 py-12">
      <div className="mx-auto max-w-7xl">
        <header className="mb-10 flex flex-col justify-between gap-5 text-vilu-paper md:flex-row md:items-end">
          <div>
            <p className="kinetic-label">Vision profile</p>
            <h1 className="kinetic-headline mt-3 text-4xl text-vilu-paper sm:text-5xl md:text-6xl">Кабинет зрения</h1>
            <p className="mt-5 max-w-2xl text-lg font-semibold leading-8 text-vilu-paper/80">Здравствуйте, {profile.fullName || user.name}. Здесь собраны данные клиента, рецепт, тренировки, инфографика и персональные предложения.</p>
            <p className="mt-3 max-w-2xl text-sm font-bold leading-6 text-vilu-lime">
              Demo/local mode: данные кабинета сохраняются только в вашем браузере и не отправляются на сервер.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button onClick={() => onNavigate?.('products')} className="rounded-full bg-vilu-lime px-6 py-4 text-xs font-black uppercase tracking-[0.18em] text-vilu-ink transition hover:bg-vilu-paper">В каталог</button>
            <button onClick={() => signOut()} className="rounded-full bg-vilu-paper px-6 py-4 text-xs font-black uppercase tracking-[0.18em] text-vilu-ink ring-1 ring-vilu-paper/30 transition hover:bg-vilu-lime">Выйти</button>
          </div>
        </header>

        <section className="mb-8 grid gap-4 md:grid-cols-4">
          <MetricCard icon={<HeartPulse />} label="Нагрузка" value={`${stats.strainScore}%`} tone="bg-vilu-lime text-vilu-ink" bar={stats.strainScore} />
          <MetricCard icon={<Target />} label="Тренировки" value={`${stats.trainingProgress}%`} tone="bg-vilu-ink text-vilu-lime" bar={stats.trainingProgress} />
          <MetricCard icon={<Calendar />} label="До осмотра" value={`${stats.nextExamDays} дн.`} tone="bg-vilu-paper text-vilu-green" bar={Math.max(8, 100 - Math.min(100, stats.nextExamDays))} />
          <MetricCard icon={<Glasses />} label="Рецепт" value={`${stats.prescriptionReady}%`} tone="bg-vilu-lime text-vilu-ink" bar={stats.prescriptionReady} />
        </section>

        <div className="grid gap-8 lg:grid-cols-[1.08fr_0.92fr]">
          <div className="space-y-8">
            <form onSubmit={saveProfile} className="rounded-[2rem] bg-vilu-card p-7 shadow-sm ring-1 ring-vilu-ink/10 md:p-9">
              <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                  <p className="kinetic-label text-vilu-green">Данные клиента</p>
                  <h2 className="mt-2 text-3xl font-black tracking-tight">Анкета и рецепт</h2>
                  <p className="mt-2 text-sm font-bold leading-6 text-vilu-ink/55">Demo-режим: данные анкеты и рецепта сохраняются только на этом устройстве.</p>
                </div>
                <button className="inline-flex items-center justify-center gap-2 rounded-full bg-vilu-ink px-6 py-3 text-xs font-black uppercase tracking-[0.18em] text-vilu-paper transition hover:bg-vilu-lime hover:text-vilu-ink"><Save size={16} /> Сохранить</button>
              </div>

              {saved && <div className="mb-5 rounded-2xl bg-vilu-lime/20 p-4 text-sm font-bold text-vilu-ink">Сохранено локально. Данные не отправлены на сервер.</div>}

              <div className="grid gap-4 md:grid-cols-2">
                <Field icon={<UserRound />} label="ФИО" name="fullName" value={profile.fullName} onChange={updateProfile} placeholder="Анна Смирнова" />
                <Field icon={<Phone />} label="Телефон" name="phone" value={profile.phone} onChange={updateProfile} placeholder="+7 900 000-00-00" />
                <Field icon={<MapPin />} label="Город" name="city" value={profile.city} onChange={updateProfile} placeholder="Москва" />
                <Field icon={<Calendar />} label="Дата рождения" name="birthDate" type="date" value={profile.birthDate} onChange={updateProfile} />
                <Field icon={<Stethoscope />} label="Последний осмотр" name="lastExamDate" type="date" value={profile.lastExamDate} onChange={updateProfile} />
                <Field icon={<Clock3 />} label="Следующий осмотр" name="nextExamDate" type="date" value={profile.nextExamDate} onChange={updateProfile} />
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <PrescriptionEye title="Левый глаз (OS)" prefix="left" profile={profile} onChange={updateProfile} />
                <PrescriptionEye title="Правый глаз (OD)" prefix="right" profile={profile} onChange={updateProfile} />
              </div>
              <p className="mt-4 rounded-2xl bg-vilu-lime/40 p-4 text-sm font-bold leading-6 text-vilu-ink">
                Рецепт и параметры зрения используются только для предварительного подбора оправ. ViLu не ставит диагноз и не заменяет консультацию специалиста.
              </p>

              <label className="mt-5 block">
                <span className="mb-2 block text-xs font-black uppercase tracking-[0.18em] text-vilu-ink/40">Особенности и жалобы</span>
                <textarea name="complaints" value={profile.complaints} onChange={updateProfile} rows={4} className="w-full rounded-3xl border border-vilu-ink/10 bg-vilu-paper px-5 py-4 font-semibold outline-none transition focus:border-vilu-lime" />
              </label>
            </form>

            <section className="rounded-[2rem] bg-vilu-card p-7 shadow-sm ring-1 ring-vilu-ink/10 md:p-9">
              <div className="mb-7 flex items-center justify-between gap-4">
                <div>
                  <p className="kinetic-label text-vilu-green">Тренажеры</p>
                  <h2 className="mt-2 text-3xl font-black tracking-tight">Упражнения для глаз</h2>
                </div>
                {isTraining && <span className="rounded-full bg-vilu-lime px-4 py-2 font-mono text-lg font-black text-vilu-ink">00:{timer < 10 ? `0${timer}` : timer}</span>}
              </div>

              <div className="mb-5 grid gap-3 md:grid-cols-3">
                {exercises.map((exercise) => (
                  <button key={exercise.id} type="button" onClick={() => { setActiveExerciseId(exercise.id); setIsTraining(false); }} className={`rounded-3xl p-4 text-left transition ${activeExerciseId === exercise.id ? 'bg-vilu-ink text-vilu-lime' : 'bg-vilu-paper text-vilu-ink hover:bg-vilu-lime/30'}`}>
                    <strong>{exercise.title}</strong>
                    <span className="mt-1 block text-xs opacity-70">{exercise.duration} сек.</span>
                  </button>
                ))}
              </div>

              <div className={`relative flex h-80 items-center justify-center overflow-hidden rounded-[2rem] border-2 border-dashed transition ${isTraining ? 'border-vilu-lime bg-vilu-lime/20' : 'border-vilu-ink/10 bg-vilu-paper'}`}>
                {!isTraining ? (
                  <div className="max-w-md text-center">
                    <p className="mb-6 font-semibold text-vilu-ink/65">{activeExercise.description}</p>
                    <button type="button" onClick={() => setIsTraining(true)} className="inline-flex items-center gap-3 rounded-full bg-vilu-ink px-8 py-4 text-xs font-black uppercase tracking-[0.18em] text-vilu-paper transition hover:bg-vilu-lime hover:text-vilu-ink"><Play size={16} fill="currentColor" /> Начать</button>
                  </div>
                ) : (
                  <>
                    <div className="absolute h-9 w-9 rounded-full bg-vilu-lime shadow-2xl shadow-vilu-lime/40 transition-all duration-300" style={{ left: `${48 + 34 * Math.cos(timer * 0.5)}%`, top: `${46 + 24 * Math.sin(timer * 0.8)}%` }} />
                    <p className="absolute bottom-6 left-0 right-0 text-center text-xs font-black uppercase tracking-[0.2em] text-vilu-green">Следите за точкой. Сессия сохранится автоматически.</p>
                  </>
                )}
              </div>

              <div className="mt-6 grid gap-3 md:grid-cols-2">
                {sessions.length === 0 ? (
                  <div className="rounded-3xl bg-vilu-paper p-5 text-sm text-vilu-ink/65">Пока нет завершенных тренировок. Запустите упражнение, чтобы история появилась здесь.</div>
                ) : sessions.slice(0, 4).map((session) => (
                  <div key={session.id} className="rounded-3xl bg-vilu-paper p-5">
                    <strong>{session.title}</strong>
                    <p className="mt-1 text-sm text-vilu-ink/55">{session.duration} сек. · {new Date(session.completedAt).toLocaleDateString('ru-RU')}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <aside className="space-y-8">
            <section className="rounded-[2rem] bg-vilu-ink p-7 text-vilu-paper shadow-2xl shadow-vilu-ink/20 ring-1 ring-vilu-lime/20">
              <LineChart className="mb-6 text-vilu-lime" size={36} />
              <h2 className="text-3xl font-black tracking-tight">Инфографика зрения</h2>
              <p className="mt-3 text-sm leading-6 text-vilu-paper/60">Сводка строится из рецепта, даты осмотра и регулярности упражнений.</p>
              <div className="mt-7 space-y-5">
                <Insight label="Риск усталости" value={stats.strainScore} />
                <Insight label="Привычка тренировок" value={stats.trainingProgress} />
                <Insight label="Заполненность рецепта" value={stats.prescriptionReady} />
              </div>
            </section>

            <section className="rounded-[2rem] bg-vilu-card p-7 shadow-sm ring-1 ring-vilu-ink/10">
              <Mail className="mb-5 text-vilu-green" />
              <h3 className="text-2xl font-black tracking-tight">Контакт для уведомлений</h3>
              <p className="mt-2 text-sm text-vilu-ink/55">{user.email}</p>
              <div className="mt-5 rounded-3xl bg-vilu-paper p-4 text-sm font-semibold leading-6 text-vilu-ink"><ShieldCheck className="mb-2 text-vilu-green" size={18} /> Уведомления в MVP-версии не отправляются. Блок показывает будущий сценарий сервиса.</div>
            </section>

            {tryOnRecommendations.length > 0 && (
              <section className="rounded-[2rem] bg-vilu-card p-5 shadow-sm ring-1 ring-vilu-ink/10">
                <VirtualTryOn product={tryOnRecommendations[0]} compact />
                <div className="mt-5 px-2">
                  <p className="kinetic-label text-vilu-green">По вашим покупкам</p>
                  <h3 className="mt-2 text-2xl font-black tracking-tight">Релевантные модели для примерки</h3>
                  <p className="mt-2 text-sm leading-6 text-vilu-ink/55">
                    Подборка строится локально и учитывает только demo-историю в этом браузере.
                  </p>
                </div>
                <div className="mt-5 grid gap-3">
                  {tryOnRecommendations.map((product) => (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => {
                        trackEvent(AnalyticsEvent.TryOnOpenedFromDashboard, { source: 'dashboard_recommendation' });
                        onNavigate?.('product', product.id);
                      }}
                      className="grid grid-cols-[72px_1fr] gap-4 rounded-3xl bg-vilu-paper p-3 text-left transition hover:bg-vilu-cream"
                    >
                      <img src={product.image_url} alt={product.name} className="h-20 w-full rounded-2xl object-cover" />
                      <span>
                        <span className="block text-xs font-black uppercase tracking-[0.18em] text-vilu-ink/42">{product.category === 'sunglasses' ? 'Солнцезащитные очки' : 'Оправа'}</span>
                        <strong className="mt-1 block text-lg">{product.name}</strong>
                        <span className="mt-1 block text-sm font-bold text-vilu-green">{formatPrice(product.price)}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {ads.map((ad, index) => (
              <section key={ad.title} className={`${index === 0 ? 'bg-vilu-lime text-vilu-ink' : 'bg-vilu-ink text-vilu-paper'} rounded-[2rem] p-7 shadow-sm`}>
                <Sparkles className="mb-5" />
                <p className="text-xs font-black uppercase tracking-[0.2em] opacity-70">Персональное предложение</p>
                <h3 className="mt-2 text-2xl font-black tracking-tight">{ad.title}</h3>
                <p className="mt-3 text-sm leading-6 opacity-75">{ad.text}</p>
                <button onClick={() => onNavigate?.('products')} className="mt-6 rounded-full bg-vilu-ink px-5 py-3 text-xs font-black uppercase tracking-[0.16em] text-vilu-paper transition hover:bg-vilu-card hover:text-vilu-ink">{ad.action}</button>
              </section>
            ))}
          </aside>
        </div>
        <footer className="mt-10 flex flex-wrap gap-x-5 gap-y-2 text-sm font-bold text-vilu-ink/55">
          <button type="button" onClick={() => onNavigate?.('privacy')} className="transition hover:text-vilu-ink">Политика конфиденциальности</button>
          <span>·</span>
          <button type="button" onClick={() => onNavigate?.('terms')} className="transition hover:text-vilu-ink">Условия</button>
          <span>·</span>
          <button type="button" onClick={() => onNavigate?.('disclaimer')} className="transition hover:text-vilu-ink">Дисклеймер</button>
        </footer>
      </div>
    </div>
  );
}

interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: string;
  bar: number;
}

function MetricCard({ icon, label, value, tone, bar }: MetricCardProps) {
  return (
    <article className="rounded-[2rem] bg-vilu-card p-5 shadow-sm ring-1 ring-vilu-ink/10">
      <div className={`mb-4 inline-flex rounded-2xl p-3 ${tone}`}>{icon}</div>
      <p className="text-xs font-black uppercase tracking-[0.2em] text-vilu-ink/40">{label}</p>
      <p className="mt-2 text-3xl font-black tracking-tight">{value}</p>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-vilu-paper"><div className="h-full rounded-full bg-vilu-lime" style={{ width: `${Math.min(100, bar)}%` }} /></div>
    </article>
  );
}

interface FieldProps {
  icon: React.ReactNode;
  label: string;
  name: keyof ClientProfile;
  value: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  type?: string;
}

function Field({ icon, label, name, value, onChange, placeholder, type = 'text' }: FieldProps) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-black uppercase tracking-[0.18em] text-vilu-ink/40">{label}</span>
      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-vilu-green">{icon}</span>
        <input name={name} type={type} value={value} onChange={onChange} placeholder={placeholder} className="w-full rounded-2xl border border-vilu-ink/10 bg-vilu-paper py-4 pl-12 pr-4 font-semibold outline-none transition focus:border-vilu-lime" />
      </div>
    </label>
  );
}

interface PrescriptionEyeProps {
  title: string;
  prefix: 'left' | 'right';
  profile: ClientProfile;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
}

function PrescriptionEye({ title, prefix, profile, onChange }: PrescriptionEyeProps) {
  return (
    <div className="rounded-3xl bg-vilu-paper p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <h3 className="font-black">{title}</h3>
        <span title="Не является медицинской рекомендацией" className="rounded-full bg-vilu-lime px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-vilu-ink">Demo</span>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[
          ['SPH', `${prefix}Sph`],
          ['CYL', `${prefix}Cyl`],
          ['AXIS', `${prefix}Axis`],
        ].map(([label, name]) => (
          <label key={name}>
            <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-vilu-ink/40">{label}</span>
            <input name={name} value={profile[name as keyof ClientProfile]} onChange={onChange} className="w-full rounded-2xl border border-vilu-ink/10 bg-vilu-card px-3 py-3 text-center font-bold outline-none transition focus:border-vilu-lime" />
          </label>
        ))}
      </div>
    </div>
  );
}

function Insight({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="mb-2 flex justify-between text-sm"><span className="text-vilu-paper/60">{label}</span><strong>{value}%</strong></div>
      <div className="h-3 overflow-hidden rounded-full bg-vilu-paper/10"><div className="h-full rounded-full bg-vilu-lime" style={{ width: `${Math.min(100, value)}%` }} /></div>
    </div>
  );
}
