import { describe, expect, it } from 'vitest';
import { PhotoRequestGate } from '../photoRequestGate';

describe('PhotoRequestGate', () => {
  it('accepts only the latest photo request', () => {
    const gate = new PhotoRequestGate();
    const first = gate.begin();
    const second = gate.begin();

    expect(gate.isCurrent(first)).toBe(false);
    expect(gate.isCurrent(second)).toBe(true);
  });

  it('invalidates pending work when the try-on screen unmounts', () => {
    const gate = new PhotoRequestGate();
    const pending = gate.begin();

    gate.invalidate();

    expect(gate.isCurrent(pending)).toBe(false);
  });
});
