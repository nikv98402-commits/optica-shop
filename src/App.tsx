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
import { EyeCheck } from './pages/EyeCheck';
import { VisionAccess } from './pages/VisionAccess';
import { PaymentStatus } from './pages/PaymentStatus';
import { getKnowledgePage, KnowledgeBase } from './pages/KnowledgeBase';
import { LanguageProvider } from './contexts/LanguageContext';
import { AuthProvider } from './contexts/AuthContext';
import { demoProducts } from './data/products';
import { createServiceCheckoutDraft, readServiceCheckoutDraft, saveServiceCheckoutDraft } from './services/serviceCheckout';
import type { ServiceCheckoutDraft, ServiceCheckoutFrame } from './types/backend';

type Page = 'home' | 'products' | 'product' | 'checkout' | 'dashboard' | 'admin' | 'tryon' | 'eyecheck' | 'visionaccess' | 'payment-return' | 'payment-success' | 'payment-failed';

const pathPageMap: Record<string, Page> = {
  '': 'home',
  catalog: 'products',
  products: 'products',
  checkout: 'checkout',
  dashboard: 'dashboard',
  cabinet: 'dashboard',
  tryon: 'tryon',
  'eye-check': 'eyecheck',
  eyecheck: 'eyecheck',
  'vision-check': 'eyecheck',
  'vision-tracker': 'eyecheck',
  visiontracker: 'eyecheck',
  'vision-access': 'visionaccess',
  impact: 'visionaccess',
  access: 'visionaccess',
  'payment/return': 'payment-return',
  'payment/success': 'payment-success',
  'payment/failed': 'payment-failed',
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
  const [checkoutDraft, setCheckoutDraft] = useState<ServiceCheckoutDraft | null>(readServiceCheckoutDraft);
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
    const targetPage = pathPageMap[page] ?? (page as Page);
    if (page in pathPageMap) {
      window.history.pushState({}, '', page === 'home' ? '/' : `/${page}`);
    }
    setCurrentPage(targetPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const toggleFitting = (id: string) => {
    setFittingCart((prev) => {
      if (prev.includes(id)) return prev.filter((item) => item !== id);
      if (prev.length >= 3) return prev;
      return [...prev, id];
    });
  };

  const startServiceCheckout = (sourcePage: '/products' | '/tryon', frames: ServiceCheckoutFrame[]) => {
    const nextDraft = createServiceCheckoutDraft(sourcePage, frames);
    setCheckoutDraft(nextDraft);
    saveServiceCheckoutDraft(nextDraft);
    window.history.pushState({}, '', '/checkout');
    setCurrentPage('checkout');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const startCatalogCheckout = () => {
    const frames = fittingCart
      .map((id) => demoProducts.find((product) => product.id === id))
      .filter((product) => product && product.category !== 'contact_lenses')
      .map((product) => ({
        frameId: product!.id,
        frameName: product!.name,
        frameBrand: product!.brand_name,
        frameCategory: product!.category,
        framePriceRub: product!.price,
        imageUrl: product!.image_url,
      }));
    startServiceCheckout('/products', frames);
  };

  return (
    <LanguageProvider>
      <AuthProvider>
        <div className="min-h-screen kinetic-surface text-vilu-ink">
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
                onStartCheckout={startCatalogCheckout}
              />
            )}
            {currentPage === 'product' && (
              <ProductDetail
                productId={selectedProductId}
                onNavigate={handleNavigate}
                onStartCheckout={(frame) => startServiceCheckout('/products', [frame])}
              />
            )}
            {currentPage === 'checkout' && (
              <Checkout
                draft={checkoutDraft}
                onDraftChange={setCheckoutDraft}
                onBack={() => handleNavigate(checkoutDraft?.sourcePage === '/tryon' ? 'tryon' : 'products')}
              />
            )}
            {(currentPage === 'dashboard' || currentPage === 'admin') && (
              <Dashboard onNavigate={handleNavigate} />
            )}
            {currentPage === 'tryon' && (
              <TryOnPilot
                onNavigate={handleNavigate}
                onStartServiceCheckout={(frames) => startServiceCheckout('/tryon', frames)}
              />
            )}
            {currentPage === 'eyecheck' && (
              <EyeCheck onNavigate={handleNavigate} />
            )}
            {currentPage === 'visionaccess' && (
              <VisionAccess onNavigate={handleNavigate} />
            )}
            {currentPage === 'payment-return' && <PaymentStatus mode="return" onNavigate={handleNavigate} onOpenStores={() => setIsStoreLocatorOpen(true)} />}
            {currentPage === 'payment-success' && <PaymentStatus mode="success" onNavigate={handleNavigate} onOpenStores={() => setIsStoreLocatorOpen(true)} />}
            {currentPage === 'payment-failed' && <PaymentStatus mode="failed" onNavigate={handleNavigate} onOpenStores={() => setIsStoreLocatorOpen(true)} />}
          </main>

          <StoreLocator isOpen={isStoreLocatorOpen} onClose={() => setIsStoreLocatorOpen(false)} />
        </div>
      </AuthProvider>
    </LanguageProvider>
  );
}

export default App;
