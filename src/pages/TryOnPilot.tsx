import { Camera, CheckCircle2, Download, MapPin, Phone, SlidersHorizontal, Upload, X } from 'lucide-react';
import { ChangeEvent, CSSProperties, FormEvent, useMemo, useState } from 'react';
import { formatPrice } from '../data/products';
import { pilotFrames, pilotOptics, PilotFrame } from '../data/pilotOptics';

interface TryOnPilotProps {
  onNavigate?: (page: string) => void;
}

interface PilotLead {
  id: string;
  createdAt: string;
  opticId: string;
  opticName: string;
  name: string;
  phone: string;
  messenger: string;
  preferredTime: string;
  selectedFrames: string[];
  status: 'new' | 'contacted' | 'booked' | 'visited' | 'bought' | 'lost';
}

const LEADS_KEY = 'visionlux_tryon_pilot_leads';
const MAX_SELECTED_FRAMES = 3;

function readLeads(): PilotLead[] {
  try {
    return JSON.parse(localStorage.getItem(LEADS_KEY) || '[]') as PilotLead[];
  } catch {
    return [];
  }
}

function saveLeads(leads: PilotLead[]) {
  localStorage.setItem(LEADS_KEY, JSON.stringify(leads));
}

function csvCell(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

function frameLabel(frame: PilotFrame) {
  return `${frame.brand} ${frame.model}`;
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

  const label = total >= 86 ? 'Отличный выбор для визита' : total >= 80 ? 'Хороший выбор для визита' : 'Стоит проверить размер в салоне';
  const risk = isWide
    ? 'Возможный риск: размер может быть широковат. Попросите консультанта подготовить похожую модель уже по мосту.'
    : isCompact
      ? 'Что проверить: компактная форма может ощущаться плотнее. В салоне стоит сравнить посадку на переносице.'
      : 'Что проверить: финальную посадку на переносице и комфорт дужек подтвердит консультант в салоне.';

  return {
    total,
    label,
    strengths: [
      'Ширина оправы визуально выглядит сбалансированной для первого отбора.',
      'Глаза находятся близко к центру линз, посадка выглядит спокойной.',
      frame.category === 'sunglasses'
        ? 'Стиль подходит для яркого повседневного образа и прогулок.'
        : 'Стиль подходит для офиса и повседневной носки.',
    ],
    risk,
  };
}

interface FrameDrawingProps {
  frame: PilotFrame;
  className?: string;
  style?: CSSProperties;
  compact?: boolean;
}

function FrameDrawing({ frame, className = '', style, compact = false }: FrameDrawingProps) {
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
    return (
      <img
        src={frame.imageUrl}
        alt={frameLabel(frame)}
        onError={() => onImageError(frame.id)}
        className="h-24 w-[86%] object-contain"
        loading="lazy"
      />
    );
  }

  return <FrameDrawing frame={frame} compact className="w-[78%]" />;
}

export function TryOnPilot({ onNavigate }: TryOnPilotProps) {
  const optic = pilotOptics[0];
  const frames = useMemo(() => pilotFrames.filter((frame) => frame.opticId === optic.id), [optic.id]);
  const [activeFrameId, setActiveFrameId] = useState(frames[0]?.id ?? '');
  const [selectedFrameIds, setSelectedFrameIds] = useState<string[]>([]);
  const [photoUrl, setPhotoUrl] = useState('');
  const [frameScale, setFrameScale] = useState(66);
  const [frameX, setFrameX] = useState(50);
  const [frameY, setFrameY] = useState(43);
  const [failedFrameImages, setFailedFrameImages] = useState<Set<string>>(new Set());
  const [fitScoreFrameId, setFitScoreFrameId] = useState('');
  const [leads, setLeads] = useState<PilotLead[]>(readLeads);
  const [submittedLead, setSubmittedLead] = useState<PilotLead | null>(null);
  const [form, setForm] = useState({
    name: '',
    phone: '',
    messenger: 'WhatsApp',
    preferredTime: '',
  });

  const activeFrame = frames.find((frame) => frame.id === activeFrameId) ?? frames[0];
  const selectedFrames = frames.filter((frame) => selectedFrameIds.includes(frame.id));
  const activeFrameHasImage = Boolean(activeFrame?.imageUrl) && !failedFrameImages.has(activeFrame.id);
  const fitScore = activeFrame && fitScoreFrameId === activeFrame.id ? getFitScore(activeFrame) : null;

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

  const prepareActiveFrame = () => {
    if (!activeFrame) return;
    setSelectedFrameIds((current) => current.includes(activeFrame.id) ? current : [activeFrame.id, ...current].slice(0, MAX_SELECTED_FRAMES));
  };

  const updateLeadStatus = (leadId: string, status: PilotLead['status']) => {
    const next = leads.map((lead) => lead.id === leadId ? { ...lead, status } : lead);
    setLeads(next);
    saveLeads(next);
  };

  const submitLead = (event: FormEvent) => {
    event.preventDefault();
    if (selectedFrameIds.length === 0) return;

    const lead: PilotLead = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      opticId: optic.id,
      opticName: optic.name,
      name: form.name.trim(),
      phone: form.phone.trim(),
      messenger: form.messenger,
      preferredTime: form.preferredTime.trim(),
      selectedFrames: selectedFrames.map(frameLabel),
      status: 'new',
    };
    const next = [lead, ...leads].slice(0, 100);
    setLeads(next);
    saveLeads(next);
    setSubmittedLead(lead);
    setForm({ name: '', phone: '', messenger: 'WhatsApp', preferredTime: '' });
  };

  const exportCsv = () => {
    const rows = [
      ['Дата', 'Оптика', 'Имя', 'Телефон', 'Мессенджер', 'Время', 'Оправы', 'Статус'],
      ...leads.map((lead) => [
        new Date(lead.createdAt).toLocaleString('ru-RU'),
        lead.opticName,
        lead.name,
        lead.phone,
        lead.messenger,
        lead.preferredTime,
        lead.selectedFrames.join('; '),
        lead.status,
      ]),
    ];
    const csv = rows.map((row) => row.map(csvCell).join(',')).join('\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `tryon-leads-${optic.id}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-[#fffaf2]">
      <section className="border-b border-slate-900/10 bg-[#f7f1e8] px-6 py-12">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.24em] text-[#9a6933]">Try-On Pilot</p>
            <h1 className="mt-4 text-5xl font-black leading-[0.95] tracking-[-0.06em] text-slate-950 md:text-7xl">
              Примерьте оправы онлайн и забронируйте лучшие в салоне
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
              Выберите 2-3 модели, отправьте заявку, и консультант подготовит оправы к вашему визиту.
            </p>
            <div className="mt-7 flex flex-wrap gap-3 text-sm font-bold text-slate-700">
              <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-3 ring-1 ring-slate-900/10"><MapPin size={16} /> {optic.address}</span>
              <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-3 ring-1 ring-slate-900/10"><Phone size={16} /> {optic.phone}</span>
            </div>
          </div>

          <div className="rounded-[2.5rem] bg-slate-950 p-6 text-white shadow-2xl shadow-slate-900/20">
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                ['1', 'Загрузите фото'],
                ['2', 'Примерьте оправы'],
                ['3', 'Оставьте заявку'],
              ].map(([step, label]) => (
                <div key={step} className="rounded-3xl bg-white/10 p-5">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f5b25f] text-sm font-black text-slate-950">{step}</span>
                  <p className="mt-4 font-black">{label}</p>
                </div>
              ))}
            </div>
            <p className="mt-6 text-sm leading-6 text-white/60">
              Онлайн-примерка не заменяет финальную посадку в салоне. Это MVP для проверки спроса и записи теплых клиентов.
            </p>
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-7xl gap-8 px-6 py-10 lg:grid-cols-[minmax(0,1fr)_420px]">
        <main className="space-y-8">
          <section className="rounded-[2.5rem] bg-white p-5 shadow-sm ring-1 ring-slate-900/5 md:p-7">
            <div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-[#9a6933]">Примерочная</p>
                <h2 className="mt-2 text-3xl font-black tracking-tight">{activeFrame ? frameLabel(activeFrame) : 'Выберите оправу'}</h2>
              </div>
              <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-full bg-slate-950 px-6 py-4 text-xs font-black uppercase tracking-[0.16em] text-white transition hover:bg-[#315c56]">
                <Upload size={16} /> Загрузить фото
                <input type="file" accept="image/*" onChange={handlePhoto} className="hidden" />
              </label>
            </div>

            <div className="relative flex aspect-[4/3] min-h-[360px] items-center justify-center overflow-hidden rounded-[2rem] bg-stone-100">
              {photoUrl ? (
                <img src={photoUrl} alt="Фото для примерки" className="absolute inset-0 h-full w-full object-contain" />
              ) : (
                <div className="max-w-md px-6 text-center">
                  <Camera className="mx-auto mb-5 text-[#315c56]" size={44} />
                  <p className="text-lg font-black">Загрузите фото лица</p>
                  <p className="mt-2 text-sm leading-6 text-slate-500">Для MVP фото остается только в вашем браузере и не отправляется на сервер.</p>
                </div>
              )}

              {activeFrame && activeFrameHasImage && (
                <img
                  src={activeFrame.imageUrl}
                  alt={frameLabel(activeFrame)}
                  onError={() => markFrameImageFailed(activeFrame.id)}
                  className="absolute object-contain drop-shadow-2xl"
                  style={{
                    left: `${frameX}%`,
                    top: `${frameY}%`,
                    width: `${frameScale}%`,
                    transform: 'translate(-50%, -50%)',
                  }}
                />
              )}

              {activeFrame && !activeFrameHasImage && (
                <FrameDrawing
                  frame={activeFrame}
                  className="absolute"
                  style={{
                    left: `${frameX}%`,
                    top: `${frameY}%`,
                    width: `${frameScale}%`,
                    transform: 'translate(-50%, -50%)',
                  }}
                />
              )}
            </div>

            <div className="mt-6 grid gap-5 md:grid-cols-3">
              {[
                ['Масштаб', frameScale, setFrameScale, 42, 88],
                ['Влево / вправо', frameX, setFrameX, 32, 68],
                ['Выше / ниже', frameY, setFrameY, 25, 62],
              ].map(([label, value, setter, min, max]) => (
                <label key={label as string} className="rounded-3xl bg-stone-100 p-4">
                  <span className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-slate-400"><SlidersHorizontal size={14} /> {label as string}</span>
                  <input
                    type="range"
                    min={min as number}
                    max={max as number}
                    value={value as number}
                    onChange={(event) => (setter as (next: number) => void)(Number(event.target.value))}
                    className="w-full accent-[#315c56]"
                  />
                </label>
              ))}
            </div>

            <div className="mt-6 rounded-[2rem] border border-slate-900/10 bg-[#f7f1e8] p-5 md:p-6">
              <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-[#9a6933]">Face-fit score</p>
                  <h3 className="mt-2 text-2xl font-black tracking-tight">Помощник выбора перед визитом</h3>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                    Это не диагноз и не медицинская рекомендация. Оценка помогает выбрать оправы для примерки в салоне.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => activeFrame && setFitScoreFrameId(activeFrame.id)}
                  className="rounded-full bg-slate-950 px-6 py-4 text-xs font-black uppercase tracking-[0.16em] text-white transition hover:bg-[#315c56]"
                >
                  Оценить посадку
                </button>
              </div>

              {fitScore && activeFrame && (
                <div className="mt-5 grid gap-5 lg:grid-cols-[170px_1fr]">
                  <div className="rounded-[1.5rem] bg-white p-5 text-center ring-1 ring-slate-900/5">
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Подходит</p>
                    <p className="mt-2 text-5xl font-black tracking-tight text-[#315c56]">{fitScore.total}</p>
                    <p className="text-sm font-black text-slate-500">из 100</p>
                  </div>

                  <div className="rounded-[1.5rem] bg-white p-5 ring-1 ring-slate-900/5">
                    <h4 className="text-xl font-black tracking-tight">{fitScore.label}</h4>
                    <div className="mt-4 grid gap-3">
                      {fitScore.strengths.map((strength) => (
                        <div key={strength} className="flex gap-3 text-sm leading-6 text-slate-600">
                          <CheckCircle2 className="mt-1 shrink-0 text-[#315c56]" size={18} />
                          {strength}
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 rounded-2xl bg-amber-50 p-4 text-sm leading-6 text-amber-950">
                      {fitScore.risk}
                    </div>
                    <button
                      type="button"
                      onClick={prepareActiveFrame}
                      className="mt-4 w-full rounded-full bg-[#f5b25f] px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-slate-950 transition hover:bg-[#e5a34f]"
                    >
                      Подготовить эту оправу и 2 похожие модели
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>

          <section className="rounded-[2.5rem] bg-white p-6 shadow-sm ring-1 ring-slate-900/5 md:p-8">
            <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-[#9a6933]">Каталог пилота</p>
                <h2 className="mt-2 text-3xl font-black tracking-tight">Выберите до 3 оправ</h2>
              </div>
              <p className="rounded-full bg-stone-100 px-4 py-2 text-sm font-black">{selectedFrameIds.length} / {MAX_SELECTED_FRAMES}</p>
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
                      <h3 className="mt-1 text-xl font-black tracking-tight">{frame.model}</h3>
                      <p className="mt-2 text-sm text-slate-500">{frame.category === 'sunglasses' ? 'Солнцезащитные' : 'Оправа'} · {frame.color} · {frame.size}</p>
                      <p className="mt-3 text-lg font-black">{formatPrice(frame.price)}</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleFrame(frame.id)}
                      className={`mt-4 flex w-full items-center justify-center gap-2 rounded-full px-4 py-3 text-xs font-black uppercase tracking-[0.14em] transition ${isSelected ? 'bg-[#315c56] text-white' : 'bg-[#f5b25f] text-slate-950 hover:bg-[#e5a34f]'}`}
                    >
                      {isSelected ? <><X size={15} /> Убрать</> : <><CheckCircle2 size={15} /> Выбрать</>}
                    </button>
                  </article>
                );
              })}
            </div>
          </section>
        </main>

        <aside className="space-y-8 lg:sticky lg:top-28 lg:h-fit">
          <section className="rounded-[2.5rem] bg-white p-7 shadow-sm ring-1 ring-slate-900/5">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#9a6933]">Заявка в салон</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight">Забронировать оправы</h2>
            <p className="mt-3 text-sm leading-6 text-slate-500">Салон свяжется с вами и подготовит выбранные модели к визиту.</p>

            {submittedLead && (
              <div className="mt-5 rounded-3xl bg-green-50 p-5 text-green-800">
                <CheckCircle2 className="mb-2" />
                <p className="font-black">Заявка получена</p>
                <p className="mt-1 text-sm leading-6">Консультант подготовит: {submittedLead.selectedFrames.join(', ')}.</p>
              </div>
            )}

            <form onSubmit={submitLead} className="mt-6 grid gap-4">
              <label>
                <span className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-slate-400">Имя</span>
                <input required value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} className="w-full rounded-2xl border border-slate-900/10 bg-stone-50 px-5 py-4 outline-none transition focus:border-[#315c56]" placeholder="Анна" />
              </label>
              <label>
                <span className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-slate-400">Телефон</span>
                <input required value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} className="w-full rounded-2xl border border-slate-900/10 bg-stone-50 px-5 py-4 outline-none transition focus:border-[#315c56]" placeholder="+7 900 000-00-00" />
              </label>
              <label>
                <span className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-slate-400">Мессенджер</span>
                <select value={form.messenger} onChange={(event) => setForm((current) => ({ ...current, messenger: event.target.value }))} className="w-full rounded-2xl border border-slate-900/10 bg-stone-50 px-5 py-4 outline-none transition focus:border-[#315c56]">
                  <option>WhatsApp</option>
                  <option>Telegram</option>
                  <option>Звонок</option>
                </select>
              </label>
              <label>
                <span className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-slate-400">Удобное время</span>
                <input value={form.preferredTime} onChange={(event) => setForm((current) => ({ ...current, preferredTime: event.target.value }))} className="w-full rounded-2xl border border-slate-900/10 bg-stone-50 px-5 py-4 outline-none transition focus:border-[#315c56]" placeholder="Сегодня после 18:00" />
              </label>

              <div className="rounded-3xl bg-stone-100 p-4">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Выбрано</p>
                {selectedFrames.length > 0 ? (
                  <div className="mt-3 grid gap-2">
                    {selectedFrames.map((frame) => <p key={frame.id} className="text-sm font-bold">{frameLabel(frame)}</p>)}
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-slate-500">Выберите хотя бы одну оправу.</p>
                )}
              </div>

              <button disabled={selectedFrameIds.length === 0} className="rounded-full bg-slate-950 px-6 py-4 text-xs font-black uppercase tracking-[0.16em] text-white transition hover:bg-[#315c56] disabled:cursor-not-allowed disabled:opacity-45">
                Отправить заявку
              </button>
            </form>
          </section>

          <section className="rounded-[2.5rem] bg-slate-950 p-7 text-white shadow-2xl shadow-slate-900/20">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-[#f5b25f]">MVP-админка</p>
                <h2 className="mt-2 text-3xl font-black tracking-tight">Лиды</h2>
              </div>
              <button onClick={exportCsv} disabled={leads.length === 0} className="rounded-full bg-white/10 p-3 text-white transition hover:bg-white/15 disabled:opacity-40" title="Скачать CSV">
                <Download size={18} />
              </button>
            </div>

            <div className="mt-6 grid gap-3">
              {leads.length === 0 ? (
                <div className="rounded-3xl bg-white/10 p-5 text-sm leading-6 text-white/65">Пока нет заявок. После отправки формы лид появится здесь и сохранится в браузере.</div>
              ) : leads.slice(0, 6).map((lead) => (
                <article key={lead.id} className="rounded-3xl bg-white/10 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <strong>{lead.name}</strong>
                      <p className="mt-1 text-sm text-white/60">{lead.phone} · {lead.messenger}</p>
                    </div>
                    <select value={lead.status} onChange={(event) => updateLeadStatus(lead.id, event.target.value as PilotLead['status'])} className="rounded-2xl border border-white/10 bg-slate-900 px-3 py-2 text-xs font-bold text-white">
                      <option value="new">новый</option>
                      <option value="contacted">связались</option>
                      <option value="booked">записан</option>
                      <option value="visited">пришел</option>
                      <option value="bought">купил</option>
                      <option value="lost">не купил</option>
                    </select>
                  </div>
                  <p className="mt-3 text-xs leading-5 text-white/55">{lead.selectedFrames.join(', ')}</p>
                </article>
              ))}
            </div>
          </section>

          <button onClick={() => onNavigate?.('products')} className="w-full rounded-full bg-[#f5b25f] px-6 py-4 text-xs font-black uppercase tracking-[0.16em] text-slate-950 transition hover:bg-white">
            Вернуться в магазин
          </button>
        </aside>
      </div>
    </div>
  );
}
