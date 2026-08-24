import type { Language } from '../../i18n/translations';

const en = {
  nav: { today: 'Today', result: 'Result', referral: 'Referral' },
  common: { loading: 'Loading…', retry: 'Try again', privacy: 'Your employer cannot see personal answers or results.', back: 'Back to today' },
  today: {
    eyebrow: 'Today · one clear next step', title: 'Check your visual comfort',
    lead: 'A five-minute guided screening. It does not diagnose a condition; it helps you understand the next safe step.',
    start: 'Start screening', resume: 'Resume screening', viewResult: 'View result', step: 'Question', of: 'of', continue: 'Continue', finish: 'See result',
    helperTitle: 'ViLu guide', helper: 'Clinical rules determine urgency. The assistant explains the route but never makes a diagnosis.',
  },
  questions: [
    { id: 'comfort', title: 'How often do your eyes feel tired or uncomfortable?', options: ['Never', 'Sometimes', 'Often', 'Almost every day'] },
    { id: 'distance', title: 'How often is text or distance vision unclear?', options: ['Never', 'Sometimes', 'Often', 'Almost every day'] },
    { id: 'one-eye', title: 'Does one eye suddenly see much worse than the other?', options: ['No', 'Not sure', 'Yes, gradually', 'Yes, suddenly'] },
    { id: 'distortion', title: 'Do you see a new dark area, flashes, or strong distortion?', options: ['No', 'Not sure', 'Occasionally', 'Yes, now'] },
  ],
  result: {
    eyebrow: 'Screening completed', title: { routine: 'Continue routine eye care', review_recommended: 'An in-person eye examination is recommended', urgent: 'Seek urgent eye care now' },
    summary: { routine: 'Your answers do not indicate a need for an accelerated route.', review_recommended: 'Continue the check with a qualified eye-care professional.', urgent: 'Your answers include a warning sign that should not wait.' },
    window: 'Recommended timeframe', days: { 0: 'Today', 30: 'Within 30 days', 365: 'Within 12 months' },
    createReferral: 'Create referral', noReferral: 'Return to today', why: 'Why this recommendation', boundary: 'This is not a diagnosis. Only a qualified professional can diagnose after an examination.',
  },
  referral: {
    eyebrow: 'Referral created', title: 'Your next step is ready', lead: 'The referral is saved in your private care route. Choose a clinical partner and explicitly consent before anything is shared.',
    status: 'Status', statusValue: 'Awaiting clinic selection', assigned: 'Sent to clinical partner', deadline: 'Complete by', next: 'What happens next', steps: ['Choose an approved clinical partner', 'Give explicit consent to share the referral', 'Book an examination'], chooseProvider: 'Clinical partner', consentNotice: 'By continuing, you consent to share this referral with the selected clinical partner. You can revoke access in Profile.', shareAndSend: 'Consent and send referral', sending: 'Sending…', assignmentSuccess: 'Referral sent securely.', assignmentFailed: 'Could not send the referral. Try again.',
    safety: 'If symptoms suddenly worsen, do not wait for this digital route—seek urgent local care.',
  },
} as const;

type Shape<T> = T extends string ? string : T extends readonly (infer U)[] ? readonly Shape<U>[] : { [K in keyof T]: Shape<T[K]> };
const ru = {
  nav: { today: 'Сегодня', result: 'Результат', referral: 'Направление' },
  common: { loading: 'Загрузка…', retry: 'Повторить', privacy: 'Работодатель не видит персональные ответы и результаты.', back: 'Вернуться на сегодня' },
  today: {
    eyebrow: 'Сегодня · один понятный шаг', title: 'Проверьте зрительный комфорт',
    lead: 'Пятиминутная проверка с подсказками. Она не ставит диагноз, а помогает понять следующий безопасный шаг.',
    start: 'Начать проверку', resume: 'Продолжить проверку', viewResult: 'Посмотреть результат', step: 'Вопрос', of: 'из', continue: 'Продолжить', finish: 'Узнать результат',
    helperTitle: 'Помощник ViLu', helper: 'Срочность определяют клинические правила. Помощник объясняет маршрут, но не ставит диагноз.',
  },
  questions: [
    { id: 'comfort', title: 'Как часто глаза устают или ощущается дискомфорт?', options: ['Никогда', 'Иногда', 'Часто', 'Почти каждый день'] },
    { id: 'distance', title: 'Как часто текст или предметы вдали видны нечётко?', options: ['Никогда', 'Иногда', 'Часто', 'Почти каждый день'] },
    { id: 'one-eye', title: 'Один глаз внезапно стал видеть заметно хуже другого?', options: ['Нет', 'Не уверен(а)', 'Да, постепенно', 'Да, внезапно'] },
    { id: 'distortion', title: 'Появилось новое тёмное пятно, вспышки или сильное искажение?', options: ['Нет', 'Не уверен(а)', 'Иногда', 'Да, сейчас'] },
  ],
  result: {
    eyebrow: 'Проверка завершена', title: { routine: 'Продолжайте плановую заботу о зрении', review_recommended: 'Рекомендуется очное обследование', urgent: 'Обратитесь за срочной офтальмологической помощью' },
    summary: { routine: 'Ответы не указывают на необходимость ускоренного маршрута.', review_recommended: 'Продолжите проверку у квалифицированного специалиста по зрению.', urgent: 'В ответах есть признак, с которым не следует ждать.' },
    window: 'Рекомендуемый срок', days: { 0: 'Сегодня', 30: 'В течение 30 дней', 365: 'В течение 12 месяцев' },
    createReferral: 'Создать направление', noReferral: 'Вернуться на сегодня', why: 'Почему такая рекомендация', boundary: 'Это не диагноз. Диагноз может поставить только квалифицированный специалист после обследования.',
  },
  referral: {
    eyebrow: 'Направление создано', title: 'Следующий шаг готов', lead: 'Направление сохранено в вашем приватном маршруте помощи. Выберите клинического партнёра и явно подтвердите согласие перед передачей данных.',
    status: 'Статус', statusValue: 'Ожидает выбора клиники', assigned: 'Передано клиническому партнёру', deadline: 'Завершить до', next: 'Что будет дальше', steps: ['Выбрать проверенного клинического партнёра', 'Явно согласиться на передачу направления', 'Записаться на обследование'], chooseProvider: 'Клинический партнёр', consentNotice: 'Продолжая, вы разрешаете передать это направление выбранному клиническому партнёру. Доступ можно отозвать в профиле.', shareAndSend: 'Разрешить и отправить направление', sending: 'Отправляем…', assignmentSuccess: 'Направление безопасно передано.', assignmentFailed: 'Не удалось передать направление. Повторите попытку.',
    safety: 'Если симптомы внезапно усилились, не ждите цифрового маршрута — обратитесь за срочной помощью по месту нахождения.',
  },
} as const satisfies Shape<typeof en>;

export const employeeFlowCopy: Record<Language, Shape<typeof en>> = { en, ru };
