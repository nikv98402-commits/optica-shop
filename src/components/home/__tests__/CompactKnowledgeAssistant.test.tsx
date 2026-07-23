import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CompactKnowledgeAssistant } from '../CompactKnowledgeAssistant';

const askKnowledgeAssistant = vi.fn();

vi.mock('../../../config/features', () => ({
  publicFeatures: { knowledgeAssistant: true },
}));

vi.mock('../../../services/knowledgeAssistant', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../../services/knowledgeAssistant')>();
  return { ...original, askKnowledgeAssistant: (...args: unknown[]) => askKnowledgeAssistant(...args) };
});

const response = {
  answerId: 'answer-1',
  answer: 'Проверенный ответ о размере оправы.',
  confidence: 'supported' as const,
  safety: 'informational' as const,
  relatedPaths: [],
  citations: [
    { id: 'one', title: 'Источник один', url: 'https://vilu.store/one', publisher: 'ViLu', license: 'vilu-owned' },
    { id: 'two', title: 'Источник два', url: 'https://vilu.store/two', publisher: 'ViLu', license: 'vilu-owned' },
    { id: 'three', title: 'Источник три', url: 'https://vilu.store/three', publisher: 'ViLu', license: 'vilu-owned' },
  ],
};

describe('CompactKnowledgeAssistant', () => {
  beforeEach(() => askKnowledgeAssistant.mockReset());

  it('keeps empty input disabled and selects a suggested question', async () => {
    const user = userEvent.setup();
    render(<CompactKnowledgeAssistant language="ru" onNavigate={vi.fn()} />);

    const input = screen.getByRole('textbox');
    await user.clear(input);
    expect(screen.getByRole('button', { name: 'Спросить ViLu' })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Когда нужна очная проверка?' }));
    expect(input).toHaveValue('Когда нужна очная проверка?');
    expect(screen.getAllByText('Когда нужна очная проверка?')).toHaveLength(2);
  });

  it('blocks duplicate submissions while loading and renders only two citations', async () => {
    let resolveRequest!: (value: typeof response) => void;
    askKnowledgeAssistant.mockReturnValue(new Promise((resolve) => {
      resolveRequest = resolve;
    }));
    const user = userEvent.setup();
    render(<CompactKnowledgeAssistant language="ru" onNavigate={vi.fn()} />);

    const submit = screen.getByRole('button', { name: 'Спросить ViLu' });
    await user.click(submit);
    expect(submit).toBeDisabled();
    expect(screen.getByText(/Находим релевантный фрагмент/)).toBeVisible();
    expect(askKnowledgeAssistant).toHaveBeenCalledOnce();

    resolveRequest(response);
    expect(await screen.findByText(response.answer)).toBeVisible();
    expect(screen.getByText('3 источника')).toBeVisible();
    expect(screen.getByRole('link', { name: /Источник один/ })).toHaveAttribute('href', 'https://vilu.store/one');
    expect(screen.getByRole('link', { name: /Источник два/ })).toBeVisible();
    expect(screen.queryByRole('link', { name: /Источник три/ })).not.toBeInTheDocument();
  });

  it('opens the full assistant from the footer', async () => {
    const onNavigate = vi.fn();
    const user = userEvent.setup();
    render(<CompactKnowledgeAssistant language="en" onNavigate={onNavigate} />);

    await user.click(screen.getByRole('button', { name: /Open full assistant/ }));
    expect(onNavigate).toHaveBeenCalledWith('assistant');
  });
});
