import { ArrowRight, CheckCircle2, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { eyeCheckUiCopy, recommendVisionTrackerFlow, visionTrackerOnboardingSteps } from '../../data/eyeCheckCopy';
import type { EyeCheckFlowId, VisionTrackerOnboardingAnswers } from '../../types/eyeCheck';

interface VisionTrackerOnboardingProps {
  onStart: () => void;
  onComplete: (answers: VisionTrackerOnboardingAnswers, recommendedFlowId: EyeCheckFlowId) => void;
  onSkip: () => void;
}

export function VisionTrackerOnboarding({ onStart, onComplete, onSkip }: VisionTrackerOnboardingProps) {
  const { language } = useLanguage();
  const copy = eyeCheckUiCopy[language];
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState<VisionTrackerOnboardingAnswers>({});
  const [started, setStarted] = useState(false);
  const step = visionTrackerOnboardingSteps[stepIndex];
  const selectedValue = answers[step.id];
  const isLastStep = stepIndex === visionTrackerOnboardingSteps.length - 1;

  const setAnswer = (value: VisionTrackerOnboardingAnswers[typeof step.id]) => {
    if (!started) {
      setStarted(true);
      onStart();
    }
    setAnswers((current) => ({
      ...current,
      [step.id]: value,
    }));
  };

  const goNext = () => {
    if (!selectedValue) return;
    if (!isLastStep) {
      setStepIndex((index) => index + 1);
      return;
    }

    const recommendedFlowId = recommendVisionTrackerFlow(answers);
    onComplete(answers, recommendedFlowId);
  };

  return (
    <section className="mt-8 overflow-hidden rounded-[2rem] bg-vilu-card shadow-sm ring-1 ring-vilu-line">
      <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="p-5 md:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-vilu-green">{copy.onboardingEyebrow}</p>
              <h2 className="mt-3 max-w-3xl text-3xl font-black leading-tight tracking-tight text-vilu-ink md:text-5xl">
                {step.title[language]}
              </h2>
              <p className="mt-3 max-w-2xl text-base font-semibold leading-7 text-vilu-ink/68">
                {step.subtitle[language]}
              </p>
            </div>
            <div className="rounded-full bg-vilu-lime px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-vilu-ink">
              {copy.onboardingProgress} {stepIndex + 1} / {visionTrackerOnboardingSteps.length}
            </div>
          </div>

          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            {step.options.map((option) => {
              const active = selectedValue === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setAnswer(option.value)}
                  className={`flex min-h-16 items-center justify-between gap-4 rounded-2xl px-5 py-4 text-left text-base font-black transition ${
                    active
                      ? 'bg-vilu-lime text-vilu-ink shadow-lg shadow-vilu-lime/20'
                      : 'bg-vilu-paper text-vilu-ink ring-1 ring-vilu-line hover:bg-vilu-lime/35'
                  }`}
                >
                  <span className="min-w-0 break-words">{option.label[language]}</span>
                  {active && <CheckCircle2 className="shrink-0" size={20} />}
                </button>
              );
            })}
          </div>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={goNext}
              disabled={!selectedValue}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-vilu-ink px-7 py-4 text-sm font-black uppercase tracking-[0.14em] text-vilu-paper transition hover:bg-vilu-green disabled:cursor-not-allowed disabled:bg-vilu-ink/16 disabled:text-vilu-ink/38"
            >
              {isLastStep ? copy.onboardingComplete : copy.onboardingNext} <ArrowRight size={18} />
            </button>
            <button
              type="button"
              onClick={onSkip}
              className="inline-flex items-center justify-center rounded-full border border-vilu-ink/12 bg-vilu-paper px-7 py-4 text-sm font-black uppercase tracking-[0.14em] text-vilu-ink transition hover:bg-vilu-lime"
            >
              {copy.onboardingSkip}
            </button>
          </div>
        </div>

        <aside className="border-t border-vilu-line bg-vilu-ink p-5 text-vilu-paper lg:border-l lg:border-t-0 md:p-8">
          <ShieldCheck className="text-vilu-lime" size={26} />
          <p className="mt-5 text-xs font-black uppercase tracking-[0.2em] text-vilu-lime">{copy.productEyebrow}</p>
          <p className="mt-3 text-sm font-semibold leading-7 text-vilu-paper/76">
            {copy.onboardingLocal}
          </p>
          <div className="mt-6 grid gap-3 text-sm font-bold text-vilu-paper/72">
            <span className="rounded-2xl bg-vilu-paper/8 p-4">{language === 'en' ? 'Local answers only' : 'Ответы только локально'}</span>
            <span className="rounded-2xl bg-vilu-paper/8 p-4">{language === 'en' ? 'No diagnosis' : 'Без диагноза'}</span>
            <span className="rounded-2xl bg-vilu-paper/8 p-4">{language === 'en' ? 'Clear next step' : 'Понятный следующий шаг'}</span>
          </div>
        </aside>
      </div>
    </section>
  );
}
