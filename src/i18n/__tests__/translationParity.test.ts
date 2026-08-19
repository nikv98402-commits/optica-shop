import { describe, expect, it } from 'vitest';
import { foundationTranslations } from '../foundation';
import { translations } from '../translations';

function keys(value: unknown, prefix = ''): string[] {
  if (Array.isArray(value)) return value.flatMap((entry, index) => keys(entry, `${prefix}[${index}]`));
  if (value && typeof value === 'object') {
    return Object.entries(value).flatMap(([key, child]) => keys(child, prefix ? `${prefix}.${key}` : key));
  }
  return [prefix];
}

describe('translation contracts', () => {
  it('keeps the legacy RU and EN dictionaries structurally equivalent', () => {
    expect(keys(translations.ru).sort()).toEqual(keys(translations.en).sort());
  });

  it('keeps the Slice 0 foundation dictionaries structurally equivalent', () => {
    expect(keys(foundationTranslations.ru).sort()).toEqual(keys(foundationTranslations.en).sort());
  });
});
