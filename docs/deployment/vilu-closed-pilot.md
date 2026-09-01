# ViLu closed production pilot preparation

This runbook prepares one closed pilot without changing public Home or granting
access to any non-pilot organization. Preparation and production rollout are
separate operations. Merging this package does not create Auth users, enable a
flag, apply a migration, create clinical data or run data deletion.

## Pilot boundary

- Employer organization: one `employee` and one `employer_admin` membership.
- Provider organization: one `provider_staff` membership.
- Use three separate Supabase Auth users. Never reuse an owner or service user.
- Employer Outcomes stays privacy-suppressed while the cohort is below 20.
- Consent, referral assignment, appointment and outcome are created through the
  authenticated product flow, never by this runbook.

The pilot feature matrix is:

| Organization | Feature rows created, initially `false` |
|---|---|
| Employer | `vilu_auth_v2`, `vilu_employee_flow_v2`, `vilu_passport_profile_v2`, `vilu_employer_outcomes_v2` |
| Provider | `vilu_auth_v2`, `vilu_provider_queue_v2` |

## Local preflight

1. Create three disposable local Auth users and record only their UUIDs.
2. Generate two different UUIDv4 organization IDs.
3. Start/reset local Supabase and run the full RLS suite.
4. Execute the provisioning file twice. The second execution must leave the
   same two organizations, three memberships and six disabled feature rows.

Use an explicit local `psql` connection. Keep variables in the operator's shell
history policy or an approved secret store. Do not put them in Git, screenshots
or reports:

```powershell
psql $env:LOCAL_DATABASE_URL `
  -v employer_org_id='<uuid>' `
  -v provider_org_id='<uuid>' `
  -v employee_user_id='<uuid>' `
  -v employer_admin_user_id='<uuid>' `
  -v provider_staff_user_id='<uuid>' `
  -f supabase/runbooks/vilu_closed_pilot_provision.sql
```

The transaction stops before any insert when an Auth user is missing or IDs
are reused. Existing organization conflicts, invalid role/type combinations,
incomplete flags and enabled ViLu flags outside the allowlist also roll back.
Output is limited to organization IDs/types and aggregate counts.

## Build preparation

GitHub Pages reads the six protected global flags from repository variables.
Missing values and all values except exact lowercase `true` remain disabled.
Do not set those variables as part of preparation.

Static protected base routes are generated only when both non-secret variables
are present and contain different canonical UUIDs:

- `VILU_PILOT_EMPLOYER_ORG_ID`
- `VILU_PILOT_PROVIDER_ORG_ID`

The generator emits RU/EN entries for Employee Today, Passport, Profile,
Employer Outcomes and Provider Queue. Dynamic screening/referral URLs continue
through the existing `404.html` SPA fallback.

## Required checks

```powershell
npm run test:rls
npm run test:pilot
npm run test:pilot:sql
npm run typecheck
npm test
npm run build
npm run lint
npm run test:performance
npm run test:pages-routes
```

Before a separately authorized rollout, also run three isolated browser
sessions and prove all negative boundaries: employee cannot enter employer or
provider surfaces; employer cannot read employee/provider records; provider is
denied before consent, after revocation and for the employer organization; a
non-pilot organization is denied.

## Rollout is a separate authorization

Keep all organization rows `false` until the global-flag build passes public
canary. Then enable one layer at a time: Auth, Employee Flow, Passport/Profile,
product-created consent/assignment, Provider Queue, and finally Employer
Outcomes. Stop on any RLS, privacy, duplicate-operation or public regression.

## Data-preserving rollback

Disable the two pilot organizations without deleting users or care records:

```powershell
psql $env:PRODUCTION_DATABASE_URL `
  -v employer_org_id='<uuid>' `
  -v provider_org_id='<uuid>' `
  -f supabase/runbooks/vilu_closed_pilot_disable.sql
```

After rollback, require sign-out or hard reload because an already-open tab may
hold cached feature rows. Verify the server-side RLS/RPC denial independently.
Any deletion remains a separate irreversible workflow requiring explicit
authorization.
