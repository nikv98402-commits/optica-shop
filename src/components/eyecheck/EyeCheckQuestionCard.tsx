import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import {
  eyeCheckUiCopy,
  getEyeCheckFlowCopy,
  getEyeCheckOptionLabel,
  getEyeCheckQuestionCopy,
} from '../../data/eyeCheckCopy';
import type { EyeCheckAnswer, EyeCheckFlow, EyeCheckQuestion } from '../../types/eyeCheck';
import { AmslerGrid } from './AmslerGrid';

interface EyeCheckQuestionCardProps {
  flow: EyeCheckFlow;
  question: EyeCheckQuestion;
  questionIndex: number;
  totalQuestions: number;
  currentAnswer?: EyeCheckAnswer;
  onAnswer: (answer: EyeCheckAnswer) => void;
  onBack: () => void;
}

export function EyeCheckQuestionCard({
  flow,
  question,
  questionIndex,
  totalQuestions,
  currentAnswer,
  onAnswer,
  onBack,
}: EyeCheckQuestionCardProps) {
  const { language } = useLanguage();
  const copy = eyeCheckUiCopy[language];
  const flowText = getEyeCheckFlowCopy(flow, language);
  const questionText = getEyeCheckQuestionCopy(question, language);
  const progress = Math.round(((questionIndex + 1) / totalQuestions) * 100);

  return (
    <section className="rounded-[2rem] bg-vilu-card p-5 shadow-sm ring-1 ring-vilu-line md:p-8">
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-vilu-green">{flowText.title}</p>
          <p className="mt-2 text-sm font-bold text-vilu-ink/55">{copy.question} {questionIndex + 1} {copy.of} {totalQuestions}</p>
        </div>
        <div className="h-3 w-full overflow-hidden rounded-full bg-vilu-ink/10 sm:w-48">
          <div className="h-full rounded-full bg-vilu-lime" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {flow.id === 'amsler-grid' && questionIndex === 0 && <div className="mb-6"><AmslerGrid /></div>}

      <h2 className="text-3xl font-black leading-tight tracking-tight text-vilu-ink md:text-4xl">{questionText.text}</h2>
      {questionText.helpText && <p className="mt-3 text-base font-semibold leading-7 text-vilu-ink/65">{questionText.helpText}</p>}

      <div className="mt-7 grid gap-3">
        {(question.options ?? []).map((option) => {
          const selected = currentAnswer?.value === option.value;
          return (
            <button
              key={option.value}
              onClick={() => onAnswer({
                questionId: question.id,
                value: option.value,
                score: option.score,
                redFlag: option.redFlag,
              })}
              className={`flex min-h-16 items-center justify-between gap-4 rounded-2xl px-5 py-4 text-left text-base font-black transition ${
                selected
                  ? 'bg-vilu-lime text-vilu-ink'
                  : 'bg-vilu-paper text-vilu-ink ring-1 ring-vilu-line hover:bg-vilu-lime/40'
              }`}
            >
              <span>{getEyeCheckOptionLabel(option.label, language)}</span>
              {selected && <CheckCircle2 size={20} />}
            </button>
          );
        })}
      </div>

      <div className="mt-7 flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          disabled={questionIndex === 0}
          className="inline-flex items-center gap-2 rounded-full border border-vilu-ink/10 bg-vilu-paper px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-vilu-ink transition hover:bg-vilu-lime disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ArrowLeft size={16} /> {copy.back}
        </button>
        <p className="text-xs font-bold leading-5 text-vilu-ink/50">{flowText.disclaimer}</p>
      </div>
    </section>
  );
}
