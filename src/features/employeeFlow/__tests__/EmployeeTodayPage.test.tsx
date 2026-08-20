import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LanguageProvider } from '../../../contexts/LanguageContext';
import { EmployeeFlowStateProvider } from '../EmployeeFlowState';
import { EmployeeTodayPage } from '../EmployeeTodayPage';

const screening = {
  id: 'screening-1', organization_id: 'org-1', owner_user_id: 'user-1', status: 'in_progress' as const,
  version: 1, protocol_version: 'adult-comfort-v1', scoring_version: 'attention-v1', started_at: '2026-08-20T00:00:00Z', completed_at: null,
};
const api = vi.hoisted(() => ({
  getLatestScreening: vi.fn(), getScreeningProgress: vi.fn(), saveScreeningProgress: vi.fn(),
  startScreening: vi.fn(), completeScreening: vi.fn(),
}));
vi.mock('../api', () => ({ ...api }));

describe('EmployeeTodayPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem('vilu_language', 'ru');
    api.getLatestScreening.mockResolvedValue(null);
    api.getScreeningProgress.mockResolvedValue(null);
    api.saveScreeningProgress.mockImplementation(async (_organizationId, current) => ({ ...current, version: current.version + 1 }));
    api.startScreening.mockResolvedValue(screening);
    api.completeScreening.mockResolvedValue({ screening: { ...screening, status: 'completed', version: 2 }, result: {} });
  });

  it('runs the guided RU screening and navigates to its result', async () => {
    const user = userEvent.setup();
    render(
      <LanguageProvider><EmployeeFlowStateProvider><MemoryRouter initialEntries={['/ru/organizations/org-1/employee/today']}>
        <Routes>
          <Route path="/:locale/organizations/:organizationId/employee/today" element={<EmployeeTodayPage />} />
          <Route path="/:locale/organizations/:organizationId/employee/screenings/:screeningId/result" element={<p>RESULT_ROUTE</p>} />
        </Routes>
      </MemoryRouter></EmployeeFlowStateProvider></LanguageProvider>,
    );

    await user.click(await screen.findByRole('button', { name: 'Начать проверку' }));
    const choices = ['Никогда', 'Никогда', 'Нет', 'Нет'];
    for (let index = 0; index < choices.length; index += 1) {
      await user.click(await screen.findByRole('button', { name: choices[index] }));
      await user.click(screen.getByRole('button', { name: index === 3 ? 'Узнать результат' : 'Продолжить' }));
    }
    expect(await screen.findByText('RESULT_ROUTE')).toBeInTheDocument();
    expect(api.completeScreening).toHaveBeenCalledOnce();
    expect(api.completeScreening.mock.calls[0][0]).toBe('org-1');
    expect(api.completeScreening.mock.calls[0][2]).toHaveLength(4);
  });

  it('restores answers and the current step after a reload', async () => {
    const user = userEvent.setup();
    api.getLatestScreening.mockResolvedValue({ ...screening, version: 3 });
    api.getScreeningProgress.mockResolvedValue({
      screening_id: screening.id,
      current_step: 2,
      answers: [
        { questionId: 'comfort', score: 1 },
        { questionId: 'distance', score: 2 },
      ],
      updated_at: '2026-08-20T00:01:00Z',
    });

    render(
      <LanguageProvider><EmployeeFlowStateProvider><MemoryRouter initialEntries={['/ru/organizations/org-1/employee/today']}>
        <Routes><Route path="/:locale/organizations/:organizationId/employee/today" element={<EmployeeTodayPage />} /></Routes>
      </MemoryRouter></EmployeeFlowStateProvider></LanguageProvider>,
    );

    expect(await screen.findByText((_, element) => element?.textContent === 'Вопрос 3 из 4')).toBeInTheDocument();
    expect(api.getScreeningProgress).toHaveBeenCalledWith('org-1', screening.id);
    await user.click(screen.getByRole('button', { name: 'Нет' }));
    await user.click(screen.getByRole('button', { name: 'Продолжить' }));
    expect(api.saveScreeningProgress.mock.calls[0][3]).toEqual([
      { questionId: 'comfort', score: 1 },
      { questionId: 'distance', score: 2 },
      { questionId: 'one-eye', score: 0, urgent: false },
    ]);
  });
});
