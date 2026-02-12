import { useState, useEffect } from 'react'; // Добавил useEffect для отладки
import { Navigation } from './components/Navigation';
import { Home } from './pages/Home';
import { Products } from './pages/Products';
import { Dashboard } from './pages/Dashboard';
import { Checkout } from './pages/Checkout';
import { Admin } from './pages/Admin'; 
import { StoreLocator } from './components/StoreLocator';
import { AuthProvider } from './contexts/AuthContext';
import { LanguageProvider } from './contexts/LanguageContext';

function App() {
  const [currentPage, setCurrentPage] = useState('home');
  const [isStoreLocatorOpen, setIsStoreLocatorOpen] = useState(false);
  const [fittingCart, setFittingCart] = useState<string[]>([]);

  // Отладочный лог: вы увидите его в консоли (F12) при каждом клике на "Салоны"
  useEffect(() => {
    console.log("Состояние модалки изменилось:", isStoreLocatorOpen);
  }, [isStoreLocatorOpen]);

  const handleNavigate = (page: string) => {
    setCurrentPage(page);
    window.scrollTo(0, 0);
  };

  const toggleFitting = (id: string) => {
    setFittingCart(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  return (
    <AuthProvider>
      <LanguageProvider>
        <div className="relative min-h-screen bg-white"> {/* Добавлен relative */}
          
          <Navigation 
            currentPage={currentPage} 
            onNavigate={handleNavigate}
            onOpenStores={() => {
              console.log("Клик зафиксирован в App.tsx");
              setIsStoreLocatorOpen(true);
            }} 
            fittingCount={fittingCart.length} // Передаем реальное число товаров
          />
          
          <main className="pt-20"> {/* Добавлен отступ сверху, чтобы контент не залезал под навигацию */}
            {currentPage === 'home' && (
              <Home onNavigate={handleNavigate} />
            )}
            
            {currentPage === 'products' && (
              <Products 
                onNavigate={handleNavigate}
                fittingCart={fittingCart}
                onToggleFitting={toggleFitting}
              />
            )}
            
            {currentPage === 'dashboard' && (
              <Dashboard onNavigate={handleNavigate} />
            )}
            
            {currentPage === 'checkout' && (
              <Checkout 
                onBack={() => handleNavigate('products')} 
                onSuccess={() => handleNavigate('dashboard')} 
              />
            )}
            
            {currentPage === 'admin' && (
              <Admin onBack={() => handleNavigate('home')} />
            )}
          </main>

          {/* ВАЖНО: StoreLocator рендерится ВНЕ <main>, 
             чтобы z-index работал корректно поверх всех страниц 
          */}
          <StoreLocator 
            isOpen={isStoreLocatorOpen} 
            onClose={() => setIsStoreLocatorOpen(false)} 
          />
          
        </div>
      </LanguageProvider>
    </AuthProvider>
  );
}

export default App;