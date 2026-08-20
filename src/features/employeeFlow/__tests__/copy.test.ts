import { describe, expect, it } from 'vitest';
import { employeeFlowCopy } from '../copy';

describe('employee flow i18n', () => {
  it('keeps RU and EN question/option structure in strict parity', () => {
    expect(employeeFlowCopy.ru.questions.map(({ id }) => id)).toEqual(employeeFlowCopy.en.questions.map(({ id }) => id));
    expect(employeeFlowCopy.ru.questions.map(({ options }) => options.length)).toEqual(employeeFlowCopy.en.questions.map(({ options }) => options.length));
  });

  it('does not expose untranslated navigation labels in Russian', () => {
    expect(Object.values(employeeFlowCopy.ru.nav)).toEqual(['Сегодня', 'Результат', 'Направление']);
  });
});
