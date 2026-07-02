import { Clock, MapPin, Phone, Search, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { opticsDirectory, DirectoryOptic } from '../data/opticsDirectory';

interface StoreLocatorProps {
  isOpen: boolean;
  onClose: () => void;
}

const stores = [...opticsDirectory].sort((storeA, storeB) => {
  const citySort = storeA.city.localeCompare(storeB.city, 'ru');
  return citySort || storeA.address.localeCompare(storeB.address, 'ru');
});

function storeHoursLabel(store: DirectoryOptic) {
  if (!store.hours.includes('-')) return store.hours;
  return store.hours;
}

function storeStatusLabel(store: DirectoryOptic) {
  return store.hours.includes('-') ? 'Открыто' : 'Уточнить';
}

export function StoreLocator({ isOpen, onClose }: StoreLocatorProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredStores = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return stores;
    return stores.filter((store) => `${store.name} ${store.city} ${store.address}`.toLowerCase().includes(query));
  }, [searchQuery]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-vilu-ink/80 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-[2rem] bg-vilu-paper shadow-2xl shadow-vilu-ink/30 ring-1 ring-vilu-lime/20">
        <div className="relative border-b border-vilu-ink/10 bg-vilu-ink p-7 text-vilu-paper md:p-9">
          <button onClick={onClose} className="absolute right-6 top-6 rounded-full bg-vilu-paper p-3 text-vilu-ink ring-1 ring-vilu-lime/25 transition hover:bg-vilu-lime"><X size={18} /></button>
          <p className="kinetic-label text-vilu-lime">Поиск салонов</p>
          <h2 className="mt-2 text-4xl font-black tracking-tight md:text-5xl">Наши салоны</h2>
          <p className="mt-2 text-sm font-bold text-vilu-paper/65">{stores.length} салонов в справочнике</p>
          <div className="relative mt-6">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-vilu-green" size={18} />
            <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Введите город или адрес" className="w-full rounded-full border border-vilu-lime/20 bg-vilu-paper py-4 pl-12 pr-5 font-bold text-vilu-ink outline-none transition placeholder:text-vilu-ink/35 focus:border-vilu-lime" />
          </div>
        </div>

        <div className="overflow-y-auto p-5 md:p-7">
          <div className="grid gap-4">
            {filteredStores.map((store) => (
              <article key={`${store.city}-${store.address}`} className="rounded-3xl bg-vilu-card p-5 ring-1 ring-vilu-ink/10 transition hover:-translate-y-0.5 hover:shadow-lg">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                  <div>
                    <h3 className="text-2xl font-black tracking-tight">{store.city}</h3>
                    <div className="mt-4 space-y-3 text-sm font-semibold text-vilu-ink/65">
                      <p className="flex gap-3"><MapPin className="shrink-0 text-vilu-green" size={18} /> {store.address}</p>
                      <p className="flex gap-3"><Phone className="shrink-0 text-vilu-green" size={18} /> {store.phone ?? 'Телефон уточняется'}</p>
                      <p className="flex gap-3"><Clock className="shrink-0 text-vilu-green" size={18} /> {storeHoursLabel(store)}</p>
                    </div>
                  </div>
                  <span className="rounded-full bg-vilu-lime px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-vilu-ink">{storeStatusLabel(store)}</span>
                </div>
              </article>
            ))}
            {filteredStores.length === 0 && (
              <div className="rounded-3xl bg-vilu-card p-6 text-sm font-bold text-vilu-ink/55 ring-1 ring-vilu-ink/10">
                По этому запросу салон не найден.
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-vilu-ink/10 p-5">
          <button onClick={onClose} className="w-full rounded-full bg-vilu-ink px-6 py-4 text-sm font-black uppercase tracking-[0.18em] text-vilu-paper transition hover:bg-vilu-lime hover:text-vilu-ink">Закрыть</button>
        </div>
      </div>
    </div>
  );
}
