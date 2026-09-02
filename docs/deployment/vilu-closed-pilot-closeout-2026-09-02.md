# ViLu Closed Production Pilot: Stage 7 Closeout

**Date:** 2026-09-02

**Status:** Closed after successful rollout, canary validation, audit, and data-preserving rollback

**Production site:** <https://vilu.store>

**Repository:** <https://github.com/nikv98402-commits/optica-shop>

**Supabase project:** `ygdjkeqdzcibgbuasjak`

## Executive summary

The closed ViLu production pilot successfully exercised the employee, employer, and clinical-provider workspaces behind two independent controls: global build-time gates and organization-scoped database flags. All approved flows were enabled one stage at a time, validated in Russian and English on desktop and mobile, and then closed using the organization-level kill switch.

The final rollback changed only six rows in `public.organization_feature_flags`. It did not delete or alter pilot identities, memberships, registry bindings, migrations, clinical records, reports, referrals, documents, or audit records. Post-rollback canaries confirmed that all three pilot roles can no longer enter their workspaces.

## Final production state

### Deployment

| Item | Final verified value |
|---|---|
| Production branch | `main` |
| Production commit | `74295622d77c7e614a703bd1a8e437f20824e2fc` |
| Commit description | Merge PR #134, privacy-safe Employer Outcomes sentinel |
| GitHub Pages run | [33588217800](https://github.com/nikv98402-commits/optica-shop/actions/runs/33588217800) |
| Deployment result | `success` |

### Global build-time gates

All global gates remain `true`. They make the reviewed code available in the deployed bundle, but they do not grant access while the organization flags are disabled.

| Global gate | Final value |
|---|---:|
| `VITE_FEATURE_VILU_FOUNDATION` | `true` |
| `VITE_FEATURE_VILU_AUTH_V2` | `true` |
| `VITE_FEATURE_VILU_EMPLOYEE_FLOW_V2` | `true` |
| `VITE_FEATURE_VILU_PASSPORT_PROFILE_V2` | `true` |
| `VITE_FEATURE_VILU_EMPLOYER_OUTCOMES_V2` | `true` |
| `VITE_FEATURE_VILU_PROVIDER_QUEUE_V2` | `true` |

### Organization-scoped gates after rollback

| Organization | Feature | Final value |
|---|---|---:|
| Employer `9fa333b9-a19e-4bcd-8a43-ef13284448e7` | `vilu_auth_v2` | `false` |
| Employer | `vilu_employee_flow_v2` | `false` |
| Employer | `vilu_passport_profile_v2` | `false` |
| Employer | `vilu_employer_outcomes_v2` | `false` |
| Provider `a26f4e1c-4564-425c-82ce-d79a774aff64` | `vilu_auth_v2` | `false` |
| Provider | `vilu_provider_queue_v2` | `false` |

**Operational effect:** the pilot is closed immediately without another deployment.

## Fixed pilot identity boundary

| Entity | UUID | Expected binding |
|---|---|---|
| Pilot marker | `4e207e43-c5ef-470d-92ea-826f86c04860` | Exact registry row |
| Employer organization | `9fa333b9-a19e-4bcd-8a43-ef13284448e7` | Employer pilot only |
| Provider organization | `a26f4e1c-4564-425c-82ce-d79a774aff64` | Provider pilot only |
| Employee | `845513f8-a80c-4b9f-a860-0f790a04af12` | Active `employee` in employer organization |
| Employer administrator | `949a5fe6-6110-4abe-902f-795b7cdf8d40` | Active `employer_admin` in employer organization |
| Provider staff | `da0fb9b3-2058-404b-8366-a2b46633e09a` | Active `provider_staff` in provider organization |

The Stage 6 audit confirmed the exact registry binding, the three matching Auth markers, exactly three approved active memberships, and zero unexpected memberships.

## Rollout and verification record

### Employee and employer organization

1. Foundation and organization Auth were enabled in separate stages.
2. Employee Flow was enabled only for the employer organization.
3. Vision Passport and Profile were enabled only after the global gate was deployed and the organization gate remained off for the preflight canary.
4. Employer Outcomes was enabled only for the employer organization after validating the authenticated `employer_admin` membership.
5. RU and EN routes were checked on desktop and at `390 × 844`.

Verified routes included:

- `/{locale}/organizations/{employerOrg}/employee/today/`
- `/{locale}/organizations/{employerOrg}/employee/passport/`
- `/{locale}/organizations/{employerOrg}/employee/profile/`
- `/{locale}/organizations/{employerOrg}/employer/outcomes/`

### Employer Outcomes privacy fix

The initial small-cohort behavior returned HTTP 403 from `get_employer_outcomes`, even though suppression was an expected privacy result. This produced a red application error in the browser console.

PR #134 changed the behavior so an authorized `employer_admin` receives HTTP 200 with a safe `privacySuppressed` sentinel when the cohort is below 20. The sentinel omits `cohortSize` and every outcome metric, is not persisted to `employer_outcome_reports`, and preserves SQLSTATE `42501` for actual authorization failures.

Migration `20260902090000_return_employer_outcomes_privacy_sentinel.sql` was applied once to production. RU and EN canaries confirmed the existing privacy message without an application or Supabase console error.

### Provider organization

1. The global Provider Queue gate was enabled and deployed while provider organization flags remained disabled.
2. Provider organization Auth was enabled first. Provider Queue correctly remained closed.
3. Provider Queue was enabled only after exact registry and `provider_staff` membership checks passed.
4. RU and EN desktop and `390 × 844` mobile canaries showed the empty queue without cross-organization records.
5. The mobile console contained only browser-extension `runtime.lastError` messages. No ViLu or Supabase application error was observed.

Verified route:

- `/{locale}/organizations/{providerOrg}/provider/queue/`

## Stage 6 audit results

| Assertion | Result |
|---|---:|
| Exact pilot registry binding | `true` |
| Exact employer and provider organizations | `true` |
| Exact Auth pilot markers | `true` |
| Exact active membership matrix | `true` |
| Unexpected memberships | `0` |
| Exact enabled pilot flag matrix before rollback | `true` |
| Unexpected pilot flag rows | `0` |
| Protected flags enabled outside pilot | `0` |
| Employer Outcomes RPC present | `true` |
| Provider Queue RPC present | `true` |
| Privacy sentinel migration present | `true` |

## Post-rollback evidence

After all six organization flags were set to `false`, authenticated canaries confirmed closure:

| Role and route | Observed result |
|---|---|
| Provider staff → Provider Queue | “У вас нет доступа к этому рабочему пространству.” |
| Employer administrator → Employer Outcomes | “У вас нет доступа к этому рабочему пространству.” |
| Employee → Employee Today | “У вас нет доступа к этому рабочему пространству.” |

The rollback did not require a new frontend deployment because the organization flag lookup is the immediate runtime gate.

## Control model

```text
Reviewed code in production bundle
            │
            ▼
Global VITE_FEATURE_VILU_* gate
            │ true
            ▼
Authenticated membership and role check
            │ exact active membership
            ▼
Organization feature flag
            │ true
            ▼
Workspace or feature becomes available
```

Both the global and organization gate must be true. Disabling an organization flag closes the corresponding pilot surface immediately while leaving the reviewed deployment and database migrations intact.

## Data-preserving emergency rollback

Use the reviewed runbook at `supabase/runbooks/vilu_closed_pilot_disable.sql`. The safe order is:

1. Verify that pilot marker `4e207e43-c5ef-470d-92ea-826f86c04860` is still bound to the two approved organizations.
2. Set the six approved organization flags to `false` in one transaction.
3. Assert that no approved pilot flag remains enabled before commit.
4. Run authenticated canaries for employee, employer, and provider routes.
5. Only for a wider incident, set the relevant global GitHub variables to `false` and deploy current `main`.

Do not reverse data-bearing migrations as an emergency response. Do not delete the pilot registry, users, memberships, referrals, reports, documents, or audit records.

## Safe repeat-run procedure

The pilot must not be restarted from this report alone. A new rollout requires a separate explicit approval and a fresh read-only preflight.

1. Reconfirm `origin/main`, required migrations, successful CI, and the production deployment SHA.
2. Reconfirm the exact pilot registry, Auth markers, active memberships, and absence of unexpected memberships.
3. Reconfirm all protected flags outside the pilot allowlist are disabled.
4. Enable one organization flag per approved transaction, following dependency order:
   - employer `vilu_auth_v2`;
   - employer `vilu_employee_flow_v2`;
   - employer `vilu_passport_profile_v2`;
   - employer `vilu_employer_outcomes_v2`;
   - provider `vilu_auth_v2`;
   - provider `vilu_provider_queue_v2`.
5. After every change, run RU and EN authenticated canaries on desktop and `390 × 844` mobile.
6. Check browser Console for application and Supabase errors. Classify extension-originated messages separately.
7. Stop immediately and use the data-preserving kill switch if an assertion or canary fails.

## Privacy and isolation guarantees validated

- Employer Outcomes does not expose individual medical data.
- Cohorts below 20 return a metric-free privacy sentinel without `cohortSize`.
- The suppression sentinel is not persisted as an employer report.
- Real access denials retain SQLSTATE `42501`.
- Provider Queue showed no referrals from another organization.
- Provider credentials could not access the employer organization.
- Disabled organization gates closed all pilot workspaces after rollback.

## Closeout decision

The pilot demonstrated that the staged two-gate rollout, privacy suppression, role checks, organization isolation, and immediate rollback work in production. The pilot is now intentionally closed. Global gates remain deployed and organization gates remain disabled, allowing a future approved pilot to begin from a stable, data-preserving baseline.
