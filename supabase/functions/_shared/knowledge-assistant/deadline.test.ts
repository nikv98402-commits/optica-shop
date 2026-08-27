import { describe, expect, it, vi } from 'vitest';
import { PipelineDeadline, PipelineDeadlineError, type StageTiming } from './deadline';

describe('knowledge assistant pipeline deadline', () => {
  it('aborts a stuck stage and records content-free structural timing', async () => {
    vi.useFakeTimers();
    const timings: StageTiming[] = [];
    const deadline = new PipelineDeadline(40, (timing) => timings.push(timing));
    let stageSignal: AbortSignal | undefined;
    const result = deadline.run('retrieval', 5_000, ({ signal }) => {
      stageSignal = signal;
      return new Promise<never>(() => undefined);
    });

    const rejection = expect(result).rejects.toMatchObject({ stage: 'retrieval' });
    await vi.advanceTimersByTimeAsync(40);
    await rejection;

    expect(stageSignal?.aborted).toBe(true);
    expect(timings).toEqual([{
      stage: 'retrieval', status: 'timed_out', durationMs: 40, remainingMs: 0,
    }]);
    expect(JSON.stringify(timings)).not.toMatch(/query|answer|content|token|secret/i);
    vi.useRealTimers();
  });

  it('fails immediately when the shared request budget is exhausted', async () => {
    const deadline = new PipelineDeadline(0);
    const operation = vi.fn();
    await expect(deadline.run('chat', 15_000, operation)).rejects.toBeInstanceOf(PipelineDeadlineError);
    expect(operation).not.toHaveBeenCalled();
  });
});
