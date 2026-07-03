import { ArrowRight, CheckCircle2, RotateCcw, Save, ShieldAlert } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import {
  eyeCheckUiCopy,
  getEyeCheckFlowCopy,
  getEyeCheckResultCopy,
} from '../../data/eyeCheckCopy';
import type { EyeCheckFlow, EyeCheckResult } from '../../types/eyeCheck';

const riskStyles = {
  info: {
    label: 'Планово',
    badge: 'bg-vilu-lime text-vilu-ink',
    panel: 'bg-vilu-card text-vilu-ink ring-vilu-line',
  },
  'check-soon': {
    label: 'Проверить скоро',
    badge: 'bg-vilu-lime text-vilu-ink',
    panel: 'bg-vilu-card text-vilu-ink ring-vilu-line',
  },
  'do-not-delay': {
    label: 'Не откладывать',
    badge: 'bg-vilu-ink text-vilu-lime',
    panel: 'bg-vilu-ink text-vilu-paper ring-vilu-lime/20',
  },
  urgent: {
    label: 'Срочно',
    badge: 'bg-vilu-ink text-vilu-lime',
    panel: 'bg-vilu-ink text-vilu-paper ring-vilu-lime/20',
  },
};

interface EyeCheckResultCardProps {
  flow: EyeCheckFlow;
  result: EyeCheckResult;
  saved: boolean;
  onSaveLocal: () => void;
  onRestart: () => void;
  onTryOn: () => void;
}

export function EyeCheckResultCard({
  flow,
  result,
  saved,
  onSaveLocal,
  onRestart,
  onTryOn,
}: EyeCheckResultCardProps) {
  const { language } = useLanguage();
  const copy = eyeCheckUiCopy[language];
  const flowText = getEyeCheckFlowCopy(flow, language);
  const resultText = getEyeCheckResultCopy(result, language);
  const style = riskStyles[result.riskLevel];
  const dark = result.riskLevel === 'do-not-delay' || result.riskLevel === 'urgent';

  return (
    <section className={`rounded-[2rem] p-5 shadow-xl ring-1 md:p-8 ${style.panel}`}>
      <div className="flex flex-col justify-between gap-5 md:flex-row md:items-start">
        <div>
          <p className={`inline-flex rounded-full px-4 py-2 text-xs font-black uppercase tracking-[0.16em] ${style.badge}`}>
            {copy.risk[result.riskLevel]}
          </p>
          <p className={`mt-5 text-xs font-black uppercase tracking-[0.2em] ${dark ? 'text-vilu-lime' : 'text-vilu-green'}`}>
            {flowText.title}
          </p>
          <h2 className="mt-3 text-4xl font-black leading-tight tracking-tight md:text-5xl">{resultText.title}</h2>
          <p className={`mt-4 max-w-3xl text-base font-semibold leading-8 ${dark ? 'text-vilu-paper/74' : 'text-vilu-ink/68'}`}>
            {resultText.summary}
          </p>
        </div>
        <div className={`rounded-[1.5rem] p-5 text-center ${dark ? 'bg-vilu-paper/10' : 'bg-vilu-paper'}`}>
          <p className={`text-xs font-black uppercase tracking-[0.18em] ${dark ? 'text-vilu-lime' : 'text-vilu-green'}`}>{copy.index}</p>
          <p className="mt-2 text-6xl font-black leading-none">{result.attentionIndex}</p>
          <p className={`mt-2 text-xs font-bold ${dark ? 'text-vilu-paper/56' : 'text-vilu-ink/50'}`}>{copy.nonMedical}</p>
        </div>
      </div>

      <div className="mt-7 grid gap-4 lg:grid-cols-2">
        <div className={`rounded-[1.5rem] p-5 ${dark ? 'bg-vilu-paper/10' : 'bg-vilu-paper'}`}>
          <h3 className="text-lg font-black tracking-tight">{copy.why}</h3>
          <div className="mt-4 grid gap-3">
            {resultText.reasons.map((reason) => (
              <div key={reason} className="flex gap-3 text-sm font-semibold leading-6">
                <CheckCircle2 className={`mt-1 shrink-0 ${dark ? 'text-vilu-lime' : 'text-vilu-green'}`} size={17} />
                <span>{reason}</span>
              </div>
            ))}
          </div>
        </div>

        <div className={`rounded-[1.5rem] p-5 ${dark ? 'bg-vilu-paper/10' : 'bg-vilu-paper'}`}>
          <h3 className="text-lg font-black tracking-tight">{copy.next}</h3>
          <div className="mt-4 grid gap-3">
            {resultText.recommendedActions.map((action) => (
              <div key={action} className="flex gap-3 text-sm font-semibold leading-6">
                <ArrowRight className={`mt-1 shrink-0 ${dark ? 'text-vilu-lime' : 'text-vilu-green'}`} size={17} />
                <span>{action}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className={`mt-6 rounded-[1.5rem] p-4 text-sm font-semibold leading-6 ${dark ? 'bg-vilu-lime/10 text-vilu-paper/72' : 'bg-vilu-lime/20 text-vilu-ink/70'}`}>
        <ShieldAlert className={`mb-2 ${dark ? 'text-vilu-lime' : 'text-vilu-green'}`} size={19} />
        {copy.disclaimer}
      </div>

      <div className="mt-7 flex flex-col gap-3 sm:flex-row">
        {result.ctaPrimary === 'tryon' && (
          <button
            type="button"
            onClick={onTryOn}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-vilu-lime px-7 py-4 text-sm font-black uppercase tracking-[0.14em] text-vilu-ink transition hover:bg-vilu-card"
          >
            {copy.tryOn} <ArrowRight size={18} />
          </button>
        )}
        <button
          type="button"
          onClick={onSaveLocal}
          disabled={saved}
          className={`inline-flex items-center justify-center gap-2 rounded-full px-7 py-4 text-sm font-black uppercase tracking-[0.14em] transition ${
            saved
              ? 'cursor-default bg-vilu-paper/30 text-vilu-ink/45'
              : 'bg-vilu-paper text-vilu-ink hover:bg-vilu-lime'
          }`}
        >
          <Save size={17} /> {saved ? copy.saved : copy.save}
        </button>
        <button
          type="button"
          onClick={onRestart}
          className={`inline-flex items-center justify-center gap-2 rounded-full px-7 py-4 text-sm font-black uppercase tracking-[0.14em] transition ${
            dark ? 'border border-vilu-paper/18 text-vilu-paper hover:bg-vilu-paper hover:text-vilu-ink' : 'border border-vilu-ink/14 text-vilu-ink hover:bg-vilu-ink hover:text-vilu-paper'
          }`}
        >
          <RotateCcw size={17} /> {copy.restart}
        </button>
      </div>
    </section>
  );
}
