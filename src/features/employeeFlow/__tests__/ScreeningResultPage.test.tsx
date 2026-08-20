import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LanguageProvider } from '../../../contexts/LanguageContext';
import { ScreeningResultPage } from '../ScreeningResultPage';

const api = vi.hoisted(() => ({
  getScreeningResult: vi.fn(),
  createReferral: vi.fn(),
}));

vi.mock('../api', () => ({ ...api }));

const screening = {
  id: 'screening-1', organization_id: 'org-1', owner_user_id: 'user-1', status: 'completed' as const,
  version: 2, protocol_version: 'adult-comfort-v1', scoring_version: 'attention-v1',
  started_at: '2026-08-20T00:00:00Z', completed_at: '2026-08-20T00:05:00Z',
};

function result(outcome: 'routine' | 'review_recommended' | 'urgent', reviewWithinDays: 0 | 30 | 365) {
  return {
    screening,
    result: {
      screening_id: screening.id, outcome, total_score: outcome === 'routine' ? 0 : 4,
      review_within_days: reviewWithinDays, protocol_version: 'adult-comfort-v1',
      scoring_version: 'attention-v1', created_at: '2026-08-20T00:05:00Z',
    },
  };
}

function renderPage(locale: 'ru' | 'en' = 'ru') {
  localStorage.setItem('vilu_language', locale);
  return render(
    <LanguageProvider><MemoryRouter initialEntries={[`/${locale}/organizations/org-1/employee/screenings/screening-1/result`]}>
      <Routes>
        <Route path="/:locale/organizations/:organizationId/employee/screenings/:screeningId/result" element={<ScreeningResultPage />} />
        <Route path="/:locale/organizations/:organizationId/employee/referrals/:referralId" element={<p>REFERRAL_ROUTE</p>} />
        <Route path="/:locale/organizations/:organizationId/employee/today" element={<p>TODAY_ROUTE</p>} />
      </Routes>
    </MemoryRouter></LanguageProvider>,
  );
}

describe('ScreeningResultPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.createReferral.mockResolvedValue({ id: 'referral-1' });
  });

  it('renders the routine EN result and returns to today without creating a referral', async () => {
    api.getScreeningResult.mockResolvedValue(result('routine', 365));
    const user = userEvent.setup();
    renderPage('en');

    expect(await screen.findByRole('heading', { name: 'Continue routine eye care' })).toBeInTheDocument();
    await user.click(screen.getByRole('link', { name: 'Return to today' }));
    expect(await screen.findByText('TODAY_ROUTE')).toBeInTheDocument();
    expect(api.createReferral).not.toHaveBeenCalled();
  });

  it.each([
    ['review_recommended', 30, 'Рекомендуется очное обследование'],
    ['urgent', 0, 'Обратитесь за срочной офтальмологической помощью'],
  ] as const)('renders %s and creates an organization-bound referral', async (outcome, days, title) => {
    api.getScreeningResult.mockResolvedValue(result(outcome, days));
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByRole('heading', { name: title })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Создать направление' }));
    expect(api.createReferral).toHaveBeenCalledWith('org-1', 'screening-1');
    expect(await screen.findByText('REFERRAL_ROUTE')).toBeInTheDocument();
  });

  it('shows a localized recoverable error when the result cannot be loaded', async () => {
    api.getScreeningResult.mockRejectedValue(new Error('offline'));
    renderPage();
    expect(await screen.findByRole('alert')).toHaveTextContent('Повторить');
  });
});
