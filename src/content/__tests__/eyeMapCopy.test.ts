import { describe, expect, it } from 'vitest';
import { eyeMapCopy } from '../eyeMapCopy';

describe('eyeMapCopy', () => {
  it('keeps RU and EN copy structurally aligned', () => {
    expect(Object.keys(eyeMapCopy.ru).sort()).toEqual(
      Object.keys(eyeMapCopy.en).sort(),
    );
    expect(Object.keys(eyeMapCopy.ru.blocked).sort()).toEqual(
      Object.keys(eyeMapCopy.en.blocked).sort(),
    );
  });

  it('does not make medical or diagnostic promises', () => {
    const copy = JSON.stringify(eyeMapCopy).toLowerCase();
    expect(copy).not.toMatch(/ставит диагноз|diagnoses|measures vision/);
  });
});
