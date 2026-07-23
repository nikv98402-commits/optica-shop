import { ShieldCheck } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { eyeCheckUiCopy } from '../../data/eyeCheckCopy';
import { AtomicHeading } from '../home/AtomicHeading';
import { OpticalOrbits } from '../home/OpticalOrbits';

export function EyeCheckIntro() {
  const { language } = useLanguage();
  const copy = eyeCheckUiCopy[language];

  return (
    <section className="eye-orbits-hero">
      <div className="eye-orbits-hero__motion" aria-hidden="true"><OpticalOrbits /></div>
      <div className="eye-orbits-hero__content">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-vilu-lime text-vilu-ink">
          <ShieldCheck size={22} />
        </div>
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-vilu-lime">{copy.productEyebrow}</p>
          <AtomicHeading
            as="h1"
            lines={language === 'ru' ? ['Понять', 'что делать', 'дальше'] : ['Understand', 'what to do', 'next']}
            className="eye-orbits-hero__title"
          />
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
