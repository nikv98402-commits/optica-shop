import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Map,
  MapPin,
  MessageCircle,
  Navigation,
  Phone,
  Search,
  Send,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { opticsDirectory, DirectoryOptic } from '../data/opticsDirectory';
import { AtomicHeading } from './home/AtomicHeading';
import { OpticalOrbits } from './home/OpticalOrbits';
import { AnalyticsEvent, trackEvent } from '../lib/analyticsEvents';

interface StoreLocatorProps {
  isOpen: boolean;
  onClose: () => void;
}

const stores = [...opticsDirectory].sort((storeA, storeB) => {
  const citySort = storeA.city.localeCompare(storeB.city, 'ru');
  return citySort || storeA.address.localeCompare(storeB.address, 'ru');
});

const cities = [...new Set(stores.map((store) => store.city))].sort((a, b) => a.localeCompare(b, 'ru'));

function storeHoursLabel(store: DirectoryOptic) {
  return store.hours;
}

function storeStatusLabel(store: DirectoryOptic) {
  return store.hours.includes('-') ? 'Открыто' : 'Уточнить';
}

function routeUrl(store: DirectoryOptic) {
  return `https://yandex.ru/maps/?rtext=~${store.lat},${store.lng}&rtt=auto`;
}

export function StoreLocator({ isOpen, onClose }: StoreLocatorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [cityFilter, setCityFilter] = useState('all');
  const [selectedStoreId, setSelectedStoreId] = useState(stores[0]?.id ?? '');

  const filteredStores = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return stores.filter((store) => {
      const cityMatches = cityFilter === 'all' || store.city === cityFilter;
      const queryMatches = !query || `${store.name} ${store.city} ${store.address}`.toLowerCase().includes(query);
      return cityMatches && queryMatches;
    });
  }, [cityFilter, searchQuery]);

  const activeStore = filteredStores.find((store) => store.id === selectedStoreId) ?? filteredStores[0];

  useEffect(() => {
    if (isOpen) trackEvent(AnalyticsEvent.NearbyOpticsOpened, { method: 'store_locator' });
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const trackStoreAction = (action: 'route' | 'call' | 'whatsapp' | 'telegram', store: DirectoryOptic) => {
    const eventMap = {
      route: AnalyticsEvent.RouteClicked,
      call: AnalyticsEvent.CallClicked,
      whatsapp: AnalyticsEvent.WhatsappClicked,
      telegram: AnalyticsEvent.TelegramClicked,
    };
    trackEvent(eventMap[action], { source: 'store_locator', store_id: store.id });
  };

  return (
    <div className="store-orbits-overlay" role="dialog" aria-modal="true" aria-label="Салоны ViLu">
      <div className="store-orbits-modal">
        <button onClick={onClose} className="store-orbits-close" aria-label="Закрыть салоны"><X size={19} /></button>

        <header className="store-orbits-hero">
          <div className="store-orbits-hero__orbits"><OpticalOrbits /></div>
          <div>
            <p className="store-orbits-eyebrow"><MapPin size={14} /> После онлайн-подбора</p>
            <AtomicHeading lines={['Выбрать салон', 'подтвердить', 'посадку']} className="store-orbits-heading" />
          </div>
          <div className="store-orbits-journey">
            {[
              ['01', 'Выбранные оправы'],
              ['02', 'Ближайший салон'],
              ['03', 'Посадка и рецепт'],
              ['04', 'Запись или маршрут'],
            ].map(([number, label]) => (
              <div key={number}><span>{number}</span><strong>{label}</strong><CheckCircle2 size={16} /></div>
            ))}
          </div>
        </header>

        <div className="store-orbits-controls">
          <label className="store-orbits-search">
            <Search size={18} aria-hidden="true" />
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Название, город или адрес"
            />
          </label>
          <label className="store-orbits-city">
            <span>Город</span>
            <select value={cityFilter} onChange={(event) => setCityFilter(event.target.value)}>
              <option value="all">Все города</option>
              {cities.map((city) => <option key={city} value={city}>{city}</option>)}
            </select>
          </label>
          <p><strong>{filteredStores.length}</strong><span>салонов найдено</span></p>
        </div>

        <div className="store-orbits-content">
          <section className="store-orbits-list" aria-label="Список салонов">
            {filteredStores.map((store, index) => (
              <article
                key={store.id}
                className={`store-orbits-card ${activeStore?.id === store.id ? 'is-active' : ''}`}
              >
                <button type="button" onClick={() => setSelectedStoreId(store.id)} className="store-orbits-card__select">
                  <span className="store-orbits-card__index">{String(index + 1).padStart(2, '0')}</span>
                  <div>
                    <p>{store.name}</p>
                    <h3>{store.city}</h3>
                    <span>{store.address}</span>
                  </div>
                  <small>{storeStatusLabel(store)}</small>
                </button>
                {activeStore?.id === store.id && (
                  <div className="store-orbits-card__details">
                    <p><Clock size={16} /> {storeHoursLabel(store)}</p>
                    <p><Phone size={16} /> {store.phone ?? 'Телефон уточняется'}</p>
                    <div className="store-orbits-card__actions">
                      <a href={routeUrl(store)} target="_blank" rel="noreferrer" onClick={() => trackStoreAction('route', store)}>
                        <Navigation size={15} /> Маршрут
                      </a>
                      {store.phone && (
                        <a href={`tel:${store.phone.replace(/[^\d+]/g, '')}`} onClick={() => trackStoreAction('call', store)}>
                          <Phone size={15} /> Позвонить
                        </a>
                      )}
                      {store.whatsapp && (
                        <a href={`https://wa.me/${store.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" onClick={() => trackStoreAction('whatsapp', store)} aria-label="Написать в WhatsApp">
                          <MessageCircle size={15} />
                        </a>
                      )}
                      {store.telegram && (
                        <a href={`https://t.me/${store.telegram}`} target="_blank" rel="noreferrer" onClick={() => trackStoreAction('telegram', store)} aria-label="Написать в Telegram">
                          <Send size={15} />
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </article>
            ))}
            {filteredStores.length === 0 && (
              <div className="store-orbits-empty">По этому запросу салон не найден.</div>
            )}
          </section>

          <aside className="store-orbits-map" aria-label="Карта салонов">
            <div className="store-orbits-map__canvas">
              <Map size={24} />
              <span className="store-orbits-map__label">Карта выбора</span>
              {filteredStores.slice(0, 24).map((store, index) => {
                const x = 8 + ((store.lng * 17 + index * 23) % 84 + 84) % 84;
                const y = 12 + ((store.lat * 13 + index * 19) % 74 + 74) % 74;
                return (
                  <button
                    key={store.id}
                    type="button"
                    onClick={() => setSelectedStoreId(store.id)}
                    className={activeStore?.id === store.id ? 'is-active' : ''}
                    style={{ left: `${x}%`, top: `${y}%` }}
                    aria-label={`${store.city}, ${store.address}`}
                  >
                    <i />
                  </button>
                );
              })}
            </div>
            {activeStore && (
              <div className="store-orbits-map__selection">
                <span>Выбран салон</span>
                <h3>{activeStore.city}</h3>
                <p>{activeStore.address}</p>
                <a href={routeUrl(activeStore)} target="_blank" rel="noreferrer" onClick={() => trackStoreAction('route', activeStore)}>
                  Построить маршрут <ArrowRight size={16} />
                </a>
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
