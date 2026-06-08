import { Camera, RotateCcw, Sparkles } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Product } from '../types';

interface VirtualTryOnProps {
  product: Product;
  compact?: boolean;
}

const frameColors: Record<Product['category'], string> = {
  eyeglasses: 'border-slate-950',
  sunglasses: 'border-[#5a3926] bg-[#2d221b]/30',
  contact_lenses: 'border-slate-300',
};

export function VirtualTryOn({ product, compact = false }: VirtualTryOnProps) {
  const [faceShape, setFaceShape] = useState<'oval' | 'round' | 'angular'>('oval');
  const [fitSize, setFitSize] = useState(72);

  const canTryOn = product.category === 'eyeglasses' || product.category === 'sunglasses';
  const frameClass = useMemo(() => frameColors[product.category], [product.category]);

  if (!canTryOn) return null;

  const bridgeWidth = fitSize < 70 ? 'w-5' : fitSize > 78 ? 'w-8' : 'w-6';
  const lensRadius = faceShape === 'angular' ? 'rounded-xl' : faceShape === 'round' ? 'rounded-full' : 'rounded-[42%]';

  return (
    <section className={`rounded-[2rem] bg-slate-950 p-5 text-white ${compact ? '' : 'mt-8'}`}>
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-[#f5b25f]">Виртуальная примерка</p>
          <h2 className="mt-2 text-2xl font-black tracking-tight">{product.name}</h2>
        </div>
        <div className="rounded-2xl bg-white/10 p-3 text-[#f5b25f]">
          <Camera size={22} />
        </div>
      </div>

      <div className="relative mx-auto flex aspect-[4/3] max-w-xl items-center justify-center overflow-hidden rounded-[1.5rem] bg-[#f7f1e8]">
        <div className={`relative h-[70%] w-[46%] min-w-44 rounded-[48%] bg-[#d7a77d] shadow-inner ${faceShape === 'round' ? 'w-[50%]' : ''} ${faceShape === 'angular' ? 'rounded-[38%]' : ''}`}>
          <div className="absolute left-[27%] top-[36%] h-3 w-3 rounded-full bg-slate-950" />
          <div className="absolute right-[27%] top-[36%] h-3 w-3 rounded-full bg-slate-950" />
          <div className="absolute left-1/2 top-[48%] h-7 w-3 -translate-x-1/2 rounded-full bg-[#bf865f]" />
          <div className="absolute bottom-[18%] left-1/2 h-2 w-14 -translate-x-1/2 rounded-full bg-[#8f4a4a]" />

          <div className="absolute left-1/2 top-[35%] flex -translate-x-1/2 items-center" style={{ width: `${fitSize}%` }}>
            <div className={`h-16 flex-1 border-[7px] ${frameClass} ${lensRadius} bg-white/10 shadow-lg`} />
            <div className={`${bridgeWidth} h-2 rounded-full bg-slate-950`} />
            <div className={`h-16 flex-1 border-[7px] ${frameClass} ${lensRadius} bg-white/10 shadow-lg`} />
          </div>
        </div>

        <div className="absolute bottom-4 left-4 right-4 rounded-2xl bg-white/85 p-3 text-sm font-bold text-slate-700 backdrop-blur">
          {product.category === 'sunglasses'
            ? 'Затемнение линз показано в демо-режиме, посадка адаптируется под форму лица.'
            : 'Демо-посадка помогает оценить ширину оправы и форму линз онлайн.'}
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-[1fr_180px]">
        <div>
          <p className="mb-3 text-xs font-black uppercase tracking-[0.18em] text-white/45">Форма лица</p>
          <div className="grid grid-cols-3 gap-2">
            {[
              ['oval', 'Овал'],
              ['round', 'Круг'],
              ['angular', 'Углы'],
            ].map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setFaceShape(id as 'oval' | 'round' | 'angular')}
                className={`rounded-2xl px-3 py-3 text-sm font-black transition ${faceShape === id ? 'bg-[#f5b25f] text-slate-950' : 'bg-white/10 text-white hover:bg-white/15'}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <label>
          <span className="mb-3 block text-xs font-black uppercase tracking-[0.18em] text-white/45">Размер</span>
          <input
            type="range"
            min="62"
            max="84"
            value={fitSize}
            onChange={(event) => setFitSize(Number(event.target.value))}
            className="w-full accent-[#f5b25f]"
          />
          <button
            type="button"
            onClick={() => { setFaceShape('oval'); setFitSize(72); }}
            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-white/10 px-3 py-3 text-xs font-black uppercase tracking-[0.14em] text-white transition hover:bg-white/15"
          >
            <RotateCcw size={14} /> Сбросить
          </button>
        </label>
      </div>

      <div className="mt-5 flex gap-3 rounded-2xl bg-white/10 p-4 text-sm leading-6 text-white/70">
        <Sparkles className="mt-1 shrink-0 text-[#f5b25f]" size={18} />
        <span>В реальной интеграции сюда подключается камера или загрузка фото, а сейчас показан безопасный demo-режим примерки.</span>
      </div>
    </section>
  );
}
