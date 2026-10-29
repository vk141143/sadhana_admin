# Sanatana admin foundation — 2026-10-18

This is a limited first implementation pass, not completion of the master prompt. Do not deploy as a fully secured production CMS yet.

## Repository audit

- React 19 / Vite / TypeScript / Tailwind; state-based navigation in `src/App.tsx`, Material Symbols sidebar, installed Lucide icons. No React router or Express entry point exists; Express is only an installed dependency.
- Admin credentials use **Supabase Auth**, not Firebase Auth. Local migrations map confirmed Auth email to `admin_users`; admin UUID and Auth UUID are not guaranteed equal. Firebase is currently a browser FCM integration. This pass preserves that identity boundary rather than inventing Firebase admin bindings.
- No local `chant_identities`, `chant_admin_bindings`, Chant migrations, analytics RPCs or concurrency-safe session implementation were found. Their reported live existence is not contradicted by their absence here. No Chant schema was created or changed.
- Existing scripture services use `scriptures`, `chapters`, `slokas`, R2 JSON and `json_url`. A separate Content pipeline uses `content_categories`, `content_chapters`, `content_verses` and versioned R2 manifests. Preserve both until their consumers are reconciled.
- FestivalWizard and its step components use festival migrations through 015. Duplicate 012 migration prefixes and successive cleanup migrations mean local SQL cannot be treated as authoritative live schema.
- Existing migrations cover quote scheduling, notifications, albums/audio, festivals, content and user preferences. `src/db/schema.sql` also contains Sadhana definitions. Never equate those user UUIDs with Firebase UIDs.
- Twelve engagement modules call `cmsService` backed by `mockDB` and fixtures. Dashboard also uses fixtures. Those routes now display an explicit pending-integration message. User Library previously opened the Scripture CMS; it now explains the missing authorized customer-progress integration. Scriptures keeps the existing LibraryView implementation.
- Existing shared components include DataTable, ConfirmModal, MediaUploader and RichTextEditor. Full shared design-system consolidation remains pending.
- R2 is already accessed through `r2-upload` and `publish-content` Supabase Edge Functions using server SDK credentials. This pass does not introduce another R2 integration.
- Existing R2 upload still accepts client object keys, lacks complete file validation, permits deletion without a reference check and has no atomic metadata lifecycle. Publishing has partial-failure/concurrency limitations. These remain production blockers.
- Local `.env` exists, but secret values were not read for this work. No privileged live schema connection was established. No live SQL, deployments, sends, uploads or customer mutations were performed.

## Implemented changes

- Registration no longer inserts an active super administrator or bypasses approval. It relies on the existing database trigger and signs out after registration.
- Login verifies the session using the new `admin-session` Edge Function. Confirmed email, active status and known role are required. Failures deny access.
- Shared backend authorization is used by `admin-session`, `r2-upload`, and `publish-content`. Viewer reads are accepted; writes require editor or super_admin. The identity comes from server-verified Supabase Auth, never client-provided role/UUID/email fields. Database lookup errors fail closed. Responses disable caching and return sanitized errors.
- The admin shell rechecks access every minute and on focus, reacts to sign-out, and provides retry/sign-in recovery. This is a UI guard, not a replacement for RLS or per-request backend authorization.
- Removed browser service-account signing/OAuth code and unsafe service-account variables from `.env.example`. Notification delivery now returns a truthful unavailable failure. A trusted, audited sender is still needed.
- Sidebar has the requested four section names, collapsible inactive groups, User Library naming and active-page semantics. The current section remains expanded. URL routing, full mobile focus management and breadcrumbs for existing pages remain pending.
- Fixed the festival boolean field type. Meditation collection objects are no longer returned as audio-track objects; that unimplemented read fails explicitly.
- Browser type checking excludes Deno entry points. `check:edge` is a separate Deno check, not an assertion that Edge Functions passed verification.

## File inventory

New: `supabase/functions/_shared/adminPolicy.ts`, `supabase/functions/_shared/requireAdmin.ts`, `supabase/functions/admin-session/index.ts`, `src/services/adminSession.ts`, `src/components/AdminSessionBoundary.tsx`, `src/components/UnavailableModule.tsx`, `tests/adminPolicy.test.ts`, this report, and `supabase/schema-inspection.sql`.

Modified: `src/views/AuthView.tsx`, `src/App.tsx`, `src/components/Sidebar.tsx`, `src/components/Step1BasicInfo.tsx`, `src/services/firebaseService.ts`, `src/services/cmsService.ts`, `supabase/functions/r2-upload/index.ts`, `supabase/functions/publish-content/index.ts`, `.env.example`, `package.json`, `tsconfig.json`.

## Routes and persistence

New backend endpoint: `POST /functions/v1/admin-session`. Updated authorization on `/functions/v1/r2-upload` (POST/DELETE) and `/functions/v1/publish-content` (POST). Unsupported methods return 405.

Reused `admin_users` for read-only session resolution. Existing content tables and R2 operations are retained. No new tables, schema mutations, migrations or required mutating SQL commands in this pass.

## Validation

- `npm test`: 15 passed; tests exercise verified identity lookup, missing/invalid credentials, unconfirmed accounts, missing admins, inactive admins, unknown roles, viewer write rejection, database failures and allowed roles. These use mocked Auth/database clients, not staging services.
- `npm run lint`: passed (TypeScript check; no ESLint command exists).
- `npm run build`: passed; 1,245.40 kB JavaScript bundle (318.67 kB gzip), with the existing large-chunk warning.
- `npm run check:edge`: could not run because Deno is not installed. Sandbox restrictions required rerunning tests/build with escalation.
- Not tested: live login, deployed function behavior, RLS, browser interaction/accessibility, Firebase verification, R2 uploads, metadata rollback, scripture/festival persistence, Chant sessions or analytics.

## Deployment and next pass

1. Inspect live schema and policies using `supabase/schema-inspection.sql` in an authorized SQL session. In particular confirm registration creates only inactive viewers and anonymous/authenticated clients cannot insert or promote admin records. Client-side fixes cannot repair permissive live RLS. Review historical signup triggers that preserve roles on email matches; do not replay old SQL blindly.
2. Deploy `admin-session`, updated `r2-upload` and `publish-content` **before** releasing this frontend. The frontend now requires `admin-session`; otherwise login fails closed. Retain JWT verification in the gateway.
3. Functions require `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` server-side. R2 retains `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_PUBLIC_URL`. Keep service keys outside Vite. Public R2 URLs do not protect drafts; private assets require a separate authenticated delivery policy.
4. Remove any real service-account credentials previously placed in VITE-prefixed variables. If such credentials were built or deployed, rotate them and invalidate old artifacts. No secret values are reproduced here.
5. Run `npm run check:edge` with Deno installed; run staging role tests, revoked-account tests, RLS/public draft checks, and upload/publish regression checks before production.
6. Obtain the actual Chant binding columns, functions and grants through read-only inspection; implement Firebase token verification and explicit bindings without email-based Firebase authorization. Do not substitute `public.users.id` or `auth.users.id` for verified customer IDs.
7. Complete database-backed dashboard/User Library and persistent engagement CMS; validate existing users/content/daily/banner/audio/album/festival workflows; implement authorized reports, support and settings. Existing screens outside the disabled mock routes are not certified end-to-end and may still contain demonstration elements.
8. Add audit logging, signature/size/dimension validation, metadata persistence, safe replacement/deletion, private media delivery and failure recovery. Validate scheduling authorization and atomicity; current scheduled-quote handler also needs review. Full Firebase/backend authorization across all admin operations is not complete.

Do not seed fake customers/content, recreate Chant tables, migrate verse JSON, or change Sadhana scoring to fill these gaps.
