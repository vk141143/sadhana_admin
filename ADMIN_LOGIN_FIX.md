# Admin login investigation and fix

## Confirmed root cause

The frontend calls `admin-session`, but that function was absent from project `yzsfbxvygvxcbyipjzjo`. Live OPTIONS and POST requests both returned HTTP 404 with `{"code":"NOT_FOUND","message":"Requested function was not found"}`. The authenticated CLI's deployed-function inventory independently confirmed its absence. The frontend discarded the HTTP distinction and displayed the account-confirmation/approval message for every error.

The existing `admin-login` function is deployed, but the current frontend does not call it. Switching to that legacy endpoint or using `admin_users.password_hash` would not follow the current login architecture.

## Login trace and identity checks

1. `src/views/AuthView.tsx` normalizes the email and calls Supabase `auth.signInWithPassword`. Firebase is not involved in admin login.
2. Provider errors stop login. A successful result must contain a user with `email_confirmed_at`; otherwise the frontend signs out.
3. `src/services/adminSession.ts` invokes `admin-session` using the Supabase client's authenticated session.
4. The Edge gateway retains JWT verification. `requireAdmin` creates an Auth client with the bearer header; `resolveAdmin` calls `auth.getUser()` to verify identity server-side.
5. The function requires a confirmed email and looks up `admin_users.email` using the lowercased, server-verified Auth email. It does not use a client-provided identity or require `admin_users.id = auth.users.id`.
6. The server requires `is_active === true` and a role of viewer/editor/super_admin. Write operations still require editor/super_admin. Database failures deny access.
7. On verification failure, AuthView signs out and presents the error. On success, the admin shell also revalidates the session periodically and on focus.

Read-only live SQL confirmed that `admin@vk.com` has a corresponding Auth account with `email_confirmed_at` set, role `super_admin`, and active status true. Both IDs happen to be `36e5d64b-25ca-45b5-a32e-38c729491c75`; equality is not an authorization requirement. Live Auth settings report email authentication enabled and automatic email confirmation enabled. No Auth settings were changed, and the application's confirmation checks remain intact.

The live admin schema has UUID ID, text role and boolean active status, with defaults viewer/false. No current login code reads or compares `password_hash`. `managed_by_supabase_auth` is a migration marker, not a password credential. No password hashes or tokens were queried.

## Separate RLS finding — unchanged

Live `pg_class` inspection reports `admin_users.relrowsecurity = false` and `relforcerowsecurity = false`. Policies exist (email-based own-profile SELECT, UID-based self SELECT/INSERT and a false ALL policy), but policies are not enforced while RLS is disabled. This is a separate security issue, not the cause of the missing-function HTTP 404. No policies, grants, accounts or application data were changed. Review the self-insert policy and existing grants before any separately approved RLS remediation; do not simply assume enabling RLS alone fixes provisioning security.

The session function uses a server-side service-role client for its admin lookup and enforces authorization explicitly. The frontend never receives the service-role key.

## Changes in this pass

- Modified `src/services/adminSession.ts` to use response classification.
- Added `src/services/adminSessionResult.ts`: distinguishes missing deployment (404), invalid session (401), authorization rejection (403), backend failure (5xx), network failure and invalid payloads. Raw server errors are not displayed.
- Added `tests/adminSessionResult.test.ts`; retained existing `tests/adminPolicy.test.ts` coverage.
- Added this report.

Deployed the **existing, unchanged** `supabase/functions/admin-session/index.ts` with its `_shared/adminPolicy.ts` and `_shared/requireAdmin.ts` dependencies. No other function was deployed or altered for this fix. Deployed version 1 is ACTIVE and `verify_jwt` is true.

Deployment performed:

```powershell
supabase functions deploy admin-session --project-ref yzsfbxvygvxcbyipjzjo --use-api
```

No migration or production data update is required for this login fix. The frontend diagnostic change is built locally; publish the updated frontend through the normal release process to receive the clearer messages. The missing-function fix already applies to the existing frontend.

## Validation and limits

- `npm test`: 23 tests passed, covering confirmed active admin resolution, differing IDs, marker exclusion, unconfirmed accounts, inactive accounts, non-admin/missing records, invalid roles, provider failures, viewer write denial, missing-function HTTP response and invalid payloads.
- `npm run lint`: passed.
- `npm run build`: passed, with the existing large-chunk warning (1,245.86 kB JavaScript; 318.93 kB gzip).
- Live post-deploy OPTIONS: 200, `Cache-Control: no-store`.
- Live post-deploy POST with the public anonymous credential: 401 `Authentication required.`, `Cache-Control: no-store`.
- Live function inventory: `admin-session` ACTIVE, version 1, JWT verification enabled.
- No authenticated browser login was performed; no user password was requested or used. Successful resolution tests use mocked Auth/database clients, not a forged production session.
- Historical execution logs were not retrieved. Before deployment there was no `admin-session` function to execute; the failure was established from live gateway responses and deployment inventory, not inferred from application logs. The CLI exposes no function-log command. Function runtime is verified by the post-deployment application-generated 401 response.

## Verify in the browser

1. Reload the admin application and sign in as `admin@vk.com` with its existing Supabase Auth password.
2. In browser Network, verify the Auth token request succeeds, followed by POST `/functions/v1/admin-session` returning 200 with name/email/role. Do not copy bearer tokens into reports or chat.
3. Confirm the admin shell opens and remains available after the focus/session recheck.
4. If another error occurs, inspect its HTTP status and the `admin-session` invocation logs in the Supabase dashboard. Do not change approval, passwords, RLS or confirmation settings to work around a transport error.
