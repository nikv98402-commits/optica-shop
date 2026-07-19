import { Camera, CheckCircle2, RotateCcw, ShieldCheck, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { analyzeFacePhoto, type FaceFitMeasurement } from '../../lib/faceFitEngine';
import { AnalyticsEvent, trackEvent } from '../../lib/analyticsEvents';

type Language = 'ru' | 'en';
type CameraState = 'requesting' | 'live' | 'denied' | 'unsupported' | 'error';
type GuidanceTone = 'waiting' | 'adjust' | 'ready';

interface GuidedCameraCaptureProps {
  language: Language;
  onCapture: (file: File) => void | Promise<void>;
  onClose: () => void;
}

interface Guidance {
  tone: GuidanceTone;
  title: string;
  detail: string;
  measurement: FaceFitMeasurement | null;
}

const COPY = {
  ru: {
    title: 'Фото для точной примерки',
    privacy: 'Камера и фото работают только в вашем браузере. ViLu не отправляет снимок на сервер.',
    requesting: 'Запрашиваем доступ к камере...',
    unsupported: 'Этот браузер не поддерживает доступ к камере.',
    denied: 'Доступ к камере закрыт. Разрешите камеру в настройках браузера или загрузите готовое фото.',
    error: 'Не удалось запустить камеру. Закройте другие приложения с камерой и попробуйте ещё раз.',
    retry: 'Повторить',
    close: 'Закрыть камеру',
    capture: 'Сделать фото',
    captureAnyway: 'Снять сейчас',
    capturing: 'Сохраняем фото...',
    waitingTitle: 'Расположите лицо в рамке',
    waitingDetail: 'Смотрите прямо, держите телефон на уровне глаз.',
    noFaceTitle: 'Лицо не найдено',
    noFaceDetail: 'Добавьте света и расположите всё лицо внутри рамки.',
    oneFaceTitle: 'В кадре должен быть один человек',
    oneFaceDetail: 'Оставьте в рамке только своё лицо.',
    closerTitle: 'Подойдите немного ближе',
    closerDetail: 'Лицо должно занимать примерно 40–60% высоты кадра.',
    fartherTitle: 'Отодвиньте телефон',
    fartherDetail: 'Оставьте немного пространства вокруг головы.',
    levelTitle: 'Держите телефон ровно',
    levelDetail: 'Глаза должны находиться примерно на одной горизонтальной линии.',
    centerTitle: 'Переместите лицо в центр',
    centerDetail: 'Нос и переносица должны быть ближе к центру рамки.',
    readyTitle: 'Расстояние оптимальное',
    readyDetail: 'Смотрите прямо и не двигайтесь во время снимка.',
    hint: 'Лучший результат: мягкий свет спереди, без очков, лицо анфас.',
  },
  en: {
    title: 'Photo for accurate try-on',
    privacy: 'The camera and photo stay in your browser. ViLu does not send the image to a server.',
    requesting: 'Requesting camera access...',
    unsupported: 'This browser does not support camera access.',
    denied: 'Camera access is blocked. Allow it in browser settings or upload an existing photo.',
    error: 'Could not start the camera. Close other apps using it and try again.',
    retry: 'Try again',
    close: 'Close camera',
    capture: 'Take photo',
    captureAnyway: 'Capture now',
    capturing: 'Saving photo...',
    waitingTitle: 'Place your face in the guide',
    waitingDetail: 'Look straight ahead and hold the phone at eye level.',
    noFaceTitle: 'Face not found',
    noFaceDetail: 'Add more light and keep your whole face inside the guide.',
    oneFaceTitle: 'Only one person in frame',
    oneFaceDetail: 'Keep only your face inside the guide.',
    closerTitle: 'Move a little closer',
    closerDetail: 'Your face should fill about 40–60% of the frame height.',
    fartherTitle: 'Move the phone farther away',
    fartherDetail: 'Leave a little space around your head.',
    levelTitle: 'Hold the phone level',
    levelDetail: 'Your eyes should be on roughly the same horizontal line.',
    centerTitle: 'Center your face',
    centerDetail: 'Your nose and bridge should be closer to the middle of the guide.',
    readyTitle: 'Distance looks good',
    readyDetail: 'Look straight ahead and stay still for the photo.',
    hint: 'Best result: soft frontal light, no glasses, face looking straight ahead.',
  },
} as const;

export function getCameraGuidance(measurement: FaceFitMeasurement | null, language: Language): Guidance {
  const copy = COPY[language];
  if (!measurement || measurement.status === 'idle' || measurement.status === 'loading') {
    return { tone: 'waiting', title: copy.waitingTitle, detail: copy.waitingDetail, measurement };
  }
  if (measurement.status === 'no_face') {
    return { tone: 'adjust', title: copy.noFaceTitle, detail: copy.noFaceDetail, measurement };
  }
  if (measurement.status === 'multiple_faces') {
    return { tone: 'adjust', title: copy.oneFaceTitle, detail: copy.oneFaceDetail, measurement };
  }
  if (measurement.status !== 'ready') {
    return { tone: 'adjust', title: copy.waitingTitle, detail: copy.waitingDetail, measurement };
  }
  if (measurement.frameWidthHint < 52 || measurement.eyeDistanceRatio < 0.19) {
    return { tone: 'adjust', title: copy.closerTitle, detail: copy.closerDetail, measurement };
  }
  if (measurement.frameWidthHint > 76 || measurement.eyeDistanceRatio > 0.32) {
    return { tone: 'adjust', title: copy.fartherTitle, detail: copy.fartherDetail, measurement };
  }
  if (Math.abs(measurement.eyeLineTiltDeg) > 7) {
    return { tone: 'adjust', title: copy.levelTitle, detail: copy.levelDetail, measurement };
  }
  if (Math.abs(measurement.bridgeOffsetPct) > 6) {
    return { tone: 'adjust', title: copy.centerTitle, detail: copy.centerDetail, measurement };
  }
  return { tone: 'ready', title: copy.readyTitle, detail: copy.readyDetail, measurement };
}

function canvasToBlob(canvas: HTMLCanvasElement, quality = 0.9) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
}

export function GuidedCameraCapture({ language, onCapture, onClose }: GuidedCameraCaptureProps) {
  const copy = COPY[language];
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const analyzingRef = useRef(false);
  const captureInFlightRef = useRef(false);
  const [cameraState, setCameraState] = useState<CameraState>('requesting');
  const [measurement, setMeasurement] = useState<FaceFitMeasurement | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const guidance = useMemo(() => getCameraGuidance(measurement, language), [language, measurement]);

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;

      const focusable = Array.from(
        dialogRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      );
      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }

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

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;
    let timer: number | undefined;

    const stopStream = () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };

    const analyzeFrame = async () => {
      const video = videoRef.current;
      if (!video || video.readyState < 2 || analyzingRef.current || video.videoWidth === 0) return;
      analyzingRef.current = true;
      const canvas = document.createElement('canvas');
      const maxWidth = 480;
      const scale = Math.min(1, maxWidth / video.videoWidth);
      canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
      canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
      const context = canvas.getContext('2d');
      if (!context) {
        analyzingRef.current = false;
        return;
      }
      context.translate(canvas.width, 0);
      context.scale(-1, 1);
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const blob = await canvasToBlob(canvas, 0.72);
      if (!blob || cancelled) {
        analyzingRef.current = false;
        return;
      }
      const objectUrl = URL.createObjectURL(blob);
      const nextMeasurement = await analyzeFacePhoto(objectUrl);
      URL.revokeObjectURL(objectUrl);
      if (!cancelled) setMeasurement(nextMeasurement);
      analyzingRef.current = false;
    };

    const start = async () => {
      stopStream();
      setCameraState('requesting');
      setMeasurement(null);
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraState('unsupported');
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: 'user',
            width: { ideal: 1280 },
            height: { ideal: 960 },
          },
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          await video.play();
        }
        setCameraState('live');
        trackEvent(AnalyticsEvent.CameraOpened, { source: 'tryon' });
        timer = window.setInterval(analyzeFrame, 850);
        void analyzeFrame();
      } catch (error) {
        stopStream();
        const errorName = error instanceof DOMException ? error.name : '';
        setCameraState(errorName === 'NotAllowedError' || errorName === 'SecurityError' ? 'denied' : 'error');
        trackEvent(AnalyticsEvent.CameraOpenFailed, { reason: errorName || 'unknown' });
      }
    };

    void start();
    return () => {
      cancelled = true;
      if (timer) window.clearInterval(timer);
      stopStream();
    };
  }, [retryKey]);

  const capture = async () => {
    if (captureInFlightRef.current) return;
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) return;
    captureInFlightRef.current = true;
    setIsCapturing(true);
    try {
      const canvas = document.createElement('canvas');
      const maxWidth = 1600;
      const scale = Math.min(1, maxWidth / video.videoWidth);
      canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
      canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
      const context = canvas.getContext('2d');
      if (!context) return;
      context.translate(canvas.width, 0);
      context.scale(-1, 1);
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const blob = await canvasToBlob(canvas);
      if (!blob) return;
      const file = new File([blob], `vilu-camera-${Date.now()}.jpg`, { type: 'image/jpeg' });
      trackEvent(AnalyticsEvent.CameraPhotoCaptured, {
        guidance: guidance.tone,
        confidence: guidance.measurement?.confidence ?? 0,
      });
      await onCapture(file);
    } finally {
      captureInFlightRef.current = false;
      setIsCapturing(false);
    }
  };

  const errorMessage =
    cameraState === 'unsupported'
      ? copy.unsupported
      : cameraState === 'denied'
        ? copy.denied
        : cameraState === 'error'
          ? copy.error
          : copy.requesting;

  return (
    <div ref={dialogRef} className="fixed inset-0 z-[120] flex items-center justify-center bg-vilu-ink/95 p-3 sm:p-6" role="dialog" aria-modal="true" aria-labelledby="guided-camera-title">
      <div className="flex max-h-[96vh] w-full max-w-4xl flex-col overflow-hidden rounded-[2rem] bg-vilu-ink text-vilu-paper ring-1 ring-vilu-paper/20">
        <div className="flex items-start justify-between gap-4 border-b border-vilu-paper/10 p-4 sm:p-6">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-vilu-lime">ViLu camera guide</p>
            <h2 id="guided-camera-title" className="mt-1 text-xl font-black sm:text-2xl">{copy.title}</h2>
          </div>
          <button ref={closeButtonRef} type="button" onClick={onClose} className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-vilu-paper text-vilu-ink" aria-label={copy.close}>
            <X size={20} />
          </button>
        </div>

        <div className="min-h-0 overflow-y-auto p-3 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-6">
          <div className="relative mx-auto aspect-[3/4] max-h-[48dvh] w-full max-w-xl overflow-hidden rounded-[1.75rem] bg-black sm:aspect-[4/3] sm:max-h-[62vh]">
            <video ref={videoRef} muted playsInline className={`h-full w-full scale-x-[-1] object-cover ${cameraState === 'live' ? 'opacity-100' : 'opacity-20'}`} />

            {cameraState === 'live' ? (
              <>
                <div className="pointer-events-none absolute inset-[8%_14%_10%] rounded-[46%] border-2 border-vilu-paper/75 shadow-[0_0_0_999px_rgba(0,0,0,0.22)]" />
                <div className={`absolute inset-x-3 bottom-3 rounded-2xl p-4 backdrop-blur-md sm:inset-x-5 sm:bottom-5 ${
                  guidance.tone === 'ready' ? 'bg-vilu-lime text-vilu-ink' : 'bg-vilu-ink/82 text-vilu-paper ring-1 ring-vilu-paper/20'
                }`}>
                  <div className="flex items-start gap-3">
                    {guidance.tone === 'ready' ? <CheckCircle2 className="mt-0.5 shrink-0" size={22} /> : <Camera className="mt-0.5 shrink-0 text-vilu-lime" size={22} />}
                    <div>
                      <p className="font-black">{guidance.title}</p>
                      <p className={`mt-1 text-sm leading-5 ${guidance.tone === 'ready' ? 'text-vilu-ink/75' : 'text-vilu-paper/72'}`}>{guidance.detail}</p>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="absolute inset-0 grid place-items-center p-8 text-center">
                <div>
                  <Camera className="mx-auto text-vilu-lime" size={44} />
                  <p className="mt-4 max-w-md font-bold leading-6 text-vilu-paper">{errorMessage}</p>
                  {(cameraState === 'denied' || cameraState === 'error') && (
                    <button type="button" onClick={() => setRetryKey((value) => value + 1)} className="mt-5 inline-flex items-center gap-2 rounded-full bg-vilu-lime px-5 py-3 text-xs font-black uppercase tracking-[0.12em] text-vilu-ink">
                      <RotateCcw size={16} /> {copy.retry}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="mx-auto mt-4 grid max-w-xl gap-3">
            <p className="text-center text-sm leading-5 text-vilu-paper/65">{copy.hint}</p>
            <button
              type="button"
              onClick={capture}
              disabled={cameraState !== 'live' || measurement?.status !== 'ready' || isCapturing}
              className="min-h-14 rounded-full bg-vilu-lime px-6 py-4 text-sm font-black uppercase tracking-[0.12em] text-vilu-ink transition hover:bg-vilu-card disabled:cursor-not-allowed disabled:bg-vilu-paper/15 disabled:text-vilu-paper/45"
            >
              {isCapturing ? copy.capturing : guidance.tone === 'ready' ? copy.capture : copy.captureAnyway}
            </button>
            <div className="flex items-start justify-center gap-2 text-xs leading-5 text-vilu-paper/55">
              <ShieldCheck className="mt-0.5 shrink-0 text-vilu-lime" size={16} />
              <span>{copy.privacy}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
