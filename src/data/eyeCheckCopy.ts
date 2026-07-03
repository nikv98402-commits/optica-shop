import type { Language } from '../i18n/translations';
import type { EyeCheckFlow, EyeCheckQuestion, EyeCheckResult, EyeCheckRiskLevel } from '../types/eyeCheck';

type FlowCopy = Pick<EyeCheckFlow, 'title' | 'subtitle' | 'disclaimer'>;
type QuestionCopy = Pick<EyeCheckQuestion, 'text' | 'helpText'>;

const flowCopy: Record<Language, Record<string, FlowCopy>> = {
  ru: {},
  en: {
    'adult-comfort': {
      title: 'Eye Comfort Check',
      subtitle: 'A short check for signs of eye strain after screen time and close-up work.',
      disclaimer: 'This is not a diagnosis or vision measurement. The result helps you decide whether to schedule an in-person eye check.',
    },
    'child-risk': {
      title: 'Child Vision Risk Check',
      subtitle: 'A parent checklist for signs that a child may need an in-person eye check.',
      disclaimer: 'The child checklist does not diagnose anything. It helps you decide whether to contact a pediatric specialist.',
    },
    'one-eye-comparison': {
      title: 'One-eye Comparison',
      subtitle: 'A simple way to compare how the right and left eye feel without measurements.',
      disclaimer: 'Eye comparison does not measure visual acuity and does not replace an in-person eye check.',
    },
    'amsler-grid': {
      title: 'Amsler Grid Guide',
      subtitle: 'A self-observation guide for central vision without making a diagnosis.',
      disclaimer: 'The Amsler grid in ViLu is not a medical test. If you notice distortions, schedule an in-person consultation.',
    },
  },
};

const questionCopy: Record<Language, Record<string, QuestionCopy>> = {
  ru: {},
  en: {
    'screen-time': { text: 'How much time do you usually spend on screens each day?' },
    dryness: { text: 'Do your eyes feel dry after screen time?' },
    burning: { text: 'Do you feel burning or irritation in your eyes?' },
    'blur-after-screen': { text: 'Does your vision become blurry after working on a screen?' },
    'headache-close-work': { text: 'Do you get headaches after reading, laptop work, or other close-up tasks?' },
    squinting: { text: 'Do you need to squint to see text or objects more clearly?' },
    'last-exam': { text: 'When was your last in-person eye check?' },
    'one-eye-worse': { text: 'Does one eye seem to see noticeably worse than the other?' },
    'child-squints': { text: 'Does the child often squint when looking far away or at a screen?' },
    'close-screen': { text: 'Does the child sit too close to the TV or screen?' },
    'close-book': { text: 'Does the child hold a book or phone very close to the face?' },
    'child-headache': { text: 'Does the child complain about headaches after reading or studying?' },
    'rubs-eyes': { text: 'Does the child often rub their eyes or complain about eye tiredness?' },
    'avoids-reading': { text: 'Does the child avoid reading or get tired quickly when working with text?' },
    'closes-one-eye': { text: 'Does the child close one eye while reading, writing, or looking at a screen?' },
    'eye-drift': { text: 'Do you notice one eye drifting or looking in a different direction?' },
    'school-reading': { text: 'Are there new difficulties with reading, writing, or attention in class?' },
    'family-myopia': { text: 'Do parents or close relatives have myopia?' },
    'child-screen-time': { text: 'Has screen time become high for the child’s age?' },
    'low-outdoor': { text: 'Does the child spend little time outdoors during the day?' },
    'white-reflex': {
      text: 'Do you notice a white pupil reflex in flash photos or bright light?',
      helpText: 'If yes, it is better not to delay an in-person consultation.',
    },
    'read-instruction': { text: 'Are you ready to cover each eye in turn and look at the same text or object?' },
    'blurrier-eye': { text: 'Does one eye see noticeably more blurry?' },
    'darker-eye': { text: 'Does the image look noticeably darker through one eye?' },
    'distorted-eye': { text: 'Do lines or shapes look distorted through one eye?' },
    'sudden-change': { text: 'Did this difference appear suddenly?' },
    'amsler-ready': { text: 'Are you ready to look at the center dot of the grid while covering one eye at a time?' },
    'wavy-lines': { text: 'Do the lines look wavy or bent?' },
    'missing-areas': { text: 'Are there missing areas, a dark spot, or blank zones?' },
    'different-eyes': { text: 'Is the result noticeably different between the right and left eye?' },
    'sudden-amsler': { text: 'Did the distortion or spot appear suddenly?' },
  },
};

const optionCopy: Record<string, string> = {
  'Нет': 'No',
  'Иногда': 'Sometimes',
  'Да': 'Yes',
  'Слабо / редко': 'Mild / rare',
  'Часто': 'Often',
  'Сильно': 'Strong',
  'До 3 часов': 'Up to 3 hours',
  '3-6 часов': '3-6 hours',
  '6-9 часов': '6-9 hours',
  'Больше 9 часов': 'More than 9 hours',
  'В течение года': 'Within the last year',
  '1-2 года назад': '1-2 years ago',
  'Больше 2 лет назад': 'More than 2 years ago',
  'Не помню / никогда': 'I do not remember / never',
  'Готово': 'Ready',
};

const resultCopy: Record<Language, Record<string, string>> = {
  ru: {},
  en: {
    'Лучше обратиться срочно': 'Seek help urgently',
    'Есть признаки, при которых не стоит полагаться на приложение. Обратитесь за медицинской помощью срочно.': 'There are signs where you should not rely on an app. Seek medical help urgently.',
    'Не откладывайте очную консультацию.': 'Do not delay an in-person consultation.',
    'Если есть боль, травма, вспышки, занавес, двоение или внезапное ухудшение зрения, обращайтесь за помощью срочно.': 'If there is pain, trauma, flashes, a curtain, double vision, or sudden vision loss, seek help urgently.',
    'Не откладывайте проверку': 'Do not delay the check',
    'Есть признаки, при которых лучше не откладывать визит к специалисту.': 'There are signs where it is better not to delay a visit to a specialist.',
    'Запланируйте очную проверку зрения.': 'Schedule an in-person eye check.',
    'Запишите, что именно повторяется или отличается между глазами.': 'Write down what repeats or differs between the eyes.',
    'Для ребенка выберите детского специалиста.': 'Choose a pediatric specialist for the child.',
    'Перед визитом можно подготовить 2-3 оправы для примерки.': 'Before the visit, you can prepare 2-3 frames for fitting.',
    'Стоит пройти проверку': 'An eye check is recommended',
    'Есть признаки зрительной нагрузки или возможной необходимости коррекции. Рекомендуем пройти очную проверку зрения.': 'There are signs of eye strain or possible need for correction. We recommend an in-person eye check.',
    'Выберите удобное время для очной проверки.': 'Choose a convenient time for an in-person eye check.',
    'Перед визитом можно пройти онлайн-примерку и сохранить подходящие оправы.': 'Before the visit, you can try frames online and save suitable options.',
    'Плановый режим': 'Routine mode',
    'По ответам нет явных тревожных признаков. Если вы давно не проверяли зрение, плановая проверка все равно полезна.': 'Your answers do not show clear warning signs. If you have not checked your vision for a long time, a routine check is still useful.',
    'Используйте ViLu как подготовку к выбору оправ.': 'Use ViLu to prepare for frame selection.',
    'Если признаки повторяются или усиливаются, пройдите очную проверку.': 'If signs repeat or get stronger, schedule an in-person eye check.',
    'Отмечен признак, который лучше проверить очно.': 'A sign was marked that is better checked in person.',
    'Есть выраженный повторяющийся признак.': 'There is a strong recurring sign.',
    'Есть признак, который может быть связан со зрительной нагрузкой.': 'There is a sign that may be related to eye strain.',
    'Есть слабый или периодический признак.': 'There is a mild or occasional sign.',
    'Ответы не показывают явных причин для срочного вывода.': 'The answers do not show clear reasons for an urgent conclusion.',
  },
};

export const eyeCheckUiCopy = {
  ru: {
    backHome: 'На главную',
    privacyNotice: 'Ответы обрабатываются в браузере. В аналитику уходят только технические события: старт, выбранный сценарий и итоговый уровень без текста ответов.',
    selectedScenario: 'Выбранный сценарий',
    time: 'Время',
    minuteShort: 'мин',
    minuteShortDot: 'мин.',
    start: 'Начать self-check',
    question: 'Вопрос',
    of: 'из',
    back: 'Назад',
    index: 'Индекс',
    nonMedical: 'не медицинская оценка',
    why: 'Почему такой результат',
    next: 'Что делать дальше',
    disclaimer: 'ViLu Eye Check не ставит диагноз, не измеряет диоптрии и не заменяет очный осмотр. При боли, травме, внезапном ухудшении зрения, вспышках, двоении или потере части поля зрения обращайтесь за медицинской помощью срочно.',
    tryOn: 'Перейти к примерке',
    saved: 'Сохранено локально',
    save: 'Сохранить на устройстве',
    restart: 'Пройти заново',
    risk: {
      info: 'Планово',
      'check-soon': 'Проверить скоро',
      'do-not-delay': 'Не откладывать',
      urgent: 'Срочно',
    } satisfies Record<EyeCheckRiskLevel, string>,
    introTitle: 'Self-check перед очной проверкой',
    introText: 'Это не диагностика. ViLu Eye Check помогает по ответам понять, стоит ли запланировать очную проверку зрения у специалиста.',
    introDisclaimer: 'ViLu не определяет заболевание, не измеряет диоптрии и не заменяет офтальмолога или оптометриста.',
  },
  en: {
    backHome: 'Back home',
    privacyNotice: 'Answers are processed in the browser. Analytics receives only technical events: start, selected scenario, and final level without answer text.',
    selectedScenario: 'Selected scenario',
    time: 'Time',
    minuteShort: 'min',
    minuteShortDot: 'min.',
    start: 'Start self-check',
    question: 'Question',
    of: 'of',
    back: 'Back',
    index: 'Index',
    nonMedical: 'not a medical score',
    why: 'Why this result',
    next: 'What to do next',
    disclaimer: 'ViLu Eye Check does not diagnose, measure diopters, or replace an in-person exam. If there is pain, trauma, sudden vision loss, flashes, double vision, or loss of part of the visual field, seek medical help urgently.',
    tryOn: 'Go to try-on',
    saved: 'Saved locally',
    save: 'Save on this device',
    restart: 'Start again',
    risk: {
      info: 'Routine',
      'check-soon': 'Check soon',
      'do-not-delay': 'Do not delay',
      urgent: 'Urgent',
    } satisfies Record<EyeCheckRiskLevel, string>,
    introTitle: 'Self-check before an in-person eye check',
    introText: 'This is not a diagnosis. ViLu Eye Check helps you decide whether to schedule an in-person eye check with a specialist.',
    introDisclaimer: 'ViLu does not identify disease, measure diopters, or replace an ophthalmologist or optometrist.',
  },
};

export function getEyeCheckFlowCopy(flow: EyeCheckFlow, language: Language): FlowCopy {
  return flowCopy[language][flow.id] ?? flow;
}

export function getEyeCheckQuestionCopy(question: EyeCheckQuestion, language: Language): QuestionCopy {
  return questionCopy[language][question.id] ?? question;
}

export function getEyeCheckOptionLabel(label: string, language: Language) {
  return language === 'en' ? optionCopy[label] ?? label : label;
}

export function getEyeCheckResultCopy(result: EyeCheckResult, language: Language): EyeCheckResult {
  if (language === 'ru') return result;
  return {
    ...result,
    title: resultCopy.en[result.title] ?? result.title,
    summary: resultCopy.en[result.summary] ?? result.summary,
    reasons: result.reasons.map((reason) => resultCopy.en[reason] ?? reason),
    recommendedActions: result.recommendedActions.map((action) => resultCopy.en[action] ?? action),
  };
}
