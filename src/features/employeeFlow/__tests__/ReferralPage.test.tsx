import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LanguageProvider } from '../../../contexts/LanguageContext';
import { ReferralPage } from '../ReferralPage';

const api = vi.hoisted(() => ({ getReferral: vi.fn() }));
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
  beforeEach(() => vi.clearAllMocks());

  it('renders the RU referral and keeps the return link inside the active organization', async () => {
    api.getReferral.mockResolvedValue({
      id: 'referral-1', care_pathway_id: 'pathway-1', status: 'created', priority: 'review_recommended',
      respond_by: '2026-09-19T00:00:00Z', created_at: '2026-08-20T00:00:00Z',
    });
    renderPage();

    expect(await screen.findByRole('heading', { name: 'Следующий шаг готов' })).toBeInTheDocument();
    expect(api.getReferral).toHaveBeenCalledWith('org-1', 'referral-1');
    expect(screen.getByRole('link', { name: 'Вернуться на сегодня' })).toHaveAttribute(
      'href', '/ru/organizations/org-1/employee/today',
    );
    expect(screen.getByText('Если симптомы внезапно усилились, не ждите цифрового маршрута — обратитесь за срочной помощью по месту нахождения.')).toBeInTheDocument();
  });

  it('shows a localized error when the referral cannot be loaded', async () => {
    api.getReferral.mockRejectedValue(new Error('forbidden'));
    renderPage('en');
    expect(await screen.findByRole('alert')).toHaveTextContent('Try again');
  });
});
