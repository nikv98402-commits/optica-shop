import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CompactKnowledgeAssistant } from '../CompactKnowledgeAssistant';

const mocks = vi.hoisted(() => ({
  askKnowledgeAssistant: vi.fn(),
  publicFeatures: { knowledgeAssistant: true },
  AssistantServiceError: class AssistantServiceError extends Error {
    constructor(public readonly code: string) {
      super(code);
    }
  },
}));

vi.mock('../../../config/features', () => ({
  publicFeatures: mocks.publicFeatures,
}));

vi.mock('../../../services/knowledgeAssistant', () => {
  return {
    AssistantServiceError: mocks.AssistantServiceError,
    askKnowledgeAssistant: (...args: unknown[]) => mocks.askKnowledgeAssistant(...args),
  };
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
  beforeEach(() => {
    mocks.askKnowledgeAssistant.mockReset();
    mocks.publicFeatures.knowledgeAssistant = true;
  });

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
    mocks.askKnowledgeAssistant.mockReturnValue(new Promise((resolve) => {
      resolveRequest = resolve;
    }));
    const user = userEvent.setup();
    render(<CompactKnowledgeAssistant language="ru" onNavigate={vi.fn()} />);

    const submit = screen.getByRole('button', { name: 'Спросить ViLu' });
    await user.click(submit);
    expect(submit).toBeDisabled();
    expect(screen.getByText(/Находим релевантный фрагмент/)).toBeVisible();
    expect(mocks.askKnowledgeAssistant).toHaveBeenCalledOnce();

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

  it('localizes accessibility labels and resets untouched starter copy when language changes', () => {
    const { rerender } = render(
      <CompactKnowledgeAssistant language="ru" onNavigate={vi.fn()} />,
    );

    expect(document.querySelector('.compact-assistant__suggestions')).toHaveAttribute('aria-label', 'Подсказки');
    expect(screen.getByRole('button', { name: 'Добавить материал' })).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toHaveValue('Как понять, что ребёнку пора проверить зрение?');

    rerender(<CompactKnowledgeAssistant language="en" onNavigate={vi.fn()} />);

    expect(document.querySelector('.compact-assistant__suggestions')).toHaveAttribute('aria-label', 'Suggestions');
    expect(screen.getByRole('button', { name: 'Add material' })).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toHaveValue('How do I know when a child needs an eye check?');
    expect(document.body.textContent).not.toMatch(/[А-Яа-яЁё]/);
  });

  it('localizes a selected product suggestion through RU to EN to RU', async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    const { rerender } = render(
      <CompactKnowledgeAssistant language="ru" onNavigate={onNavigate} />,
    );

    await user.click(screen.getByRole('button', { name: 'Как понять, что оправа широкая?' }));
    expect(screen.getByRole('textbox')).toHaveValue('Как понять, что оправа широкая?');

    rerender(<CompactKnowledgeAssistant language="en" onNavigate={onNavigate} />);
    expect(screen.getByRole('textbox')).toHaveValue('How can I tell if a frame is too wide?');
    expect(screen.getAllByText('How can I tell if a frame is too wide?')).toHaveLength(2);

    rerender(<CompactKnowledgeAssistant language="ru" onNavigate={onNavigate} />);
    expect(screen.getByRole('textbox')).toHaveValue('Как понять, что оправа широкая?');
    expect(screen.getAllByText('Как понять, что оправа широкая?')).toHaveLength(2);
  });

  it('localizes a submitted product suggestion through RU to EN to RU', async () => {
    mocks.askKnowledgeAssistant.mockResolvedValueOnce(response);
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    const { rerender } = render(
      <CompactKnowledgeAssistant language="ru" onNavigate={onNavigate} />,
    );

    await user.click(screen.getByRole('button', { name: 'Когда нужна очная проверка?' }));
    await user.click(screen.getByRole('button', { name: 'Спросить ViLu' }));
    expect(await screen.findByText(response.answer)).toBeVisible();

    rerender(<CompactKnowledgeAssistant language="en" onNavigate={onNavigate} />);
    expect(screen.getByRole('textbox')).toHaveValue('When is an in-person eye check needed?');
    expect(screen.getAllByText('When is an in-person eye check needed?')).toHaveLength(2);

    rerender(<CompactKnowledgeAssistant language="ru" onNavigate={onNavigate} />);
    expect(screen.getByRole('textbox')).toHaveValue('Когда нужна очная проверка?');
    expect(screen.getAllByText('Когда нужна очная проверка?')).toHaveLength(2);
  });

  it('does not translate arbitrary user text when language changes', async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    const { rerender } = render(
      <CompactKnowledgeAssistant language="ru" onNavigate={onNavigate} />,
    );

    const input = screen.getByRole('textbox');
    await user.clear(input);
    await user.type(input, 'My custom question');

    rerender(<CompactKnowledgeAssistant language="en" onNavigate={onNavigate} />);
    expect(screen.getByRole('textbox')).toHaveValue('My custom question');
  });

  it('clears an existing answer and its citations when language changes', async () => {
    mocks.askKnowledgeAssistant.mockResolvedValueOnce(response);
    const user = userEvent.setup();
    const { rerender } = render(
      <CompactKnowledgeAssistant language="ru" onNavigate={vi.fn()} />,
    );

    await user.click(screen.getByRole('button', { name: 'Спросить ViLu' }));
    expect(await screen.findByText(response.answer)).toBeVisible();
    expect(screen.getByRole('link', { name: /Источник один/ })).toBeVisible();

    rerender(<CompactKnowledgeAssistant language="en" onNavigate={vi.fn()} />);

    await waitFor(() => expect(screen.queryByText(response.answer)).not.toBeInTheDocument());
    expect(screen.queryByRole('link', { name: /Источник один/ })).not.toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/[А-Яа-яЁё]/);
  });

  it('ignores a pending response from the previous language', async () => {
    let resolveRequest!: (value: typeof response) => void;
    mocks.askKnowledgeAssistant.mockReturnValueOnce(new Promise((resolve) => {
      resolveRequest = resolve;
    }));
    const user = userEvent.setup();
    const { rerender } = render(
      <CompactKnowledgeAssistant language="ru" onNavigate={vi.fn()} />,
    );

    await user.click(screen.getByRole('button', { name: 'Спросить ViLu' }));
    expect(screen.getByText(/Находим релевантный фрагмент/)).toBeVisible();

    rerender(<CompactKnowledgeAssistant language="en" onNavigate={vi.fn()} />);
    resolveRequest(response);

    await waitFor(() => expect(screen.queryByText(response.answer)).not.toBeInTheDocument());
    expect(screen.queryByRole('link', { name: /Источник один/ })).not.toBeInTheDocument();
    expect(screen.queryByText(/Finding the relevant ViLu material/)).not.toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/[А-Яа-яЁё]/);
  });

  it('renders a recoverable message for service errors', async () => {
    mocks.askKnowledgeAssistant.mockRejectedValueOnce(
      new mocks.AssistantServiceError('provider_unavailable'),
    );
    const user = userEvent.setup();
    render(<CompactKnowledgeAssistant language="ru" onNavigate={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Спросить ViLu' }));
    expect(await screen.findByText(/Не удалось получить ответ/)).toBeVisible();
  });

  it('does not mislabel unexpected errors as recoverable service failures', async () => {
    mocks.askKnowledgeAssistant.mockRejectedValueOnce(new Error('unexpected'));
    const user = userEvent.setup();
    render(<CompactKnowledgeAssistant language="ru" onNavigate={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Спросить ViLu' }));
    await screen.findByRole('button', { name: 'Спросить ViLu' });
    expect(screen.queryByText(/Не удалось получить ответ/)).not.toBeInTheDocument();
  });

  it('navigates instead of calling the service when the feature is disabled', async () => {
    mocks.publicFeatures.knowledgeAssistant = false;
    const onNavigate = vi.fn();
    const user = userEvent.setup();
    render(<CompactKnowledgeAssistant language="ru" onNavigate={onNavigate} />);

    await user.click(screen.getByRole('button', { name: 'Спросить ViLu' }));
    expect(onNavigate).toHaveBeenCalledWith('assistant');
    expect(mocks.askKnowledgeAssistant).not.toHaveBeenCalled();
  });
});
