export const YANDEX_METRIKA_ID = 109764495;

type MetrikaParams = Record<string, string | number | boolean | undefined>;

declare global {
  interface Window {
    ym?: (counterId: number, method: string, goalName?: string, params?: MetrikaParams) => void;
  }
}

export function reachGoal(goalName: string, params?: MetrikaParams) {
  if (typeof window === 'undefined' || typeof window.ym !== 'function') return;

  window.ym(YANDEX_METRIKA_ID, 'reachGoal', goalName, params);
}
