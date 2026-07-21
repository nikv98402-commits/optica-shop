import { beforeEach, describe, expect, it, vi } from 'vitest';

const { reachGoal } = vi.hoisted(() => ({ reachGoal: vi.fn() }));
vi.mock('../../metrika', () => ({ reachGoal }));

import { AnalyticsEvent, trackEvent } from '../../analyticsEvents';

describe('assistant analytics privacy', () => {
  beforeEach(() => reachGoal.mockClear());

  it('drops prompt, answer, URL and health free text', () => {
    trackEvent(AnalyticsEvent.AssistantAnswerRendered, {
      locale: 'ru', confidence: 'supported', citation_count: 2,
      query: 'private prompt', answer: 'private answer', url: 'https://private', symptom: 'pain',
    });
    expect(reachGoal).toHaveBeenCalledWith(AnalyticsEvent.AssistantAnswerRendered, {
      locale: 'ru', confidence: 'supported', citation_count: 2,
    });
  });
});
