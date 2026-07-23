import { ArrowUp, BookOpen, Check, Loader2, Plus, ShieldCheck } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { publicFeatures } from '../../config/features';
import { askKnowledgeAssistant, AssistantServiceError } from '../../services/knowledgeAssistant';
import type { AssistantResponse } from '../../types/knowledgeAssistant';
import { OpticalOrbits } from './OpticalOrbits';

interface CompactKnowledgeAssistantProps {
  language: 'ru' | 'en';
  onNavigate: (page: string) => void;
}

const content = {
  ru: {
    title: 'Спросить ViLu',
    trust: 'Проверенные материалы',
    prompt: 'Чем помочь?',
    initial: 'Как понять, что ребёнку пора проверить зрение?',
    placeholder: 'Задайте вопрос о зрении или выборе оправы',
    mode: 'База ViLu',
    local: 'История остаётся в браузере',
    disclaimer: 'Информация, не диагноз',
    loading: 'Находим релевантный фрагмент в базе ViLu…',
    answer: 'Проверенный ответ',
    source: 'источник',
    sources: 'источника',
    open: 'Открыть полный помощник',
    retry: 'Не удалось получить ответ. Откройте полный помощник или попробуйте ещё раз.',
    suggestions: [
      'Что значит размер оправы 52–18–140?',
      'Как понять, что оправа широкая?',
      'Когда нужна очная проверка?',
    ],
  },
  en: {
    title: 'Ask ViLu',
    trust: 'Reviewed materials',
    prompt: 'How can I help?',
    initial: 'How do I know when a child needs an eye check?',
    placeholder: 'Ask about vision or choosing frames',
    mode: 'ViLu library',
    local: 'History stays in your browser',
    disclaimer: 'Information, not diagnosis',
    loading: 'Finding the relevant ViLu material…',
    answer: 'Reviewed answer',
    source: 'source',
    sources: 'sources',
    open: 'Open full assistant',
    retry: 'Could not get an answer. Open the full assistant or try again.',
    suggestions: [
      'What does frame size 52–18–140 mean?',
      'How can I tell if a frame is too wide?',
      'When is an in-person eye check needed?',
    ],
  },
} as const;

export function CompactKnowledgeAssistant({ language, onNavigate }: CompactKnowledgeAssistantProps) {
  const copy = content[language];
  const [query, setQuery] = useState<string>(copy.initial);
  const [shownQuestion, setShownQuestion] = useState<string>(copy.initial);
  const [response, setResponse] = useState<AssistantResponse | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const normalized = query.trim();
    if (!normalized || loading) return;
    if (!publicFeatures.knowledgeAssistant) {
      onNavigate('assistant');
      return;
    }

    setShownQuestion(normalized);
    setResponse(null);
    setError(false);
    setLoading(true);

    try {
      const result = await askKnowledgeAssistant({
        query: normalized,
        locale: language,
        recentTurns: [],
        preferences: {
          experience: 'beginner',
          interests: ['frame_fit', 'eye_comfort', 'visit_preparation'],
          answerLength: 'short',
        },
      });
      setResponse(result);
    } catch (caught) {
      setError(caught instanceof AssistantServiceError);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="assistant-orbit-stage">
      <OpticalOrbits />
      <section className="compact-assistant" aria-label={copy.title}>
        <header className="compact-assistant__header">
          <div className="compact-assistant__identity">
            <span className="compact-assistant__mark" aria-hidden="true">V</span>
            <strong>{copy.title}</strong>
          </div>
          <span className="compact-assistant__verified"><ShieldCheck size={14} /> {copy.trust}</span>
        </header>

        <div className="compact-assistant__conversation" aria-live="polite">
          {!response && !error && (
            <div className={loading ? 'compact-assistant__question is-muted' : 'compact-assistant__question'}>
              <span>{copy.prompt}</span>
              <p>{shownQuestion}</p>
            </div>
          )}

          {loading && (
            <div className="compact-assistant__loading">
              <div className="compact-assistant__scan" />
              <span><Loader2 size={15} className="animate-spin" /> {copy.loading}</span>
            </div>
          )}

          {response && (
            <div className="compact-assistant__answer">
              <div className="compact-assistant__answer-meta">
                <span><Check size={14} /> {copy.answer}</span>
                <b>{response.citations.length} {response.citations.length === 1 ? copy.source : copy.sources}</b>
              </div>
              <p>{response.answer}</p>
              {response.citations.length > 0 && (
                <div className="compact-assistant__sources">
                  {response.citations.slice(0, 2).map((citation, index) => (
                    <a href={citation.url} key={citation.id} target="_blank" rel="noreferrer">
                      <BookOpen size={13} /> [{index + 1}] {citation.title}
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}

          {error && <p className="compact-assistant__error">{copy.retry}</p>}
        </div>

        {!response && !loading && (
          <div className="compact-assistant__suggestions" aria-label="Подсказки">
            {copy.suggestions.map((suggestion) => (
              <button
                type="button"
                key={suggestion}
                onClick={() => {
                  setQuery(suggestion);
                  setShownQuestion(suggestion);
                  setError(false);
                }}
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}

        <form className="compact-assistant__composer" onSubmit={submit}>
          <button type="button" className="compact-assistant__icon" aria-label="Добавить материал">
            <Plus size={19} />
          </button>
          <label className="sr-only" htmlFor="home-assistant-question">{copy.placeholder}</label>
          <input
            id="home-assistant-question"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={copy.placeholder}
            maxLength={500}
          />
          <span className="compact-assistant__mode">{copy.mode}</span>
          <button type="submit" className="compact-assistant__send" aria-label={copy.title} disabled={loading || !query.trim()}>
            <ArrowUp size={19} />
          </button>
        </form>

        <footer className="compact-assistant__footer">
          <span><ShieldCheck size={13} /> {copy.local}</span>
          <span>{copy.disclaimer}</span>
          <button type="button" onClick={() => onNavigate('assistant')}>{copy.open} →</button>
        </footer>
      </section>
    </div>
  );
}
