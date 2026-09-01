import { spawn, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const container = process.env.PILOT_TEST_DB_CONTAINER || 'supabase_db_vilu-slice-0';
if (!/^supabase_db_[a-z0-9._-]+$/i.test(container)) {
  throw new Error('PILOT_TEST_DB_CONTAINER must name a local Supabase database container');
}

const employerOrganizationId = '22000000-0000-4000-8000-000000000001';
const providerOrganizationId = '22000000-0000-4000-8000-000000000002';
const pilotMarker = '32000000-0000-4000-8000-000000000001';
const wrongPilotMarker = '32000000-0000-4000-8000-000000000002';
const rollbackPilotMarker = '32000000-0000-4000-8000-000000000003';
const failedEmployerOrganizationId = '22000000-0000-4000-8000-000000000011';
const failedProviderOrganizationId = '22000000-0000-4000-8000-000000000012';
const rollbackEmployerOrganizationId = '22000000-0000-4000-8000-000000000031';
const rollbackProviderOrganizationId = '22000000-0000-4000-8000-000000000032';
const employeeUserId = '12000000-0000-4000-8000-000000000001';
const employerAdminUserId = '12000000-0000-4000-8000-000000000002';
const providerStaffUserId = '12000000-0000-4000-8000-000000000003';
const missingUserId = '12000000-0000-4000-8000-000000000099';
const productionUserId = '12000000-0000-4000-8000-000000000098';
const alternateEmployeeUserId = '12000000-0000-4000-8000-000000000011';
const alternateAdminUserId = '12000000-0000-4000-8000-000000000012';
const alternateProviderUserId = '12000000-0000-4000-8000-000000000013';
const rollbackEmployeeUserId = '12000000-0000-4000-8000-000000000021';
const rollbackAdminUserId = '12000000-0000-4000-8000-000000000022';
const rollbackProviderUserId = '12000000-0000-4000-8000-000000000023';
const foreignOrganizationId = '22000000-0000-4000-8000-000000000099';
const concurrentEmployerOrganizationId = '22000000-0000-4000-8000-000000000021';
const concurrentProviderOrganizationId = '22000000-0000-4000-8000-000000000022';
const competingEmployerOrganizationId = '22000000-0000-4000-8000-000000000023';
const competingProviderOrganizationId = '22000000-0000-4000-8000-000000000024';

const variables = [
  'pilot_marker', pilotMarker,
  'employer_org_id', employerOrganizationId,
  'provider_org_id', providerOrganizationId,
  'employee_user_id', employeeUserId,
  'employer_admin_user_id', employerAdminUserId,
  'provider_staff_user_id', providerStaffUserId,
];

function psql(sql, variablePairs = [], expectedStatus = 0, extraArgs = []) {
  const variableArgs = [];
  for (let index = 0; index < variablePairs.length; index += 2) {
    variableArgs.push('-v', `${variablePairs[index]}=${variablePairs[index + 1]}`);
  }
  const result = spawnSync('docker', [
    'exec', '-i', container, 'psql', '-X', '-q', '-U', 'postgres', '-d', 'postgres',
    '-v', 'ON_ERROR_STOP=1', ...extraArgs, ...variableArgs,
  ], { input: sql, encoding: 'utf8', windowsHide: true });

  if (result.error) throw result.error;
  if (result.status !== expectedStatus && !(expectedStatus === 1 && result.status !== 0)) {
    throw new Error(`Local pilot SQL exited ${result.status}: ${result.stderr.trim()}`);
  }
  return result.stdout.trim();
}

function psqlAsync(sql, variablePairs = []) {
  const variableArgs = [];
  for (let index = 0; index < variablePairs.length; index += 2) {
    variableArgs.push('-v', `${variablePairs[index]}=${variablePairs[index + 1]}`);
  }
  return new Promise((resolve, reject) => {
    const child = spawn('docker', [
      'exec', '-i', container, 'psql', '-X', '-q', '-U', 'postgres', '-d', 'postgres',
      '-v', 'ON_ERROR_STOP=1', ...variableArgs,
    ], { windowsHide: true });
    let stderr = '';
    child.stderr.setEncoding('utf8');
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('error', reject);
    child.on('close', (status) => resolve({ status, stderr: stderr.trim() }));
    child.stdin.end(sql);
  });
}

function scalar(sql) {
  return psql(sql, [], 0, ['-A', '-t']).trim();
}

const provision = readFileSync('supabase/runbooks/vilu_closed_pilot_provision.sql', 'utf8');
const disable = readFileSync('supabase/runbooks/vilu_closed_pilot_disable.sql', 'utf8');
const allOrganizationIds = [
  employerOrganizationId,
  providerOrganizationId,
  failedEmployerOrganizationId,
  failedProviderOrganizationId,
  rollbackEmployerOrganizationId,
  rollbackProviderOrganizationId,
  foreignOrganizationId,
  concurrentEmployerOrganizationId,
  concurrentProviderOrganizationId,
  competingEmployerOrganizationId,
  competingProviderOrganizationId,
];
const allUserIds = [
  employeeUserId, employerAdminUserId, providerStaffUserId, missingUserId,
  productionUserId, alternateEmployeeUserId, alternateAdminUserId, alternateProviderUserId,
  rollbackEmployeeUserId, rollbackAdminUserId, rollbackProviderUserId,
];

const cleanup = `
drop trigger if exists vilu_test_fail_pilot_flag_insert on public.organization_feature_flags;
drop function if exists private.vilu_test_fail_pilot_flag_insert();
do $cleanup$
begin
  if to_regclass('private.vilu_closed_pilot_registry') is not null then
    delete from private.vilu_closed_pilot_registry
    where pilot_marker in ('${pilotMarker}', '${wrongPilotMarker}', '${rollbackPilotMarker}');
  end if;
end
$cleanup$;
delete from public.organizations where id = any(array[${allOrganizationIds.map((id) => `'${id}'::uuid`).join(',')}]);
delete from auth.users where id = any(array[${allUserIds.map((id) => `'${id}'::uuid`).join(',')}]);
`;

try {
  psql(cleanup);
  psql(`
    insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, created_at, updated_at)
    values
      ('${employeeUserId}', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'pilot-runbook-employee@example.test', '', now(), jsonb_build_object('vilu_closed_pilot_marker', '${pilotMarker}'), now(), now()),
      ('${employerAdminUserId}', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'pilot-runbook-admin@example.test', '', now(), jsonb_build_object('vilu_closed_pilot_marker', '${pilotMarker}'), now(), now()),
      ('${providerStaffUserId}', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'pilot-runbook-provider@example.test', '', now(), jsonb_build_object('vilu_closed_pilot_marker', '${pilotMarker}'), now(), now()),
      ('${productionUserId}', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'existing-owner@example.test', '', now(), '{}'::jsonb, now(), now()),
      ('${alternateEmployeeUserId}', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'alternate-employee@example.test', '', now(), jsonb_build_object('vilu_closed_pilot_marker', '${wrongPilotMarker}'), now(), now()),
      ('${alternateAdminUserId}', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'alternate-admin@example.test', '', now(), jsonb_build_object('vilu_closed_pilot_marker', '${wrongPilotMarker}'), now(), now()),
      ('${alternateProviderUserId}', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'alternate-provider@example.test', '', now(), jsonb_build_object('vilu_closed_pilot_marker', '${wrongPilotMarker}'), now(), now()),
      ('${rollbackEmployeeUserId}', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'rollback-employee@example.test', '', now(), jsonb_build_object('vilu_closed_pilot_marker', '${rollbackPilotMarker}'), now(), now()),
      ('${rollbackAdminUserId}', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'rollback-admin@example.test', '', now(), jsonb_build_object('vilu_closed_pilot_marker', '${rollbackPilotMarker}'), now(), now()),
      ('${rollbackProviderUserId}', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'rollback-provider@example.test', '', now(), jsonb_build_object('vilu_closed_pilot_marker', '${rollbackPilotMarker}'), now(), now());
  `);

  psql(provision, variables);
  psql(provision, variables);
  if (scalar(`select count(*) from public.organizations where id in ('${employerOrganizationId}', '${providerOrganizationId}');`) !== '2') {
    throw new Error('Provisioning did not leave exactly two pilot organizations');
  }
  if (scalar(`select count(*) from public.organization_memberships where organization_id in ('${employerOrganizationId}', '${providerOrganizationId}');`) !== '3') {
    throw new Error('Provisioning replay created an unexpected membership count');
  }
  if (scalar(`select count(*) from public.organization_feature_flags where organization_id in ('${employerOrganizationId}', '${providerOrganizationId}') and enabled;`) !== '0') {
    throw new Error('Provisioning enabled a pilot feature');
  }
  if (scalar(`select count(*) from private.vilu_closed_pilot_registry where pilot_marker = '${pilotMarker}' and employer_organization_id = '${employerOrganizationId}' and provider_organization_id = '${providerOrganizationId}';`) !== '1') {
    throw new Error('Provisioning did not persist the exact pilot registry binding');
  }
  psql(provision, [
    'pilot_marker', pilotMarker,
    'employer_org_id', employerOrganizationId,
    'provider_org_id', providerOrganizationId,
    'employee_user_id', employerAdminUserId,
    'employer_admin_user_id', employeeUserId,
    'provider_staff_user_id', providerStaffUserId,
  ], 1);
  if (scalar(`select count(*) from public.organization_memberships where organization_id in ('${employerOrganizationId}', '${providerOrganizationId}');`) !== '3') {
    throw new Error('Changed registry replay altered pilot memberships');
  }

  psql(provision, [
    'pilot_marker', wrongPilotMarker,
    'employer_org_id', failedEmployerOrganizationId,
    'provider_org_id', failedProviderOrganizationId,
    'employee_user_id', productionUserId,
    'employer_admin_user_id', alternateAdminUserId,
    'provider_staff_user_id', alternateProviderUserId,
  ], 1);
  if (scalar(`select count(*) from private.vilu_closed_pilot_registry where pilot_marker = '${wrongPilotMarker}';`) !== '0') {
    throw new Error('Production identity rejection left a pilot registry row');
  }

  psql(provision, [
    'pilot_marker', wrongPilotMarker,
    'employer_org_id', failedEmployerOrganizationId,
    'provider_org_id', failedProviderOrganizationId,
    'employee_user_id', alternateEmployeeUserId,
    'employer_admin_user_id', alternateAdminUserId,
    'provider_staff_user_id', missingUserId,
  ], 1);
  if (scalar(`select count(*) from public.organizations where id in ('${failedEmployerOrganizationId}', '${failedProviderOrganizationId}');`) !== '0') {
    throw new Error('Failed provisioning left partial organization rows');
  }

  // A fresh marker may never adopt an existing organization, even when its
  // visible attributes resemble the pilot. The fail-closed preflight must
  // preserve that row and create no paired organization or pilot state.
  psql(`
    insert into public.organizations (id, name, organization_type, country_code)
    values ('${failedEmployerOrganizationId}', 'Pre-existing organization', 'employer', 'EN');
  `);
  psql(provision, [
    'pilot_marker', wrongPilotMarker,
    'employer_org_id', failedEmployerOrganizationId,
    'provider_org_id', failedProviderOrganizationId,
    'employee_user_id', alternateEmployeeUserId,
    'employer_admin_user_id', alternateAdminUserId,
    'provider_staff_user_id', alternateProviderUserId,
  ], 1);
  if (scalar(`select count(*) from public.organizations where id = '${failedEmployerOrganizationId}' and name = 'Pre-existing organization' and organization_type = 'employer' and country_code = 'EN';`) !== '1') {
    throw new Error('Failed provisioning changed the pre-existing organization');
  }
  if (scalar(`select count(*) from public.organizations where id = '${failedProviderOrganizationId}';`) !== '0') {
    throw new Error('Failed provisioning committed a partial provider organization');
  }
  if (scalar(`select count(*) from public.organization_memberships where organization_id in ('${failedEmployerOrganizationId}', '${failedProviderOrganizationId}');`) !== '0') {
    throw new Error('Failed provisioning committed partial memberships');
  }
  if (scalar(`select count(*) from public.organization_feature_flags where organization_id in ('${failedEmployerOrganizationId}', '${failedProviderOrganizationId}');`) !== '0') {
    throw new Error('Failed provisioning committed partial feature flags');
  }

  psql(`
    insert into public.organizations (id, name, organization_type, country_code)
    values ('${foreignOrganizationId}', 'Existing production employer', 'employer', 'RU');
    insert into public.organization_memberships (organization_id, user_id, role, status)
    values ('${foreignOrganizationId}', '${employeeUserId}', 'employee', 'active');
  `);
  psql(provision, variables, 1);
  if (scalar(`select count(*) from public.organization_memberships where user_id = '${employeeUserId}';`) !== '2') {
    throw new Error('Foreign-membership rejection changed membership state');
  }
  psql(`delete from public.organization_memberships where organization_id = '${foreignOrganizationId}' and user_id = '${employeeUserId}';`);

  psql(`
    insert into public.organization_memberships (organization_id, user_id, role, status)
    values ('${employerOrganizationId}', '${productionUserId}', 'employee', 'invited');
  `);
  psql(provision, variables, 1);
  if (scalar(`select count(*) from public.organization_memberships where organization_id = '${employerOrganizationId}' and user_id = '${productionUserId}' and status = 'invited';`) !== '1') {
    throw new Error('Inactive foreign-membership rejection changed membership state');
  }
  psql(`delete from public.organization_memberships where organization_id = '${employerOrganizationId}' and user_id = '${productionUserId}';`);

  psql(`
    create or replace function private.vilu_test_fail_pilot_flag_insert()
    returns trigger
    language plpgsql
    as $function$
    begin
      if new.organization_id in ('${rollbackEmployerOrganizationId}'::uuid, '${rollbackProviderOrganizationId}'::uuid) then
        raise exception 'intentional post-membership rollback test';
      end if;
      return new;
    end
    $function$;
    create trigger vilu_test_fail_pilot_flag_insert
    before insert on public.organization_feature_flags
    for each row execute function private.vilu_test_fail_pilot_flag_insert();
  `);
  psql(provision, [
    'pilot_marker', rollbackPilotMarker,
    'employer_org_id', rollbackEmployerOrganizationId,
    'provider_org_id', rollbackProviderOrganizationId,
    'employee_user_id', rollbackEmployeeUserId,
    'employer_admin_user_id', rollbackAdminUserId,
    'provider_staff_user_id', rollbackProviderUserId,
  ], 1);
  if (scalar(`select count(*) from private.vilu_closed_pilot_registry where pilot_marker = '${rollbackPilotMarker}';`) !== '0') {
    throw new Error('Post-insert failure left a pilot registry row');
  }
  if (scalar(`select count(*) from public.organizations where id in ('${rollbackEmployerOrganizationId}', '${rollbackProviderOrganizationId}');`) !== '0') {
    throw new Error('Post-insert failure left pilot organization rows');
  }
  if (scalar(`select count(*) from public.organization_memberships where organization_id in ('${rollbackEmployerOrganizationId}', '${rollbackProviderOrganizationId}');`) !== '0') {
    throw new Error('Post-insert failure left pilot membership rows');
  }
  if (scalar(`select count(*) from public.organization_feature_flags where organization_id in ('${rollbackEmployerOrganizationId}', '${rollbackProviderOrganizationId}');`) !== '0') {
    throw new Error('Post-insert failure left pilot feature rows');
  }
  psql(`
    drop trigger vilu_test_fail_pilot_flag_insert on public.organization_feature_flags;
    drop function private.vilu_test_fail_pilot_flag_insert();
  `);

  const lockUsers = psqlAsync(`
    begin;
    select id from auth.users
    where id in ('${alternateEmployeeUserId}', '${alternateAdminUserId}', '${alternateProviderUserId}')
    order by id for update;
    select pg_sleep(1);
    commit;
  `);
  await new Promise((resolve) => setTimeout(resolve, 150));
  const concurrentVariables = [
    'pilot_marker', wrongPilotMarker,
    'employer_org_id', concurrentEmployerOrganizationId,
    'provider_org_id', concurrentProviderOrganizationId,
    'employee_user_id', alternateEmployeeUserId,
    'employer_admin_user_id', alternateAdminUserId,
    'provider_staff_user_id', alternateProviderUserId,
  ];
  const competingVariables = [
    'pilot_marker', wrongPilotMarker,
    'employer_org_id', competingEmployerOrganizationId,
    'provider_org_id', competingProviderOrganizationId,
    'employee_user_id', alternateAdminUserId,
    'employer_admin_user_id', alternateEmployeeUserId,
    'provider_staff_user_id', alternateProviderUserId,
  ];
  const concurrentRuns = await Promise.all([
    psqlAsync(provision, concurrentVariables),
    psqlAsync(provision, competingVariables),
  ]);
  const lockResult = await lockUsers;
  if (lockResult.status !== 0) throw new Error(`Failed to establish concurrency barrier: ${lockResult.stderr}`);
  if (concurrentRuns.filter(({ status }) => status === 0).length !== 1) {
    throw new Error(`Concurrent provisioning expected one winner: ${JSON.stringify(concurrentRuns)}`);
  }
  if (scalar(`select count(*) from private.vilu_closed_pilot_registry where pilot_marker = '${wrongPilotMarker}';`) !== '1') {
    throw new Error('Concurrent provisioning did not leave exactly one registry binding');
  }
  if (scalar(`select count(*) from public.organizations where id in ('${concurrentEmployerOrganizationId}', '${concurrentProviderOrganizationId}', '${competingEmployerOrganizationId}', '${competingProviderOrganizationId}');`) !== '2') {
    throw new Error('Concurrent provisioning committed state from the losing transaction');
  }

  psql(`update public.organization_feature_flags set enabled = true where organization_id in ('${employerOrganizationId}', '${providerOrganizationId}');`);
  psql(disable, [
    'pilot_marker', wrongPilotMarker,
    'employer_org_id', employerOrganizationId,
    'provider_org_id', providerOrganizationId,
  ], 1);
  if (scalar(`select count(*) from public.organization_feature_flags where organization_id in ('${employerOrganizationId}', '${providerOrganizationId}') and enabled;`) !== '6') {
    throw new Error('Wrong-marker rollback changed pilot feature flags');
  }
  psql(disable, [
    'pilot_marker', pilotMarker,
    'employer_org_id', providerOrganizationId,
    'provider_org_id', employerOrganizationId,
  ], 1);
  if (scalar(`select count(*) from public.organization_feature_flags where organization_id in ('${employerOrganizationId}', '${providerOrganizationId}') and enabled;`) !== '6') {
    throw new Error('Mis-targeted rollback changed pilot feature flags');
  }
  psql(disable, variables.slice(0, 6));
  if (scalar(`select count(*) from public.organization_feature_flags where organization_id in ('${employerOrganizationId}', '${providerOrganizationId}') and enabled;`) !== '0') {
    throw new Error('Rollback left a pilot feature enabled');
  }
  if (scalar(`select count(*) from public.organization_memberships where organization_id in ('${employerOrganizationId}', '${providerOrganizationId}');`) !== '3') {
    throw new Error('Rollback changed pilot memberships');
  }

  console.log(JSON.stringify({
    provisionReplay: 'passed',
    registryBinding: 'passed',
    changedRegistryReplayRejected: 'passed',
    productionIdentityRejected: 'passed',
    foreignMembershipRejected: 'passed',
    inactiveForeignMembershipRejected: 'passed',
    concurrentRegistryBinding: 'passed',
    missingAuthRollback: 'passed',
    postInsertRollback: 'passed',
    preexistingOrganizationRejected: 'passed',
    rollbackIdentityGuard: 'passed',
    dataPreservingDisable: 'passed',
  }));
} finally {
  psql(cleanup);
}
