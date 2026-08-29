# ViLu protected workspaces operations

This runbook is the deployment reference for Slice 0–3. It covers the protected
employee, employer and clinical-partner surfaces. Public storefront, checkout,
try-on and Ask ViLu have separate rollout controls.

## Security invariants

- Every protected URL carries `/:locale/organizations/:organizationId`.
- `activeOrganizationId` is the route `organizationId`; role guards, feature
  flags and every data RPC must resolve against that same organization.
- Active membership and role are required on every request. A role in one
  organization never grants access to another organization.
- Employee medical data is unavailable to employers. Employer Outcomes returns
  only frozen completed-month aggregates protected by the privacy threshold and
  complementary suppression.
- Provider access requires `provider_staff` membership in a provider
  organization plus active `clinic_access` consent for the employee and
  referral.
- Sensitive provider reads and mutations are audited without patient names,
  document paths, clinical reasons or outcome content in metadata.
- Global and organization feature flags are both deny-by-default. A database
  migration does not enable its UI.

## Roles and routes

| Role | Surface | Route | Required organization feature |
|---|---|---|---|
| `employee` | Employee Today | `/:locale/organizations/:organizationId/employee/today` | `vilu_employee_flow_v2` |
| `employee` | Screening Result | `/:locale/organizations/:organizationId/employee/screenings/:screeningId/result` | `vilu_employee_flow_v2` |
| `employee` | Referral | `/:locale/organizations/:organizationId/employee/referrals/:referralId` | `vilu_employee_flow_v2` |
| `employee` | Vision Passport | `/:locale/organizations/:organizationId/employee/passport` | `vilu_passport_profile_v2` |
| `employee` | Profile | `/:locale/organizations/:organizationId/employee/profile` | `vilu_passport_profile_v2` |
| `employer_admin` | Employer Outcomes | `/:locale/organizations/:organizationId/employer/outcomes` | `vilu_employer_outcomes_v2` |
| `provider_staff` | Provider Queue | `/:locale/organizations/:organizationId/provider/queue` | `vilu_provider_queue_v2` |

All routes also require the foundation master gate and organization auth gate.
Supported locales are exactly `ru` and `en`. An unknown locale redirects to the
authenticated profile locale while preserving the remaining path, query and
hash.

## Feature gates

| Purpose | Build-time global flag | Organization flag |
|---|---|---|
| Route foundation | `VITE_FEATURE_VILU_FOUNDATION` | none |
| Auth and role shell | `VITE_FEATURE_VILU_AUTH_V2` | `vilu_auth_v2` |
| Employee care flow | `VITE_FEATURE_VILU_EMPLOYEE_FLOW_V2` | `vilu_employee_flow_v2` |
| Passport and Profile | `VITE_FEATURE_VILU_PASSPORT_PROFILE_V2` | `vilu_passport_profile_v2` |
| Employer Outcomes | `VITE_FEATURE_VILU_EMPLOYER_OUTCOMES_V2` | `vilu_employer_outcomes_v2` |
| Provider Queue | `VITE_FEATURE_VILU_PROVIDER_QUEUE_V2` | `vilu_provider_queue_v2` |

Only the exact string `true` enables a global flag. `.env.example` keeps every
protected-workspace flag `false`. `.github/workflows/deploy-pages.yml` does not
set these flags, so the production GitHub Pages build keeps Slice 0–3 disabled
until a reviewed rollout changes its build configuration.

## Migration order

Apply the complete ordered chain; never apply a later Slice migration alone:

1. `20260819090000_create_vilu_identity_foundation.sql`
2. `20260819130000_create_vilu_employee_care_flow.sql`
3. `20260820120000_create_vilu_passport_profile.sql`
4. `20260821120000_create_vilu_employer_provider_operations.sql`
5. `20260821130000_harden_vilu_slice3_deletion.sql`

The chain creates organizations, memberships, roles, feature flags and audit
events; employee screenings and referrals; Passport/Profile, consent,
documents and deletion requests; then employer/provider operations and their
storage-safe deletion order.

## Local verification

Docker must be available for the local Supabase stack.

```powershell
npm ci
npx --yes supabase@2.115.0 start
npx --yes supabase@2.115.0 db reset
npm run test:rls
npm run typecheck
npm test
npm run build
npm run lint
```

`npm run test:rls` covers allowed/denied access, two organizations, role
escalation denial, telemetry-role spoofing denial, employee draft resume,
atomic referral creation, Passport/Profile and clinic consent, employer privacy
suppression, provider auditing and optimistic concurrency, and deletion worker
ordering. The provider concurrency suite uses two independent database
sessions.

Before rollout, also exercise RU/EN on desktop and mobile 390×844 for each role.
Test a user holding the same role in two organizations and confirm that changing
the route organization changes the selected workspace rather than leaking the
previous one.

## Production rollout

1. Confirm the Supabase project ref, current backup, reviewed `main` commit and
   that all protected global and organization flags are disabled.
2. Link the CLI to the intended project and inspect pending migrations:

   ```powershell
   npx --yes supabase@2.115.0 link --project-ref <project-ref>
   npx --yes supabase@2.115.0 migration list
   npx --yes supabase@2.115.0 db push
   ```

3. Run the full local RLS and application checks against the resulting schema.
4. For Slice 2 deletion support, deploy `process-data-deletion` and configure
   its dispatcher as described below.
5. Deploy the frontend with the protected flags still disabled. Verify the
   public storefront, RU/EN, `/assistant`, `/dashboard` and `/checkout` first.
6. Enable `VITE_FEATURE_VILU_FOUNDATION` and the required global feature in a
   reviewed build. Then enable `vilu_auth_v2` and the matching feature only for
   one pilot organization.
7. Verify employee, employer and provider boundaries with separate accounts.
   Do not use one privileged session as proof of RLS isolation.
8. Expand organization flags only after the pilot canary remains healthy.

If a UI or access regression appears, disable the organization flag first and
then the global flag. Do not reverse a data-bearing migration. Repair forward,
rerun RLS tests and resume rollout.

## Data-deletion worker

Profile creates a deletion request and displays `requested`, `processing`,
`completed`, `cancelled` or `failed`. Cancellation is available only while the
request is still `requested`, before processing begins. The browser never runs
deletion work.

- `supabase/functions/process-data-deletion` claims queued and expired-lease
  requests, deletes the employee's `clinic-documents` Storage files first, then
  completes database deletion.
- `.github/workflows/data-deletion-dispatch.yml` invokes the worker every five
  minutes and also supports an authorized manual dispatch.
- Supabase Edge runtime needs `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` and
  `DATA_DELETION_DISPATCH_SECRET`.
- GitHub Actions needs `SUPABASE_URL` and the same
  `DATA_DELETION_DISPATCH_SECRET`. It must not receive or send the service-role
  key over HTTP.
- `verify_jwt = false` is intentional for this function because the handler
  authenticates the separate dispatcher secret before using its internal
  service-role client.

Deploy the worker only after the Slice 2 and Slice 3 deletion migrations:

```powershell
npx --yes supabase@2.115.0 functions deploy process-data-deletion --project-ref <project-ref>
```

An actual manual dispatch can irreversibly delete queued production data. Run it
only with explicit authorization naming the production project and the intended
batch. A normal deployment or canary must not trigger it.

## Ask ViLu and Edge Functions

Ask ViLu is public and controlled by `VITE_FEATURE_KNOWLEDGE_ASSISTANT`, not the
protected-workspace flags. Its server contract, secrets, deadline, pinned Deno
module graph and deployment steps are in
[`knowledge-assistant.md`](knowledge-assistant.md). Corpus publication is a
separate operation described in
[`knowledge-corpus-publication.md`](knowledge-corpus-publication.md).

Do not combine an Ask ViLu-only deployment with workspace migrations or data
deletion. Other Edge Functions (`submit-visit-lead`, `create-payment-intent`,
`get-payment-status` and `offer-finder`) retain their own rollout procedures.

## Post-deploy canary

Canary is read-only unless a rollout task explicitly authorizes flags or data
changes. Record HTTP status, load time, console/page errors and screenshots for:

- `/`, `/assistant`, `/dashboard` and `/checkout` on desktop and mobile 390×844;
- RU and EN navigation and direct protected-route loading;
- employee Today → Result → Referral, Passport and Profile;
- employer aggregate-only outcomes with no employee drill-down;
- provider queue, pagination and only the operations valid for the current
  referral status;
- Ask ViLu direct load/reload with opposite-locale history, preserved shared
  preferences, legacy-v1 fail-closed cleanup and RU→EN→RU during an unfinished
  request without a late response.

Treat an isolated third-party resource timeout as transient. Alert only when a
page failure, new console error or load regression persists across at least two
consecutive checks. Never enable feature flags, apply migrations or invoke the
deletion dispatcher merely to complete canary coverage.
