import { X, MapPin, Phone, Clock, Search } from 'lucide-react'; // Добавил Search
import { useState } from 'react'; // Добавил useState

interface StoreLocatorProps {
  isOpen: boolean;
  onClose: () => void;
}

export function StoreLocator({ isOpen, onClose }: StoreLocatorProps) {
  const [searchQuery, setSearchQuery] = useState(''); // Состояние для поиска

  if (!isOpen) return null;

  const stores = [
    { city: 'Москва', address: 'ул. Тверская, 10, ТЦ «Центральный»', phone: '+7 (495) 123-45-67', time: '10:00 — 22:00' },
    { city: 'Санкт-Петербург', address: 'Невский проспект, 25', phone: '+7 (812) 321-76-54', time: '10:00 — 21:00' },
    { city: 'Екатеринбург', address: 'ул. Ленина, 5, оф. 102', phone: '+7 (343) 999-00-11', time: '09:00 — 20:00' },
    { city: 'Новосибирск', address: 'Красный проспект, 42', phone: '+7 (383) 222-33-44', time: '10:00 — 20:00' },
    { city: 'Казань', address: 'ул. Баумана, 7', phone: '+7 (843) 555-44-33', time: '10:00 — 21:00' },
    { city: 'Краснодар', address: 'ул. Красная, 124', phone: '+7 (861) 777-88-99', time: '10:00 — 22:00' },
  ];

  // Фильтрация магазинов по вводу пользователя
  const filteredStores = stores.filter(store => 
    store.city.toLowerCase().includes(searchQuery.toLowerCase()) || 
    store.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-white max-w-2xl w-full max-h-[90vh] flex flex-col relative shadow-2xl">
        <button onClick={onClose} className="absolute top-6 right-6 text-gray-400 hover:text-gray-900 z-10">
          <X size={24} />
        </button>

        <div className="p-8 border-b border-gray-100">
          <h2 className="text-3xl font-serif mb-2 text-gray-900">Наши салоны</h2>
          
          {/* Поле поиска */}
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text"
              placeholder="Введите город или адрес..."
              className="w-full pl-10 pr-4 py-2 border border-gray-200 focus:border-gray-900 outline-none transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-y-auto p-8 pt-4 space-y-6 flex-grow">
          {filteredStores.length > 0 ? (
            <div className="grid gap-4">
              {filteredStores.map((store, idx) => (
                <div key={idx} className="border border-gray-200 p-5 hover:border-blue-600 transition-all group">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-xl font-serif text-gray-900">{store.city}</h3>
                    <span className="text-[10px] bg-green-50 text-green-700 px-2 py-1 rounded-full border border-green-100 uppercase font-bold">Открыто</span>
                  </div>
                  <div className="space-y-3 text-sm text-gray-600">
                    <div className="flex items-start space-x-3">
                      <MapPin size={18} className="text-blue-600" />
                      <span>{store.address}</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Phone size={18} />
                      <a href={`tel:${store.phone}`}>{store.phone}</a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 text-gray-500">Магазины в этом городе пока не найдены</div>
          )}
        </div>

        <div className="p-6 border-t border-gray-100 bg-gray-50">
          <button onClick={onClose} className="w-full bg-gray-900 text-white py-4 font-bold uppercase tracking-widest text-sm">
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
}