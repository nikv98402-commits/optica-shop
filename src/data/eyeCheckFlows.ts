import type { EyeCheckFlow, EyeCheckQuestion } from '../types/eyeCheck';

const yesNo = (yesScore = 2, redFlag = false): EyeCheckQuestion['options'] => [
  { value: 'no', label: 'Нет', score: 0 },
  { value: 'sometimes', label: 'Иногда', score: Math.max(1, yesScore - 1) },
  { value: 'yes', label: 'Да', score: yesScore, redFlag },
];

const severity = (redFlag = false): EyeCheckQuestion['options'] => [
  { value: 'none', label: 'Нет', score: 0 },
  { value: 'mild', label: 'Слабо / редко', score: 1 },
  { value: 'often', label: 'Часто', score: 2 },
  { value: 'strong', label: 'Сильно', score: 3, redFlag },
];

export const eyeCheckFlows: EyeCheckFlow[] = [
  {
    id: 'adult-comfort',
    title: 'Комфорт глаз',
    subtitle: 'Короткая проверка признаков зрительной нагрузки после экрана и работы вблизи.',
    audience: 'adult',
    estimatedMinutes: 3,
    disclaimer: 'Это не диагностика и не измерение зрения. Результат помогает понять, стоит ли пройти очную проверку.',
    questions: [
      {
        id: 'screen-time',
        text: 'Сколько времени в день вы обычно проводите за экраном?',
        type: 'single',
        options: [
          { value: 'low', label: 'До 3 часов', score: 0 },
          { value: 'medium', label: '3-6 часов', score: 1 },
          { value: 'high', label: '6-9 часов', score: 2 },
          { value: 'very-high', label: 'Больше 9 часов', score: 3 },
        ],
      },
      { id: 'dryness', text: 'Чувствуете сухость глаз после экрана?', type: 'single', options: severity() },
      { id: 'burning', text: 'Бывает жжение или раздражение глаз?', type: 'single', options: severity() },
      { id: 'blur-after-screen', text: 'Зрение становится расплывчатым после работы за экраном?', type: 'single', options: severity() },
      { id: 'headache-close-work', text: 'Болит голова после чтения, ноутбука или работы вблизи?', type: 'single', options: severity() },
      { id: 'squinting', text: 'Приходится щуриться, чтобы лучше видеть текст или объекты?', type: 'single', options: yesNo(2) },
      {
        id: 'last-exam',
        text: 'Когда вы последний раз проходили очную проверку зрения?',
        type: 'single',
        options: [
          { value: 'recent', label: 'В течение года', score: 0 },
          { value: 'one-two', label: '1-2 года назад', score: 1 },
          { value: 'long', label: 'Больше 2 лет назад', score: 2 },
          { value: 'never', label: 'Не помню / никогда', score: 3 },
        ],
      },
      { id: 'one-eye-worse', text: 'Кажется, что один глаз видит заметно хуже другого?', type: 'single', options: yesNo(4, true) },
    ],
  },
  {
    id: 'child-risk',
    title: 'Детский чеклист',
    subtitle: 'Чеклист для родителей: признаки, при которых ребенку стоит пройти очную проверку.',
    audience: 'child',
    estimatedMinutes: 4,
    disclaimer: 'Детский чеклист не ставит диагноз. Он помогает решить, стоит ли обратиться к детскому специалисту.',
    questions: [
      { id: 'child-squints', text: 'Ребенок часто щурится, когда смотрит вдаль или на экран?', type: 'single', options: yesNo(2) },
      { id: 'close-screen', text: 'Садится слишком близко к телевизору или экрану?', type: 'single', options: yesNo(2) },
      { id: 'close-book', text: 'Держит книгу или телефон очень близко к лицу?', type: 'single', options: yesNo(2) },
      { id: 'child-headache', text: 'Жалуется на головные боли после чтения или учебы?', type: 'single', options: yesNo(2) },
      { id: 'rubs-eyes', text: 'Часто трет глаза или жалуется на усталость глаз?', type: 'single', options: yesNo(1) },
      { id: 'avoids-reading', text: 'Избегает чтения или быстро устает от текста?', type: 'single', options: yesNo(2) },
      { id: 'closes-one-eye', text: 'Закрывает один глаз при чтении, письме или просмотре экрана?', type: 'single', options: yesNo(4, true) },
      { id: 'eye-drift', text: 'Замечаете, что один глаз отклоняется или смотрит не туда же, куда второй?', type: 'single', options: yesNo(5, true) },
      { id: 'school-reading', text: 'Есть новые сложности с чтением, письмом или вниманием на уроках?', type: 'single', options: yesNo(2) },
      { id: 'family-myopia', text: 'У родителей или близких родственников есть близорукость?', type: 'single', options: yesNo(1) },
      { id: 'child-screen-time', text: 'Экранного времени стало много для возраста ребенка?', type: 'single', options: yesNo(1) },
      { id: 'low-outdoor', text: 'Ребенок мало гуляет на улице днем?', type: 'single', options: yesNo(1) },
      { id: 'white-reflex', text: 'На фото со вспышкой или при свете заметен белый зрачковый рефлекс?', helpText: 'Если да, лучше не откладывать очную консультацию.', type: 'single', options: yesNo(6, true) },
    ],
  },
  {
    id: 'one-eye-comparison',
    title: 'Сравнение глаз',
    subtitle: 'Простой способ сравнить ощущения правого и левого глаза без измерений.',
    audience: 'all',
    estimatedMinutes: 2,
    disclaimer: 'Сравнение глаз не измеряет остроту зрения и не заменяет очную проверку.',
    questions: [
      { id: 'read-instruction', text: 'Вы готовы по очереди закрыть каждый глаз и посмотреть на один и тот же текст или объект?', type: 'single', options: [{ value: 'ready', label: 'Готово', score: 0 }] },
      { id: 'blurrier-eye', text: 'Один глаз видит заметно более размыто?', type: 'single', options: yesNo(4, true) },
      { id: 'darker-eye', text: 'Картинка одним глазом кажется заметно темнее?', type: 'single', options: yesNo(4, true) },
      { id: 'distorted-eye', text: 'Линии или формы одним глазом кажутся искаженными?', type: 'single', options: yesNo(5, true) },
      { id: 'sudden-change', text: 'Это различие появилось внезапно?', type: 'single', options: yesNo(6, true) },
    ],
  },
  {
    id: 'amsler-grid',
    title: 'Сетка Амслера',
    subtitle: 'Гайд для самонаблюдения центральной зоны зрения без постановки диагноза.',
    audience: 'all',
    estimatedMinutes: 3,
    disclaimer: 'Сетка Амслера в ViLu не является медицинским тестом. При искажениях лучше пройти очную консультацию.',
    questions: [
      { id: 'amsler-ready', text: 'Вы готовы смотреть в центральную точку сетки, закрывая по одному глазу?', type: 'single', options: [{ value: 'ready', label: 'Готово', score: 0 }] },
      { id: 'wavy-lines', text: 'Линии выглядят волнистыми или изогнутыми?', type: 'single', options: yesNo(5, true) },
      { id: 'missing-areas', text: 'Есть пропавшие участки, темное пятно или пустые зоны?', type: 'single', options: yesNo(5, true) },
      { id: 'different-eyes', text: 'Результат заметно отличается между правым и левым глазом?', type: 'single', options: yesNo(4, true) },
      { id: 'sudden-amsler', text: 'Искажения или пятно появились внезапно?', type: 'single', options: yesNo(6, true) },
    ],
  },
];

export function getEyeCheckFlow(id: string) {
  return eyeCheckFlows.find((flow) => flow.id === id) ?? eyeCheckFlows[0];
}
