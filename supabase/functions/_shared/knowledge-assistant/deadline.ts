export type PipelineStage =
  | 'rate_limit'
  | 'embedding'
  | 'retrieval'
  | 'chat'
  | 'citation_correction'
  | 'external_sources';

export type StageTiming = {
  stage: PipelineStage;
  status: 'completed' | 'failed' | 'timed_out' | 'skipped';
  durationMs: number;
  remainingMs: number;
};

export type OperationBudget = {
  signal: AbortSignal;
  remainingMs: () => number;
};

export class PipelineDeadlineError extends Error {
  constructor(public readonly stage: PipelineStage) {
    super('pipeline_deadline_exceeded');
  }
}

const MINIMUM_OPERATION_BUDGET_MS = 25;

export class PipelineDeadline {
  private readonly deadlineAt: number;

  constructor(
    totalMs: number,
    private readonly onTiming: (timing: StageTiming) => void = () => undefined,
    private readonly now: () => number = Date.now,
  ) {
    this.deadlineAt = this.now() + Math.max(0, totalMs);
  }

  remainingMs() {
    return Math.max(0, this.deadlineAt - this.now());
  }

  hasBudget(minimumMs: number) {
    return this.remainingMs() >= minimumMs;
  }

  skip(stage: PipelineStage) {
    this.onTiming({ stage, status: 'skipped', durationMs: 0, remainingMs: this.remainingMs() });
  }

  async run<T>(
    stage: PipelineStage,
    maximumMs: number,
    operation: (budget: OperationBudget) => Promise<T>,
  ): Promise<T> {
    const availableMs = Math.min(this.remainingMs(), maximumMs);
    if (availableMs < MINIMUM_OPERATION_BUDGET_MS) {
      this.onTiming({ stage, status: 'timed_out', durationMs: 0, remainingMs: this.remainingMs() });
      throw new PipelineDeadlineError(stage);
    }

    const startedAt = this.now();
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let timedOut = false;
    const work = Promise.resolve().then(() => operation({
      signal: controller.signal,
      remainingMs: () => this.remainingMs(),
    }));
    // Keep a late rejection from becoming unhandled after the deadline wins the race.
    void work.catch(() => undefined);
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        timedOut = true;
        controller.abort();
        reject(new PipelineDeadlineError(stage));
      }, availableMs);
    });

    let status: StageTiming['status'] = 'completed';
    try {
      return await Promise.race([work, timeout]);
    } catch (error) {
      if (timedOut && !(error instanceof PipelineDeadlineError)) {
        status = 'timed_out';
        throw new PipelineDeadlineError(stage);
      }
      status = error instanceof PipelineDeadlineError ? 'timed_out' : 'failed';
      throw error;
    } finally {
      if (timer !== undefined) clearTimeout(timer);
      this.onTiming({
        stage,
        status,
        durationMs: Math.max(0, this.now() - startedAt),
        remainingMs: this.remainingMs(),
      });
    }
  }
}
