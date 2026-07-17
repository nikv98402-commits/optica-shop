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
import { ChangeEvent, CSSProperties, KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { cityCoordinates, opticsDirectory, DirectoryOptic } from '../data/opticsDirectory';
import { formatPrice } from '../data/products';
import { pilotFrames, PilotFrame } from '../data/pilotOptics';
import { analyzeFacePhoto, type FaceFitMeasurement, unsupportedPhotoMeasurement } from '../lib/faceFitEngine';
import { createLocalId } from '../lib/id';
import { AnalyticsEvent, AnalyticsEventName, trackEvent } from '../lib/analyticsEvents';
import { submitVisitLead as submitVisitLeadToBackend } from '../services/leadService';
import { toVisitLeadFrames } from '../services/selectionService';
import type { ServiceCheckoutFrame } from '../types/backend';

interface TryOnPilotProps {
  onNavigate?: (page: string) => void;
  onStartServiceCheckout?: (frames: ServiceCheckoutFrame[]) => void;
}

interface UserLocation {
  lat: number;
  lng: number;
  label: string;
}

interface IntentEvent {
  id: string;
  createdAt: string;
  action: 'route' | 'call' | 'whatsapp' | 'telegram' | 'copy' | 'visit_lead';
  opticId: string;
  opticName: string;
  selectedFrames: string[];
  goal: string;
}

interface VisitLeadForm {
  city: string;
  contactMethod: 'phone' | 'telegram' | 'whatsapp';
  contact: string;
  comment: string;
  consent: boolean;
}

const INTENT_KEY = 'visionlux_tryon_intent_events';
const PAYMENT_INTENT_KEY = 'vilu_payment_intent_stats';
const SELECTED_FRAMES_KEY = 'vilu_tryon_selected_frames_v1';
const MAX_SELECTED_FRAMES = 3;
const VISIT_PREP_OFFER = {
  id: 'visit_preparation_v1',
  price: 429,
  title: 'Приоритетная подготовка визита',
};
const FACE_FIT_IDLE: FaceFitMeasurement = {
  status: 'idle',
  confidence: 0,
  faceCount: 0,
  eyeDistanceRatio: 0,
  frameWidthHint: 66,
  frameCenterX: 50,
  frameCenterY: 43,
  eyeLineTiltDeg: 0,
  bridgeOffsetPct: 0,
  overlayPoints: [],
  checks: [],
  limitations: [],
};

const fitGoals = [
  'Для офиса',
  'На каждый день',
  'Солнцезащитные',
  'Для компьютера',
  'Выразительная оправа',
  'Минимализм',
];

const cityFallbacks: Record<string, UserLocation> = Object.fromEntries(
  Object.entries(cityCoordinates)
    .sort(([cityA], [cityB]) => cityA.localeCompare(cityB, 'ru'))
    .map(([city, coordinates]) => [city, { ...coordinates, label: city }]),
);

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

function formatDistance(km: number, language: 'ru' | 'en') {
  if (km < 1) return `${Math.round(km * 1000)} ${language === 'en' ? 'm' : 'м'}`;
  return `${km.toFixed(km < 10 ? 1 : 0)} ${language === 'en' ? 'km' : 'км'}`;
}

function opticHoursLabel(hours: string) {
  if (!hours.includes('-')) return hours;

  const closingTime = hours.split('-')[1];
  return closingTime ? `Сегодня открыто до ${closingTime}` : hours;
}

function mediaPipeStatusText(measurement: FaceFitMeasurement) {
  if (measurement.status === 'loading') return 'Ищем глаза и переносицу, чтобы поставить оправу ближе к реальной посадке.';
  if (measurement.status === 'ready') return 'Лицо найдено. ViLu может выровнять оправу по глазам и переносице.';
  if (measurement.status === 'no_face') return 'Лицо не найдено. Попробуйте фото анфас при хорошем освещении.';
  if (measurement.status === 'multiple_faces') return 'Найдено несколько лиц. Для примерки нужно одно лицо.';
  if (measurement.status === 'unsupported_photo') return 'Фото не открылось в браузере. Нужен JPEG, PNG или WebP.';
  if (measurement.status === 'error') return 'Автопосадка не загрузилась, базовая ручная примерка продолжает работать.';
  return 'Загрузите фото, чтобы ViLu нашел глаза и переносицу и предложил стартовую посадку оправы.';
}

function autoFitTitle(measurement: FaceFitMeasurement, autoFitApplied: boolean) {
  if (measurement.status === 'ready' && autoFitApplied) return 'Автопосадка готова';
  if (measurement.status === 'ready') return 'Лицо найдено';
  if (measurement.status === 'loading') return 'Анализируем фото';
  if (measurement.status === 'no_face') return 'Нужно другое фото';
  if (measurement.status === 'multiple_faces') return 'На фото несколько лиц';
  if (measurement.status === 'unsupported_photo') return 'Формат не поддержан';
  if (measurement.status === 'error') return 'Автопосадка недоступна';
  return 'Автопосадка оправы';
}

function autoFitResultText(measurement: FaceFitMeasurement, autoFitApplied: boolean) {
  if (measurement.status === 'ready' && autoFitApplied) {
    return 'Оправа выровнена по глазам и переносице. Теперь можно оценить общий баланс и сохранить модель в подбор.';
  }
  return mediaPipeStatusText(measurement);
}

function autoFitStageLabel(measurement: FaceFitMeasurement, autoFitApplied: boolean) {
  if (measurement.status === 'ready' && autoFitApplied) return 'Готово';
  if (measurement.status === 'ready') return 'Можно подстроить';
  if (measurement.status === 'loading') return 'Анализ фото';
  if (measurement.status === 'idle') return 'Ждем фото';
  return 'Ручной режим';
}

function autoFitStageClass(measurement: FaceFitMeasurement, autoFitApplied: boolean) {
  if (measurement.status === 'ready' && autoFitApplied) return 'bg-vilu-lime text-vilu-ink';
  if (measurement.status === 'ready') return 'bg-vilu-lime/20 text-vilu-ink ring-1 ring-vilu-lime/30';
  if (measurement.status === 'loading') return 'bg-vilu-ink text-vilu-paper';
  if (measurement.status === 'idle') return 'bg-vilu-paper text-vilu-ink/65 ring-1 ring-vilu-ink/10';
  return 'bg-vilu-paper text-vilu-ink/72 ring-1 ring-vilu-ink/10';
}

function photoQualityLabel(measurement: FaceFitMeasurement) {
  if (measurement.status === 'loading') return { label: 'анализируем', className: 'bg-vilu-ink text-vilu-paper' };
  if (measurement.status !== 'ready') return { label: 'нужна проверка', className: 'bg-vilu-paper text-vilu-ink/72 ring-1 ring-vilu-ink/10' };
  if (measurement.confidence >= 82) return { label: 'хорошее', className: 'bg-vilu-lime text-vilu-ink' };
  if (measurement.confidence >= 65) return { label: 'среднее', className: 'bg-vilu-lime/20 text-vilu-ink ring-1 ring-vilu-lime/30' };
  return { label: 'лучше переснять', className: 'bg-vilu-paper text-vilu-ink/72 ring-1 ring-vilu-ink/10' };
}

function autoFitChecklist(measurement: FaceFitMeasurement, autoFitApplied: boolean) {
  if (measurement.status === 'ready') {
    return [
      {
        title: autoFitApplied ? 'Посадка применена' : 'Лицо найдено',
        text: autoFitApplied ? 'Оправа стоит по центру глаз и переносице.' : 'ViLu нашел глаза, переносицу и центр лица.',
      },
      {
        title: 'Масштаб',
        text: `Стартовая ширина оправы: ${Math.round(measurement.frameWidthHint)}%.`,
      },
      {
        title: 'Проверка фото',
        text: Math.abs(measurement.eyeLineTiltDeg) <= 4
          ? 'Линия глаз ровная для предварительной оценки.'
          : 'Фото немного наклонено, посадку лучше перепроверить.',
      },
    ];
  }

  if (measurement.status === 'loading') {
    return [
      { title: 'Ищем ориентиры', text: 'Определяем глаза, переносицу и центр лица.' },
      { title: 'Готовим посадку', text: 'После анализа предложим стартовую позицию оправы.' },
      { title: 'Контроль вручную', text: 'Ручная подстройка остается доступной.' },
    ];
  }

  if (measurement.status === 'idle') {
    return [
      { title: 'Фото анфас', text: 'Смотрите прямо в камеру.' },
      { title: 'Уровень глаз', text: 'Держите телефон на уровне глаз.' },
      { title: 'Дистанция', text: 'Лицо занимает 40-60% кадра.' },
    ];
  }

  return [
    { title: 'Нужна проверка', text: 'Автопосадка не смогла уверенно оценить фото.' },
    { title: 'Без блокировки', text: 'Ручная примерка продолжает работать.' },
    { title: 'Что попробовать', text: 'Загрузите JPEG, PNG или WebP при хорошем свете.' },
  ];
}

function isLikelyUnsupportedPhoto(file: File) {
  const fileName = file.name.toLowerCase();
  return file.type === 'image/heic' || file.type === 'image/heif' || fileName.endsWith('.heic') || fileName.endsWith('.heif');
}

function getDecodedImageSize(url: string) {
  return new Promise<{ width: number; height: number } | null>((resolve) => {
    const image = new Image();
    image.onload = () => resolve({ width: image.naturalWidth || image.width, height: image.naturalHeight || image.height });
    image.onerror = () => resolve(null);
    image.src = url;
  });
}

function routeQuery(optic: DirectoryOptic) {
  return encodeURIComponent(`${optic.name}, ${optic.address}`);
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

function getPaymentIntentCount() {
  if (typeof window === 'undefined') return 0;
  const rawValue = localStorage.getItem(PAYMENT_INTENT_KEY);
  if (!rawValue) return 0;

  try {
    const parsed = JSON.parse(rawValue) as { count?: number };
    return Number(parsed.count ?? 0);
  } catch {
    return 0;
  }
}

function savePaymentIntentClick() {
  const count = getPaymentIntentCount() + 1;
  localStorage.setItem(PAYMENT_INTENT_KEY, JSON.stringify({
    count,
    lastClickedAt: new Date().toISOString(),
    offerId: VISIT_PREP_OFFER.id,
  }));
  return count;
}

function getStoredSelectedFrames(validFrameIds: Set<string>) {
  if (typeof window === 'undefined') return [];

  try {
    const stored = JSON.parse(localStorage.getItem(SELECTED_FRAMES_KEY) || '[]');
    if (!Array.isArray(stored)) return [];
    return stored
      .filter((frameId): frameId is string => typeof frameId === 'string' && validFrameIds.has(frameId))
      .slice(0, MAX_SELECTED_FRAMES);
  } catch {
    return [];
  }
}

async function copyTextSafely(text: string) {
  if (!navigator.clipboard?.writeText) {
    return false;
  }

  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
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

export function TryOnPilot({ onNavigate, onStartServiceCheckout }: TryOnPilotProps) {
  const { language } = useLanguage();
  const frames = pilotFrames;
  const validFrameIds = useMemo(() => new Set(frames.map((frame) => frame.id)), [frames]);
  const [selectedGoal, setSelectedGoal] = useState(fitGoals[0]);
  const [activeFrameId, setActiveFrameId] = useState(frames[0]?.id ?? '');
  const [selectedFrameIds, setSelectedFrameIds] = useState<string[]>(() => getStoredSelectedFrames(validFrameIds));
  const [photoUrl, setPhotoUrl] = useState('');
  const [photoAspectRatio, setPhotoAspectRatio] = useState(3 / 4);
  const [frameScale, setFrameScale] = useState(66);
  const [frameX, setFrameX] = useState(50);
  const [frameY, setFrameY] = useState(43);
  const [faceFitMeasurement, setFaceFitMeasurement] = useState<FaceFitMeasurement>(FACE_FIT_IDLE);
  const [showLandmarks, setShowLandmarks] = useState(false);
  const [autoFitApplied, setAutoFitApplied] = useState(false);
  const [failedFrameImages, setFailedFrameImages] = useState<Set<string>>(new Set());
  const [fitScoreFrameId, setFitScoreFrameId] = useState('');
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [geoStatus, setGeoStatus] = useState('');
  const [copiedOpticId, setCopiedOpticId] = useState('');
  const [isVisitLeadOpen, setIsVisitLeadOpen] = useState(false);
  const [isPaymentDoorOpen, setIsPaymentDoorOpen] = useState(false);
  const [isSubmittingVisitLead, setIsSubmittingVisitLead] = useState(false);
  const [paymentDoorStatus, setPaymentDoorStatus] = useState('');
  const [visitLeadStatus, setVisitLeadStatus] = useState('');
  const [visitLeadForm, setVisitLeadForm] = useState<VisitLeadForm>({
    city: 'Москва',
    contactMethod: 'telegram',
    contact: '',
    comment: '',
    consent: false,
  });
  const [intentCount, setIntentCount] = useState(() => getStoredIntentEvents().length);
  const paymentDialogRef = useRef<HTMLDivElement>(null);
  const paymentTriggerRef = useRef<HTMLElement | null>(null);

  const activeFrame = frames.find((frame) => frame.id === activeFrameId) ?? frames[0];
  const selectedFrames = frames.filter((frame) => selectedFrameIds.includes(frame.id));
  const activeFrameHasImage = Boolean(activeFrame?.imageUrl) && !failedFrameImages.has(activeFrame.id);
  const fitScore = activeFrame && fitScoreFrameId === activeFrame.id ? getFitScore(activeFrame) : null;
  const paymentEntryText = language === 'ru' ? 'Подготовить визит за 429 ₽' : 'Prepare the visit for 429 RUB';
  const paymentDialogCloseLabel = language === 'ru' ? 'Закрыть оплату' : 'Close payment';

  useEffect(() => {
    localStorage.setItem(SELECTED_FRAMES_KEY, JSON.stringify(selectedFrameIds));
  }, [selectedFrameIds]);

  useEffect(() => {
    if (!isPaymentDoorOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    paymentTriggerRef.current = previousFocus;
    document.body.style.overflow = 'hidden';

    const dialog = paymentDialogRef.current;
    const focusable = dialog?.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])');
    focusable?.[0]?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      paymentTriggerRef.current?.focus();
      paymentTriggerRef.current = null;
    };
  }, [isPaymentDoorOpen]);
  const activeFrameScore = activeFrame ? getFitScore(activeFrame) : null;

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

  const canPrepareVisit = selectedFrames.length >= 2;
  const canSubmitVisitLead = canPrepareVisit && visitLeadForm.contact.trim().length >= 3 && visitLeadForm.consent;
  const paymentDoorDisabled = selectedFrames.length < 1;
  const photoQuality = photoQualityLabel(faceFitMeasurement);
  const autoFitChecklistItems = autoFitChecklist(faceFitMeasurement, autoFitApplied);

  const markFrameImageFailed = (frameId: string) => {
    setFailedFrameImages((current) => new Set(current).add(frameId));
  };

  const handlePhoto = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (isLikelyUnsupportedPhoto(file)) {
      setPhotoUrl('');
      setFaceFitMeasurement(unsupportedPhotoMeasurement(file.name));
      return;
    }

    const nextPhotoUrl = URL.createObjectURL(file);
    const imageSize = await getDecodedImageSize(nextPhotoUrl);
    if (!imageSize) {
      URL.revokeObjectURL(nextPhotoUrl);
      setPhotoUrl('');
      setFaceFitMeasurement(unsupportedPhotoMeasurement(file.name));
      return;
    }

    setPhotoUrl(nextPhotoUrl);
    setPhotoAspectRatio(imageSize.width / imageSize.height);
    setFaceFitMeasurement({ ...FACE_FIT_IDLE, status: 'loading' });
    setAutoFitApplied(false);
    setShowLandmarks(false);
    trackEvent(AnalyticsEvent.PhotoUploaded, { source: 'tryon' });
    analyzeFacePhoto(nextPhotoUrl).then((measurement) => {
      setFaceFitMeasurement(measurement);
      if (measurement.status === 'ready') {
        applyAutoFit(measurement);
        trackEvent(AnalyticsEvent.FaceLandmarkerAnalyzed, {
          status: measurement.status,
          confidence: measurement.confidence,
          face_count: measurement.faceCount,
        });
      }
    });
  };

  const applyAutoFit = (measurement = faceFitMeasurement) => {
    if (measurement.status !== 'ready') return;
    setFrameScale(measurement.frameWidthHint);
    setFrameX(measurement.frameCenterX);
    setFrameY(measurement.frameCenterY);
    setAutoFitApplied(true);
    if (activeFrame) setFitScoreFrameId(activeFrame.id);
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
    trackEvent(AnalyticsEvent.FrameSaved, { frame_id: activeFrame.id, goal: selectedGoal });
  };

  const requestLocation = () => {
    trackEvent(AnalyticsEvent.NearbyOpticsOpened, { method: 'geolocation' });
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
    trackEvent(AnalyticsEvent.NearbyOpticsOpened, { method: 'city_fallback', city });
  };

  const recordIntent = (optic: DirectoryOptic, action: IntentEvent['action']) => {
    saveIntentEvent({
      id: createLocalId('intent'),
      createdAt: new Date().toISOString(),
      action,
      opticId: optic.id,
      opticName: optic.name,
      selectedFrames: selectedFrames.map(frameLabel),
      goal: selectedGoal,
    });
    setIntentCount(getStoredIntentEvents().length);

    const goalByAction: Record<IntentEvent['action'], AnalyticsEventName> = {
      route: AnalyticsEvent.RouteClicked,
      call: AnalyticsEvent.CallClicked,
      whatsapp: AnalyticsEvent.WhatsappClicked,
      telegram: AnalyticsEvent.TelegramClicked,
      copy: AnalyticsEvent.SelectionCopied,
      visit_lead: AnalyticsEvent.VisitLeadSubmitted,
    };
    trackEvent(goalByAction[action], {
      optic_id: optic.id,
      selected_count: selectedFrames.length,
      goal: selectedGoal,
    });
  };

  const openVisitLead = () => {
    if (!canPrepareVisit) {
      setVisitLeadStatus('Сохраните минимум 2 оправы, чтобы подготовить подбор к визиту.');
      return;
    }
    setVisitLeadStatus('');
    setVisitLeadForm((current) => ({
      ...current,
      city: userLocation?.label && userLocation.label !== 'ваше местоположение' ? userLocation.label : current.city,
    }));
    setIsVisitLeadOpen(true);
    trackEvent(AnalyticsEvent.VisitLeadOpened, {
      selected_count: selectedFrames.length,
      source: 'selection_card',
    });
  };

  const openPaymentDoor = (source: string) => {
    setPaymentDoorStatus('');
    setIsPaymentDoorOpen(true);
    trackEvent(AnalyticsEvent.PaymentDoorViewed, {
      offer_id: VISIT_PREP_OFFER.id,
      price: VISIT_PREP_OFFER.price,
      selected_count: selectedFrames.length,
      source,
    });
  };

  const clickPaymentIntent = () => {
    if (selectedFrames.length < 1) return;
    const intentClicks = savePaymentIntentClick();
    trackEvent(AnalyticsEvent.PaymentIntentClicked, {
      offer_id: VISIT_PREP_OFFER.id,
      price: VISIT_PREP_OFFER.price,
      selected_count: selectedFrames.length,
      intent_clicks: intentClicks,
      source: 'fake_payment_modal',
    });

    const frames: ServiceCheckoutFrame[] = selectedFrames.slice(0, 3).map((frame) => ({
      frameId: frame.id,
      frameName: `${frame.brand} ${frame.model}`,
      frameBrand: frame.brand,
      frameCategory: frame.category,
      frameSize: frame.size,
      framePriceRub: frame.price,
      fitScore: activeFrameScore?.total,
      useCase: selectedGoal,
      imageUrl: frame.imageUrl,
    }));
    setIsPaymentDoorOpen(false);
    onStartServiceCheckout?.(frames);
  };

  const closePaymentDoor = () => {
    setIsPaymentDoorOpen(false);
    trackEvent(AnalyticsEvent.PaymentDoorDismissed, {
      offer_id: VISIT_PREP_OFFER.id,
      selected_count: selectedFrames.length,
    });
  };

  const handlePaymentDialogKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      closePaymentDoor();
      return;
    }

    if (event.key !== 'Tab') return;
    const focusable = Array.from(paymentDialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])') ?? []);
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const submitVisitLead = async () => {
    if (isSubmittingVisitLead) return;

    if (!canSubmitVisitLead) {
      setVisitLeadStatus('Укажите контакт и подтвердите согласие, чтобы подготовить заявку к визиту.');
      return;
    }

    setIsSubmittingVisitLead(true);
    setVisitLeadStatus('Готовим подбор. Фото, рецепт и точные координаты не отправляются.');

    saveIntentEvent({
      id: createLocalId('intent'),
      createdAt: new Date().toISOString(),
      action: 'visit_lead',
      opticId: 'visit-lead',
      opticName: visitLeadForm.city,
      selectedFrames: selectedFrames.map(frameLabel),
      goal: selectedGoal,
    });
    setIntentCount(getStoredIntentEvents().length);

    trackEvent(AnalyticsEvent.VisitLeadSubmitted, {
      selected_count: selectedFrames.length,
      mode: 'backend_first',
    });

    const backendResult = await submitVisitLeadToBackend({
      locale: language,
      contactValue: visitLeadForm.contact.trim(),
      contactChannel: visitLeadForm.contactMethod,
      city: visitLeadForm.city,
      consentPersonalData: true,
      consentVersion: 'personal-data-consent-v1-2026-07',
      privacyVersion: 'privacy-v1-2026-07',
      sourcePage: '/tryon',
      selectedFrames: toVisitLeadFrames(selectedFrames, selectedGoal, activeFrameScore?.total),
      comment: visitLeadForm.comment.trim() || undefined,
    });

    if (backendResult.ok) {
      setVisitLeadStatus('Подбор сохранен для подготовки визита. Фото, рецепт и точные координаты не отправлены.');
      setIsSubmittingVisitLead(false);
      return;
    }

    const text = `Подбор ViLu для визита\nГород: ${visitLeadForm.city}\nЦель: ${selectedGoal}\n${selectionText}\n\nФото, рецепт и контакт не передаются.`;
    const copied = await copyTextSafely(text);
    setVisitLeadStatus(copied
      ? 'Подбор скопирован. Данные не отправлены на сервер.'
      : 'Подбор подготовлен локально, но браузер запретил копирование. Данные не отправлены на сервер.');
    setIsSubmittingVisitLead(false);
  };

  const copyVisitSelection = async () => {
    const text = `Мой подбор ViLu\nЦель: ${selectedGoal}\n${selectionText}\n\nФото, рецепт, контакт и точное местоположение не передаются. Перед визитом уточните наличие похожих моделей.`;
    const copied = await copyTextSafely(text);
    saveIntentEvent({
      id: createLocalId('intent'),
      createdAt: new Date().toISOString(),
      action: 'copy',
      opticId: 'visit-selection',
      opticName: 'Самостоятельный подбор',
      selectedFrames: selectedFrames.map(frameLabel),
      goal: selectedGoal,
    });
    setIntentCount(getStoredIntentEvents().length);
    trackEvent(AnalyticsEvent.SelectionCopied, {
      selected_count: selectedFrames.length,
      goal: selectedGoal,
      source: 'visit_modal',
    });
    setVisitLeadStatus(copied
      ? 'Подбор скопирован без контакта. Вы можете показать его консультанту в салоне.'
      : 'Подбор готов локально, но браузер запретил копирование. Контакт не отправлен.');
  };

  const copySelection = async (optic: DirectoryOptic) => {
    const text = `Мой подбор ViLu\nЦель: ${selectedGoal}\n${selectionText}\n\nПеред визитом уточните наличие похожих моделей.\nОптика: ${optic.name}, ${optic.address}`;
    const copied = await copyTextSafely(text);
    recordIntent(optic, 'copy');
    if (copied) {
      setCopiedOpticId(optic.id);
    } else {
      setGeoStatus('Браузер запретил копирование. Подбор остался только на этом устройстве.');
    }
  };

  const openRoute = (optic: DirectoryOptic) => {
    recordIntent(optic, 'route');
    window.open(`https://www.google.com/maps/search/?api=1&query=${routeQuery(optic)}`, '_blank', 'noopener,noreferrer');
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
    <div className="min-h-screen overflow-x-hidden bg-vilu-paper">
      <section className="w-full overflow-x-hidden border-b border-vilu-paper/10 bg-vilu-ink px-4 py-10 text-vilu-paper sm:px-6 sm:py-12">
        <div className="mx-auto grid w-full max-w-7xl min-w-0 gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:items-center">
          <div className="min-w-0 max-w-[calc(100vw-2rem)] sm:max-w-none">
            <p className="kinetic-label sm:text-sm">Пилот примерки</p>
            <h1 className="kinetic-headline mt-4 max-w-full break-words text-[clamp(2.25rem,10.5vw,5.2rem)] font-black leading-[0.9] text-vilu-paper md:text-7xl">
              <span className="block">Примерь.</span>
              <span className="block">Оцени.</span>
              <span className="block">Салон.</span>
            </h1>
            <p className="vilu-accent-copy-on-dark mt-6 max-w-[calc(100vw-2rem)] break-words text-base font-bold leading-7 sm:max-w-2xl sm:text-lg sm:leading-8">
              Загрузите фото, выберите 2-3 подходящих стиля и получите список ближайших оптик для финальной примерки.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a href="#fit-goal" onClick={() => trackEvent(AnalyticsEvent.TryOnOpened, { source: 'tryon_hero' })} className="kinetic-cta inline-flex w-full justify-center rounded-full px-6 py-4 text-xs font-black uppercase tracking-[0.16em] transition hover:bg-vilu-card sm:w-auto sm:px-7">
                Начать примерку <ArrowRight className="ml-2" size={16} />
              </a>
              <a href="#nearby-optics" className="vilu-action-secondary-dark inline-flex w-full justify-center rounded-full px-6 py-4 text-xs font-black uppercase tracking-[0.16em] transition sm:w-auto sm:px-7">
                Найти салон
              </a>
            </div>
          </div>

          <div className="min-w-0 rounded-[2rem] border border-vilu-lime/35 bg-vilu-mist p-5 text-vilu-paper shadow-2xl shadow-vilu-ink/30 sm:rounded-[2.5rem] sm:p-6">
            <div className="grid min-w-0 gap-4 sm:grid-cols-2">
              {['Примерил', 'Оценил посадку', 'Сохранил 2-3 оправы', 'Открыл маршрут или контакт'].map((label, index) => (
                <div key={label} className="min-w-0 rounded-2xl bg-vilu-paper/8 p-5 ring-1 ring-vilu-lime/35">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-vilu-lime text-sm font-black text-vilu-ink">{index + 1}</span>
                  <p className="mt-4 font-black text-vilu-paper">{label}</p>
                </div>
              ))}
            </div>
            <p className="mt-6 text-sm leading-6 text-vilu-paper/65">
              Список оптик появляется после персонального подбора, чтобы пользователь шел в салон уже с коротким чеклистом.
            </p>
          </div>
        </div>
      </section>

      <div className="mx-auto grid w-full max-w-7xl min-w-0 gap-8 px-4 py-10 sm:px-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
        <main className="min-w-0 space-y-8">
          <section id="fit-goal" className="rounded-[2.5rem] bg-vilu-ink p-6 text-vilu-paper shadow-sm ring-1 ring-vilu-paper/10 md:p-8">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-vilu-paper/65">Сценарий подбора</p>
            <h2 className="mt-2 break-words text-3xl font-black tracking-tight">Выберите сценарий</h2>
            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {fitGoals.map((goal) => (
                <button
                  key={goal}
                  type="button"
                  onClick={() => setSelectedGoal(goal)}
                  className={`rounded-2xl px-5 py-4 text-left text-sm font-black transition ${
                    selectedGoal === goal
                      ? 'bg-vilu-lime text-vilu-ink shadow-[0_0_0_2px_rgba(217,255,46,0.38),0_18px_42px_rgba(217,255,46,0.18)]'
                      : 'bg-vilu-paper/10 text-vilu-paper/80 ring-1 ring-vilu-paper/10 hover:bg-vilu-paper/16 hover:text-vilu-paper'
                  }`}
                >
                  <span className="inline-flex items-center gap-2">
                    {selectedGoal === goal && <CheckCircle2 size={16} className="shrink-0" />}
                    <span>{goal}</span>
                  </span>
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-[2.5rem] bg-vilu-card p-5 shadow-sm ring-1 ring-vilu-ink/10 md:p-7">
            <div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-vilu-green">Примерка</p>
                <h2 className="mt-2 break-words text-3xl font-black tracking-tight">{activeFrame ? frameLabel(activeFrame) : 'Выберите оправу'}</h2>
              </div>
              <label className="inline-flex max-w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-vilu-ink px-5 py-4 text-center text-xs font-black uppercase tracking-[0.12em] text-vilu-lime transition hover:bg-vilu-lime hover:text-vilu-ink">
                <Upload size={16} /> Загрузить фото
                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handlePhoto} className="hidden" />
              </label>
            </div>

            <div className="mb-5 flex gap-3 rounded-3xl bg-vilu-lime/10 p-4 text-sm leading-6 text-vilu-ink ring-1 ring-vilu-lime/20">
              <ShieldCheck className="mt-0.5 shrink-0" size={20} />
              <p>Фото используется только в вашем браузере для примерки и не отправляется на сервер.</p>
            </div>

            <div className="mb-5 overflow-hidden rounded-[1.75rem] bg-vilu-paper ring-1 ring-vilu-ink/10">
              <div className="grid min-w-0 gap-0">
                <div className="min-w-0 p-4 sm:p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-vilu-green">Автопосадка</p>
                    <span className={`inline-flex rounded-full px-3 py-2 text-[11px] font-black uppercase tracking-[0.08em] ${autoFitStageClass(faceFitMeasurement, autoFitApplied)}`}>
                      {autoFitStageLabel(faceFitMeasurement, autoFitApplied)}
                    </span>
                    <span className={`inline-flex rounded-full px-3 py-2 text-[11px] font-black uppercase tracking-[0.08em] ${photoQuality.className}`}>
                      Фото: {photoQuality.label}
                    </span>
                  </div>

                  <h3 className="mt-3 max-w-3xl break-words text-2xl font-black tracking-tight text-vilu-ink sm:text-3xl">
                    {autoFitTitle(faceFitMeasurement, autoFitApplied)}
                  </h3>

                  <p className="mt-3 max-w-3xl text-sm font-bold leading-6 text-vilu-ink/72">
                    {autoFitResultText(faceFitMeasurement, autoFitApplied)}
                  </p>

                  <div className="mt-4 grid min-w-0 gap-2 sm:grid-cols-3">
                    {autoFitChecklistItems.map((check) => (
                      <div key={check.title} className="min-w-0 rounded-2xl bg-vilu-card/75 p-3 ring-1 ring-vilu-ink/10">
                        <p className="text-[10px] font-black uppercase tracking-[0.12em] text-vilu-ink/42">{check.title}</p>
                        <p className="mt-1 text-xs font-bold leading-5 text-vilu-ink/65">{check.text}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid min-w-0 gap-4 border-t border-vilu-lime/20 bg-vilu-card/35 p-4 sm:p-5">
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-2xl bg-vilu-card/85 p-4 ring-1 ring-vilu-ink/10">
                      <p className="text-[11px] font-black uppercase tracking-[0.14em] text-vilu-ink/42">Face-fit score</p>
                      <p className="mt-2 text-4xl font-black tracking-tight text-vilu-ink">{activeFrameScore?.total ?? '--'}</p>
                      <p className="mt-1 text-xs font-bold leading-5 text-vilu-ink/55">
                        {autoFitApplied ? 'Смотрим посадку после автоподстройки' : 'Предварительная оценка модели'}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-vilu-card/85 p-4 ring-1 ring-vilu-ink/10">
                      <p className="text-[11px] font-black uppercase tracking-[0.14em] text-vilu-ink/42">Ограничение</p>
                      <p className="mt-2 text-xs font-bold leading-5 text-vilu-ink/65">
                        Это не медицинская проверка. Размер, PD, мост и комфорт подтверждаются в салоне.
                      </p>
                    </div>
                  </div>

                  <div className="grid min-w-0 gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                  <button
                    type="button"
                    onClick={() => applyAutoFit()}
                    disabled={faceFitMeasurement.status !== 'ready'}
                    className="min-h-[48px] rounded-full bg-vilu-lime px-4 py-3 text-center text-[11px] font-black uppercase tracking-[0.08em] text-vilu-ink transition hover:bg-vilu-card disabled:cursor-not-allowed disabled:bg-vilu-paper disabled:text-vilu-ink/62 disabled:ring-1 disabled:ring-vilu-ink/10"
                  >
                    {autoFitApplied ? 'Подстроить еще раз' : 'Подстроить автоматически'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowLandmarks((current) => !current)}
                    disabled={faceFitMeasurement.status !== 'ready'}
                    className="min-h-[48px] rounded-full bg-vilu-card px-4 py-3 text-center text-[11px] font-black uppercase tracking-[0.08em] text-vilu-ink ring-1 ring-vilu-ink/10 transition hover:bg-vilu-cream disabled:cursor-not-allowed disabled:bg-vilu-paper disabled:text-vilu-ink/58"
                  >
                    {showLandmarks ? 'Скрыть ориентиры' : 'Показать ориентиры'}
                  </button>
                  <p className="px-1 pt-1 text-xs leading-5 text-vilu-ink/65 sm:col-span-2">
                    Ориентиры скрыты по умолчанию. Они нужны только для проверки, куда ViLu поставил оправу.
                  </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative flex aspect-[4/3] min-h-[320px] w-full items-center justify-center overflow-hidden rounded-[2rem] bg-vilu-ink p-4 sm:min-h-[360px]">
              {photoUrl ? (
                <div
                  className="relative max-h-full max-w-full overflow-hidden rounded-[1.5rem] bg-vilu-card shadow-inner"
                  style={{
                    aspectRatio: photoAspectRatio,
                    height: photoAspectRatio < 1 ? '100%' : undefined,
                    width: photoAspectRatio >= 1 ? '100%' : undefined,
                  }}
                >
                  <img src={photoUrl} alt="Фото для примерки" className="absolute inset-0 h-full w-full object-cover" />

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

                  {showLandmarks && faceFitMeasurement.status === 'ready' && faceFitMeasurement.overlayPoints.map((point) => (
                    <span
                      key={point.id}
                      className="pointer-events-none absolute h-2 w-2 rounded-full bg-vilu-lime/80 ring-2 ring-white/90"
                      style={{ left: `${point.x}%`, top: `${point.y}%`, transform: 'translate(-50%, -50%)' }}
                    />
                  ))}
                </div>
              ) : (
                <div className="max-w-md px-6 text-center">
                  <Camera className="mx-auto mb-5 text-vilu-green" size={44} />
                  <p className="text-lg font-black text-vilu-paper">Загрузите фото лица</p>
                  <p className="mt-2 text-sm leading-6 text-vilu-paper/60">После загрузки можно подвинуть оправу и оценить посадку.</p>
                </div>
              )}
            </div>

            <div className="mt-6 grid min-w-0 gap-5 md:grid-cols-3">
              {[
                ['Масштаб', frameScale, setFrameScale, 42, 88],
                ['Влево / вправо', frameX, setFrameX, 32, 68],
                ['Выше / ниже', frameY, setFrameY, 25, 62],
                ].map(([label, value, setter, min, max]) => (
                <label key={label as string} className="rounded-3xl bg-vilu-paper p-4 ring-1 ring-vilu-ink/10">
                  <span className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-vilu-ink/42"><SlidersHorizontal size={14} /> {label as string}</span>
                  <input min={min as number} max={max as number} value={value as number} type="range" onChange={(event) => (setter as (next: number) => void)(Number(event.target.value))} className="w-full accent-vilu-lime" />
                </label>
              ))}
            </div>

            <div className="mt-6 rounded-[2rem] border border-vilu-paper/10 bg-vilu-ink p-5 text-vilu-paper md:p-6">
              <div className="flex min-w-0 flex-col justify-between gap-4 md:flex-row md:items-center">
                <div className="min-w-0">
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-vilu-paper/65">Face-fit score</p>
                  <h3 className="mt-2 break-words text-2xl font-black tracking-tight">Помощник выбора перед визитом</h3>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-vilu-paper/65">
                    Оценка помогает выбрать оправы для салона. Если автопосадка готова, учитываем центр глаз, переносицу и качество фото.
                  </p>
                  {autoFitApplied && (
                    <p className="mt-3 inline-flex rounded-full bg-vilu-lime/20 px-3 py-2 text-xs font-black text-vilu-ink ring-1 ring-vilu-lime/30">
                      Автопосадка учтена в предварительной проверке
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (!activeFrame) return;
                    setFitScoreFrameId(activeFrame.id);
                    trackEvent(AnalyticsEvent.FitScoreViewed, { frame_id: activeFrame.id, goal: selectedGoal });
                  }}
                  className="rounded-full bg-vilu-lime px-6 py-4 text-xs font-black uppercase tracking-[0.12em] text-vilu-ink transition hover:bg-vilu-card"
                >
                  Оценить посадку
                </button>
              </div>

              {fitScore && activeFrame && (
                <div className="mt-5 grid gap-5 lg:grid-cols-[170px_1fr]">
                  <div className="rounded-[1.5rem] bg-vilu-paper p-5 text-center text-vilu-ink ring-1 ring-vilu-paper/10">
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-vilu-ink/42">Скор</p>
                    <p className="mt-2 text-5xl font-black tracking-tight text-vilu-green">{fitScore.total}</p>
                    <p className="text-sm font-black text-vilu-ink/55">из 100</p>
                  </div>
                  <div className="rounded-[1.5rem] bg-vilu-paper p-5 text-vilu-ink ring-1 ring-vilu-paper/10">
                    <h4 className="break-words text-xl font-black tracking-tight">{fitScore.label}</h4>
                    <div className="mt-4 grid gap-3">
                      {fitScore.strengths.map((strength) => (
                        <div key={strength} className="flex gap-3 text-sm leading-6 text-vilu-ink/65">
                          <CheckCircle2 className="mt-1 shrink-0 text-vilu-green" size={18} />
                          {strength}
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 rounded-2xl bg-vilu-lime/10 p-4 text-sm leading-6 text-vilu-ink ring-1 ring-vilu-lime/20">
                      <strong>Что проверить в салоне: </strong>{fitScore.checks.join(' ')}
                    </div>
                    {faceFitMeasurement.status === 'ready' && (
                      <div className="mt-3 rounded-2xl bg-vilu-mist p-4 text-sm leading-6 text-vilu-ink/72">
                        <strong>Что дала автопосадка: </strong>
                        центр оправы {autoFitApplied ? 'поставлен' : 'можно поставить'} по глазам, стартовый масштаб {Math.round(faceFitMeasurement.frameWidthHint)}%, качество фото {photoQuality.label}.
                      </div>
                    )}
                    <button type="button" onClick={saveActiveFrame} className="mt-4 w-full rounded-full bg-vilu-lime px-5 py-3 text-xs font-black uppercase tracking-[0.1em] text-vilu-ink transition hover:bg-vilu-card">
                      Сохранить в подбор
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>

          <section className="rounded-[2.5rem] bg-vilu-card p-6 shadow-sm ring-1 ring-vilu-ink/10 md:p-8">
            <div className="mb-6 grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-vilu-green">Каталог пилота</p>
                <h2 className="mt-2 break-words text-3xl font-black tracking-tight">Примерьте 6 оправ и выберите до 3</h2>
              </div>
              <p className="inline-flex min-w-[112px] items-center justify-center rounded-2xl bg-vilu-paper px-4 py-3 text-sm font-black text-vilu-ink ring-1 ring-vilu-ink/10 sm:mt-7">
                {selectedFrameIds.length} из {MAX_SELECTED_FRAMES}
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {frames.map((frame) => {
                const isActive = frame.id === activeFrame?.id;
                const isSelected = selectedFrameIds.includes(frame.id);
                return (
                  <article key={frame.id} className={`rounded-[2rem] p-4 ring-1 transition ${isActive ? 'bg-vilu-lime/15 ring-vilu-lime/35' : 'bg-vilu-cream ring-vilu-ink/10'}`}>
                    <button type="button" onClick={() => setActiveFrameId(frame.id)} className="block w-full text-left">
                      <div className="flex h-32 items-center justify-center rounded-[1.5rem] bg-vilu-card">
                        <FrameThumb frame={frame} failedImages={failedFrameImages} onImageError={markFrameImageFailed} />
                      </div>
                      <p className="mt-4 text-xs font-black uppercase tracking-[0.18em] text-vilu-ink/42">{frame.brand}</p>
                      <h3 className="mt-1 break-words text-xl font-black tracking-tight">{frame.model}</h3>
                      <p className="mt-2 text-sm text-vilu-ink/55">{frame.category === 'sunglasses' ? 'Солнцезащитные' : 'Оправа'} - {frame.color} - {frame.size}</p>
                      <p className="mt-3 text-lg font-black">{formatPrice(frame.price)}</p>
                    </button>
                    <button type="button" onClick={() => toggleFrame(frame.id)} className={`mt-4 flex w-full items-center justify-center gap-2 rounded-full px-4 py-3 text-xs font-black uppercase tracking-[0.14em] transition ${isSelected ? 'bg-vilu-ink text-vilu-paper' : 'bg-vilu-lime text-vilu-ink hover:bg-vilu-card'}`}>
                      {isSelected ? <><X size={15} /> Убрать</> : <><CheckCircle2 size={15} /> Выбрать</>}
                    </button>
                  </article>
                );
              })}
            </div>
          </section>
        </main>

        <aside className="min-w-0 space-y-8 xl:sticky xl:top-28 xl:h-fit">
          <section className="rounded-[2.5rem] bg-vilu-card p-7 shadow-sm ring-1 ring-vilu-ink/10">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-vilu-ink/55">Мой подбор</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight">Чеклист для визита</h2>
            <p className="mt-3 text-sm leading-6 text-vilu-ink/55">Сохраните 2-3 варианта, а затем выберите ближайшую оптику для финальной примерки.</p>

            <div className="mt-6 grid gap-3">
              {selectedFrames.length > 0 ? selectedFrames.map((frame, index) => (
                <div key={frame.id} className="rounded-3xl bg-vilu-paper p-4">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-vilu-ink/42">Вариант {index + 1}</p>
                  <p className="mt-2 font-black">{frameLabel(frame)}</p>
                  <p className="mt-1 text-sm leading-6 text-vilu-ink/55">{frame.color} - {frameUseCase(frame, selectedGoal)}</p>
                </div>
              )) : (
                <div className="rounded-3xl bg-vilu-paper p-5 text-sm leading-6 text-vilu-ink/55">Пока нет сохраненных оправ. Нажмите “Сохранить в подбор” после Face-fit score или выберите оправу в каталоге.</div>
              )}
            </div>

            <a href="#nearby-optics" onClick={() => trackEvent(AnalyticsEvent.NearbyOpticsOpened, { method: 'selection_cta', selected_count: selectedFrames.length })} className={`mt-6 flex w-full items-center justify-center gap-2 rounded-full px-6 py-4 text-xs font-black uppercase tracking-[0.14em] transition ${selectedFrames.length > 0 ? 'bg-vilu-lime text-vilu-ink hover:bg-vilu-card' : 'pointer-events-none bg-vilu-paper text-vilu-ink/58 ring-1 ring-vilu-ink/10'}`}>
              Найти оптику рядом <MapPinned size={16} />
            </a>
            <button
              type="button"
              onClick={openVisitLead}
              disabled={!canPrepareVisit}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-vilu-lime px-6 py-4 text-center text-xs font-black uppercase tracking-[0.14em] text-vilu-ink transition hover:bg-vilu-card disabled:cursor-not-allowed disabled:bg-vilu-paper disabled:text-vilu-ink/58 disabled:ring-1 disabled:ring-vilu-ink/10"
            >
              Подготовить подбор к визиту <ArrowRight size={16} />
            </button>
            <div className="mt-4 rounded-[1.7rem] bg-vilu-ink p-5 text-vilu-paper ring-1 ring-vilu-lime/20">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-vilu-lime">Платный сервис</p>
                  <h3 className="mt-2 text-xl font-black tracking-tight">{VISIT_PREP_OFFER.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-vilu-paper/70">
                    Консультант заранее получает ваш короткий список, готовит похожие оправы и экономит время визита.
                  </p>
                </div>
                <div className="shrink-0 rounded-2xl bg-vilu-lime px-4 py-3 text-center text-vilu-ink">
                  <p className="text-[10px] font-black uppercase tracking-[0.12em]">тест</p>
                  <p className="text-xl font-black">{formatPrice(VISIT_PREP_OFFER.price)}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => openPaymentDoor('selection_card')}
                disabled={paymentDoorDisabled}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-vilu-lime px-5 py-4 text-xs font-black uppercase tracking-[0.14em] text-vilu-ink transition hover:bg-vilu-card disabled:cursor-not-allowed disabled:bg-vilu-paper/20 disabled:text-vilu-paper/45"
              >
                {paymentEntryText} <ArrowRight size={16} />
              </button>
              {paymentDoorDisabled && (
                <p className="mt-3 text-xs leading-5 text-vilu-paper/58">Сначала сохраните хотя бы одну оправу в подбор.</p>
              )}
            </div>
            <p className="mt-3 text-xs leading-5 text-vilu-ink/55">
              Контакт передается только после согласия. Фото, рецепт и точное местоположение не отправляются.
            </p>
            {visitLeadStatus && !isVisitLeadOpen && (
              <p className="mt-3 rounded-2xl bg-vilu-lime/10 p-3 text-xs leading-5 text-vilu-ink ring-1 ring-vilu-lime/20">{visitLeadStatus}</p>
            )}
          </section>

          <section className="rounded-[2.5rem] bg-vilu-ink p-7 text-vilu-paper shadow-2xl shadow-vilu-ink/20">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-vilu-paper/65">Готовность к визиту</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight">{intentCount}</h2>
            <p className="mt-3 text-sm leading-6 text-vilu-paper/65">Сохраняем только локальные действия: маршрут, звонок, мессенджер или копирование подбора. Фото, рецепт и точное местоположение не сохраняются.</p>
          </section>

          <button onClick={() => onNavigate?.('products')} className="w-full rounded-full bg-vilu-lime px-6 py-4 text-xs font-black uppercase tracking-[0.16em] text-vilu-ink transition hover:bg-vilu-card">
            Вернуться в магазин
          </button>
        </aside>
      </div>

      <section id="nearby-optics" className="border-t border-vilu-paper/10 bg-vilu-ink px-4 py-12 text-vilu-paper sm:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr]">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-vilu-paper/65">Ближайшие оптики</p>
              <h2 className="mt-3 break-words text-4xl font-black tracking-tight md:text-5xl">Показываем рядом после подбора</h2>
              <p className="mt-5 text-base leading-8 text-vilu-paper/65">
                Чтобы показать ближайшие оптики, разрешите доступ к геолокации. Мы используем координаты только для сортировки оптик рядом и не сохраняем точное местоположение.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <button type="button" onClick={requestLocation} className="inline-flex items-center justify-center gap-2 rounded-full bg-vilu-lime px-6 py-4 text-xs font-black uppercase tracking-[0.14em] text-vilu-ink transition hover:bg-vilu-card">
                  <LocateFixed size={16} /> Показать рядом
                </button>
                <div className="flex flex-wrap gap-2">
                  {Object.keys(cityFallbacks).map((city) => (
                    <button key={city} type="button" onClick={() => chooseCity(city)} className="rounded-full bg-vilu-card px-4 py-3 text-xs font-black text-vilu-ink/72 ring-1 ring-vilu-ink/10 transition hover:bg-vilu-cream">
                      {city}
                    </button>
                  ))}
                </div>
              </div>
              {geoStatus && <p className="mt-4 rounded-2xl bg-vilu-card/70 p-4 text-sm leading-6 text-vilu-ink/65">{geoStatus}</p>}
            </div>

            <div className="grid gap-4">
              {nearbyOptics.map(({ optic, distance }) => (
                <article key={optic.id} className="rounded-[2rem] bg-vilu-ink p-5 text-vilu-paper shadow-sm ring-1 ring-vilu-lime/20">
                  <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="break-words text-2xl font-black tracking-tight text-vilu-paper">{optic.name}</h3>
                        {optic.partnerStatus === 'partner' ? (
                          <span className="rounded-full bg-vilu-lime px-3 py-1 text-[11px] font-black text-vilu-ink">Партнер ViLu</span>
                        ) : (
                          <span className="rounded-full bg-vilu-paper px-3 py-1 text-[11px] font-black uppercase tracking-[0.12em] text-vilu-ink">Открытые источники</span>
                        )}
                      </div>
                      <p className="mt-2 flex gap-2 text-sm leading-6 text-vilu-paper/72"><MapPin className="mt-1 shrink-0 text-vilu-lime" size={16} /> {formatDistance(distance, language)} от {userLocation?.label ?? 'центра Москвы'} - {optic.address}</p>
                      <p className="mt-1 text-sm font-bold text-vilu-paper/68">{opticHoursLabel(optic.hours)}</p>
                      <p className="mt-3 rounded-2xl bg-vilu-lime p-3 text-sm font-black leading-6 text-vilu-ink ring-1 ring-vilu-lime">Перед визитом уточните наличие похожих моделей.</p>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
                    <button type="button" onClick={() => openRoute(optic)} className="inline-flex items-center justify-center gap-2 rounded-full bg-vilu-lime px-4 py-3 text-xs font-black uppercase tracking-[0.1em] text-vilu-ink transition hover:bg-vilu-card">
                      <RouteIcon size={15} /> Маршрут
                    </button>
                    {optic.phone ? (
                      <a onClick={() => recordIntent(optic, 'call')} href={`tel:${optic.phone.replace(/\s/g, '')}`} className="inline-flex items-center justify-center gap-2 rounded-full bg-vilu-paper px-4 py-3 text-xs font-black uppercase tracking-[0.1em] text-vilu-ink transition hover:bg-vilu-cream">
                        <Phone size={15} /> Позвонить
                      </a>
                    ) : (
                      <button type="button" disabled className="inline-flex cursor-not-allowed items-center justify-center gap-2 rounded-full bg-vilu-paper/82 px-4 py-3 text-xs font-black uppercase tracking-[0.1em] text-vilu-ink/70">
                        <Phone size={15} /> Позвонить
                      </button>
                    )}
                    <button type="button" onClick={() => openWhatsApp(optic)} disabled={!optic.whatsapp} className="inline-flex items-center justify-center gap-2 rounded-full bg-vilu-paper px-4 py-3 text-xs font-black uppercase tracking-[0.1em] text-vilu-ink transition hover:bg-vilu-cream disabled:cursor-not-allowed disabled:bg-vilu-paper/82 disabled:text-vilu-ink/70">
                      <MessageCircle size={15} /> WhatsApp
                    </button>
                    <button type="button" onClick={() => openTelegram(optic)} disabled={!optic.telegram} className="inline-flex items-center justify-center gap-2 rounded-full bg-vilu-paper px-4 py-3 text-xs font-black uppercase tracking-[0.1em] text-vilu-ink transition hover:bg-vilu-cream disabled:cursor-not-allowed disabled:bg-vilu-paper/82 disabled:text-vilu-ink/70">
                      <Send size={15} /> Telegram
                    </button>
                    <button type="button" onClick={() => copySelection(optic)} className="inline-flex items-center justify-center gap-2 rounded-full bg-vilu-lime px-4 py-3 text-xs font-black uppercase tracking-[0.1em] text-vilu-ink transition hover:bg-vilu-card">
                      <Copy size={15} /> {copiedOpticId === optic.id ? 'Скопировано' : 'Подбор'}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      {isPaymentDoorOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-vilu-ink/75 sm:items-center sm:px-4 sm:py-6">
          <div
            ref={paymentDialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="payment-dialog-title"
            onKeyDown={handlePaymentDialogKeyDown}
            className="max-h-[100dvh] w-full max-w-xl overflow-y-auto rounded-t-[2rem] bg-vilu-paper p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl ring-1 ring-white/20 sm:max-h-[92vh] sm:rounded-[2rem] sm:p-6 md:p-8"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-vilu-green">Тестовый контур оплаты</p>
                <h2 id="payment-dialog-title" className="mt-2 text-3xl font-black tracking-tight text-vilu-ink">{VISIT_PREP_OFFER.title}</h2>
                <p className="mt-3 text-sm leading-6 text-vilu-ink/65">
                  Проверяем сценарий оплаты без реального списания. Банковские данные не запрашиваются и не сохраняются.
                </p>
              </div>
              <button
                type="button"
                onClick={closePaymentDoor}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-vilu-card text-vilu-ink ring-1 ring-vilu-ink/10 transition hover:bg-vilu-paper"
                aria-label={paymentDialogCloseLabel}
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-3xl bg-vilu-card p-4 ring-1 ring-vilu-ink/10">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-vilu-ink/42">Цена</p>
                <p className="mt-2 text-3xl font-black text-vilu-ink">{formatPrice(VISIT_PREP_OFFER.price)}</p>
              </div>
              <div className="rounded-3xl bg-vilu-card p-4 ring-1 ring-vilu-ink/10">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-vilu-ink/42">Подбор</p>
                <p className="mt-2 text-3xl font-black text-vilu-ink">{selectedFrames.length}</p>
              </div>
              <div className="rounded-3xl bg-vilu-card p-4 ring-1 ring-vilu-ink/10">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-vilu-ink/42">Данные</p>
                <p className="mt-2 text-sm font-black leading-5 text-vilu-green">без фото и рецепта</p>
              </div>
            </div>

            <div className="mt-6 rounded-3xl bg-vilu-ink p-5 text-vilu-paper">
              <p className="font-black">Что входит в сервис</p>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-vilu-paper/72">
                <li>1. Проверка короткого списка 2-3 оправ перед визитом.</li>
                <li>2. Подготовка похожих моделей консультантом.</li>
                <li>3. Чеклист вопросов по посадке, мосту и ширине оправы.</li>
              </ul>
            </div>

            {paymentDoorStatus && (
              <p className="mt-5 rounded-2xl bg-vilu-lime/18 p-4 text-sm font-bold leading-6 text-vilu-ink ring-1 ring-vilu-lime/40">{paymentDoorStatus}</p>
            )}

            <div className="sticky bottom-0 -mx-5 mt-6 flex flex-col gap-3 border-t border-vilu-ink/10 bg-vilu-paper px-5 pb-1 pt-4 sm:static sm:mx-0 sm:flex-row sm:border-0 sm:p-0">
              <button
                type="button"
                onClick={clickPaymentIntent}
                className="inline-flex flex-1 items-center justify-center rounded-full bg-vilu-lime px-6 py-4 text-xs font-black uppercase tracking-[0.14em] text-vilu-ink transition hover:bg-vilu-ink hover:text-vilu-paper disabled:cursor-wait disabled:bg-vilu-card disabled:text-vilu-ink/55"
              >
                {language === 'ru' ? 'Продолжить оформление' : 'Continue to checkout'}
              </button>
              <button
                type="button"
                onClick={closePaymentDoor}
                className="inline-flex flex-1 items-center justify-center rounded-full bg-vilu-card px-6 py-4 text-xs font-black uppercase tracking-[0.14em] text-vilu-ink ring-1 ring-vilu-ink/10 transition hover:bg-vilu-cream"
              >
                Не сейчас
              </button>
            </div>
          </div>
        </div>
      )}

      {isVisitLeadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-vilu-ink/70 px-4 py-6">
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-[2rem] bg-vilu-paper p-6 shadow-2xl ring-1 ring-white/20 md:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-vilu-green">Подбор к визиту</p>
                <h2 className="mt-2 text-3xl font-black tracking-tight text-vilu-ink">Подготовить подбор к визиту</h2>
                <p className="mt-3 text-sm leading-6 text-vilu-ink/65">
                  Можно просто скопировать чеклист без контакта или подготовить заявку с удобным способом связи. Фото, рецепт и точные координаты не отправляются.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsVisitLeadOpen(false)}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-vilu-card text-vilu-ink ring-1 ring-vilu-ink/10 transition hover:bg-vilu-paper"
                aria-label="Закрыть форму"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-6 grid gap-3">
              {selectedFrames.map((frame, index) => (
                <div key={frame.id} className="rounded-3xl bg-vilu-card p-4 ring-1 ring-vilu-ink/10">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-vilu-ink/42">Оправа {index + 1}</p>
                  <p className="mt-1 font-black text-vilu-ink">{frameLabel(frame)}</p>
                  <p className="mt-1 text-sm leading-6 text-vilu-ink/55">{frame.color} - {frameUseCase(frame, selectedGoal)}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-xs font-black uppercase tracking-[0.16em] text-vilu-ink/42">Город</span>
                <select
                  value={visitLeadForm.city}
                  onChange={(event) => setVisitLeadForm((current) => ({ ...current, city: event.target.value }))}
                  className="mt-2 w-full rounded-2xl border border-vilu-ink/10 bg-vilu-card px-4 py-4 text-sm font-bold outline-none transition focus:border-vilu-lime"
                >
                  {Object.keys(cityFallbacks).map((city) => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-xs font-black uppercase tracking-[0.16em] text-vilu-ink/42">Способ связи</span>
                <select
                  value={visitLeadForm.contactMethod}
                  onChange={(event) => setVisitLeadForm((current) => ({ ...current, contactMethod: event.target.value as VisitLeadForm['contactMethod'] }))}
                  className="mt-2 w-full rounded-2xl border border-vilu-ink/10 bg-vilu-card px-4 py-4 text-sm font-bold outline-none transition focus:border-vilu-lime"
                >
                  <option value="telegram">Telegram</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="phone">Телефон</option>
                </select>
              </label>
            </div>

            <label className="mt-4 block">
              <span className="text-xs font-black uppercase tracking-[0.16em] text-vilu-ink/42">Контакт</span>
              <input
                value={visitLeadForm.contact}
                onChange={(event) => setVisitLeadForm((current) => ({ ...current, contact: event.target.value }))}
                placeholder="@username или +7 900 000-00-00"
                className="mt-2 w-full rounded-2xl border border-vilu-ink/10 bg-vilu-card px-4 py-4 text-sm font-bold outline-none transition focus:border-vilu-lime"
              />
            </label>

            <label className="mt-4 block">
              <span className="text-xs font-black uppercase tracking-[0.16em] text-vilu-ink/42">Комментарий</span>
              <textarea
                value={visitLeadForm.comment}
                onChange={(event) => setVisitLeadForm((current) => ({ ...current, comment: event.target.value }))}
                rows={3}
                placeholder="Например: хочу примерить похожие прозрачные оправы в выходные"
                className="mt-2 w-full rounded-2xl border border-vilu-ink/10 bg-vilu-card px-4 py-4 text-sm font-bold outline-none transition focus:border-vilu-lime"
              />
            </label>

            <label className="mt-5 flex gap-3 rounded-3xl bg-vilu-card p-4 text-sm leading-6 text-vilu-ink/65 ring-1 ring-vilu-ink/10">
              <input
                type="checkbox"
                checked={visitLeadForm.consent}
                onChange={(event) => {
                  setVisitLeadForm((current) => ({ ...current, consent: event.target.checked }));
                  if (event.target.checked) {
                    trackEvent(AnalyticsEvent.ConsentChecked, { source: 'visit_lead' });
                  }
                }}
                className="mt-1 h-5 w-5 shrink-0 accent-vilu-lime"
              />
              <span>
                Согласен передать контакт и выбранные оправы для подготовки визита. Я понимаю, что фото, рецепт и параметры зрения не отправляются.{' '}
                <a href="/privacy" className="font-black text-vilu-green underline">Политика</a>
              </span>
            </label>

            {visitLeadStatus && (
              <p className="mt-4 rounded-2xl bg-vilu-lime/10 p-4 text-sm leading-6 text-vilu-ink ring-1 ring-vilu-lime/20">{visitLeadStatus}</p>
            )}

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={submitVisitLead}
                disabled={!canSubmitVisitLead || isSubmittingVisitLead}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-vilu-ink px-6 py-4 text-xs font-black uppercase tracking-[0.14em] text-vilu-paper transition hover:bg-vilu-lime hover:text-vilu-ink disabled:cursor-not-allowed disabled:bg-vilu-ink/10 disabled:text-vilu-ink/42"
              >
                {isSubmittingVisitLead ? 'Готовим...' : 'Скопировать заявку'} <ArrowRight size={16} />
              </button>
              <button
                type="button"
                onClick={copyVisitSelection}
                className="inline-flex flex-1 items-center justify-center rounded-full bg-vilu-card px-6 py-4 text-xs font-black uppercase tracking-[0.14em] text-vilu-ink ring-1 ring-vilu-ink/10 transition hover:bg-vilu-cream"
              >
                Скопировать без контакта
              </button>
            </div>
            <button
              type="button"
              onClick={() => setIsVisitLeadOpen(false)}
              className="mt-3 w-full text-center text-xs font-black uppercase tracking-[0.14em] text-vilu-ink/55 transition hover:text-vilu-ink"
            >
              Закрыть
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
