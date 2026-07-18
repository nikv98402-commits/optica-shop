import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LanguageProvider } from '../../contexts/LanguageContext';
import type { ServiceCheckoutDraft } from '../../types/backend';
import { Checkout } from '../Checkout';

const submitVisitLead = vi.fn();
const createPaymentIntent = vi.fn();
const hasLeadForm = vi.fn();
const buildLeadFormUrl = vi.fn();

vi.mock('../../services/leadService', () => ({
  submitVisitLead: (...args: unknown[]) => submitVisitLead(...args),
}));

vi.mock('../../services/paymentService', () => ({
  createPaymentIntent: (...args: unknown[]) => createPaymentIntent(...args),
  getPaymentIdempotencyKey: () => 'stable-payment-key',
}));

vi.mock('../../config/leads', () => ({
  hasLeadForm: () => hasLeadForm(),
  buildLeadFormUrl: (...args: unknown[]) => buildLeadFormUrl(...args),
}));

vi.mock('../../lib/analyticsEvents', () => ({
  AnalyticsEvent: new Proxy({}, { get: (_, key) => String(key) }),
  trackEvent: vi.fn(),
}));

const draft: ServiceCheckoutDraft = {
  version: 1,
  sourcePage: '/products',
  selectedFrames: [{ frameId: 'aurora', frameName: 'Aurora Crystal' }],
  storePreference: { mode: 'later' },
  createdAt: new Date().toISOString(),
};

function renderCheckout() {
  return render(
    <LanguageProvider>
      <Checkout draft={draft} onDraftChange={vi.fn()} onBack={vi.fn()} />
    </LanguageProvider>,
  );
}

async function fillRequiredFields() {
  const user = userEvent.setup();
  await user.type(screen.getByPlaceholderText('+7 900 000-00-00 или @username'), '@anna');
  await user.click(screen.getByRole('checkbox'));
  return user;
}

describe('Checkout', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    submitVisitLead.mockReset();
    createPaymentIntent.mockReset();
    hasLeadForm.mockReset();
    buildLeadFormUrl.mockReset();
    hasLeadForm.mockReturnValue(false);
  });

  it('links validation errors and does not submit invalid data', async () => {
    const user = userEvent.setup();
    renderCheckout();

    await user.click(screen.getByRole('button', { name: /перейти к тестовой оплате/i }));

    expect(await screen.findByText(/укажите телефон, email/i)).toBeVisible();
    expect(screen.getByText('Подтвердите согласие, чтобы продолжить.')).toBeVisible();
    expect(screen.getByPlaceholderText('+7 900 000-00-00 или @username')).toHaveAttribute('aria-invalid', 'true');
    expect(submitVisitLead).not.toHaveBeenCalled();
    expect(createPaymentIntent).not.toHaveBeenCalled();
  });

  it('retries payment with the same lead and idempotency key without creating another lead', async () => {
    submitVisitLead.mockResolvedValue({
      ok: true,
      data: {
        leadId: 'lead-1',
        paymentCapabilityToken: 'lead-capability-1',
        status: 'new',
        nextStep: 'payment_optional',
      },
    });
    createPaymentIntent
      .mockResolvedValueOnce({ ok: false, reason: 'request_failed' })
      .mockResolvedValueOnce({ ok: false, reason: 'request_failed' });
    renderCheckout();
    const user = await fillRequiredFields();

    await user.click(screen.getByRole('button', { name: /перейти к тестовой оплате/i }));
    expect(await screen.findByText(/заявка сохранена, но тестовую оплату/i)).toBeVisible();
    await user.click(screen.getByRole('button', { name: /повторить открытие оплаты/i }));

    await waitFor(() => expect(createPaymentIntent).toHaveBeenCalledTimes(2));
    expect(submitVisitLead).toHaveBeenCalledTimes(1);
    expect(createPaymentIntent.mock.calls[0][0]).toMatchObject({
      leadId: 'lead-1',
      leadCapabilityToken: 'lead-capability-1',
      idempotencyKey: 'stable-payment-key',
    });
    expect(createPaymentIntent.mock.calls[1][0]).toMatchObject({
      leadId: 'lead-1',
      leadCapabilityToken: 'lead-capability-1',
      idempotencyKey: 'stable-payment-key',
    });
  });

  it('never starts payment when lead submission fails', async () => {
    submitVisitLead.mockResolvedValue({ ok: false, reason: 'request_failed' });
    renderCheckout();
    const user = await fillRequiredFields();

    await user.click(screen.getByRole('button', { name: /перейти к тестовой оплате/i }));

    expect(await screen.findByText(/не удалось сохранить заявку/i)).toBeVisible();
    expect(createPaymentIntent).not.toHaveBeenCalled();
  });

  it('opens the configured Tally fallback when lead submission is unavailable', async () => {
    const open = vi.spyOn(window, 'open').mockImplementation(() => null);
    hasLeadForm.mockReturnValue(true);
    buildLeadFormUrl.mockReturnValue('https://tally.so/r/test?selected_count=1');
    submitVisitLead.mockResolvedValue({ ok: false, reason: 'request_failed' });
    renderCheckout();
    const user = await fillRequiredFields();

    await user.click(screen.getByRole('button', { name: /перейти к тестовой оплате/i }));

    expect(await screen.findByText(/открываем резервную форму/i)).toBeVisible();
    expect(open).toHaveBeenCalledWith(
      'https://tally.so/r/test?selected_count=1',
      '_blank',
      'noopener,noreferrer',
    );
    expect(createPaymentIntent).not.toHaveBeenCalled();
    open.mockRestore();
  });

  it('localizes a stored Russian use case in the English checkout', () => {
    window.localStorage.setItem('vilu_language', 'en');
    const englishDraft: ServiceCheckoutDraft = {
      ...draft,
      selectedFrames: [{
        frameId: 'aurora',
        frameName: 'Aurora Crystal',
        frameSize: '49-19-140',
        fitScore: 87,
        useCase: 'Для офиса',
      }],
    };

    render(
      <LanguageProvider>
        <Checkout draft={englishDraft} onDraftChange={vi.fn()} onBack={vi.fn()} />
      </LanguageProvider>,
    );

    expect(screen.getByText('49-19-140 · For office · Face-fit 87/100')).toBeVisible();
    expect(screen.queryByText(/Для офиса/)).not.toBeInTheDocument();
  });
});
