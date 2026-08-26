import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LanguageDomBridge } from '../../components/LanguageDomBridge';
import { Navigation } from '../../components/Navigation';
import { LanguageProvider } from '../../contexts/LanguageContext';
import { Home } from '../Home';

const mocks = vi.hoisted(() => ({
  publicFeatures: { eyeMap: false, knowledgeAssistant: true },
}));

vi.mock('../../config/features', () => ({
  publicFeatures: mocks.publicFeatures,
}));

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: null, signOut: vi.fn() }),
}));

const approvedRussianLatinFragments = [
  'ViLu', 'Aurora 03', 'Aurora Crystal', 'ViLu Atelier', 'Noir Line', 'Maison Optique',
  'Solstice Honey', 'ViLu Sun', 'Daily Air Plus', 'ViLu Care', 'UV400', 'EN',
];

function getLanguageSurface() {
  const attributes = Array.from(document.querySelectorAll('[aria-label], [title], [placeholder]'))
    .flatMap((element) => ['aria-label', 'title', 'placeholder'].map((name) => element.getAttribute(name) ?? ''));
  const metaDescription = document.querySelector<HTMLMetaElement>('meta[name="description"]')?.content ?? '';
  return [document.body.textContent ?? '', document.title, metaDescription, ...attributes].join(' ');
}

function removeApprovedRussianLatinFragments(value: string) {
  return [...approvedRussianLatinFragments]
    .sort((left, right) => right.length - left.length)
    .reduce((result, fragment) => result.split(fragment).join(''), value);
}

function TestHome() {
  return (
    <>
      <LanguageDomBridge />
      <Navigation currentPage="home" onNavigate={vi.fn()} onOpenStores={vi.fn()} />
      <main><Home onNavigate={vi.fn()} /></main>
    </>
  );
}

describe('Home localization', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.lang = 'ru';
    mocks.publicFeatures.knowledgeAssistant = true;
  });

  it('renders the complete Home in Russian without unapproved English fragments', async () => {
    render(<LanguageProvider><TestHome /></LanguageProvider>);

    await waitFor(() => expect(document.documentElement.lang).toBe('ru'));

    expect(screen.getByRole('heading', { name: 'Самопроверка перед очной проверкой' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Программа доступного зрения' })).toBeInTheDocument();
    expect(screen.getAllByText('Оценка посадки').length).toBeGreaterThan(0);
    expect(removeApprovedRussianLatinFragments(getLanguageSurface())).not.toMatch(/[A-Za-z]{2,}/);
  });

  it('renders the complete Home in English without Cyrillic', async () => {
    window.localStorage.setItem('vilu_language', 'en');

    render(<LanguageProvider><TestHome /></LanguageProvider>);

    await waitFor(() => expect(document.documentElement.lang).toBe('en'));

    expect(screen.getByRole('heading', { name: 'Before your visit without unnecessary worry' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Vision Access Program' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'A methodology you can verify' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Frames for your first try-on' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Care continues' })).toBeInTheDocument();
    expect(getLanguageSurface()).not.toMatch(/[А-Яа-яЁё]/);
  });

  it('switches the complete Home RU to EN and back to RU', async () => {
    const user = userEvent.setup();
    render(<LanguageProvider><TestHome /></LanguageProvider>);

    await user.click(screen.getByRole('button', { name: 'Переключить язык на EN' }));
    await waitFor(() => {
      expect(document.documentElement.lang).toBe('en');
      expect(Array.from(document.querySelectorAll('.compact-assistant__suggestions')).map((element) => element.getAttribute('aria-label'))).toEqual(['Suggestions']);
      expect(screen.getByRole('button', { name: 'Add material' })).toBeInTheDocument();
      expect(getLanguageSurface()).not.toMatch(/[А-Яа-яЁё]/);
    });

    await user.click(screen.getByRole('button', { name: 'Switch language to RU' }));
    await waitFor(() => {
      expect(document.documentElement.lang).toBe('ru');
      expect(screen.getByRole('heading', { name: 'Самопроверка перед очной проверкой' })).toBeInTheDocument();
      expect(removeApprovedRussianLatinFragments(getLanguageSurface())).not.toMatch(/[A-Za-z]{2,}/);
    });
  });

  it('opens mobile navigation and switches its labels with the Home language', async () => {
    const user = userEvent.setup();
    render(<LanguageProvider><TestHome /></LanguageProvider>);

    await user.click(screen.getByRole('button', { name: 'Открыть меню' }));
    expect(screen.getAllByRole('button', { name: 'Онлайн-примерка' })).toHaveLength(2);
    expect(screen.queryByRole('button', { name: 'Наши салоны' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Язык: EN' }));
    await waitFor(() => {
      expect(document.documentElement.lang).toBe('en');
      expect(getLanguageSurface()).not.toMatch(/[А-Яа-яЁё]/);
    });
    expect(screen.getByRole('button', { name: 'Close menu' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Online try-on' })).toHaveLength(2);
    expect(screen.queryByRole('button', { name: 'Our stores' })).not.toBeInTheDocument();
  });

  it('localizes icon-only profile and cart controls and keeps them keyboard-operable', async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    render(
      <LanguageProvider>
        <Navigation currentPage="home" onNavigate={onNavigate} onOpenStores={vi.fn()} />
      </LanguageProvider>,
    );

    const profile = screen.getByRole('button', { name: 'Открыть личный кабинет' });
    const cart = screen.getByRole('button', { name: 'Открыть корзину' });
    profile.focus();
    await user.keyboard('{Enter}');
    expect(onNavigate).toHaveBeenCalledWith('dashboard');
    cart.focus();
    await user.keyboard('{Enter}');
    expect(onNavigate).toHaveBeenCalledWith('checkout');

    await user.click(screen.getByRole('button', { name: 'Переключить язык на EN' }));
    expect(screen.getByRole('button', { name: 'Open profile' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open cart' })).toBeInTheDocument();
  });

  it('defers all four below-the-fold Home images with stable responsive geometry', () => {
    render(<LanguageProvider><TestHome /></LanguageProvider>);

    const images = document.querySelectorAll<HTMLImageElement>('.orbits-product-image img, .orbits-lens-visual img');
    expect(images).toHaveLength(4);
    images.forEach((image) => {
      expect(image.getAttribute('loading')).toBe('lazy');
      expect(image.getAttribute('decoding')).toBe('async');
      expect(image.getAttribute('width')).toBe('900');
      expect(image.getAttribute('height')).toBe('600');
      expect(image.getAttribute('srcset')).toMatch(/360w.*640w.*900w/);
      expect(image.getAttribute('sizes')).toBeTruthy();
    });
  });

  it('does not render assistant actions when the feature is disabled', () => {
    mocks.publicFeatures.knowledgeAssistant = false;
    render(<LanguageProvider><Home onNavigate={vi.fn()} /></LanguageProvider>);

    expect(screen.queryByRole('region', { name: 'Спросить ViLu' })).not.toBeInTheDocument();
  });
});
