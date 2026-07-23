import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../App';

vi.mock('../config/features', () => ({
  publicFeatures: { eyeMap: false, knowledgeAssistant: false },
}));
vi.mock('../contexts/LanguageContext', () => ({ LanguageProvider: ({ children }: { children: React.ReactNode }) => children }));
vi.mock('../contexts/AuthContext', () => ({ AuthProvider: ({ children }: { children: React.ReactNode }) => children }));
vi.mock('../components/LanguageDomBridge', () => ({ LanguageDomBridge: () => null }));
vi.mock('../components/StoreLocator', () => ({ StoreLocator: () => null }));
vi.mock('../components/Navigation', () => ({
  Navigation: ({ onNavigate }: { onNavigate: (page: string) => void }) => (
    <button type="button" onClick={() => onNavigate('assistant')}>Try assistant route</button>
  ),
}));
vi.mock('../pages/Home', () => ({ Home: () => <h1>Home page</h1> }));
vi.mock('../pages/Products', () => ({ Products: () => null }));
vi.mock('../pages/ProductDetail', () => ({ ProductDetail: () => null }));
vi.mock('../pages/Checkout', () => ({ Checkout: () => null }));
vi.mock('../pages/Dashboard', () => ({ Dashboard: () => null }));
vi.mock('../pages/TryOnPilot', () => ({ TryOnPilot: () => null }));
vi.mock('../pages/EyeCheck', () => ({ EyeCheck: () => null }));
vi.mock('../pages/VisionAccess', () => ({ VisionAccess: () => null }));
vi.mock('../pages/AboutBrand', () => ({ AboutBrand: () => null }));
vi.mock('../pages/PaymentStatus', () => ({ PaymentStatus: () => null }));
vi.mock('../pages/KnowledgeAssistant', () => ({ KnowledgeAssistant: () => <h1>Assistant page</h1> }));
vi.mock('../pages/KnowledgeBase', () => ({ getKnowledgePage: () => null, KnowledgeBase: () => null }));
vi.mock('../services/serviceCheckout', () => ({
  createServiceCheckoutDraft: vi.fn(),
  readServiceCheckoutDraft: () => null,
  saveServiceCheckoutDraft: vi.fn(),
}));

describe('App with Knowledge Assistant disabled', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/');
    vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
  });

  it('redirects a direct /assistant visit to home', () => {
    window.history.replaceState({}, '', '/assistant');
    render(<App />);
    expect(window.location.pathname).toBe('/');
    expect(screen.getByRole('heading', { name: 'Home page' })).toBeVisible();
    expect(screen.queryByRole('heading', { name: 'Assistant page' })).not.toBeInTheDocument();
  });

  it('guards navigation to the disabled assistant', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Try assistant route' }));
    expect(window.location.pathname).toBe('/');
    expect(screen.getByRole('heading', { name: 'Home page' })).toBeVisible();
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
  });
});
