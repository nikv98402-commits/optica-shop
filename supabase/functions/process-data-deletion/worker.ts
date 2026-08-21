type RpcResult<T> = { data: T | null; error: { message: string; code?: string } | null };

export type DeletionClaim = { requestId: string; workerToken: string; storagePaths: string[] };
export type PendingDeletion = { requestId: string; ownerUserId: string; organizationId: string };
export type DeletionWorkerClient = {
  rpc: (name: string, args: Record<string, unknown>) => Promise<RpcResult<unknown>>;
  storage: { from: (bucket: string) => { remove: (paths: string[]) => Promise<{ error: { message: string } | null }> } };
};

function assertClaim(value: unknown): DeletionClaim {
  if (!value || typeof value !== 'object') throw new Error('invalid_claim');
  const claim = value as Partial<DeletionClaim>;
  if (typeof claim.requestId !== 'string' || typeof claim.workerToken !== 'string' || !Array.isArray(claim.storagePaths) || !claim.storagePaths.every((path) => typeof path === 'string')) throw new Error('invalid_claim');
  return claim as DeletionClaim;
}

export async function processDeletion(client: DeletionWorkerClient, requestId: string, ownerUserId: string, organizationId: string) {
  const { data, error } = await client.rpc('claim_employee_data_deletion', { target_request_id: requestId, target_owner_user_id: ownerUserId, target_organization_id: organizationId });
  if (error) throw new Error(error.code ?? error.message);
  const claim = assertClaim(data);
  try {
    if (claim.storagePaths.length) {
      const removal = await client.storage.from('clinic-documents').remove(claim.storagePaths);
      if (removal.error) throw new Error(`storage:${removal.error.message}`);
    }
    const completed = await client.rpc('complete_employee_data_deletion', { target_request_id: claim.requestId, target_worker_token: claim.workerToken });
    if (completed.error) throw new Error(completed.error.code ?? completed.error.message);
    return completed.data;
  } catch (workerError) {
    const failureCode = workerError instanceof Error ? workerError.message : 'worker_error';
    const failed = await client.rpc('fail_employee_data_deletion', { target_request_id: claim.requestId, target_worker_token: claim.workerToken, target_failure_code: failureCode });
    if (failed.error) throw new Error(`${failureCode};fail:${failed.error.code ?? failed.error.message}`);
    throw workerError;
  }
}

function assertPending(value: unknown): PendingDeletion[] {
  if (!Array.isArray(value)) throw new Error('invalid_pending_deletions');
  for (const item of value) {
    if (!item || typeof item !== 'object') throw new Error('invalid_pending_deletion');
    const pending = item as Partial<PendingDeletion>;
    if (typeof pending.requestId !== 'string' || typeof pending.ownerUserId !== 'string' || typeof pending.organizationId !== 'string') throw new Error('invalid_pending_deletion');
  }
  return value as PendingDeletion[];
}

export async function dispatchPendingDeletions(client: DeletionWorkerClient, batchSize = 10) {
  const { data, error } = await client.rpc('list_pending_employee_data_deletions', { target_limit: batchSize });
  if (error) throw new Error(error.code ?? error.message);
  const pending = assertPending(data);
  const result = { discovered: pending.length, completed: 0, failed: 0 };
  for (const job of pending) {
    try {
      await processDeletion(client, job.requestId, job.ownerUserId, job.organizationId);
      result.completed += 1;
    } catch {
      result.failed += 1;
    }
  }
  return result;
}
