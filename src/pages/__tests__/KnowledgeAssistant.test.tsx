import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LanguageProvider } from '../../contexts/LanguageContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { KnowledgeAssistant } from '../KnowledgeAssistant';

const askKnowledgeAssistant = vi.fn();
vi.mock('../../services/knowledgeAssistant', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../services/knowledgeAssistant')>();
  return { ...original, askKnowledgeAssistant: (...args: unknown[]) => askKnowledgeAssistant(...args) };
});

const supported = {
  answerId: 'answer-1', answer: '52 — ширина линзы. [1]', confidence: 'supported' as const,
  safety: 'informational' as const, relatedPaths: ['/kak-vybrat-razmer-opravy'],
  citations: [{ id: 'source-1', title: 'Размер оправы', url: 'https://vilu.store/kak-vybrat-razmer-opravy', publisher: 'ViLu', license: 'vilu-owned' }],
  externalSources: [{ id: 'external-1', title: 'OcuLearning', url: 'https://www.oculearning.com/', publisher: 'OcuLearning' }],
};

function LanguageHarness() {
  const { language, setLanguage } = useLanguage();
  return <><button onClick={() => setLanguage(language === 'ru' ? 'en' : 'ru')}>toggle locale</button><KnowledgeAssistant onNavigate={vi.fn()} /></>;
}

describe('KnowledgeAssistant', () => {
  beforeEach(() => askKnowledgeAssistant.mockReset().mockResolvedValue(supported));
  afterEach(() => vi.unstubAllGlobals());

  it('does not steal focus or scroll position on a mobile viewport', () => {
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: false }));
    render(<LanguageProvider><KnowledgeAssistant onNavigate={vi.fn()} /></LanguageProvider>);
    expect(screen.getByRole('textbox')).not.toHaveFocus();
  });

  it('focuses the composer on a wide viewport', () => {
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: true }));
    render(<LanguageProvider><KnowledgeAssistant onNavigate={vi.fn()} /></LanguageProvider>);
    expect(screen.getByRole('textbox')).toHaveFocus();
  });

  it('submits a RU question and renders expandable citations', async () => {
    const user = userEvent.setup();
    render(<LanguageProvider><KnowledgeAssistant onNavigate={vi.fn()} /></LanguageProvider>);
    await user.type(screen.getByRole('textbox'), 'Что значит 52-18-140?');
    await user.click(screen.getByRole('button', { name: 'Спросить' }));
    expect(await screen.findByText('52 — ширина линзы. [1]')).toBeVisible();
    expect(screen.getByRole('button', { name: /Как выбрать размер оправы/i })).toBeVisible();
    expect(screen.queryByText('kak vybrat razmer opravy')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Источники/i }));
    expect(screen.getByRole('link', { name: /Размер оправы/i })).toHaveAttribute('href', 'https://vilu.store/kak-vybrat-razmer-opravy');
    expect(screen.getByRole('link', { name: /OcuLearning/i })).toHaveAttribute('href', 'https://www.oculearning.com/');
  });

  it('loads English copy from the shared language preference', () => {
    localStorage.setItem('vilu_language', 'en');
    render(<LanguageProvider><KnowledgeAssistant onNavigate={vi.fn()} /></LanguageProvider>);
    expect(screen.getByRole('heading', { name: 'Ask ViLu about vision and choosing frames' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Ask' })).toBeDisabled();
  });

  it('clears active-locale history while preserving shared settings', async () => {
    localStorage.setItem('vilu_knowledge_assistant_history_v3_ru', JSON.stringify({
      version: 3, locale: 'ru',
      turns: [{ id: 'turn', role: 'user', content: 'Stored question', createdAt: new Date().toISOString() }],
    }));
    localStorage.setItem('vilu_knowledge_assistant_preferences_v3', JSON.stringify({
      version: 3, preferences: { experience: 'familiar', interests: [], answerLength: 'detailed' },
    }));
    const user = userEvent.setup();
    render(<LanguageProvider><KnowledgeAssistant onNavigate={vi.fn()} /></LanguageProvider>);
    await user.click(screen.getByRole('button', { name: /Очистить историю/i }));
    expect(screen.queryByText('Stored question')).not.toBeInTheDocument();
    expect(localStorage.getItem('vilu_knowledge_assistant_history_v3_ru')).toContain('"turns":[]');
    expect(localStorage.getItem('vilu_knowledge_assistant_preferences_v3')).toContain('"experience":"familiar"');
  });

  it.each([
    ['en', 'ru', 'Русский вопрос'],
    ['ru', 'en', 'English question'],
  ] as const)('does not render %s UI with stored %s turns on direct load', (activeLocale, storedLocale, storedQuestion) => {
    localStorage.setItem('vilu_language', activeLocale);
    localStorage.setItem('vilu_knowledge_assistant_v2', JSON.stringify({
      version: 2,
      locale: storedLocale,
      preferences: { experience: 'familiar', interests: [], answerLength: 'detailed' },
      turns: [{ id: 'turn', role: 'user', content: storedQuestion, createdAt: new Date().toISOString() }],
    }));

    render(<LanguageProvider><KnowledgeAssistant onNavigate={vi.fn()} /></LanguageProvider>);

    expect(screen.queryByText(storedQuestion)).not.toBeInTheDocument();
    expect(screen.getByText(activeLocale === 'en'
      ? 'Choose a suggestion or ask your own question.'
      : 'Выберите подсказку или задайте свой вопрос.')).toBeVisible();
  });

  it('restores a completed response after RU to EN to RU', async () => {
    const user = userEvent.setup();
    render(<LanguageProvider><LanguageHarness /></LanguageProvider>);
    await user.type(screen.getByRole('textbox'), 'Что значит размер?');
    await user.click(screen.getByRole('button', { name: 'Спросить' }));
    expect(await screen.findByText(supported.answer)).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'toggle locale' }));
    expect(screen.queryByText(supported.answer)).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Ask ViLu about vision and choosing frames' })).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'toggle locale' }));
    expect(screen.getByText(supported.answer)).toBeVisible();
  });

  it('ignores a late response from the previous locale', async () => {
    let resolveRequest!: (value: typeof supported) => void;
    askKnowledgeAssistant.mockReturnValueOnce(new Promise((resolve) => { resolveRequest = resolve; }));
    const user = userEvent.setup();
    render(<LanguageProvider><LanguageHarness /></LanguageProvider>);
    await user.type(screen.getByRole('textbox'), 'Что значит размер?');
    await user.click(screen.getByRole('button', { name: 'Спросить' }));
    await user.click(screen.getByRole('button', { name: 'toggle locale' }));
    resolveRequest(supported);
    await Promise.resolve();
    expect(screen.queryByText(supported.answer)).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Ask ViLu about vision and choosing frames' })).toBeVisible();
  });
});
