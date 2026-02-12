import { ShoppingBag, User, Languages, MapPin } from 'lucide-react'; // Добавил MapPin
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';

interface NavigationProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  onOpenStores: () => void; // Добавили обязательный проп для открытия магазинов
  fittingCount?: number;
}

export function Navigation({ 
  currentPage, 
  onNavigate, 
  onOpenStores, // Принимаем функцию
  fittingCount = 0 
}: NavigationProps) {
  const { language, setLanguage } = useLanguage();
  const { user } = useAuth();

  return (
    <nav className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-md z-50 border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        
        {/* Логотип */}
        <div 
          className="text-2xl font-serif tracking-tighter cursor-pointer"
          onClick={() => onNavigate('home')}
        >
          VisionLux
        </div>

        {/* Центральное меню */}
        <div className="hidden md:flex items-center gap-8">
          <button
            onClick={() => onNavigate('products')}
            className={`text-sm font-medium tracking-wide transition-colors ${
              currentPage === 'products' ? 'text-blue-600' : 'text-gray-600 hover:text-black'
            }`}
          >
            Каталог
          </button>
          
          {/* Кнопка выбора торговой точки */}
          <button
            onClick={onOpenStores} // Вызывает модалку StoreLocator
            className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-black tracking-wide transition-colors"
          >
            <MapPin size={16} className="text-blue-600" />
            Наши салоны
          </button>

          <button
            onClick={() => onNavigate('home')}
            className="text-sm font-medium text-gray-600 hover:text-black tracking-wide transition-colors"
          >
            О нас
          </button>
        </div>

        {/* Правая часть */}
        <div className="flex items-center gap-6">
          <button 
            onClick={() => setLanguage(language === 'en' ? 'ru' : 'en')}
            className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-gray-900"
          >
            <Languages size={16} />
            {language}
          </button>

          <button 
            onClick={() => onNavigate(user ? 'dashboard' : 'admin')} 
            className="text-gray-600 hover:text-black transition-colors"
          >
            <User size={20} />
          </button>

          <button 
            onClick={() => onNavigate('checkout')}
            className="relative text-gray-600 hover:text-black transition-colors"
          >
            <ShoppingBag size={20} />
            {fittingCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-blue-600 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold animate-pulse">
                {fittingCount}
              </span>
            )}
          </button>

          <button
            onClick={() => onNavigate('products')}
            className="hidden lg:block bg-gray-900 text-white px-6 py-2.5 text-xs font-bold uppercase tracking-widest hover:bg-gray-800 transition-colors"
          >
            В каталог
          </button>
        </div>
      </div>
    </nav>
  );
}