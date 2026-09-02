import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LanguageProvider } from '../../../contexts/LanguageContext';
import { ReferralPage } from '../ReferralPage';

const api = vi.hoisted(() => ({ getReferral: vi.fn(), getReferralProviderOptions: vi.fn(), consentAndAssignReferral: vi.fn() }));
vi.mock('../api', () => ({ ...api }));

function renderPage(locale: 'ru' | 'en' = 'ru') {
  localStorage.setItem('vilu_language', locale);
  return render(
    <LanguageProvider><MemoryRouter initialEntries={[`/${locale}/organizations/org-1/employee/referrals/referral-1`]}>
      <Routes><Route path="/:locale/organizations/:organizationId/employee/referrals/:referralId" element={<ReferralPage />} /></Routes>
    </MemoryRouter></LanguageProvider>,
  );
}

describe('ReferralPage', () => {
  beforeEach(() => { vi.clearAllMocks(); api.getReferralProviderOptions.mockResolvedValue([{ id: 'provider-1', name: 'Vision Clinic' }]); });

  it('renders the RU referral and keeps the return link inside the active organization', async () => {
    api.getReferral.mockResolvedValue({
      id: 'referral-1', care_pathway_id: 'pathway-1', status: 'created', version: 1, provider_organization_id: null, provider_status: 'unassigned', priority: 'review_recommended',
      respond_by: '2026-09-19T00:00:00Z', appointment_at: null, created_at: '2026-08-20T00:00:00Z',
    });
    renderPage();

    expect(await screen.findByRole('heading', { name: 'Следующий шаг готов' })).toBeInTheDocument();
    expect(screen.getByText('Направление сохранено в вашем приватном маршруте помощи. Выберите клинического партнёра и явно подтвердите согласие перед передачей данных.')).toBeInTheDocument();
    expect(screen.queryByText(/следующем релизе/)).not.toBeInTheDocument();
    expect(api.getReferral).toHaveBeenCalledWith('org-1', 'referral-1');
    expect(screen.getByRole('link', { name: 'Вернуться на сегодня' })).toHaveAttribute(
      'href', '/ru/organizations/org-1/employee/today',
    );
    expect(screen.getByText('Если симптомы внезапно усилились, не ждите цифрового маршрута — обратитесь за срочной помощью по месту нахождения.')).toBeInTheDocument();
  });

  it('grants consent and assigns the selected provider inside the active organization', async () => {
    const referral = { id: 'referral-1', care_pathway_id: 'pathway-1', status: 'created', version: 1, provider_organization_id: null, provider_status: 'unassigned' as const, priority: 'review_recommended' as const, respond_by: '2026-09-19T00:00:00Z', appointment_at: null, created_at: '2026-08-20T00:00:00Z' };
    api.getReferral.mockResolvedValue(referral);
    api.consentAndAssignReferral.mockResolvedValue({ ...referral, version: 2, status: 'assigned', provider_organization_id: 'provider-1', provider_status: 'queued' });
    renderPage('en');
    await userEvent.click(await screen.findByRole('button', { name: 'Consent and send referral' }));
    expect(api.consentAndAssignReferral).toHaveBeenCalledWith('org-1', referral, 'provider-1', expect.any(String));
    expect(await screen.findByRole('status')).toHaveTextContent('Referral sent securely.');
  });

  it('shows the booked appointment status and date instead of the obsolete response deadline', async () => {
    api.getReferral.mockResolvedValue({
      id: 'referral-1', care_pathway_id: 'pathway-1', status: 'assigned', version: 3,
      provider_organization_id: 'provider-1', provider_status: 'appointment_booked', priority: 'urgent',
      respond_by: '2026-09-02T11:44:19Z', appointment_at: '2026-09-17T12:15:00Z', created_at: '2026-09-02T11:40:00Z',
    });
    renderPage();

    expect(await screen.findByText('Запись создана')).toBeInTheDocument();
    expect(screen.getByText('Запись на')).toBeInTheDocument();
    const expectedAppointment = new Intl.DateTimeFormat('ru-RU', { dateStyle: 'long', timeStyle: 'short' }).format(new Date('2026-09-17T12:15:00Z'));
    expect(screen.getByText(expectedAppointment)).toBeInTheDocument();
    expect(screen.queryByText(/2.*сент.*2026/i)).not.toBeInTheDocument();
  });

  it('shows a localized error when the referral cannot be loaded', async () => {
    api.getReferral.mockRejectedValue(new Error('forbidden'));
    renderPage('en');
    expect(await screen.findByRole('alert')).toHaveTextContent('Try again');
  });
});
