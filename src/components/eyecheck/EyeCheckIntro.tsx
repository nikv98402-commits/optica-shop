import { ShieldCheck } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { eyeCheckUiCopy } from '../../data/eyeCheckCopy';

export function EyeCheckIntro() {
  const { language } = useLanguage();
  const copy = eyeCheckUiCopy[language];

  return (
    <section className="rounded-[2rem] bg-vilu-ink p-6 text-vilu-paper shadow-2xl shadow-vilu-ink/20 md:p-8">
      <div className="flex flex-col gap-5 md:flex-row md:items-start">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-vilu-lime text-vilu-ink">
          <ShieldCheck size={22} />
        </div>
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-vilu-lime">{copy.productEyebrow}</p>
          <h1 className="mt-3 text-4xl font-black leading-[0.95] tracking-tight md:text-6xl">{copy.introTitle}</h1>
          <p className="mt-5 max-w-3xl text-base font-semibold leading-8 text-vilu-paper/76">
            {copy.introText}
          </p>
          <p className="mt-4 rounded-2xl border border-vilu-lime/20 bg-vilu-paper/8 p-4 text-sm font-semibold leading-6 text-vilu-paper/72">
            {copy.introDisclaimer}
          </p>
        </div>
      </div>
    </section>
  );
}
