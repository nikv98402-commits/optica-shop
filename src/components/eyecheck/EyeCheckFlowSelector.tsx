import { ArrowRight, Baby, Grid3X3, Monitor, SplitSquareHorizontal } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { eyeCheckUiCopy, getEyeCheckFlowCopy } from '../../data/eyeCheckCopy';
import type { EyeCheckFlow, EyeCheckFlowId } from '../../types/eyeCheck';

const icons = {
  'adult-comfort': Monitor,
  'child-risk': Baby,
  'one-eye-comparison': SplitSquareHorizontal,
  'amsler-grid': Grid3X3,
};

interface EyeCheckFlowSelectorProps {
  flows: EyeCheckFlow[];
  selectedId: EyeCheckFlowId;
  onSelect: (id: EyeCheckFlowId) => void;
}

export function EyeCheckFlowSelector({ flows, selectedId, onSelect }: EyeCheckFlowSelectorProps) {
  const { language } = useLanguage();
  const copy = eyeCheckUiCopy[language];

  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {flows.map((flow) => {
        const Icon = icons[flow.id];
        const active = flow.id === selectedId;
        const flowText = getEyeCheckFlowCopy(flow, language);
        return (
          <button
            key={flow.id}
            onClick={() => onSelect(flow.id)}
            className={`group rounded-[1.5rem] p-5 text-left transition ${
              active
                ? 'bg-vilu-lime text-vilu-ink shadow-xl shadow-vilu-lime/20'
                : 'bg-vilu-card text-vilu-ink ring-1 ring-vilu-line hover:bg-vilu-paper'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <span className={`flex h-11 w-11 items-center justify-center rounded-full ${active ? 'bg-vilu-ink text-vilu-lime' : 'bg-vilu-ink text-vilu-paper'}`}>
                <Icon size={20} />
              </span>
              <ArrowRight className="transition group-hover:translate-x-1" size={18} />
            </div>
            <h2 className="mt-5 text-xl font-black tracking-tight">{flowText.title}</h2>
            <p className={`mt-3 text-sm font-semibold leading-6 ${active ? 'text-vilu-ink/72' : 'text-vilu-ink/60'}`}>{flowText.subtitle}</p>
            <p className="mt-4 text-xs font-black uppercase tracking-[0.16em]">{flow.estimatedMinutes} {copy.minuteShortDot}</p>
          </button>
        );
      })}
    </section>
  );
}
