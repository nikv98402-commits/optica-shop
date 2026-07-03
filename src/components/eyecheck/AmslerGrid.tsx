import { useLanguage } from '../../contexts/LanguageContext';

export function AmslerGrid() {
  const { language } = useLanguage();
  const steps = language === 'en'
    ? [
      '1. Cover one eye.',
      '2. Look only at the center dot.',
      '3. Do not scan around the grid.',
      '4. Repeat with the other eye.',
    ]
    : [
      '1. Закройте один глаз.',
      '2. Смотрите только в центральную точку.',
      '3. Не бегайте глазами по сетке.',
      '4. Повторите для другого глаза.',
    ];

  return (
    <div className="rounded-[1.5rem] bg-vilu-card p-4 ring-1 ring-vilu-line">
      <div
        className="relative mx-auto aspect-square w-full max-w-sm overflow-hidden rounded-2xl border-2 border-vilu-ink bg-vilu-paper"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(7,17,13,0.22) 1px, transparent 1px), linear-gradient(to bottom, rgba(7,17,13,0.22) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
        aria-label={language === 'en' ? 'Amsler grid guide' : 'Гайд по сетке Амслера'}
      >
        <div className="absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-vilu-ink" />
      </div>
      <div className="mt-4 grid gap-2 text-sm font-semibold leading-6 text-vilu-ink/70">
        {steps.map((step) => <p key={step}>{step}</p>)}
      </div>
    </div>
  );
}
