import { describe, expect, it, vi } from 'vitest';
import { criticalAlerts, validateSourceId, withRetry } from './operations.ts';

describe('Offer Finder production operations', () => {
  it('retries with bounded exponential backoff', async () => {
    const operation = vi.fn()
      .mockRejectedValueOnce(new Error('temporary'))
      .mockRejectedValueOnce(new Error('temporary'))
      .mockResolvedValue('ok');
    const sleep = vi.fn().mockResolvedValue(undefined);
    await expect(withRetry(operation, {
      attempts: 3, baseDelayMs: 100, maxDelayMs: 150, jitterRatio: 0,
    }, sleep)).resolves.toBe('ok');
    expect(sleep).toHaveBeenNthCalledWith(1, 100);
    expect(sleep).toHaveBeenNthCalledWith(2, 150);
  });

  it('stops after the configured retry budget is exhausted', async () => {
    const operation = vi.fn().mockRejectedValue(new Error('still unavailable'));
    const sleep = vi.fn().mockResolvedValue(undefined);

    await expect(withRetry(operation, {
      attempts: 3, baseDelayMs: 100, maxDelayMs: 1_000, jitterRatio: 0,
    }, sleep)).rejects.toThrow('still unavailable');

    expect(operation).toHaveBeenCalledTimes(3);
    expect(sleep).toHaveBeenCalledTimes(2);
  });

  it('rejects non-UUID source ids before any production call', () => {
    expect(() => validateSourceId('fixture-canary')).toThrow(/UUID/);
    expect(validateSourceId('00000000-0000-4000-8000-000000000057'))
      .toBe('00000000-0000-4000-8000-000000000057');
  });

  it('classifies blocking and warning health alerts', () => {
    expect(criticalAlerts([{
      source_id: 'source', source_name: 'Canary',
      alert_codes: [
        'QUARANTINE_ABOVE_5',
        'NO_SUCCESS_30H',
        'CONSECUTIVE_FAILURES',
        'STALE_HEARTBEAT',
        'MISSING_TERMINAL_HEARTBEAT',
      ],
      fresh_offer_count: 0, open_incident_count: 1,
    }])).toEqual([
      'source:NO_SUCCESS_30H',
      'source:CONSECUTIVE_FAILURES',
      'source:STALE_HEARTBEAT',
      'source:MISSING_TERMINAL_HEARTBEAT',
    ]);
  });
});
