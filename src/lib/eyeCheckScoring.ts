import type { EyeCheckAnswer, EyeCheckFlow, EyeCheckResult, EyeCheckRiskLevel } from '../types/eyeCheck';

const urgentIds = new Set([
  'white-reflex',
  'sudden-change',
  'sudden-amsler',
]);

const doNotDelayIds = new Set([
  'one-eye-worse',
  'closes-one-eye',
  'eye-drift',
  'blurrier-eye',
  'darker-eye',
  'distorted-eye',
  'wavy-lines',
  'missing-areas',
  'different-eyes',
]);

function thresholdRisk(flow: EyeCheckFlow, score: number): EyeCheckRiskLevel {
  if (flow.id === 'child-risk') {
    if (score >= 8) return 'do-not-delay';
    if (score >= 4) return 'check-soon';
    return 'info';
  }

  if (flow.id === 'adult-comfort') {
    if (score >= 13) return 'do-not-delay';
    if (score >= 6) return 'check-soon';
    return 'info';
  }

  if (score >= 10) return 'do-not-delay';
  if (score >= 5) return 'check-soon';
  return 'info';
}

function resultCopy(riskLevel: EyeCheckRiskLevel, flow: EyeCheckFlow) {
  if (riskLevel === 'urgent') {
    return {
      title: 'Лучше обратиться срочно',
      summary: 'Есть признаки, при которых не стоит полагаться на приложение. Обратитесь за медицинской помощью срочно.',
      actions: [
        'Не откладывайте очную консультацию.',
        'Если есть боль, травма, вспышки, занавес, двоение или внезапное ухудшение зрения, обращайтесь за помощью срочно.',
      ],
    };
  }

  if (riskLevel === 'do-not-delay') {
    return {
      title: 'Не откладывайте проверку',
      summary: 'Есть признаки, при которых лучше не откладывать визит к специалисту.',
      actions: [
        'Запланируйте очную проверку зрения.',
        'Запишите, что именно повторяется или отличается между глазами.',
        flow.id === 'child-risk' ? 'Для ребенка выберите детского специалиста.' : 'Перед визитом можно подготовить 2-3 оправы для примерки.',
      ],
    };
  }

  if (riskLevel === 'check-soon') {
    return {
      title: 'Стоит пройти проверку',
      summary: 'Есть признаки зрительной нагрузки или возможной необходимости коррекции. Рекомендуем пройти очную проверку зрения.',
      actions: [
        'Выберите удобное время для очной проверки.',
        'Перед визитом можно пройти онлайн-примерку и сохранить подходящие оправы.',
      ],
    };
  }

  return {
    title: 'Плановый режим',
    summary: 'По ответам нет явных тревожных признаков. Если вы давно не проверяли зрение, плановая проверка все равно полезна.',
    actions: [
      'Используйте ViLu как подготовку к выбору оправ.',
      'Если признаки повторяются или усиливаются, пройдите очную проверку.',
    ],
  };
}

function answerReason(answer: EyeCheckAnswer) {
  if (answer.redFlag) return 'Отмечен признак, который лучше проверить очно.';
  if (answer.score >= 3) return 'Есть выраженный повторяющийся признак.';
  if (answer.score >= 2) return 'Есть признак, который может быть связан со зрительной нагрузкой.';
  if (answer.score >= 1) return 'Есть слабый или периодический признак.';
  return '';
}

export function calculateEyeCheckResult(flow: EyeCheckFlow, answers: EyeCheckAnswer[]): EyeCheckResult {
  const totalScore = answers.reduce((sum, answer) => sum + answer.score, 0);
  const redFlagAnswers = answers.filter((answer) => answer.redFlag);
  const urgent = redFlagAnswers.some((answer) => urgentIds.has(answer.questionId));
  const doNotDelay = redFlagAnswers.some((answer) => doNotDelayIds.has(answer.questionId));

  const riskLevel: EyeCheckRiskLevel = urgent
    ? 'urgent'
    : doNotDelay
      ? 'do-not-delay'
      : thresholdRisk(flow, totalScore);

  const copy = resultCopy(riskLevel, flow);
  const reasons = answers
    .map(answerReason)
    .filter(Boolean)
    .filter((reason, index, list) => list.indexOf(reason) === index)
    .slice(0, 4);

  return {
    flowId: flow.id,
    totalScore,
    riskLevel,
    title: copy.title,
    summary: copy.summary,
    reasons: reasons.length > 0 ? reasons : ['Ответы не показывают явных причин для срочного вывода.'],
    recommendedActions: copy.actions,
    ctaPrimary: riskLevel === 'urgent' ? 'none' : 'tryon',
  };
}
