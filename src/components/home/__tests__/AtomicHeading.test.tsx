import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AtomicHeading } from '../AtomicHeading';

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('AtomicHeading', () => {
  it('assembles immediately when IntersectionObserver is unavailable', () => {
    vi.stubGlobal('IntersectionObserver', undefined);
    render(<AtomicHeading lines={['Clear route']} ariaLabel="Clear route" />);
    expect(screen.getByRole('heading', { name: 'Clear route' })).toHaveClass('is-assembled');
  });

  it('observes visibility, assembles, cycles, and disconnects on cleanup', () => {
    vi.useFakeTimers();
    let callback!: IntersectionObserverCallback;
    const observe = vi.fn();
    const disconnect = vi.fn();
    class FakeIntersectionObserver {
      constructor(nextCallback: IntersectionObserverCallback) {
        callback = nextCallback;
      }
      observe = observe;
      disconnect = disconnect;
    }
    vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver);

    const { unmount } = render(<AtomicHeading lines={['Atoms']} ariaLabel="Atoms" />);
    const heading = screen.getByRole('heading', { name: 'Atoms' });
    expect(observe).toHaveBeenCalledWith(heading);

    act(() => callback([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver));
    act(() => vi.advanceTimersByTime(120));
    expect(heading).toHaveClass('is-assembled');

    act(() => callback([{ isIntersecting: false } as IntersectionObserverEntry], {} as IntersectionObserver));
    expect(heading).toHaveClass('is-assembled');

    act(() => callback([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver));
    act(() => vi.advanceTimersByTime(5900));
    expect(heading).not.toHaveClass('is-assembled');
    act(() => vi.advanceTimersByTime(1350));
    expect(heading).toHaveClass('is-assembled');

    unmount();
    expect(disconnect).toHaveBeenCalledOnce();
  });
});
