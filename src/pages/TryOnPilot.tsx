import {
  ArrowRight,
  Camera,
  CheckCircle2,
  Copy,
  LocateFixed,
  MapPinned,
  MapPin,
  MessageCircle,
  Navigation as RouteIcon,
  Phone,
  Send,
  ShieldCheck,
  SlidersHorizontal,
  Upload,
  X,
} from 'lucide-react';
import { ChangeEvent, CSSProperties, useMemo, useState } from 'react';
import { opticsDirectory, DirectoryOptic } from '../data/opticsDirectory';
import { formatPrice } from '../data/products';
import { pilotFrames, PilotFrame } from '../data/pilotOptics';

interface TryOnPilotProps {
  onNavigate?: (page: string) => void;
}

interface UserLocation {
  lat: number;
  lng: number;
  label: string;
}

interface IntentEvent {
  id: string;
  createdAt: string;
  action: 'route' | 'call' | 'whatsapp' | 'telegram' | 'copy';
  opticId: string;
  opticName: string;
  selectedFrames: string[];
  goal: string;
}

const INTENT_KEY = 'visionlux_tryon_intent_events';
const MAX_SELECTED_FRAMES = 3;

const fitGoals = [
  'Для офиса',
  'На каждый день',
  'Солнцезащитные',
  'Для компьютера',
  'Выразительная оправа',
  'Минимализм',
];

const cityFallbacks: Record<string, UserLocation> = {
  'Москва': { lat: 55.7558, lng: 37.6173, label: 'Москва' },
  'Санкт-Петербург': { lat: 59.9343, lng: 30.3351, label: 'Санкт-Петербург' },
  'Казань': { lat: 55.7961, lng: 49.1064, label: 'Казань' },
};

function frameLabel(frame: PilotFrame) {
  return `${frame.brand} ${frame.model}`;
}

function frameUseCase(frame: PilotFrame, selectedGoal: string) {
  if (frame.category === 'sunglasses') return 'прогулки / вождение';
  if (frame.material.toLowerCase().includes('металл')) return 'минимализм / офис';
  return selectedGoal ? selectedGoal.toLowerCase() : 'офис / каждый день';
}

function getFitScore(frame: PilotFrame) {
  const sizeMatch = frame.size.match(/^(\d+)-(\d+)-(\d+)/);
  const lensWidth = sizeMatch ? Number(sizeMatch[1]) : 50;
  const bridgeWidth = sizeMatch ? Number(sizeMatch[2]) : 18;
  const isWide = lensWidth >= 53;
  const isCompact = lensWidth <= 49;
  const widthScore = isWide ? 72 : isCompact ? 88 : 84;
  const eyeScore = isWide ? 76 : 86;
  const styleScore = frame.category === 'sunglasses' ? 82 : frame.material.toLowerCase().includes('металл') ? 80 : 86;
  const bridgeScore = bridgeWidth >= 20 ? 76 : 84;
  const total = Math.round(widthScore * 0.4 + eyeScore * 0.3 + styleScore * 0.2 + bridgeScore * 0.1);

  return {
    total,
    label: total >= 86 ? 'Подходит для первого визита' : total >= 80 ? 'Хорошо для первого отбора' : 'Стоит сравнить размер в салоне',
    strengths: [
      'Ширина оправы выглядит сбалансированной.',
      'Глаза близко к центру линз.',
      frame.category === 'sunglasses'
        ? 'Стиль подходит для прогулок, вождения и яркого повседневного образа.'
        : 'Стиль подходит для офиса и повседневной носки.',
    ],
    checks: [
      'посадку на переносице;',
      isWide ? 'размер M, если L окажется широковат.' : 'комфорт дужек после 5-10 минут примерки.',
    ],
  };
}

function distanceKm(from: UserLocation, optic: DirectoryOptic) {
  const earthRadiusKm = 6371;
  const dLat = ((optic.lat - from.lat) * Math.PI) / 180;
  const dLng = ((optic.lng - from.lng) * Math.PI) / 180;
  const lat1 = (from.lat * Math.PI) / 180;
  const lat2 = (optic.lat * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDistance(km: number) {
  if (km < 1) return `${Math.round(km * 1000)} м`;
  return `${km.toFixed(km < 10 ? 1 : 0)} км`;
}

function getStoredIntentEvents(): IntentEvent[] {
  try {
    return JSON.parse(localStorage.getItem(INTENT_KEY) || '[]') as IntentEvent[];
  } catch {
    return [];
  }
}

function saveIntentEvent(event: IntentEvent) {
  const next = [event, ...getStoredIntentEvents()].slice(0, 100);
  localStorage.setItem(INTENT_KEY, JSON.stringify(next));
}

function FrameDrawing({ frame, className = '', style, compact = false }: { frame: PilotFrame; className?: string; style?: CSSProperties; compact?: boolean }) {
  const lensHeight = compact ? 'h-14' : 'h-20';
  const borderWidth = compact ? 'border-[7px]' : 'border-[9px]';
  const bridgeWidth = compact ? 'w-6' : 'w-8';
  const bridgeHeight = compact ? 'h-2' : 'h-3';

  return (
    <div className={`flex items-center ${className}`} style={style}>
      <div className={`${lensHeight} flex-1 rounded-[42%] ${borderWidth} shadow-xl`} style={{ borderColor: frame.frameColor, backgroundColor: frame.lensTone }} />
      <div className={`${bridgeHeight} ${bridgeWidth} rounded-full`} style={{ backgroundColor: frame.frameColor }} />
      <div className={`${lensHeight} flex-1 rounded-[42%] ${borderWidth} shadow-xl`} style={{ borderColor: frame.frameColor, backgroundColor: frame.lensTone }} />
    </div>
  );
}

function FrameThumb({ frame, failedImages, onImageError }: { frame: PilotFrame; failedImages: Set<string>; onImageError: (frameId: string) => void }) {
  if (frame.imageUrl && !failedImages.has(frame.id)) {
    return <img src={frame.imageUrl} alt={frameLabel(frame)} onError={() => onImageError(frame.id)} className="h-24 w-[86%] object-contain" loading="lazy" />;
  }

  return <FrameDrawing frame={frame} compact className="w-[78%]" />;
}

export function TryOnPilot({ onNavigate }: TryOnPilotProps) {
  const frames = pilotFrames;
  const [selectedGoal, setSelectedGoal] = useState(fitGoals[0]);
  const [activeFrameId, setActiveFrameId] = useState(frames[0]?.id ?? '');
  const [selectedFrameIds, setSelectedFrameIds] = useState<string[]>([]);
  const [photoUrl, setPhotoUrl] = useState('');
  const [frameScale, setFrameScale] = useState(66);
  const [frameX, setFrameX] = useState(50);
  const [frameY, setFrameY] = useState(43);
  const [failedFrameImages, setFailedFrameImages] = useState<Set<string>>(new Set());
  const [fitScoreFrameId, setFitScoreFrameId] = useState('');
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [geoStatus, setGeoStatus] = useState('');
  const [copiedOpticId, setCopiedOpticId] = useState('');
  const [intentCount, setIntentCount] = useState(() => getStoredIntentEvents().length);

  const activeFrame = frames.find((frame) => frame.id === activeFrameId) ?? frames[0];
  const selectedFrames = frames.filter((frame) => selectedFrameIds.includes(frame.id));
  const activeFrameHasImage = Boolean(activeFrame?.imageUrl) && !failedFrameImages.has(activeFrame.id);
  const fitScore = activeFrame && fitScoreFrameId === activeFrame.id ? getFitScore(activeFrame) : null;

  const nearbyOptics = useMemo(() => {
    const sourceLocation = userLocation ?? cityFallbacks['Москва'];
    return opticsDirectory
      .map((optic) => ({ optic, distance: distanceKm(sourceLocation, optic) }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 4);
  }, [userLocation]);

  const selectionText = selectedFrames.length > 0
    ? selectedFrames.map((frame, index) => `${index + 1}. ${frameLabel(frame)} - ${frame.color}, ${frameUseCase(frame, selectedGoal)}`).join('\n')
    : 'Подбор пока пуст.';

  const markFrameImageFailed = (frameId: string) => {
    setFailedFrameImages((current) => new Set(current).add(frameId));
  };

  const handlePhoto = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setPhotoUrl(URL.createObjectURL(file));
  };

  const toggleFrame = (frameId: string) => {
    setSelectedFrameIds((current) => {
      if (current.includes(frameId)) return current.filter((id) => id !== frameId);
      if (current.length >= MAX_SELECTED_FRAMES) return current;
      return [...current, frameId];
    });
  };

  const saveActiveFrame = () => {
    if (!activeFrame) return;
    setSelectedFrameIds((current) => current.includes(activeFrame.id) ? current : [activeFrame.id, ...current].slice(0, MAX_SELECTED_FRAMES));
  };

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setGeoStatus('Геолокация недоступна в этом браузере. Выберите город вручную.');
      return;
    }

    setGeoStatus('Запрашиваем разрешение браузера...');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          label: 'ваше местоположение',
        });
        setGeoStatus('Показываем оптики рядом. Точные координаты не сохраняются.');
      },
      () => {
        setGeoStatus('Не получилось получить геолокацию. Можно выбрать город вручную.');
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 },
    );
  };

  const chooseCity = (city: string) => {
    setUserLocation(cityFallbacks[city]);
    setGeoStatus(`Показываем оптики для города: ${city}.`);
  };

  const recordIntent = (optic: DirectoryOptic, action: IntentEvent['action']) => {
    saveIntentEvent({
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      action,
      opticId: optic.id,
      opticName: optic.name,
      selectedFrames: selectedFrames.map(frameLabel),
      goal: selectedGoal,
    });
    setIntentCount(getStoredIntentEvents().length);
  };

  const copySelection = async (optic: DirectoryOptic) => {
    const text = `Мой подбор ViLu / VisionLux\nЦель: ${selectedGoal}\n${selectionText}\n\nПеред визитом уточните наличие похожих моделей.\nОптика: ${optic.name}, ${optic.address}`;
    await navigator.clipboard.writeText(text);
    recordIntent(optic, 'copy');
    setCopiedOpticId(optic.id);
  };

  const openRoute = (optic: DirectoryOptic) => {
    recordIntent(optic, 'route');
    window.open(`https://www.google.com/maps/search/?api=1&query=${optic.lat},${optic.lng}`, '_blank', 'noopener,noreferrer');
  };

  const openWhatsApp = (optic: DirectoryOptic) => {
    if (!optic.whatsapp) return;
    recordIntent(optic, 'whatsapp');
    const message = `Здравствуйте! Хочу уточнить наличие похожих оправ по подбору ViLu:%0A${encodeURIComponent(selectionText)}`;
    window.open(`https://wa.me/${optic.whatsapp.replace(/\D/g, '')}?text=${message}`, '_blank', 'noopener,noreferrer');
  };

  const openTelegram = (optic: DirectoryOptic) => {
    if (!optic.telegram) return;
    recordIntent(optic, 'telegram');
    window.open(`https://t.me/${optic.telegram.replace('@', '')}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#fffaf2]">
      <section className="w-full overflow-x-hidden border-b border-slate-900/10 bg-[#f7f1e8] px-4 py-10 sm:px-6 sm:py-12">
        <div className="mx-auto grid w-full max-w-7xl min-w-0 gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:items-center">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#9a6933] sm:text-sm">Try-On Pilot</p>
            <h1 className="mt-4 max-w-full break-words text-4xl font-black leading-[1.02] text-slate-950 sm:text-5xl md:text-7xl md:leading-[0.95]">
              Подберите очки онлайн и найдите, где примерить похожие рядом
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
              Загрузите фото, выберите 2-3 подходящих стиля и получите список ближайших оптик для финальной примерки.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a href="#fit-goal" className="inline-flex justify-center rounded-full bg-slate-950 px-7 py-4 text-xs font-black uppercase tracking-[0.16em] text-white transition hover:bg-[#315c56]">
                Начать подбор <ArrowRight className="ml-2" size={16} />
              </a>
              <a href="#nearby-optics" className="inline-flex justify-center rounded-full bg-white px-7 py-4 text-xs font-black uppercase tracking-[0.16em] text-slate-950 ring-1 ring-slate-900/10 transition hover:bg-stone-50">
                Оптики после подбора
              </a>
            </div>
          </div>

          <div className="min-w-0 rounded-[2rem] bg-slate-950 p-5 text-white shadow-2xl shadow-slate-900/20 sm:rounded-[2.5rem] sm:p-6">
            <div className="grid min-w-0 gap-4 sm:grid-cols-2">
              {['Примерил', 'Понял, что подходит', 'Сохранил подбор', 'Маршрут / звонок / WhatsApp / Telegram'].map((label, index) => (
                <div key={label} className="min-w-0 rounded-3xl bg-white/10 p-5">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f5b25f] text-sm font-black text-slate-950">{index + 1}</span>
                  <p className="mt-4 font-black">{label}</p>
                </div>
              ))}
            </div>
            <p className="mt-6 text-sm leading-6 text-white/60">
              Это не справочник оптик. Список появляется после персонального подбора оправ и работает как intent-сигнал для партнерских точек.
            </p>
          </div>
        </div>
      </section>

      <div className="mx-auto grid w-full max-w-7xl min-w-0 gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
        <main className="min-w-0 space-y-8">
          <section id="fit-goal" className="rounded-[2.5rem] bg-white p-6 shadow-sm ring-1 ring-slate-900/5 md:p-8">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#9a6933]">Цель подбора</p>
            <h2 className="mt-2 break-words text-3xl font-black tracking-tight">Выберите сценарий</h2>
            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {fitGoals.map((goal) => (
                <button
                  key={goal}
                  type="button"
                  onClick={() => setSelectedGoal(goal)}
                  className={`rounded-2xl px-5 py-4 text-left text-sm font-black transition ${selectedGoal === goal ? 'bg-[#315c56] text-white' : 'bg-stone-100 text-slate-700 hover:bg-stone-200'}`}
                >
                  {goal}
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-[2.5rem] bg-white p-5 shadow-sm ring-1 ring-slate-900/5 md:p-7">
            <div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-[#9a6933]">Примерка</p>
                <h2 className="mt-2 break-words text-3xl font-black tracking-tight">{activeFrame ? frameLabel(activeFrame) : 'Выберите оправу'}</h2>
              </div>
              <label className="inline-flex max-w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-slate-950 px-5 py-4 text-center text-xs font-black uppercase tracking-[0.12em] text-white transition hover:bg-[#315c56]">
                <Upload size={16} /> Загрузить фото
                <input type="file" accept="image/*" onChange={handlePhoto} className="hidden" />
              </label>
            </div>

            <div className="mb-5 flex gap-3 rounded-3xl bg-blue-50 p-4 text-sm leading-6 text-blue-950">
              <ShieldCheck className="mt-0.5 shrink-0" size={20} />
              <p>Фото используется только в вашем браузере для примерки и не отправляется на сервер.</p>
            </div>

            <div className="relative flex aspect-[4/3] min-h-[320px] w-full items-center justify-center overflow-hidden rounded-[2rem] bg-stone-100 sm:min-h-[360px]">
              {photoUrl ? (
                <img src={photoUrl} alt="Фото для примерки" className="absolute inset-0 h-full w-full object-contain" />
              ) : (
                <div className="max-w-md px-6 text-center">
                  <Camera className="mx-auto mb-5 text-[#315c56]" size={44} />
                  <p className="text-lg font-black">Загрузите фото лица</p>
                  <p className="mt-2 text-sm leading-6 text-slate-500">После загрузки можно подвинуть оправу и оценить посадку.</p>
                </div>
              )}

              {activeFrame && activeFrameHasImage && (
                <img
                  src={activeFrame.imageUrl}
                  alt={frameLabel(activeFrame)}
                  onError={() => markFrameImageFailed(activeFrame.id)}
                  className="absolute object-contain drop-shadow-2xl"
                  style={{ left: `${frameX}%`, top: `${frameY}%`, width: `${frameScale}%`, transform: 'translate(-50%, -50%)' }}
                />
              )}

              {activeFrame && !activeFrameHasImage && (
                <FrameDrawing
                  frame={activeFrame}
                  className="absolute max-w-[92%]"
                  style={{ left: `${frameX}%`, top: `${frameY}%`, width: `${frameScale}%`, transform: 'translate(-50%, -50%)' }}
                />
              )}
            </div>

            <div className="mt-6 grid min-w-0 gap-5 md:grid-cols-3">
              {[
                ['Масштаб', frameScale, setFrameScale, 42, 88],
                ['Влево / вправо', frameX, setFrameX, 32, 68],
                ['Выше / ниже', frameY, setFrameY, 25, 62],
              ].map(([label, value, setter, min, max]) => (
                <label key={label as string} className="rounded-3xl bg-stone-100 p-4">
                  <span className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-slate-400"><SlidersHorizontal size={14} /> {label as string}</span>
                  <input min={min as number} max={max as number} value={value as number} type="range" onChange={(event) => (setter as (next: number) => void)(Number(event.target.value))} className="w-full accent-[#315c56]" />
                </label>
              ))}
            </div>

            <div className="mt-6 rounded-[2rem] border border-slate-900/10 bg-[#f7f1e8] p-5 md:p-6">
              <div className="flex min-w-0 flex-col justify-between gap-4 md:flex-row md:items-center">
                <div className="min-w-0">
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-[#9a6933]">Face-fit score</p>
                  <h3 className="mt-2 break-words text-2xl font-black tracking-tight">Помощник выбора перед визитом</h3>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Оценка помогает выбрать оправы для салона. Финальную посадку проверяет консультант.</p>
                </div>
                <button type="button" onClick={() => activeFrame && setFitScoreFrameId(activeFrame.id)} className="rounded-full bg-slate-950 px-6 py-4 text-xs font-black uppercase tracking-[0.12em] text-white transition hover:bg-[#315c56]">
                  Оценить посадку
                </button>
              </div>

              {fitScore && activeFrame && (
                <div className="mt-5 grid gap-5 lg:grid-cols-[170px_1fr]">
                  <div className="rounded-[1.5rem] bg-white p-5 text-center ring-1 ring-slate-900/5">
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Скор</p>
                    <p className="mt-2 text-5xl font-black tracking-tight text-[#315c56]">{fitScore.total}</p>
                    <p className="text-sm font-black text-slate-500">из 100</p>
                  </div>
                  <div className="rounded-[1.5rem] bg-white p-5 ring-1 ring-slate-900/5">
                    <h4 className="break-words text-xl font-black tracking-tight">{fitScore.label}</h4>
                    <div className="mt-4 grid gap-3">
                      {fitScore.strengths.map((strength) => (
                        <div key={strength} className="flex gap-3 text-sm leading-6 text-slate-600">
                          <CheckCircle2 className="mt-1 shrink-0 text-[#315c56]" size={18} />
                          {strength}
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 rounded-2xl bg-amber-50 p-4 text-sm leading-6 text-amber-950">
                      <strong>Что проверить в салоне: </strong>{fitScore.checks.join(' ')}
                    </div>
                    <button type="button" onClick={saveActiveFrame} className="mt-4 w-full rounded-full bg-[#f5b25f] px-5 py-3 text-xs font-black uppercase tracking-[0.1em] text-slate-950 transition hover:bg-[#e5a34f]">
                      Сохранить в подбор
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>

          <section className="rounded-[2.5rem] bg-white p-6 shadow-sm ring-1 ring-slate-900/5 md:p-8">
            <div className="mb-6 grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-[#9a6933]">Каталог пилота</p>
                <h2 className="mt-2 break-words text-3xl font-black tracking-tight">Примерьте 6 оправ и выберите до 3</h2>
              </div>
              <p className="inline-flex min-w-[112px] items-center justify-center rounded-2xl bg-stone-100 px-4 py-3 text-sm font-black text-slate-950 ring-1 ring-slate-900/5 sm:mt-7">
                {selectedFrameIds.length} из {MAX_SELECTED_FRAMES}
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {frames.map((frame) => {
                const isActive = frame.id === activeFrame?.id;
                const isSelected = selectedFrameIds.includes(frame.id);
                return (
                  <article key={frame.id} className={`rounded-[2rem] p-4 ring-1 transition ${isActive ? 'bg-[#eef5f1] ring-[#315c56]/30' : 'bg-stone-50 ring-slate-900/5'}`}>
                    <button type="button" onClick={() => setActiveFrameId(frame.id)} className="block w-full text-left">
                      <div className="flex h-32 items-center justify-center rounded-[1.5rem] bg-white">
                        <FrameThumb frame={frame} failedImages={failedFrameImages} onImageError={markFrameImageFailed} />
                      </div>
                      <p className="mt-4 text-xs font-black uppercase tracking-[0.18em] text-slate-400">{frame.brand}</p>
                      <h3 className="mt-1 break-words text-xl font-black tracking-tight">{frame.model}</h3>
                      <p className="mt-2 text-sm text-slate-500">{frame.category === 'sunglasses' ? 'Солнцезащитные' : 'Оправа'} - {frame.color} - {frame.size}</p>
                      <p className="mt-3 text-lg font-black">{formatPrice(frame.price)}</p>
                    </button>
                    <button type="button" onClick={() => toggleFrame(frame.id)} className={`mt-4 flex w-full items-center justify-center gap-2 rounded-full px-4 py-3 text-xs font-black uppercase tracking-[0.14em] transition ${isSelected ? 'bg-[#315c56] text-white' : 'bg-[#f5b25f] text-slate-950 hover:bg-[#e5a34f]'}`}>
                      {isSelected ? <><X size={15} /> Убрать</> : <><CheckCircle2 size={15} /> Выбрать</>}
                    </button>
                  </article>
                );
              })}
            </div>
          </section>
        </main>

        <aside className="min-w-0 space-y-8 lg:sticky lg:top-28 lg:h-fit">
          <section className="rounded-[2.5rem] bg-white p-7 shadow-sm ring-1 ring-slate-900/5">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#9a6933]">Мой подбор</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight">Чеклист для визита</h2>
            <p className="mt-3 text-sm leading-6 text-slate-500">Сохраните 2-3 варианта, а затем выберите ближайшую оптику для финальной примерки.</p>

            <div className="mt-6 grid gap-3">
              {selectedFrames.length > 0 ? selectedFrames.map((frame, index) => (
                <div key={frame.id} className="rounded-3xl bg-stone-100 p-4">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Вариант {index + 1}</p>
                  <p className="mt-2 font-black">{frameLabel(frame)}</p>
                  <p className="mt-1 text-sm leading-6 text-slate-500">{frame.color} - {frameUseCase(frame, selectedGoal)}</p>
                </div>
              )) : (
                <div className="rounded-3xl bg-stone-100 p-5 text-sm leading-6 text-slate-500">Пока нет сохраненных оправ. Нажмите “Сохранить в подбор” после Face-fit score или выберите оправу в каталоге.</div>
              )}
            </div>

            <a href="#nearby-optics" className={`mt-6 flex w-full items-center justify-center gap-2 rounded-full px-6 py-4 text-xs font-black uppercase tracking-[0.14em] transition ${selectedFrames.length > 0 ? 'bg-slate-950 text-white hover:bg-[#315c56]' : 'pointer-events-none bg-slate-200 text-slate-400'}`}>
              Найти оптику рядом <MapPinned size={16} />
            </a>
          </section>

          <section className="rounded-[2.5rem] bg-slate-950 p-7 text-white shadow-2xl shadow-slate-900/20">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#f5b25f]">Intent-сигналы</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight">{intentCount}</h2>
            <p className="mt-3 text-sm leading-6 text-white/65">Считаем клики по маршруту, звонку, WhatsApp, Telegram и копированию подбора. Точное местоположение и фото не сохраняются.</p>
          </section>

          <button onClick={() => onNavigate?.('products')} className="w-full rounded-full bg-[#f5b25f] px-6 py-4 text-xs font-black uppercase tracking-[0.16em] text-slate-950 transition hover:bg-white">
            Вернуться в магазин
          </button>
        </aside>
      </div>

      <section id="nearby-optics" className="border-t border-slate-900/10 bg-[#eef5f1] px-4 py-12 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr]">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-[#9a6933]">Ближайшие оптики</p>
              <h2 className="mt-3 break-words text-4xl font-black tracking-tight md:text-5xl">Показываем рядом после подбора</h2>
              <p className="mt-5 text-base leading-8 text-slate-600">
                Чтобы показать ближайшие оптики, разрешите доступ к геолокации. Мы используем координаты только для сортировки оптик рядом и не сохраняем точное местоположение.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <button type="button" onClick={requestLocation} className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-950 px-6 py-4 text-xs font-black uppercase tracking-[0.14em] text-white transition hover:bg-[#315c56]">
                  <LocateFixed size={16} /> Показать рядом
                </button>
                <div className="flex flex-wrap gap-2">
                  {Object.keys(cityFallbacks).map((city) => (
                    <button key={city} type="button" onClick={() => chooseCity(city)} className="rounded-full bg-white px-4 py-3 text-xs font-black text-slate-700 ring-1 ring-slate-900/10 transition hover:bg-stone-50">
                      {city}
                    </button>
                  ))}
                </div>
              </div>
              {geoStatus && <p className="mt-4 rounded-2xl bg-white/70 p-4 text-sm leading-6 text-slate-600">{geoStatus}</p>}
            </div>

            <div className="grid gap-4">
              {nearbyOptics.map(({ optic, distance }) => (
                <article key={optic.id} className="rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-slate-900/5">
                  <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="break-words text-2xl font-black tracking-tight">{optic.name}</h3>
                        {optic.partnerStatus === 'partner' ? (
                          <span className="rounded-full bg-[#315c56] px-3 py-1 text-[11px] font-black text-white">Партнер ViLu</span>
                        ) : (
                          <span className="rounded-full bg-stone-100 px-3 py-1 text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">Открытые источники</span>
                        )}
                      </div>
                      <p className="mt-2 flex gap-2 text-sm leading-6 text-slate-600"><MapPin className="mt-1 shrink-0" size={16} /> {formatDistance(distance)} от {userLocation?.label ?? 'центра Москвы'} - {optic.address}</p>
                      <p className="mt-1 text-sm font-bold text-slate-500">Сегодня открыто до {optic.hours.split('-')[1] ?? optic.hours}</p>
                      <p className="mt-3 rounded-2xl bg-amber-50 p-3 text-sm leading-6 text-amber-950">Перед визитом уточните наличие похожих моделей.</p>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
                    <button type="button" onClick={() => openRoute(optic)} className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-950 px-4 py-3 text-xs font-black uppercase tracking-[0.1em] text-white transition hover:bg-[#315c56]">
                      <RouteIcon size={15} /> Маршрут
                    </button>
                    <a onClick={() => recordIntent(optic, 'call')} href={`tel:${optic.phone.replace(/\s/g, '')}`} className="inline-flex items-center justify-center gap-2 rounded-full bg-stone-100 px-4 py-3 text-xs font-black uppercase tracking-[0.1em] text-slate-800 transition hover:bg-stone-200">
                      <Phone size={15} /> Позвонить
                    </a>
                    <button type="button" onClick={() => openWhatsApp(optic)} disabled={!optic.whatsapp} className="inline-flex items-center justify-center gap-2 rounded-full bg-stone-100 px-4 py-3 text-xs font-black uppercase tracking-[0.1em] text-slate-800 transition hover:bg-stone-200 disabled:cursor-not-allowed disabled:opacity-45">
                      <MessageCircle size={15} /> WhatsApp
                    </button>
                    <button type="button" onClick={() => openTelegram(optic)} disabled={!optic.telegram} className="inline-flex items-center justify-center gap-2 rounded-full bg-stone-100 px-4 py-3 text-xs font-black uppercase tracking-[0.1em] text-slate-800 transition hover:bg-stone-200 disabled:cursor-not-allowed disabled:opacity-45">
                      <Send size={15} /> Telegram
                    </button>
                    <button type="button" onClick={() => copySelection(optic)} className="inline-flex items-center justify-center gap-2 rounded-full bg-[#f5b25f] px-4 py-3 text-xs font-black uppercase tracking-[0.1em] text-slate-950 transition hover:bg-[#e5a34f]">
                      <Copy size={15} /> {copiedOpticId === optic.id ? 'Скопировано' : 'Подбор'}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
