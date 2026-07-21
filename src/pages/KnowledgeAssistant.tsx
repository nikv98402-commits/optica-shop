import {
  ArrowRight,
  BookOpen,
  Check,
  ChevronDown,
  AlertCircle,
  ExternalLink,
  Loader2,
  MessageCircleQuestion,
  RotateCcw,
  Send,
  Settings2,
  ShieldCheck,
  ThumbsDown,
  ThumbsUp,
  Trash2,
} from 'lucide-react';
import { FormEvent, type ReactNode, useEffect, useRef, useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { AnalyticsEvent, trackEvent } from '../lib/analyticsEvents';
import {
  clearAssistantLocalState,
  readAssistantLocalState,
  saveAssistantLocalState,
  toBoundedRecentTurns,
  type AssistantLocalState,
} from '../lib/knowledgeAssistant/localHistory';
import { askKnowledgeAssistant, AssistantServiceError } from '../services/knowledgeAssistant';
import type {
  AssistantAnswerLength,
  AssistantExperience,
  AssistantInterest,
  AssistantResponse,
  AssistantStoredTurn,
} from '../types/knowledgeAssistant';

interface KnowledgeAssistantProps {
  onNavigate: (page: string) => void;
}

const promptSuggestions = {
  ru: ['Что значит 52-18-140?', 'Как понять, что оправа широкая?', 'Что такое PD?', 'Когда нужна очная проверка?'],
  en: ['What does 52-18-140 mean?', 'How can I tell if a frame is too wide?', 'What is PD?', 'When is an in-person check needed?'],
};

const copy = {
  ru: {
    eyebrow: 'ViLu Knowledge Assistant',
    title: 'Спросите ViLu о зрении и выборе оправы',
    intro: 'Короткие ответы по проверенным материалам ViLu. С источниками и без медицинских обещаний.',
    placeholder: 'Например: что значит размер оправы 52-18-140?',
    submit: 'Спросить',
    informational: 'Информационный ответ',
    urgent: 'Лучше обратиться за очной помощью',
    sources: 'Источники',
    related: 'По теме',
    external: 'Проверенные внешние ресурсы',
    externalNote: 'Ссылки для самостоятельного чтения. Их материалы не цитируются и не переводятся ViLu.',
    settings: 'Настроить ответы',
    clear: 'Очистить историю и настройки',
    empty: 'Выберите подсказку или задайте свой вопрос.',
    retry: 'Повторить',
    error: 'Не удалось получить ответ. Ваш вопрос сохранен только в этом браузере.',
    noBackend: 'Помощник еще не подключен в этом окружении. Проверенные статьи ViLu остаются доступны.',
    experience: 'Уровень знакомства с темой',
    beginner: 'Начинаю разбираться',
    familiar: 'Знаком с основами',
    interests: 'Что важно',
    length: 'Длина ответа',
    short: 'Коротко',
    detailed: 'Подробнее',
    helpful: 'Ответ помог?',
    local: 'История и настройки хранятся только в вашем браузере.',
    disclaimer: 'ViLu не ставит диагноз, не интерпретирует рецепт и не заменяет очный осмотр.',
  },
  en: {
    eyebrow: 'ViLu Knowledge Assistant',
    title: 'Ask ViLu about vision and choosing frames',
    intro: 'Concise answers grounded in reviewed ViLu materials, with sources and no medical promises.',
    placeholder: 'For example: what does frame size 52-18-140 mean?',
    submit: 'Ask',
    informational: 'Informational answer',
    urgent: 'Seek in-person care',
    sources: 'Sources',
    related: 'Related',
    external: 'Reviewed external resources',
    externalNote: 'Links for independent reading. ViLu does not quote or translate their content.',
    settings: 'Tune answers',
    clear: 'Clear history and settings',
    empty: 'Choose a suggestion or ask your own question.',
    retry: 'Retry',
    error: 'The answer could not be loaded. Your question remains only in this browser.',
    noBackend: 'The assistant is not connected in this environment yet. Reviewed ViLu articles remain available.',
    experience: 'Experience level',
    beginner: 'New to the topic',
    familiar: 'Familiar with the basics',
    interests: 'Interests',
    length: 'Answer length',
    short: 'Short',
    detailed: 'Detailed',
    helpful: 'Was this helpful?',
    local: 'History and preferences stay only in your browser.',
    disclaimer: 'ViLu does not diagnose, interpret prescriptions, or replace an in-person eye exam.',
  },
};

const interestLabels: Record<'ru' | 'en', Record<AssistantInterest, string>> = {
  ru: { frame_fit: 'Посадка оправы', pd_sizing: 'PD и размеры', eye_comfort: 'Комфорт глаз', visit_preparation: 'Подготовка к визиту' },
  en: { frame_fit: 'Frame fit', pd_sizing: 'PD and sizing', eye_comfort: 'Eye comfort', visit_preparation: 'Visit preparation' },
};

function createTurn(role: AssistantStoredTurn['role'], content: string, response?: AssistantResponse): AssistantStoredTurn {
  return {
    id: typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    role,
    content,
    createdAt: new Date().toISOString(),
    response,
  };
}

function coarseTopic(query: string) {
  const normalized = query.toLowerCase();
  if (/52|18|140|размер|size|pd|пд/.test(normalized)) return 'sizing';
  if (/широк|узк|посад|fit|wide|narrow/.test(normalized)) return 'frame_fit';
  if (/салон|визит|осмотр|visit|store|exam/.test(normalized)) return 'visit';
  return 'general';
}

export function KnowledgeAssistant({ onNavigate }: KnowledgeAssistantProps) {
  const { language } = useLanguage();
  const t = copy[language];
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [localState, setLocalState] = useState<AssistantLocalState>(readAssistantLocalState);
  const [draft, setDraft] = useState('');
  const [lastQuery, setLastQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [expandedSources, setExpandedSources] = useState<Record<string, boolean>>({});

  useEffect(() => {
    trackEvent(AnalyticsEvent.AssistantOpened, { locale: language });
    inputRef.current?.focus();
  }, [language]);

  useEffect(() => {
    saveAssistantLocalState(localState);
  }, [localState]);

  const submitQuery = async (query: string) => {
    const normalized = query.trim();
    if (normalized.length < 2 || loading) return;
    const recentTurns = toBoundedRecentTurns(localState.turns);
    const userTurn = createTurn('user', normalized);
    setLocalState((current) => ({ ...current, turns: [...current.turns, userTurn] }));
    setDraft('');
    setLastQuery(normalized);
    setErrorCode(null);
    setLoading(true);
    trackEvent(AnalyticsEvent.AssistantPromptSubmitted, { locale: language, topic: coarseTopic(normalized) });

    try {
      const response = await askKnowledgeAssistant({
        query: normalized,
        locale: language,
        recentTurns,
        preferences: localState.preferences,
      });
      const answerTurn = createTurn('assistant', response.answer, response);
      setLocalState((current) => ({ ...current, turns: [...current.turns, answerTurn] }));
      if (response.confidence === 'insufficient_sources') {
        trackEvent(AnalyticsEvent.AssistantAbstained, { reason: 'insufficient_sources', locale: language });
      } else {
        trackEvent(AnalyticsEvent.AssistantAnswerRendered, {
          confidence: response.confidence,
          citation_count: response.citations.length,
          safety: response.safety,
          locale: language,
        });
      }
    } catch (error) {
      setErrorCode(error instanceof AssistantServiceError ? error.code : 'network_error');
    } finally {
      setLoading(false);
      window.setTimeout(() => inputRef.current?.focus(), 0);
    }
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    void submitQuery(draft);
  };

  const updatePreference = <K extends keyof AssistantLocalState['preferences']>(
    key: K,
    value: AssistantLocalState['preferences'][K],
  ) => {
    setLocalState((current) => ({
      ...current,
      preferences: { ...current.preferences, [key]: value },
    }));
  };

  const toggleInterest = (interest: AssistantInterest) => {
    const current = localState.preferences.interests;
    updatePreference('interests', current.includes(interest)
      ? current.filter((item) => item !== interest)
      : [...current, interest]);
  };

  const clearHistory = () => {
    clearAssistantLocalState();
    setLocalState(readAssistantLocalState());
    setDraft('');
    setLastQuery('');
    setErrorCode(null);
    trackEvent(AnalyticsEvent.AssistantHistoryCleared);
  };

  return (
    <div className="assistant-page min-h-[calc(100vh-5rem)] bg-vilu-paper text-vilu-ink">
      <header className="assistant-hero border-b border-vilu-paper/10 bg-vilu-ink px-4 py-12 text-vilu-paper sm:px-6 sm:py-16">
        <div className="mx-auto max-w-5xl">
          <div className="kinetic-label"><MessageCircleQuestion size={15} /> {t.eyebrow}</div>
          <h1 className="mt-5 max-w-4xl text-4xl font-black leading-[0.98] sm:text-5xl lg:text-6xl">{t.title}</h1>
          <p className="vilu-copy-on-dark mt-5 max-w-2xl text-base leading-7 sm:text-lg">{t.intro}</p>
          <div className="mt-6 flex flex-wrap gap-2" aria-label={language === 'en' ? 'Suggested questions' : 'Подсказки для вопроса'}>
            {promptSuggestions[language].map((suggestion) => (
              <button key={suggestion} onClick={() => { setDraft(suggestion); inputRef.current?.focus(); }} className="rounded-full border border-vilu-paper/20 bg-vilu-paper/5 px-4 py-2 text-left text-sm text-vilu-paper/80 transition hover:border-vilu-lime hover:text-vilu-lime">
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:py-12">
        <section className="min-w-0" aria-live="polite">
          {localState.turns.length === 0 && (
            <div className="rounded-3xl border border-vilu-line bg-vilu-card p-6 text-vilu-muted sm:p-8">
              <BookOpen size={24} className="text-vilu-green" />
              <p className="mt-4 text-lg">{t.empty}</p>
            </div>
          )}

          <div className="grid gap-5">
            {localState.turns.map((turn) => turn.role === 'user' ? (
              <article key={turn.id} className="ml-auto max-w-[90%] rounded-3xl rounded-br-md bg-vilu-lime px-5 py-4 text-vilu-ink sm:max-w-[80%]">
                <p className="whitespace-pre-wrap leading-7">{turn.content}</p>
              </article>
            ) : turn.response ? (
              <article key={turn.id} className={`rounded-3xl border p-5 sm:p-7 ${turn.response.safety === 'urgent' ? 'border-red-300 bg-red-50' : 'border-vilu-line bg-vilu-card'}`}>
                <div className="flex flex-wrap items-center gap-2 text-xs font-black uppercase tracking-[0.12em]">
                  {turn.response.safety === 'urgent' ? <AlertCircle size={17} className="text-red-700" /> : <ShieldCheck size={17} className="text-vilu-green" />}
                  <span>{turn.response.safety === 'urgent' ? t.urgent : t.informational}</span>
                  {turn.response.confidence === 'supported' && <span className="rounded-full bg-vilu-lime px-2 py-1 text-vilu-ink">{turn.response.citations.length} {t.sources.toLowerCase()}</span>}
                </div>
                <p className="mt-4 whitespace-pre-wrap text-lg leading-8">{turn.response.answer}</p>

                {turn.response.citations.length > 0 && (
                  <div className="mt-6 rounded-2xl border border-vilu-line">
                    <button onClick={() => setExpandedSources((current) => ({ ...current, [turn.id]: !current[turn.id] }))} className="flex w-full items-center justify-between gap-3 p-4 text-left font-black" aria-expanded={Boolean(expandedSources[turn.id])}>
                      <span>{t.sources}</span>
                      <ChevronDown className={`transition ${expandedSources[turn.id] ? 'rotate-180' : ''}`} size={18} />
                    </button>
                    {expandedSources[turn.id] && (
                      <div className="grid gap-3 border-t border-vilu-line p-3">
                        {turn.response.citations.map((source, index) => (
                          <a key={source.id} href={source.url} target="_blank" rel="noreferrer" onClick={() => trackEvent(AnalyticsEvent.AssistantSourceOpened, { source_id: source.id })} className="flex items-start justify-between gap-4 rounded-xl bg-vilu-paper p-4 transition hover:bg-vilu-lime/20">
                            <span className="min-w-0"><strong className="block">[{index + 1}] {source.title}</strong><span className="mt-1 block text-sm text-vilu-muted">{source.publisher}{source.publishedAt ? ` · ${source.publishedAt}` : ''}</span></span>
                            <ExternalLink size={17} className="shrink-0" />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {turn.response.relatedPaths.length > 0 && (
                  <div className="mt-5 flex flex-wrap gap-2">
                    {turn.response.relatedPaths.map((path) => (
                      <button key={path} onClick={() => onNavigate(path.replace(/^\//, ''))} className="inline-flex items-center gap-2 rounded-full border border-vilu-line px-4 py-2 text-sm font-bold transition hover:bg-vilu-lime">
                        {path.replace(/^\//, '').replace(/-/g, ' ')} <ArrowRight size={15} />
                      </button>
                    ))}
                  </div>
                )}

                {(turn.response.externalSources?.length || 0) > 0 && (
                  <div className="mt-6 rounded-2xl border border-vilu-line bg-vilu-paper p-4">
                    <strong className="block">{t.external}</strong>
                    <p className="mt-1 text-sm leading-6 text-vilu-muted">{t.externalNote}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {turn.response.externalSources?.map((source) => (
                        <a key={source.id} href={source.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border border-vilu-line bg-vilu-card px-4 py-2 text-sm font-bold transition hover:border-vilu-lime">
                          {source.title} <ExternalLink size={15} />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-vilu-line pt-4 text-sm text-vilu-muted">
                  <span>{t.helpful}</span>
                  <button onClick={() => trackEvent(AnalyticsEvent.AssistantFeedbackSubmitted, { response_id: turn.response?.answerId, positive: true })} className="rounded-full border border-vilu-line p-2 text-vilu-ink hover:bg-vilu-lime" aria-label="Positive feedback"><ThumbsUp size={16} /></button>
                  <button onClick={() => trackEvent(AnalyticsEvent.AssistantFeedbackSubmitted, { response_id: turn.response?.answerId, positive: false })} className="rounded-full border border-vilu-line p-2 text-vilu-ink hover:bg-vilu-lime" aria-label="Negative feedback"><ThumbsDown size={16} /></button>
                </div>
              </article>
            ) : null)}
          </div>

          {loading && <div className="mt-5 flex items-center gap-3 rounded-3xl border border-vilu-line bg-vilu-card p-5"><Loader2 className="animate-spin text-vilu-green" /><span>{language === 'en' ? 'Checking reviewed sources…' : 'Проверяем источники…'}</span></div>}
          {errorCode && (
            <div className="mt-5 rounded-3xl border border-vilu-line bg-vilu-card p-5">
              <p>{errorCode === 'not_configured' ? t.noBackend : t.error}</p>
              {lastQuery && errorCode !== 'not_configured' && <button onClick={() => void submitQuery(lastQuery)} className="vilu-primary-button mt-4 gap-2 px-5 py-3"><RotateCcw size={16} /> {t.retry}</button>}
            </div>
          )}

          <form onSubmit={handleSubmit} className="sticky bottom-0 mt-6 border-t border-vilu-line bg-vilu-paper/95 py-4 backdrop-blur" data-testid="assistant-form">
            <div className="flex items-end gap-2 rounded-3xl border border-vilu-line bg-vilu-card p-2 shadow-lg">
              <textarea ref={inputRef} value={draft} onChange={(event) => setDraft(event.target.value.slice(0, 1000))} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void submitQuery(draft); } }} rows={2} minLength={2} maxLength={1000} placeholder={t.placeholder} className="min-h-14 min-w-0 flex-1 resize-none bg-transparent px-3 py-3 text-base outline-none placeholder:text-vilu-muted" aria-label={t.placeholder} />
              <button type="submit" aria-label={t.submit} disabled={loading || draft.trim().length < 2} className="vilu-primary-button h-12 shrink-0 gap-2 px-4 disabled:cursor-not-allowed disabled:opacity-45 sm:px-6">
                <Send size={17} /><span className="hidden sm:inline">{t.submit}</span>
              </button>
            </div>
          </form>
        </section>

        <aside className="min-w-0">
          <div className="rounded-3xl border border-vilu-line bg-vilu-card p-5 lg:sticky lg:top-28">
            <button onClick={() => setSettingsOpen((value) => !value)} className="flex w-full items-center justify-between gap-3 text-left font-black" aria-expanded={settingsOpen}>
              <span className="flex items-center gap-2"><Settings2 size={18} /> {t.settings}</span><ChevronDown size={18} className={`transition ${settingsOpen ? 'rotate-180' : ''}`} />
            </button>
            {settingsOpen && (
              <div className="mt-5 grid gap-6 border-t border-vilu-line pt-5">
                <PreferenceGroup title={t.experience}>
                  {(['beginner', 'familiar'] as AssistantExperience[]).map((value) => <PreferenceButton key={value} active={localState.preferences.experience === value} onClick={() => updatePreference('experience', value)}>{value === 'beginner' ? t.beginner : t.familiar}</PreferenceButton>)}
                </PreferenceGroup>
                <PreferenceGroup title={t.interests}>
                  {(Object.keys(interestLabels[language]) as AssistantInterest[]).map((value) => <PreferenceButton key={value} active={localState.preferences.interests.includes(value)} onClick={() => toggleInterest(value)}>{interestLabels[language][value]}</PreferenceButton>)}
                </PreferenceGroup>
                <PreferenceGroup title={t.length}>
                  {(['short', 'detailed'] as AssistantAnswerLength[]).map((value) => <PreferenceButton key={value} active={localState.preferences.answerLength === value} onClick={() => updatePreference('answerLength', value)}>{value === 'short' ? t.short : t.detailed}</PreferenceButton>)}
                </PreferenceGroup>
              </div>
            )}
            <div className="mt-5 border-t border-vilu-line pt-5">
              <p className="text-sm leading-6 text-vilu-muted"><ShieldCheck className="mr-2 inline text-vilu-green" size={16} />{t.local}</p>
              <button onClick={clearHistory} disabled={localState.turns.length === 0} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full border border-vilu-line px-4 py-3 text-sm font-black transition hover:bg-vilu-ink hover:text-vilu-paper disabled:opacity-45"><Trash2 size={16} /> {t.clear}</button>
            </div>
          </div>
        </aside>
      </div>

      <footer className="border-t border-vilu-line bg-vilu-card px-4 py-6 text-center text-sm text-vilu-muted"><ShieldCheck className="mr-2 inline" size={16} />{t.disclaimer}</footer>
    </div>
  );
}

function PreferenceGroup({ title, children }: { title: string; children: ReactNode }) {
  return <fieldset><legend className="mb-2 text-xs font-black uppercase tracking-[0.12em] text-vilu-muted">{title}</legend><div className="flex flex-wrap gap-2">{children}</div></fieldset>;
}

function PreferenceButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return <button type="button" onClick={onClick} className={`inline-flex items-center gap-1 rounded-full border px-3 py-2 text-sm font-bold transition ${active ? 'border-vilu-lime bg-vilu-lime text-vilu-ink' : 'border-vilu-line bg-vilu-paper text-vilu-ink'}`}>{active && <Check size={14} />}{children}</button>;
}
