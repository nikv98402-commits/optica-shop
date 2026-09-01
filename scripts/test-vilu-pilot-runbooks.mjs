import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const container = process.env.PILOT_TEST_DB_CONTAINER || 'supabase_db_vilu-slice-0';
if (!/^supabase_db_[a-z0-9._-]+$/i.test(container)) {
  throw new Error('PILOT_TEST_DB_CONTAINER must name a local Supabase database container');
}

const employerOrganizationId = '22000000-0000-4000-8000-000000000001';
const providerOrganizationId = '22000000-0000-4000-8000-000000000002';
const failedEmployerOrganizationId = '22000000-0000-4000-8000-000000000011';
const failedProviderOrganizationId = '22000000-0000-4000-8000-000000000012';
const employeeUserId = '12000000-0000-4000-8000-000000000001';
const employerAdminUserId = '12000000-0000-4000-8000-000000000002';
const providerStaffUserId = '12000000-0000-4000-8000-000000000003';
const missingUserId = '12000000-0000-4000-8000-000000000099';

const variables = [
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
];
const allUserIds = [employeeUserId, employerAdminUserId, providerStaffUserId, missingUserId];

const cleanup = `
delete from public.organizations where id = any(array[${allOrganizationIds.map((id) => `'${id}'::uuid`).join(',')}]);
delete from auth.users where id = any(array[${allUserIds.map((id) => `'${id}'::uuid`).join(',')}]);
`;

try {
  psql(cleanup);
  psql(`
    insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
    values
      ('${employeeUserId}', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'pilot-runbook-employee@example.test', '', now(), now(), now()),
      ('${employerAdminUserId}', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'pilot-runbook-admin@example.test', '', now(), now(), now()),
      ('${providerStaffUserId}', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'pilot-runbook-provider@example.test', '', now(), now(), now());
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

  psql(provision, [
    'employer_org_id', failedEmployerOrganizationId,
    'provider_org_id', failedProviderOrganizationId,
    'employee_user_id', employeeUserId,
    'employer_admin_user_id', employerAdminUserId,
    'provider_staff_user_id', missingUserId,
  ], 1);
  if (scalar(`select count(*) from public.organizations where id in ('${failedEmployerOrganizationId}', '${failedProviderOrganizationId}');`) !== '0') {
    throw new Error('Failed provisioning left partial organization rows');
  }

  // Force a failure after the organization INSERT has run: the employer ID is
  // already occupied by an incompatible row, while the provider ID is new.
  // The provider INSERT must roll back and the pre-existing row must survive
  // unchanged, proving the runbook transaction is atomic past preflight.
  psql(`
    insert into public.organizations (id, name, organization_type, country_code)
    values ('${failedEmployerOrganizationId}', 'Pre-existing organization', 'employer', 'EN');
  `);
  psql(provision, [
    'employer_org_id', failedEmployerOrganizationId,
    'provider_org_id', failedProviderOrganizationId,
    'employee_user_id', employeeUserId,
    'employer_admin_user_id', employerAdminUserId,
    'provider_staff_user_id', providerStaffUserId,
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

  psql(`update public.organization_feature_flags set enabled = true where organization_id in ('${employerOrganizationId}', '${providerOrganizationId}');`);
  psql(disable, [
    'employer_org_id', providerOrganizationId,
    'provider_org_id', employerOrganizationId,
  ], 1);
  if (scalar(`select count(*) from public.organization_feature_flags where organization_id in ('${employerOrganizationId}', '${providerOrganizationId}') and enabled;`) !== '6') {
    throw new Error('Mis-targeted rollback changed pilot feature flags');
  }
  psql(disable, variables.slice(0, 4));
  if (scalar(`select count(*) from public.organization_feature_flags where organization_id in ('${employerOrganizationId}', '${providerOrganizationId}') and enabled;`) !== '0') {
    throw new Error('Rollback left a pilot feature enabled');
  }
  if (scalar(`select count(*) from public.organization_memberships where organization_id in ('${employerOrganizationId}', '${providerOrganizationId}');`) !== '3') {
    throw new Error('Rollback changed pilot memberships');
  }

  console.log(JSON.stringify({
    provisionReplay: 'passed',
    missingAuthRollback: 'passed',
    postInsertRollback: 'passed',
    rollbackIdentityGuard: 'passed',
    dataPreservingDisable: 'passed',
  }));
} finally {
  psql(cleanup);
}
