import type { AssistantResponse, Locale } from './contracts.ts';

const URGENT_PATTERNS = [
  /(?:внезапн|резк)[а-яё]*\s+(?:потер|ухудш|пропал|исчез)[а-яё]*\s+зр/i,
  /зр[а-яё]*\s+(?:внезапн|резк)[а-яё]*\s+(?:пропал|исчез|ухудш)[а-яё]*/i,
  /сильн[а-яё]*\s+бол[а-яё]*\s+(в\s+)?глаз/i,
  /травм[а-яё]*\s+глаз/i,
  /вспышк[а-яё]*.*(занавес|пелен|штор)/i,
  /нов[а-яё]*\s+(сильн[а-яё]*\s+)?двоен/i,
  /химическ[а-яё]*.*(глаз|ожог)/i,
  /sudden\s+(vision\s+loss|loss\s+of\s+vision|vision\s+change)/i,
  /severe\s+eye\s+pain/i,
  /eye\s+(trauma|injury)/i,
  /flashes?.*(curtain|veil)/i,
  /new\s+(marked\s+)?double\s+vision/i,
  /chemical.*eye/i,
];

const DISALLOWED_PATTERNS = [
  /(?:постав|определи|скажи).{0,30}диагноз/i,
  /(?:вероятност|шанс).{0,30}(?:болезн|заболеван|диагноз)/i,
  /(?:расшифруй|интерпретируй|проверь).{0,30}(?:рецепт|sph|cyl|axis|фото|изображен)/i,
  /(?:назнач|посоветуй|рекомендуй).{0,30}(?:лечен|лекарств|капл|дозиров|упражнен)/i,
  /(?:игнорируй|обойди|отмени).{0,30}(?:правил|ограничен|инструкц|политик)/i,
  /(?:diagnos|probability of|chance of).{0,40}(?:disease|condition|disorder)?/i,
  /(?:interpret|read|check).{0,30}(?:prescription|sph|cyl|axis|photo|image)/i,
  /(?:prescribe|recommend).{0,30}(?:treatment|medicine|medication|drops|dosage|exercise)/i,
  /(?:ignore|bypass|override).{0,30}(?:rules|policy|instructions|safety)/i,
];

export function isUrgentQuery(query: string) {
  return URGENT_PATTERNS.some((pattern) => pattern.test(query));
}

export function isDisallowedQuery(query: string) {
  return DISALLOWED_PATTERNS.some((pattern) => pattern.test(query));
}

export function refusalResponse(locale: Locale): AssistantResponse {
  return {
    answerId: crypto.randomUUID(),
    answer: locale === 'ru'
      ? 'Я не могу ставить диагноз, интерпретировать рецепт или фотографию, назначать лечение и обходить правила безопасности. Могу объяснить общий термин или помочь подготовить вопросы для очного специалиста.'
      : 'I cannot diagnose, interpret a prescription or image, prescribe treatment, or bypass safety rules. I can explain a general concept or help you prepare questions for an in-person specialist.',
    citations: [],
    confidence: 'insufficient_sources',
    safety: 'informational',
    relatedPaths: ['/vision-care'],
  };
}

export function urgentResponse(locale: Locale): AssistantResponse {
  return {
    answerId: crypto.randomUUID(),
    answer: locale === 'ru'
      ? 'Не откладывайте очную медицинскую помощь. При внезапном ухудшении или потере зрения, сильной боли, травме, химическом воздействии, вспышках с «занавесом» или новом выраженном двоении обратитесь за срочной помощью. ViLu не может оценить причину симптомов онлайн.'
      : 'Do not delay in-person medical care. Seek urgent help for sudden vision loss or change, severe pain, trauma, chemical exposure, flashes with a curtain or veil, or new marked double vision. ViLu cannot assess the cause online.',
    citations: [],
    confidence: 'insufficient_sources',
    safety: 'urgent',
    relatedPaths: ['/vision-care'],
  };
}
