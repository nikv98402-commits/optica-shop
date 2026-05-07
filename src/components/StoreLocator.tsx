import { Clock, MapPin, Phone, Search, X } from 'lucide-react';
import { useMemo, useState } from 'react';

interface StoreLocatorProps {
  isOpen: boolean;
  onClose: () => void;
}

const stores = [
  { city: 'Москва', address: 'Тверская, 10, ТЦ Центральный', phone: '+7 (495) 123-45-67', time: '10:00-22:00' },
  { city: 'Санкт-Петербург', address: 'Невский проспект, 25', phone: '+7 (812) 321-76-54', time: '10:00-21:00' },
  { city: 'Екатеринбург', address: 'Ленина, 5, офис 102', phone: '+7 (343) 999-00-11', time: '09:00-20:00' },
  { city: 'Новосибирск', address: 'Красный проспект, 42', phone: '+7 (383) 222-33-44', time: '10:00-20:00' },
  { city: 'Казань', address: 'Баумана, 7', phone: '+7 (843) 555-44-33', time: '10:00-21:00' },
];

export function StoreLocator({ isOpen, onClose }: StoreLocatorProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredStores = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return stores;
    return stores.filter((store) => `${store.city} ${store.address}`.toLowerCase().includes(query));
  }, [searchQuery]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-[2.5rem] bg-[#fffaf2] shadow-2xl">
        <div className="relative border-b border-slate-900/10 p-7 md:p-9">
          <button onClick={onClose} className="absolute right-6 top-6 rounded-full bg-white p-3 ring-1 ring-slate-900/10 transition hover:bg-stone-100"><X size={18} /></button>
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#9a6933]">Store locator</p>
          <h2 className="mt-2 text-4xl font-black tracking-[-0.05em]">Наши салоны</h2>
          <div className="relative mt-6">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Введите город или адрес" className="w-full rounded-full border border-slate-900/10 bg-white py-4 pl-12 pr-5 outline-none transition focus:border-[#315c56]" />
          </div>
        </div>

        <div className="overflow-y-auto p-5 md:p-7">
          <div className="grid gap-4">
            {filteredStores.map((store) => (
              <article key={`${store.city}-${store.address}`} className="rounded-3xl bg-white p-5 ring-1 ring-slate-900/5 transition hover:shadow-lg">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                  <div>
                    <h3 className="text-2xl font-black tracking-tight">{store.city}</h3>
                    <div className="mt-4 space-y-3 text-sm text-slate-600">
                      <p className="flex gap-3"><MapPin className="shrink-0 text-[#315c56]" size={18} /> {store.address}</p>
                      <p className="flex gap-3"><Phone className="shrink-0 text-[#315c56]" size={18} /> {store.phone}</p>
                      <p className="flex gap-3"><Clock className="shrink-0 text-[#315c56]" size={18} /> {store.time}</p>
                    </div>
                  </div>
                  <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-green-700">Открыто</span>
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className="border-t border-slate-900/10 p-5">
          <button onClick={onClose} className="w-full rounded-full bg-slate-950 px-6 py-4 text-sm font-black uppercase tracking-[0.18em] text-white transition hover:bg-[#315c56]">Закрыть</button>
        </div>
      </div>
    </div>
  );
}
