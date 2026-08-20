import { beforeEach, describe, expect, it, vi } from 'vitest';
import { completeScreening, createReferral, getReferral, getScreeningResult, saveScreeningProgress, startScreening } from '../api';

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  single: vi.fn(),
}));

vi.mock('../../../lib/supabase', () => ({
  supabase: { rpc: mocks.rpc },
}));

describe('employee flow RPC contracts', () => {
  beforeEach(() => {
    mocks.rpc.mockReset();
    mocks.single.mockReset();
    mocks.rpc.mockReturnValue({ single: mocks.single });
  });

  it('unwraps the single screening row returned by start_employee_screening', async () => {
    const screening = { id: 'screening-1', status: 'in_progress' };
    mocks.single.mockResolvedValue({ data: screening, error: null });

    await expect(startScreening('org-1')).resolves.toBe(screening);
    expect(mocks.single).toHaveBeenCalledOnce();
  });

  it('unwraps the single referral row returned by create_employee_referral', async () => {
    const referral = { id: 'referral-1', status: 'created' };
    mocks.single.mockResolvedValue({ data: referral, error: null });

    await expect(createReferral('org-1', 'screening-1')).resolves.toBe(referral);
    expect(mocks.rpc).toHaveBeenCalledWith('create_employee_referral', expect.objectContaining({
      target_organization_id: 'org-1', target_screening_id: 'screening-1',
    }));
    expect(mocks.single).toHaveBeenCalledOnce();
  });

  it('binds completion and result reads to the active organization', async () => {
    const row = { screening: { id: 'screening-1' }, result: { screening_id: 'screening-1' } };
    mocks.rpc.mockResolvedValueOnce({ data: [row], error: null }).mockResolvedValueOnce({ data: [row], error: null });

    await expect(completeScreening('org-1', { id: 'screening-1', version: 2 } as never, [])).resolves.toBe(row);
    await expect(getScreeningResult('org-1', 'screening-1')).resolves.toBe(row);
    expect(mocks.rpc).toHaveBeenNthCalledWith(1, 'complete_employee_screening', expect.objectContaining({ target_organization_id: 'org-1' }));
    expect(mocks.rpc).toHaveBeenNthCalledWith(2, 'get_employee_screening_result', expect.objectContaining({ target_organization_id: 'org-1' }));
  });

  it('binds referral reads to the active organization', async () => {
    const referral = { id: 'referral-1' };
    mocks.single.mockResolvedValue({ data: referral, error: null });
    await expect(getReferral('org-1', 'referral-1')).resolves.toBe(referral);
    expect(mocks.rpc).toHaveBeenCalledWith('get_employee_referral', {
      target_organization_id: 'org-1', target_referral_id: 'referral-1',
    });
  });

  it('binds draft progress to the active organization and screening version', async () => {
    const updated = { id: 'screening-1', status: 'in_progress', version: 2 };
    mocks.single.mockResolvedValue({ data: updated, error: null });

    await expect(saveScreeningProgress('org-1', {
      id: 'screening-1', organization_id: 'org-1', owner_user_id: 'user-1', status: 'in_progress',
      version: 1, protocol_version: 'v1', scoring_version: 'v1', started_at: '', completed_at: null,
    }, 1, [{ questionId: 'comfort', score: 1 }])).resolves.toBe(updated);

    expect(mocks.rpc).toHaveBeenCalledWith('save_employee_screening_progress', expect.objectContaining({
      target_organization_id: 'org-1', target_screening_id: 'screening-1', expected_version: 1, target_current_step: 1,
    }));
  });
});
