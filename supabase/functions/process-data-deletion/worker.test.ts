import { describe, expect, it, vi } from 'vitest';
import { dispatchPendingDeletions, processDeletion, type DeletionWorkerClient } from './worker';

function clientWith(rpc: ReturnType<typeof vi.fn>, remove: ReturnType<typeof vi.fn>) {
  return { rpc, storage: { from: vi.fn(() => ({ remove })) } } as unknown as DeletionWorkerClient;
}

describe('processDeletion', () => {
  it('deletes every clinic object before completing the database deletion', async () => {
    const events: string[] = [];
    const rpc = vi.fn(async (name: string) => {
      events.push(name);
      if (name === 'claim_employee_data_deletion') return { data: { requestId: 'request-a', workerToken: 'token-a', storagePaths: ['user/a.pdf', 'user/b.png'] }, error: null };
      return { data: { status: 'completed' }, error: null };
    });
    const remove = vi.fn(async () => { events.push('storage.remove'); return { error: null }; });
    await processDeletion(clientWith(rpc, remove), 'request-a', 'user-a', 'org-a');
    expect(remove).toHaveBeenCalledWith(['user/a.pdf', 'user/b.png']);
    expect(events).toEqual(['claim_employee_data_deletion', 'storage.remove', 'complete_employee_data_deletion']);
  });

  it('marks the request failed and never deletes database rows when Storage fails', async () => {
    const rpc = vi.fn(async (name: string) => {
      if (name === 'claim_employee_data_deletion') return { data: { requestId: 'request-a', workerToken: 'token-a', storagePaths: ['user/a.pdf'] }, error: null };
      if (name === 'fail_employee_data_deletion') return { data: { status: 'requested' }, error: null };
      return { data: null, error: null };
    });
    const client = clientWith(rpc, vi.fn(async () => ({ error: { message: 'unavailable' } })));
    await expect(processDeletion(client, 'request-a', 'user-a', 'org-a')).rejects.toThrow('storage:unavailable');
    expect(rpc).not.toHaveBeenCalledWith('complete_employee_data_deletion', expect.anything());
    expect(rpc).toHaveBeenCalledWith('fail_employee_data_deletion', expect.objectContaining({ target_worker_token: 'token-a' }));
  });

  it('reports a failed scheduled batch so the dispatcher can alert and retry', async () => {
    const rpc = vi.fn(async (name: string) => {
      if (name === 'list_pending_employee_data_deletions') return { data: [{ requestId: 'request-a', ownerUserId: 'user-a', organizationId: 'org-a' }], error: null };
      if (name === 'claim_employee_data_deletion') return { data: { requestId: 'request-a', workerToken: 'token-a', storagePaths: ['org/user/a.pdf'] }, error: null };
      if (name === 'fail_employee_data_deletion') return { data: { status: 'requested' }, error: null };
      return { data: null, error: null };
    });
    const result = await dispatchPendingDeletions(clientWith(rpc, vi.fn(async () => ({ error: { message: 'temporary' } }))));
    expect(result).toEqual({ discovered: 1, completed: 0, failed: 1 });
    expect(rpc).toHaveBeenCalledWith('fail_employee_data_deletion', expect.objectContaining({ target_failure_code: 'storage:temporary' }));
  });

  it('reports an exhausted crashed lease as a failed dispatcher batch', async () => {
    const rpc = vi.fn(async (name: string) => {
      if (name === 'list_pending_employee_data_deletions') return { data: [{ requestId: 'request-a', ownerUserId: 'user-a', organizationId: 'org-a' }], error: null };
      if (name === 'claim_employee_data_deletion') return { data: { requestId: 'request-a', terminal: true, failureCode: 'worker_lease_exhausted' }, error: null };
      return { data: null, error: null };
    });
    const result = await dispatchPendingDeletions(clientWith(rpc, vi.fn()));
    expect(result).toEqual({ discovered: 1, completed: 0, failed: 1 });
  });

  it('dispatches queued requests without any browser-supplied identity', async () => {
    const rpc = vi.fn(async (name: string) => {
      if (name === 'list_pending_employee_data_deletions') return { data: [{ requestId: 'request-a', ownerUserId: 'user-a', organizationId: 'org-a' }], error: null };
      if (name === 'claim_employee_data_deletion') return { data: { requestId: 'request-a', workerToken: 'token-a', storagePaths: [] }, error: null };
      return { data: { status: 'completed' }, error: null };
    });
    const result = await dispatchPendingDeletions(clientWith(rpc,vi.fn()),25);
    expect(result).toEqual({ discovered: 1, completed: 1, failed: 0 });
    expect(rpc).toHaveBeenCalledWith('claim_employee_data_deletion',{ target_request_id: 'request-a', target_owner_user_id: 'user-a', target_organization_id: 'org-a' });
  });

  it('surfaces claim errors without attempting storage or failure RPCs', async () => {
    const rpc = vi.fn(async () => ({ data: null, error: { message: 'denied', code: '42501' } }));
    const remove = vi.fn();
    await expect(processDeletion(clientWith(rpc, remove), 'request-a', 'user-a', 'org-a')).rejects.toThrow('42501');
    expect(remove).not.toHaveBeenCalled();
    expect(rpc).toHaveBeenCalledTimes(1);
  });

  it('rejects malformed claim payloads', async () => {
    for (const claim of [null, {}, { requestId: 'request-a', workerToken: 'token-a', storagePaths: [1] }]) {
      const rpc = vi.fn(async () => ({ data: claim, error: null }));
      await expect(processDeletion(clientWith(rpc, vi.fn()), 'request-a', 'user-a', 'org-a')).rejects.toThrow('invalid_claim');
    }
  });

  it('preserves both completion and failure-reporting errors', async () => {
    const rpc = vi.fn(async (name: string) => {
      if (name === 'claim_employee_data_deletion') return { data: { requestId: 'request-a', workerToken: 'token-a', storagePaths: [] }, error: null };
      if (name === 'complete_employee_data_deletion') return { data: null, error: { message: 'complete failed', code: 'C1' } };
      return { data: null, error: { message: 'fail failed', code: 'F1' } };
    });
    await expect(processDeletion(clientWith(rpc, vi.fn()), 'request-a', 'user-a', 'org-a')).rejects.toThrow('C1;fail:F1');
  });

  it('rejects list errors and malformed pending jobs', async () => {
    const listError = clientWith(vi.fn(async () => ({ data: null, error: { message: 'list failed', code: 'L1' } })), vi.fn());
    await expect(dispatchPendingDeletions(listError)).rejects.toThrow('L1');
    const malformed = clientWith(vi.fn(async () => ({ data: [{ requestId: 'a', ownerUserId: 'u' }], error: null })), vi.fn());
    await expect(dispatchPendingDeletions(malformed)).rejects.toThrow('invalid_pending_deletion');
  });

  it('counts mixed completed and failed jobs while continuing the batch', async () => {
    const rpc = vi.fn(async (name: string, args: Record<string, unknown>) => {
      if (name === 'list_pending_employee_data_deletions') return { data: [
        { requestId: 'ok', ownerUserId: 'user-a', organizationId: 'org-a' },
        { requestId: 'bad', ownerUserId: 'user-b', organizationId: 'org-b' },
      ], error: null };
      if (name === 'claim_employee_data_deletion' && args.target_request_id === 'bad') return { data: null, error: { message: 'denied' } };
      if (name === 'claim_employee_data_deletion') return { data: { requestId: 'ok', workerToken: 'token', storagePaths: [] }, error: null };
      return { data: { status: 'completed' }, error: null };
    });
    await expect(dispatchPendingDeletions(clientWith(rpc, vi.fn()))).resolves.toEqual({ discovered: 2, completed: 1, failed: 1 });
  });
});
