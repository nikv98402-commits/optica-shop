import { ArrowLeft, Glasses, MessageCircleQuestion } from 'lucide-react';
import { OpticalOrbits } from '../components/home/OpticalOrbits';

interface ComingSoonProps {
  onNavigate: (page: string) => void;
}

export function ComingSoon({ onNavigate }: ComingSoonProps) {
  return (
    <section className="coming-soon-page">
      <div className="coming-soon-page__orbits" aria-hidden="true"><OpticalOrbits /></div>
      <div className="coming-soon-page__content">
        <p className="kinetic-label">Следующий шаг ViLu</p>
        <h1>Подготовка к визиту<br />ещё в работе</h1>
        <p>
          Мы собираем понятный сценарий: выбранные оправы, ближайший салон и короткий
          чек-лист для проверки посадки и рецепта.
        </p>
        <div className="coming-soon-page__actions">
          <button type="button" onClick={() => onNavigate('products')}>
            <ArrowLeft size={17} /> Вернуться в каталог
          </button>
          <button type="button" onClick={() => onNavigate('assistant')}>
            <MessageCircleQuestion size={17} /> Спросить ViLu
          </button>
        </div>
        <div className="coming-soon-page__status">
          <Glasses size={20} />
          <span>Каталог и онлайн-примерка продолжают работать.</span>
        </div>
      </div>
    </section>
  );
}
