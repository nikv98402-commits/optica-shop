import { describe, expect, it } from 'vitest';
import {
  EYE_MAP_HISTORY_LIMIT,
  EYE_MAP_STORAGE_KEY,
  parseEyeMapLocalResult,
  readEyeMapStore,
  saveEyeMapResult,
} from '../storage';
import { localResult } from './fixtures';

describe('Eye Map local storage', () => {
  it('rejects unexpected fields so photos and personal data cannot persist', () => {
    expect(
      parseEyeMapLocalResult({
        ...localResult(),
        photo: 'data:image/jpeg;base64,secret',
      }),
    ).toBeNull();
    expect(
      parseEyeMapLocalResult({
        ...localResult(),
        age: 42,
      }),
    ).toBeNull();
  });

  it('keeps a strict maximum of twelve technical results', () => {
    for (let index = 0; index < EYE_MAP_HISTORY_LIMIT + 3; index += 1) {
      saveEyeMapResult(localResult({ id: `result-${index}` }));
    }

    const store = readEyeMapStore();
    expect(store.results).toHaveLength(EYE_MAP_HISTORY_LIMIT);
    expect(store.results[0].id).toBe('result-14');
    expect(store.baselineId).toBe('result-0');
    expect(window.localStorage.getItem(EYE_MAP_STORAGE_KEY)).not.toContain(
      'data:image',
    );
  });

  it('fails closed when the stored envelope is malformed', () => {
    window.localStorage.setItem(
      EYE_MAP_STORAGE_KEY,
      JSON.stringify({ schemaVersion: 2, results: [localResult()] }),
    );
    expect(readEyeMapStore()).toEqual({ schemaVersion: 1, results: [] });
  });
});
