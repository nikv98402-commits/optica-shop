import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LanguageProvider } from '../../contexts/LanguageContext';
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
};

describe('KnowledgeAssistant', () => {
  beforeEach(() => askKnowledgeAssistant.mockReset().mockResolvedValue(supported));

  it('submits a RU question and renders expandable citations', async () => {
    const user = userEvent.setup();
    render(<LanguageProvider><KnowledgeAssistant onNavigate={vi.fn()} /></LanguageProvider>);
    await user.type(screen.getByRole('textbox'), 'Что значит 52-18-140?');
    await user.click(screen.getByRole('button', { name: 'Спросить' }));
    expect(await screen.findByText('52 — ширина линзы. [1]')).toBeVisible();
    await user.click(screen.getByRole('button', { name: /Источники/i }));
    expect(screen.getByRole('link', { name: /Размер оправы/i })).toHaveAttribute('href', 'https://vilu.store/kak-vybrat-razmer-opravy');
  });

  it('loads English copy from the shared language preference', () => {
    localStorage.setItem('vilu_language', 'en');
    render(<LanguageProvider><KnowledgeAssistant onNavigate={vi.fn()} /></LanguageProvider>);
    expect(screen.getByRole('heading', { name: 'Ask ViLu about vision and choosing frames' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Ask' })).toBeDisabled();
  });

  it('clears local history and settings from the UI', async () => {
    localStorage.setItem('vilu_knowledge_assistant_v1', JSON.stringify({
      version: 1, preferences: { experience: 'familiar', interests: [], answerLength: 'detailed' },
      turns: [{ id: 'turn', role: 'user', content: 'Stored question', createdAt: new Date().toISOString() }],
    }));
    const user = userEvent.setup();
    render(<LanguageProvider><KnowledgeAssistant onNavigate={vi.fn()} /></LanguageProvider>);
    await user.click(screen.getByRole('button', { name: /Очистить историю/i }));
    expect(screen.queryByText('Stored question')).not.toBeInTheDocument();
    expect(localStorage.getItem('vilu_knowledge_assistant_v1')).toContain('"turns":[]');
  });
});
