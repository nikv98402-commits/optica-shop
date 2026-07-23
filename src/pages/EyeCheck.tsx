import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Clock, ShieldCheck } from 'lucide-react';
import { EyeCheckFlowSelector } from '../components/eyecheck/EyeCheckFlowSelector';
import { EyeCheckIntro } from '../components/eyecheck/EyeCheckIntro';
import { EyeCheckQuestionCard } from '../components/eyecheck/EyeCheckQuestionCard';
import { EyeCheckResultCard } from '../components/eyecheck/EyeCheckResultCard';
import { VisionTrackerOnboarding } from '../components/eyecheck/VisionTrackerOnboarding';
import { useLanguage } from '../contexts/LanguageContext';
import { eyeCheckUiCopy, getEyeCheckFlowCopy } from '../data/eyeCheckCopy';
import { eyeCheckFlows, getEyeCheckFlow } from '../data/eyeCheckFlows';
import { AnalyticsEvent, trackEvent } from '../lib/analyticsEvents';
import { calculateEyeCheckResult } from '../lib/eyeCheckScoring';
import { saveEyeCheckResult } from '../lib/eyeCheckStorage';
import type { EyeCheckAnswer, EyeCheckFlowId, EyeCheckResult, VisionTrackerOnboardingAnswers } from '../types/eyeCheck';

interface EyeCheckProps {
  onNavigate: (page: string) => void;
}

export function EyeCheck({ onNavigate }: EyeCheckProps) {
  const { language } = useLanguage();
  const copy = eyeCheckUiCopy[language];
  const [selectedFlowId, setSelectedFlowId] = useState<EyeCheckFlowId>('adult-comfort');
  const [started, setStarted] = useState(false);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<EyeCheckAnswer[]>([]);
  const [result, setResult] = useState<EyeCheckResult | null>(null);
  const [saved, setSaved] = useState(false);
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [onboardingAnswers, setOnboardingAnswers] = useState<VisionTrackerOnboardingAnswers | null>(null);

  const flow = useMemo(() => getEyeCheckFlow(selectedFlowId), [selectedFlowId]);
  const flowText = getEyeCheckFlowCopy(flow, language);
  const currentQuestion = flow.questions[questionIndex];

  useEffect(() => {
    trackEvent(AnalyticsEvent.EyeCheckOpened, { source: 'route' });
    trackEvent(AnalyticsEvent.VisionTrackerOpened, { source: 'route' });
  }, []);

  useEffect(() => {
    document.title = language === 'en'
      ? 'ViLu Vision Tracker | Before an in-person eye check'
      : 'ViLu Vision Tracker | Перед очной проверкой';
  }, [language]);

  const resetFlow = (nextFlowId = selectedFlowId) => {
    setSelectedFlowId(nextFlowId);
    setStarted(false);
    setQuestionIndex(0);
    setAnswers([]);
    setResult(null);
    setSaved(false);
  };

  const handleOnboardingStart = () => {
    trackEvent(AnalyticsEvent.VisionTrackerOnboardingStarted, { source: 'vision_tracker' });
  };

  const handleOnboardingComplete = (
    nextAnswers: VisionTrackerOnboardingAnswers,
    recommendedFlowId: EyeCheckFlowId,
  ) => {
    setOnboardingAnswers(nextAnswers);
    setOnboardingComplete(true);
    resetFlow(recommendedFlowId);
    trackEvent(AnalyticsEvent.VisionTrackerOnboardingCompleted, { status: 'complete' });
    trackEvent(AnalyticsEvent.VisionTrackerFlowRecommended, { flow_id: recommendedFlowId });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOnboardingSkip = () => {
    setOnboardingComplete(true);
    trackEvent(AnalyticsEvent.VisionTrackerOnboardingCompleted, { status: 'skipped' });
  };

  const handleSelectFlow = (id: EyeCheckFlowId) => {
    resetFlow(id);
    trackEvent(AnalyticsEvent.EyeCheckFlowSelected, { flow_id: id });
  };

  const handleStart = () => {
    setStarted(true);
    setQuestionIndex(0);
    setAnswers([]);
    setResult(null);
    setSaved(false);
  };

  const handleAnswer = (answer: EyeCheckAnswer) => {
    const nextAnswers = [
      ...answers.filter((item) => item.questionId !== answer.questionId),
      answer,
    ];
    setAnswers(nextAnswers);

    setQuestionIndex((currentIndex) => {
      if (currentIndex >= flow.questions.length - 1) {
        const nextResult = calculateEyeCheckResult(flow, nextAnswers);
        setResult(nextResult);
        setStarted(false);
        trackEvent(AnalyticsEvent.EyeCheckCompleted, {
          flow_id: flow.id,
          risk_level: nextResult.riskLevel,
          total_score: nextResult.totalScore,
        });
        trackEvent(AnalyticsEvent.EyeCheckResultViewed, {
          flow_id: flow.id,
          risk_level: nextResult.riskLevel,
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return currentIndex;
      }

      return currentIndex + 1;
    });
  };

  const handleBack = () => {
    if (questionIndex === 0) return;
    setQuestionIndex((index) => index - 1);
  };

  const handleSaveLocal = () => {
    if (!result || saved) return;
    saveEyeCheckResult(result);
    setSaved(true);
    trackEvent(AnalyticsEvent.EyeCheckSavedLocal, {
      flow_id: result.flowId,
      risk_level: result.riskLevel,
    });
    trackEvent(AnalyticsEvent.VisionTrackerSavedLocal, {
      flow_id: result.flowId,
      risk_level: result.riskLevel,
    });
  };

  const handleTryOn = () => {
    trackEvent(AnalyticsEvent.EyeCheckCtaTryOn, {
      flow_id: result?.flowId ?? flow.id,
      risk_level: result?.riskLevel,
    });
    onNavigate('tryon');
  };

  return (
    <div className="eye-orbits-page min-h-screen bg-vilu-paper px-4 py-10 sm:px-6">
      <div className="eye-orbits-shell mx-auto max-w-6xl">
        <button
          type="button"
          onClick={() => onNavigate('home')}
          className="eye-orbits-back mb-6 inline-flex items-center gap-2 rounded-full bg-vilu-card px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-vilu-ink ring-1 ring-vilu-line transition hover:bg-vilu-lime"
        >
          <ArrowLeft size={16} /> {copy.backHome}
        </button>

        <EyeCheckIntro />

        <div className="eye-orbits-privacy mt-6 rounded-[1.5rem] bg-vilu-lime/18 p-4 text-sm font-semibold leading-6 text-vilu-ink/72 ring-1 ring-vilu-lime/25">
          <ShieldCheck className="mb-2 text-vilu-green" size={18} />
          {copy.privacyNotice}
        </div>

        {!onboardingComplete && !started && !result && (
          <VisionTrackerOnboarding
            onStart={handleOnboardingStart}
            onComplete={handleOnboardingComplete}
            onSkip={handleOnboardingSkip}
          />
        )}

        {onboardingComplete && !started && !result && (
          <div className="eye-orbits-recommendation mt-8 rounded-[1.5rem] bg-vilu-card p-5 text-vilu-ink shadow-sm ring-1 ring-vilu-line">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-vilu-green">{copy.recommendationReady}</p>
            <p className="mt-2 text-sm font-semibold leading-6 text-vilu-ink/68">
              {copy.recommendationText} {onboardingAnswers ? copy.chooseAnotherScenario : ''}
            </p>
          </div>
        )}

        {onboardingComplete && (
          <div className="mt-8">
            <EyeCheckFlowSelector flows={eyeCheckFlows} selectedId={selectedFlowId} onSelect={handleSelectFlow} />
          </div>
        )}

        {onboardingComplete && !started && !result && (
          <section className="eye-orbits-start mt-8 rounded-[2rem] bg-vilu-card p-6 shadow-sm ring-1 ring-vilu-line md:p-8">
            <div className="grid gap-6 lg:grid-cols-[1fr_280px] lg:items-center">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-vilu-green">{copy.selectedScenario}</p>
                <h2 className="mt-3 text-3xl font-black tracking-tight text-vilu-ink md:text-5xl">{flowText.title}</h2>
                <p className="mt-4 max-w-3xl text-base font-semibold leading-8 text-vilu-ink/68">{flowText.subtitle}</p>
                <p className="mt-4 rounded-2xl bg-vilu-paper p-4 text-sm font-semibold leading-6 text-vilu-ink/62">{flowText.disclaimer}</p>
              </div>
              <div className="rounded-[1.5rem] bg-vilu-ink p-5 text-vilu-paper">
                <Clock className="mb-4 text-vilu-lime" />
                <p className="text-xs font-black uppercase tracking-[0.18em] text-vilu-lime">{copy.time}</p>
                <p className="mt-2 text-4xl font-black">{flow.estimatedMinutes} {copy.minuteShort}</p>
                <button
                  type="button"
                  onClick={handleStart}
                  className="mt-6 w-full rounded-full bg-vilu-lime px-6 py-4 text-sm font-black uppercase tracking-[0.14em] text-vilu-ink transition hover:bg-vilu-card"
                >
                  {copy.start}
                </button>
              </div>
            </div>
          </section>
        )}

        {started && currentQuestion && (
          <div className="mt-8">
            <EyeCheckQuestionCard
              key={`${flow.id}-${currentQuestion.id}`}
              flow={flow}
              question={currentQuestion}
              questionIndex={questionIndex}
              totalQuestions={flow.questions.length}
              currentAnswer={answers.find((answer) => answer.questionId === currentQuestion.id)}
              onAnswer={handleAnswer}
              onBack={handleBack}
            />
          </div>
        )}

        {result && (
          <div className="mt-8">
            <EyeCheckResultCard
              flow={flow}
              result={result}
              saved={saved}
              onSaveLocal={handleSaveLocal}
              onRestart={() => resetFlow(flow.id)}
              onTryOn={handleTryOn}
            />
          </div>
        )}
      </div>
    </div>
  );
}
