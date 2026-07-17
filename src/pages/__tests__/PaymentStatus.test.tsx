import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LanguageProvider } from '../../contexts/LanguageContext';
import { PaymentStatus } from '../PaymentStatus';

const getPaymentStatus = vi.fn();

vi.mock('../../services/paymentService', () => ({
  getPaymentStatus: (...args: unknown[]) => getPaymentStatus(...args),
  simulateLocalPaymentStatus: vi.fn(),
}));

vi.mock('../../lib/analyticsEvents', () => ({
  AnalyticsEvent: new Proxy({}, { get: (_, key) => String(key) }),
  trackEvent: vi.fn(),
}));

function pendingReceipt() {
  return {
    ok: true,
    data: {
      paymentIntentId: 'payment-1',
      publicToken: 'public-token',
      offerCode: 'visit_preparation_v1',
      amountRub: 429,
      currency: 'RUB',
      status: 'provider_created',
      providerMode: 'test_not_connected',
      returnUrl: '/payment/return?token=public-token',
    },
  };
}

function renderStatus() {
  window.history.replaceState({}, '', '/payment/return?token=public-token');
  return render(
    <LanguageProvider>
      <PaymentStatus mode="return" onNavigate={vi.fn()} onOpenStores={vi.fn()} />
    </LanguageProvider>,
  );
}

describe('PaymentStatus', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    getPaymentStatus.mockReset();
  });

  it('polls at most five times and then exposes a manual status check', async () => {
    getPaymentStatus.mockResolvedValue(pendingReceipt());
    renderStatus();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(20_100);
    });

    expect(getPaymentStatus).toHaveBeenCalledTimes(5);
    expect(screen.getByText(/автоматическая проверка завершена/i)).toBeVisible();
    expect(screen.getByRole('button', { name: /проверить еще раз/i })).toBeVisible();
  });

  it('stops polling when a paid terminal status arrives', async () => {
    getPaymentStatus
      .mockResolvedValueOnce(pendingReceipt())
      .mockResolvedValueOnce({
        ...pendingReceipt(),
        data: { ...pendingReceipt().data, status: 'paid' },
      });
    renderStatus();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });

    expect(getPaymentStatus).toHaveBeenCalledTimes(2);
    expect(screen.getByRole('heading', { name: /оплата завершена/i })).toBeVisible();
  });

  it('allows a manual retry after a status error', async () => {
    vi.useRealTimers();
    getPaymentStatus
      .mockResolvedValueOnce({ ok: false, reason: 'request_failed' })
      .mockResolvedValueOnce(pendingReceipt());
    renderStatus();

    const retry = await screen.findByRole('button', { name: /проверить еще раз/i });
    await userEvent.click(retry);

    await waitFor(() => expect(getPaymentStatus).toHaveBeenCalledTimes(2));
  });
});
