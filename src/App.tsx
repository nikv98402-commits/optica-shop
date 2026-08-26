import { lazy, Suspense, useState } from 'react';
import { Navigation } from './components/Navigation';
import { LanguageDomBridge } from './components/LanguageDomBridge';
import { Home } from './pages/Home';
import { getKnowledgePage, KnowledgeBase } from './pages/KnowledgeBase';
import { demoProducts } from './data/products';
import { createServiceCheckoutDraft, readServiceCheckoutDraft, saveServiceCheckoutDraft } from './services/serviceCheckout';
import type { ServiceCheckoutDraft, ServiceCheckoutFrame } from './types/backend';
import { publicFeatures } from './config/features';

const AboutBrand = lazy(() => import('./pages/AboutBrand').then((module) => ({ default: module.AboutBrand })));
const AuthenticatedDashboard = lazy(() => import('./pages/AuthenticatedDashboard').then((module) => ({ default: module.AuthenticatedDashboard })));
const Checkout = lazy(() => import('./pages/Checkout').then((module) => ({ default: module.Checkout })));
const ComingSoon = lazy(() => import('./pages/ComingSoon').then((module) => ({ default: module.ComingSoon })));
const EyeCheck = lazy(() => import('./pages/EyeCheck').then((module) => ({ default: module.EyeCheck })));
const KnowledgeAssistant = lazy(() => import('./pages/KnowledgeAssistant').then((module) => ({ default: module.KnowledgeAssistant })));
const PaymentStatus = lazy(() => import('./pages/PaymentStatus').then((module) => ({ default: module.PaymentStatus })));
const ProductDetail = lazy(() => import('./pages/ProductDetail').then((module) => ({ default: module.ProductDetail })));
const Products = lazy(() => import('./pages/Products').then((module) => ({ default: module.Products })));
const StoreLocator = lazy(() => import('./components/StoreLocator').then((module) => ({ default: module.StoreLocator })));
const TryOnPilot = lazy(() => import('./pages/TryOnPilot').then((module) => ({ default: module.TryOnPilot })));
const VisionAccess = lazy(() => import('./pages/VisionAccess').then((module) => ({ default: module.VisionAccess })));

type Page = 'home' | 'about' | 'products' | 'product' | 'checkout' | 'dashboard' | 'admin' | 'tryon' | 'eyecheck' | 'visionaccess' | 'payment-return' | 'payment-success' | 'payment-failed' | 'assistant' | 'visit-preparation';

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
  'visit-preparation': 'visit-preparation',
  about: 'about',
  brand: 'about',
  impact: 'visionaccess',
  access: 'visionaccess',
  'payment/return': 'payment-return',
  'payment/success': 'payment-success',
  'payment/failed': 'payment-failed',
  ...(publicFeatures.knowledgeAssistant ? { assistant: 'assistant' as const } : {}),
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
  if (/^products\/[^/]+$/.test(currentKnowledgeSlug())) {
    return 'product';
  }
  return pathPageMap[currentKnowledgeSlug()] ?? 'home';
}

function currentProductId() {
  const match = currentKnowledgeSlug().match(/^products\/([^/]+)$/);
  if (!match) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

function App() {
  if (!publicFeatures.knowledgeAssistant && currentKnowledgeSlug() === 'assistant') {
    window.history.replaceState({}, '', '/');
  }
  const [currentPage, setCurrentPage] = useState<Page>(getKnowledgePage(currentKnowledgeSlug()) ? 'home' : currentAppPage());
  const [selectedProductId, setSelectedProductId] = useState<string>(() => currentProductId() ?? 'aurora-crystal');
  const [isStoreLocatorOpen, setIsStoreLocatorOpen] = useState(false);
  const [fittingCart, setFittingCart] = useState<string[]>([]);
  const [checkoutDraft, setCheckoutDraft] = useState<ServiceCheckoutDraft | null>(readServiceCheckoutDraft);
  const knowledgePage = getKnowledgePage(currentKnowledgeSlug());

  const handleNavigate = (page: string, productId?: string) => {
    if (page === 'assistant' && !publicFeatures.knowledgeAssistant) {
      window.history.pushState({}, '', '/');
      setCurrentPage('home');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
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
    if (page === 'product' && productId) {
      window.history.pushState({}, '', `/products/${encodeURIComponent(productId)}`);
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
        <div className="min-h-screen kinetic-surface text-vilu-ink">
          <LanguageDomBridge />
          <Navigation
            currentPage={currentPage}
            onNavigate={handleNavigate}
            onOpenStores={() => setIsStoreLocatorOpen(true)}
            fittingCount={fittingCart.length}
          />

          <main className="pt-20">
            <Suspense fallback={null}>
            {knowledgePage && <KnowledgeBase page={knowledgePage} onNavigate={handleNavigate} />}
            {!knowledgePage && currentPage === 'home' && <Home onNavigate={handleNavigate} />}
            {!knowledgePage && currentPage === 'about' && <AboutBrand onNavigate={handleNavigate} />}
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
              <AuthenticatedDashboard onNavigate={handleNavigate} onOpenStores={() => setIsStoreLocatorOpen(true)} />
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
            {publicFeatures.knowledgeAssistant && currentPage === 'assistant' && (
              <KnowledgeAssistant onNavigate={handleNavigate} onOpenStores={() => setIsStoreLocatorOpen(true)} />
            )}
            {currentPage === 'visit-preparation' && <ComingSoon onNavigate={handleNavigate} />}
            {currentPage === 'payment-return' && <PaymentStatus mode="return" onNavigate={handleNavigate} onOpenStores={() => setIsStoreLocatorOpen(true)} />}
            {currentPage === 'payment-success' && <PaymentStatus mode="success" onNavigate={handleNavigate} onOpenStores={() => setIsStoreLocatorOpen(true)} />}
            {currentPage === 'payment-failed' && <PaymentStatus mode="failed" onNavigate={handleNavigate} onOpenStores={() => setIsStoreLocatorOpen(true)} />}
            </Suspense>
          </main>

          {isStoreLocatorOpen && <Suspense fallback={null}><StoreLocator isOpen onClose={() => setIsStoreLocatorOpen(false)} /></Suspense>}
        </div>
  );
}

export default App;
