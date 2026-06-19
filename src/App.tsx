import { useState } from 'react';
import { Navigation } from './components/Navigation';
import { StoreLocator } from './components/StoreLocator';
import { LanguageDomBridge } from './components/LanguageDomBridge';
import { Home } from './pages/Home';
import { Products } from './pages/Products';
import { ProductDetail } from './pages/ProductDetail';
import { Checkout } from './pages/Checkout';
import { Dashboard } from './pages/Dashboard';
import { TryOnPilot } from './pages/TryOnPilot';
import { getKnowledgePage, KnowledgeBase } from './pages/KnowledgeBase';
import { LanguageProvider } from './contexts/LanguageContext';
import { AuthProvider } from './contexts/AuthContext';

type Page = 'home' | 'products' | 'product' | 'checkout' | 'dashboard' | 'admin' | 'tryon';

const pathPageMap: Record<string, Page> = {
  '': 'home',
  catalog: 'products',
  products: 'products',
  dashboard: 'dashboard',
  cabinet: 'dashboard',
  tryon: 'tryon',
};

function currentKnowledgeSlug() {
  const redirect = new URLSearchParams(window.location.search).get('redirect');
  if (redirect) {
    const normalizedRedirect = redirect.startsWith('/') ? redirect : `/${redirect}`;
    window.history.replaceState({}, '', normalizedRedirect);
  }
  return window.location.pathname.replace(/^\/+|\/+$/g, '');
}

function currentAppPage(): Page {
  return pathPageMap[currentKnowledgeSlug()] ?? 'home';
}

function App() {
  const [currentPage, setCurrentPage] = useState<Page>(getKnowledgePage(currentKnowledgeSlug()) ? 'home' : currentAppPage());
  const [selectedProductId, setSelectedProductId] = useState<string>('aurora-crystal');
  const [isStoreLocatorOpen, setIsStoreLocatorOpen] = useState(false);
  const [fittingCart, setFittingCart] = useState<string[]>([]);
  const knowledgePage = getKnowledgePage(currentKnowledgeSlug());

  const handleNavigate = (page: string, productId?: string) => {
    if (productId) {
      setSelectedProductId(productId);
    }
    if (getKnowledgePage(page)) {
      window.location.href = `/${page}`;
      return;
    }
    if (knowledgePage) {
      window.history.pushState({}, '', '/');
    }
    if (page in pathPageMap) {
      window.history.pushState({}, '', page === 'home' ? '/' : `/${page}`);
    }
    setCurrentPage(page as Page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const toggleFitting = (id: string) => {
    setFittingCart((prev) => {
      if (prev.includes(id)) return prev.filter((item) => item !== id);
      if (prev.length >= 5) return prev;
      return [...prev, id];
    });
  };

  return (
    <LanguageProvider>
      <AuthProvider>
        <div className="min-h-screen bg-stone-50 text-slate-950">
          <LanguageDomBridge />
          <Navigation
            currentPage={currentPage}
            onNavigate={handleNavigate}
            onOpenStores={() => setIsStoreLocatorOpen(true)}
            fittingCount={fittingCart.length}
          />

          <main className="pt-20">
            {knowledgePage && <KnowledgeBase page={knowledgePage} onNavigate={handleNavigate} />}
            {!knowledgePage && currentPage === 'home' && <Home onNavigate={handleNavigate} />}
            {currentPage === 'products' && (
              <Products
                onNavigate={handleNavigate}
                fittingCart={fittingCart}
                onToggleFitting={toggleFitting}
              />
            )}
            {currentPage === 'product' && (
              <ProductDetail productId={selectedProductId} onNavigate={handleNavigate} />
            )}
            {currentPage === 'checkout' && (
              <Checkout productId={selectedProductId} onBack={() => handleNavigate('products')} onSuccess={() => handleNavigate('dashboard')} />
            )}
            {(currentPage === 'dashboard' || currentPage === 'admin') && (
              <Dashboard onNavigate={handleNavigate} />
            )}
            {currentPage === 'tryon' && (
              <TryOnPilot onNavigate={handleNavigate} />
            )}
          </main>

          <StoreLocator isOpen={isStoreLocatorOpen} onClose={() => setIsStoreLocatorOpen(false)} />
        </div>
      </AuthProvider>
    </LanguageProvider>
  );
}

export default App;
