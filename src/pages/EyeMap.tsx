import {
  ArrowLeft,
  Camera,
  Check,
  Eye,
  History,
  ImagePlus,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Trash2,
} from 'lucide-react';
import {
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react';
import { GuidedCameraCapture } from '../components/tryon/GuidedCameraCapture';
import { eyeMapCopy } from '../content/eyeMapCopy';
import { useLanguage } from '../contexts/LanguageContext';
import {
  EYE_MAP_INITIAL_STATE,
  eyeMapReducer,
} from '../lib/eyeMap/eyeMapReducer';
import {
  getEyeMapAnalyticsCommon,
  trackEyeMapEvent,
} from '../lib/eyeMap/eyeMapAnalytics';
import { adaptFaceFitToEyeMap } from '../lib/eyeMap/localResultAdapter';
import {
  clearEyeMapHistory,
  readEyeMapStore,
  saveEyeMapResult,
} from '../lib/eyeMap/storage';
import type {
  EyeMapCaptureSource,
  EyeMapLocalStoreV1,
} from '../types/eyeMapLocal';

interface EyeMapProps {
  onNavigate: (page: string) => void;
}

function historyBucket(count: number): '1' | '2-5' | '6-12' {
  return count <= 1 ? '1' : count <= 5 ? '2-5' : '6-12';
}

export function EyeMap({ onNavigate }: EyeMapProps) {
  const { language } = useLanguage();
  const copy = eyeMapCopy[language];
  const analyticsCommon = useMemo(
    () => getEyeMapAnalyticsCommon(language),
    [language],
  );
  const [state, dispatch] = useReducer(
    eyeMapReducer,
    EYE_MAP_INITIAL_STATE,
  );
  const [history, setHistory] = useState<EyeMapLocalStoreV1>(() =>
    readEyeMapStore(),
  );
  const [storageAvailable, setStorageAvailable] = useState(true);
  const [showGuides, setShowGuides] = useState(false);
  const [guidePoints, setGuidePoints] = useState<
    Array<{ id: string; x: number; y: number }>
  >([]);
  const previewUrlRef = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    document.title =
      language === 'en'
        ? 'Eye Map | Personal visual baseline | ViLu'
        : 'Eye Map | Личная визуальная точка отсчета | ViLu';
  }, [language]);

  useEffect(() => {
    trackEyeMapEvent('eye_map_opened', {
      ...analyticsCommon,
      entryPoint: 'direct',
    });
  }, [analyticsCommon]);

  useEffect(
    () => () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    },
    [],
  );

  const baseline = history.results.find(
    (result) => result.id === history.baselineId,
  );

  const analyzeFile = async (
    file: File,
    source: EyeMapCaptureSource,
  ) => {
    const analysisId = crypto.randomUUID();
    const supported = ['image/jpeg', 'image/png', 'image/webp'].includes(
      file.type,
    );
    if (!supported) {
      dispatch({
        type: 'START_ANALYSIS',
        analysisId,
        source,
        previewUrl: '',
      });
      dispatch({
        type: 'ANALYSIS_BLOCKED',
        analysisId,
        reason: 'unsupported_file',
      });
      return;
    }

    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    const previewUrl = URL.createObjectURL(file);
    previewUrlRef.current = previewUrl;
    setShowGuides(false);
    setGuidePoints([]);
    dispatch({ type: 'START_ANALYSIS', analysisId, source, previewUrl });
    trackEyeMapEvent('eye_map_photo_selected', {
      ...analyticsCommon,
      source,
    });

    try {
      const { analyzeFacePhoto } = await import('../lib/faceFitEngine');
      const measurement = await analyzeFacePhoto(previewUrl);
      const adapted = adaptFaceFitToEyeMap(
        measurement,
        source,
        baseline,
      );
      if (adapted.status === 'blocked') {
        dispatch({
          type: 'ANALYSIS_BLOCKED',
          analysisId,
          reason: adapted.reason,
        });
        trackEyeMapEvent('eye_map_analysis_blocked', {
          ...analyticsCommon,
          reason: adapted.reason,
        });
        return;
      }
      setGuidePoints(measurement.overlayPoints);
      dispatch({
        type: 'ANALYSIS_READY',
        analysisId,
        result: adapted.result,
      });
      trackEyeMapEvent('eye_map_analysis_completed', {
        ...analyticsCommon,
        status:
          adapted.result.qualityStatus === 'retake' ? 'retake' : 'good',
      });
    } catch {
      dispatch({
        type: 'ANALYSIS_BLOCKED',
        analysisId,
        reason: 'engine_unavailable',
      });
      trackEyeMapEvent('eye_map_analysis_blocked', {
        ...analyticsCommon,
        reason: 'engine_unavailable',
      });
    }
  };

  const reset = () => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    setGuidePoints([]);
    setShowGuides(false);
    dispatch({ type: 'RESET' });
  };

  const saveResult = () => {
    if (state.status !== 'result' || state.saved) return;
    try {
      const next = saveEyeMapResult(state.result);
      setHistory(next);
      dispatch({ type: 'MARK_SAVED' });
      trackEyeMapEvent('eye_map_baseline_saved', {
        ...analyticsCommon,
        historyCountBucket: historyBucket(next.results.length),
      });
    } catch {
      setStorageAvailable(false);
    }
  };

  const clearHistory = () => {
    try {
      clearEyeMapHistory();
      setHistory({ schemaVersion: 1, results: [] });
      trackEyeMapEvent('eye_map_history_cleared', analyticsCommon);
    } catch {
      setStorageAvailable(false);
    }
  };

  const qualityLabel =
    state.status === 'result'
      ? state.result.metrics.captureQuality === 'good'
        ? copy.captureGood
        : state.result.metrics.captureQuality === 'acceptable'
          ? copy.captureAcceptable
          : copy.captureRetake
      : '';

  return (
    <div className="min-h-screen bg-vilu-paper px-4 py-10 text-vilu-ink sm:px-6">
      <div className="mx-auto max-w-6xl">
        <button
          type="button"
          onClick={() => onNavigate('eyecheck')}
          className="vilu-secondary-button min-h-11 gap-2 px-5 py-3 text-xs"
        >
          <ArrowLeft size={16} /> {copy.back}
        </button>

        <header className="mt-8 grid gap-8 rounded-[2rem] bg-vilu-ink p-6 text-vilu-paper md:p-10 lg:grid-cols-[1fr_0.75fr] lg:items-end">
          <div>
            <p className="kinetic-label">{copy.eyebrow}</p>
            <h1 className="mt-5 text-5xl font-black uppercase leading-[0.95] md:text-7xl">
              {copy.title}
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-vilu-paper/78">
              {copy.intro}
            </p>
          </div>
          <div className="rounded-[1.5rem] bg-vilu-mist p-5 ring-1 ring-vilu-paper/15">
            <ShieldCheck className="text-vilu-lime" />
            <p className="mt-3 text-sm leading-6 text-vilu-paper/78">
              {copy.privacy}
            </p>
            <p className="mt-3 text-xs font-black uppercase tracking-[0.13em] text-vilu-lime">
              {copy.notMedical}
            </p>
          </div>
        </header>

        {(state.status === 'idle' || state.status === 'camera') && (
          <section className="mt-8 rounded-[2rem] bg-vilu-card p-6 ring-1 ring-vilu-line md:p-10">
            <div className="mx-auto max-w-3xl text-center">
              <Sparkles className="mx-auto text-vilu-green" size={34} />
              <h2 className="mt-4 text-3xl font-black md:text-5xl">
                {copy.baselineFirst}
              </h2>
              <p className="mx-auto mt-4 max-w-2xl leading-7 text-vilu-ink/68">
                {copy.baselineFirstDetail}
              </p>
              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => {
                    dispatch({ type: 'OPEN_CAMERA' });
                    trackEyeMapEvent(
                      'eye_map_camera_started',
                      analyticsCommon,
                    );
                  }}
                  className="vilu-primary-button min-h-14 gap-2 px-6 py-4 text-sm"
                >
                  <Camera size={19} /> {copy.startCamera}
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="vilu-secondary-button min-h-14 gap-2 px-6 py-4 text-sm"
                >
                  <ImagePlus size={19} /> {copy.upload}
                </button>
              </div>
              <p className="mt-3 text-xs text-vilu-ink/55">
                {copy.uploadHint}
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void analyzeFile(file, 'upload');
                  event.currentTarget.value = '';
                }}
              />
            </div>
          </section>
        )}

        {state.status === 'camera' && (
          <GuidedCameraCapture
            language={language}
            analyticsSource="eye_map"
            onCapture={(file) => analyzeFile(file, 'camera')}
            onClose={() => dispatch({ type: 'RESET' })}
          />
        )}

        {state.status === 'analyzing' && (
          <section
            className="mt-8 grid min-h-[360px] place-items-center rounded-[2rem] bg-vilu-card p-8 text-center ring-1 ring-vilu-line"
            aria-live="polite"
          >
            <div>
              <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-vilu-line border-t-vilu-green" />
              <h2 className="mt-6 text-3xl font-black">{copy.analyzing}</h2>
              <p className="mt-3 text-vilu-ink/65">{copy.analyzingDetail}</p>
            </div>
          </section>
        )}

        {state.status === 'blocked' && (
          <section className="mt-8 rounded-[2rem] bg-vilu-card p-6 ring-1 ring-vilu-line md:p-10">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-vilu-green">
              {copy.notMedical}
            </p>
            <h2 className="mt-4 text-3xl font-black md:text-5xl">
              {copy.retake}
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-vilu-ink/70">
              {copy.blocked[state.reason]}
            </p>
            <button
              type="button"
              onClick={reset}
              className="vilu-primary-button mt-7 min-h-12 gap-2 px-6 py-3 text-xs"
            >
              <RotateCcw size={17} /> {copy.retakeAction}
            </button>
          </section>
        )}

        {state.status === 'result' && (
          <section className="mt-8 overflow-hidden rounded-[2rem] bg-vilu-card ring-1 ring-vilu-line">
            <div className="grid lg:grid-cols-[1.15fr_0.85fr]">
              <div className="relative min-h-[360px] bg-vilu-ink">
                <img
                  src={state.previewUrl}
                  alt={copy.resultImageAlt}
                  className="h-full max-h-[680px] w-full object-contain"
                />
                {showGuides &&
                  guidePoints.map((point) => (
                    <span
                      key={point.id}
                      className="absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-vilu-ink bg-vilu-lime"
                      style={{ left: `${point.x}%`, top: `${point.y}%` }}
                    />
                  ))}
                <button
                  type="button"
                  aria-pressed={showGuides}
                  onClick={() => setShowGuides((value) => !value)}
                  className="absolute bottom-4 left-4 inline-flex min-h-11 items-center gap-2 rounded-full bg-vilu-card px-4 py-2 text-xs font-black uppercase tracking-[0.1em] text-vilu-ink"
                >
                  <Eye size={16} />
                  {showGuides ? copy.hideGuides : copy.showGuides}
                </button>
              </div>

              <div className="p-6 md:p-8">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-vilu-green">
                  {new Date(state.result.capturedAt).toLocaleString(language)}
                </p>
                <h2 className="mt-3 text-3xl font-black md:text-5xl">
                  {copy.resultTitle}
                </h2>
                <p className="mt-4 text-lg font-bold text-vilu-green">
                  {state.result.qualityStatus === 'retake'
                    ? copy.retake
                    : copy.suitable}
                </p>
                <p className="mt-2 text-sm text-vilu-ink/62">
                  {copy.notMedical}
                </p>

                <dl className="mt-7 divide-y divide-vilu-line border-y border-vilu-line">
                  <MetricRow
                    label={copy.captureQuality}
                    value={qualityLabel}
                  />
                  <MetricRow
                    label={copy.alignment}
                    value={
                      state.result.metrics.alignmentQuality === 'aligned'
                        ? copy.aligned
                        : copy.adjust
                    }
                  />
                  <MetricRow
                    label={copy.visibility}
                    value={copy.bothEyes}
                  />
                  <MetricRow
                    label={copy.repeatability}
                    value={
                      state.result.metrics.repeatabilityScore === undefined
                        ? copy.baselineFirst
                        : `${state.result.metrics.repeatabilityScore}/100`
                    }
                  />
                </dl>

                <button
                  type="button"
                  onClick={saveResult}
                  disabled={state.saved || !storageAvailable}
                  className="vilu-primary-button mt-7 min-h-14 w-full gap-2 px-6 py-4 text-xs disabled:cursor-not-allowed disabled:opacity-55"
                >
                  <Check size={18} />
                  {state.saved ? copy.saved : copy.saveBaseline}
                </button>
                {!storageAvailable && (
                  <p className="mt-3 text-sm text-vilu-ink/65">
                    {copy.storageUnavailable}
                  </p>
                )}
                <button
                  type="button"
                  onClick={reset}
                  className="vilu-secondary-button mt-3 min-h-12 w-full px-6 py-3 text-xs"
                >
                  {copy.newPhoto}
                </button>
              </div>
            </div>
          </section>
        )}

        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="rounded-[2rem] bg-vilu-card p-6 ring-1 ring-vilu-line md:p-8">
            <div className="flex items-center gap-3">
              <History className="text-vilu-green" />
              <h2 className="text-2xl font-black">{copy.history}</h2>
            </div>
            {history.results.length === 0 ? (
              <p className="mt-5 text-vilu-ink/62">{copy.historyEmpty}</p>
            ) : (
              <ol className="mt-5 divide-y divide-vilu-line">
                {history.results.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center justify-between gap-4 py-4"
                  >
                    <span className="text-sm font-bold">
                      {new Date(item.capturedAt).toLocaleDateString(language)}
                    </span>
                    <span className="text-xs font-black uppercase tracking-[0.1em] text-vilu-green">
                      {item.qualityStatus === 'good'
                        ? copy.captureGood
                        : copy.captureAcceptable}
                    </span>
                  </li>
                ))}
              </ol>
            )}
            {history.results.length > 0 && (
              <button
                type="button"
                onClick={clearHistory}
                className="vilu-secondary-button mt-5 min-h-11 gap-2 px-5 py-3 text-xs"
              >
                <Trash2 size={16} /> {copy.clear}
              </button>
            )}
          </div>

          <div className="rounded-[2rem] border border-dashed border-vilu-green/45 bg-vilu-foam p-6 md:p-8">
            <span className="inline-flex rounded-full bg-vilu-card px-3 py-2 text-[10px] font-black uppercase tracking-[0.13em] text-vilu-green ring-1 ring-vilu-line">
              {copy.demoBadge}
            </span>
            <h2 className="mt-5 text-2xl font-black">{copy.demoTitle}</h2>
            <p className="mt-4 text-sm leading-7 text-vilu-ink/68">
              {copy.demoBody}
            </p>
            <button
              type="button"
              disabled
              className="mt-6 min-h-11 w-full cursor-not-allowed rounded-full border border-vilu-line bg-transparent px-5 py-3 text-xs font-black uppercase tracking-[0.1em] text-vilu-ink/48"
            >
              {copy.demoAction}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 py-4 sm:grid-cols-[1fr_auto] sm:items-center sm:gap-5">
      <dt className="text-sm font-bold text-vilu-ink/65">{label}</dt>
      <dd className="text-sm font-black text-vilu-ink">{value}</dd>
    </div>
  );
}
