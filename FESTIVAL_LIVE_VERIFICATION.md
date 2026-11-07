# Festival Management ? live deployment verification

Report date: 7 November 2026 (Asia/Calcutta).

## Four separate results

| Area | Live result | Evidence |
|---|---|---|
| Database deployment | PASS | Migration 023 validated in a rolled-back live transaction, then applied alone using the authenticated Supabase CLI. Remote history records 023. wizard_state is JSONB, NOT NULL, default {}. |
| Authenticated save | PASS (API/service layer) | A dedicated confirmed Supabase Auth user signed in with a random password as an active editor. The existing application service saved and restored all nine steps; repeated edits retained one occurrence, one content row, and one settings row. |
| R2 upload and Supabase media persistence | PASS (PNG) | The existing authenticated r2-upload endpoint accepted an actual 68-byte PNG. Public GET returned 200/image/png and SHA-256 matched the original bytes. URL, object keys and metadata were restored from Supabase; cover association persisted. |
| Customer visibility | PASS (anonymous data API) | Draft hidden; Published + Active parent, occurrence, content and media visible; Published + Inactive parent/occurrence hidden; Archived parent, occurrence, content and media hidden. Customer UI rendering was not tested. |

## Deployment scope and validation

- Project: `yzsfbxvygvxcbyipjzjo`.
- Before deployment, the live database had no migration-history table and no wizard_state column. Existing festival columns were present. The CLI migration list showed all local migrations as unrecorded.
- Inspected actual columns, defaults, nullability, policies, content-admin authorization and festival triggers. Existing festival triggers were timestamp updates, with no notification triggers. The auth-user creation hook only creates an inactive viewer admin profile.
- Executed migration 023 with COMMIT replaced by ROLLBACK to validate its SQL against the actual database without retaining changes.
- Used an ignored isolated work directory containing only `023_festival_persistence_completion.sql`. `supabase db push --linked --dry-run --workdir .festival-deploy` confirmed only that migration. Applied with `supabase db push --linked --workdir .festival-deploy --yes`.
- No other migrations, seeds, roles or Edge Functions were deployed. No table/column/data deletion was performed. Existing RLS and editor authorization remain in force.
- Final audit confirmed SECURITY INVOKER on the wizard function. The project grants anonymous EXECUTE through existing privileges, but both wizard and cover RPCs enforce an administrator check before writes: actual anonymous requests returned HTTP 401 / SQLSTATE 42501. No anonymous record was created.
- Do not interpret older migrations as unapplied merely because they are absent from history: existing schema was previously installed outside the CLI migration history. Do not push all pending historical files.

Migration SHA-256: `49f41085345c188e115dd212f9735e29646151a063a29529dd8a095ef8164b91`.

## Authenticated verification details

All festival writes used the real editor JWT obtained through Supabase password authentication. The management/service credential was held in process memory only and used for dedicated account provisioning and final cleanup, not as a substitute for authenticated festival writes.

The application functions saveFestivalWizard, fetchFestivalFull, insertFestivalMedia, setCoverMedia and uploadFestivalMediaToR2 were exercised. A native-fetch XHR adapter sent real requests through the existing browser upload transport contract; it did not mock upload responses.

| Step | Saved and restored fields |
|---|---|
| 1 Festival Details | Name, alternate name, slug, type, deity, associated deities, tradition, description, active flag; partial date-less draft and generated parent ID. |
| 2 Panchanga | Date, year, tithi, paksha, nakshatra, yoga; content linked to the generated occurrence. |
| 3 Timings | All five start/end ranges and custom timing name/start/end/description, comparing timestamps by instant. |
| 4 Fasting | Enabled flag, type, rules, Parana requirement and timestamp. |
| 5 Content | Description, significance, story sections and scriptural references. |
| 6 Puja | Name, description, duration, samagri nested fields and vidhi sections. |
| 7 Related Content | All six related-content arrays, with optional IDs and titles. |
| 8 Media/settings | Home/featured/calendar flags, priority, showing dates; cover file, metadata and URL verified in the subsequent media check. |
| 9 Review & Publish | Resume step 9; draft/edit persistence; later publication, activation and archival verified. |

Repeated saves/edits resulted in exactly one occurrence, content row and settings row. The final media row count was one even after repeating metadata insertion. The final read-only audit independently confirmed these counts.

## Live failure and retry checks

1. Submitted invalid priority -1 directly to the live wizard RPC, bypassing client validation. Server rejected it with P0001; a name change earlier in that transaction was rolled back. A valid authenticated retry succeeded.
2. Sent the PNG with an intentionally invalid upload token. The live endpoint returned HTTP 401. A retry with the actual editor session uploaded successfully.
3. Signed out before media metadata persistence. The application metadata service rejected the unauthenticated write. Signed in again with the same dedicated test user, retried the identical file, and confirmed the in-tab upload cache issued zero additional upload requests. Metadata insertion succeeded and repeating it returned the same media ID.

These are actual authorization/validation failure paths. Real network outages, timeouts and lost successful HTTP responses were not induced and are not marked verified.

## Evidence and retained fixtures

- Final festival: `a70335d3-769a-46b8-837a-31e6d294bb36`.
- Final media row: `08b5811d-ab3f-4053-a597-f61d2c7d894b`.
- Final R2 key: `festivals/a70335d3-769a-46b8-837a-31e6d294bb36/2026/images/d7eeeebc-9299-4eda-8a00-8b62e39fedfb.png`.
- Public object URL: https://pub-5ac331aed8ed455b8efc7bde5ffd54bf.r2.dev/festivals/a70335d3-769a-46b8-837a-31e6d294bb36/2026/images/d7eeeebc-9299-4eda-8a00-8b62e39fedfb.png
- Machine-readable final results: `tests/festivalLiveResults.json`.
- Initial harness attempt: `tests/festivalLiveResults-initial.json`.
- Upload/session-retry harness attempt: `tests/festivalLiveResults-upload.json`.
- Reproducible explicit live harness: `tests/festivalLiveVerification.ts` (not part of npm test; creates real fixtures).
- Metadata audit SQL: `tests/festivalDeploymentInspect.sql` and `tests/festivalDeploymentAudit.sql`.
- Anonymous authorization check: `tests/festivalAnonymousAuthorization.mjs`.

There were three runs. The first stopped because the test expected the old null content occurrence link after the database correctly linked it; the assertion was corrected. The second verified the actual upload but stopped while trying to reuse a signed-out session; the harness now performs a fresh password login. The final run passed all recorded checks. These were harness issues, not changes to production application code.

All three festival fixtures are retained as Archived and inactive. All three verification administrator profiles are inactive, their Auth accounts are banned, and passwords were replaced with fresh undisclosed random values. Existing users and festivals were not changed. Two small PNG R2 objects were uploaded across the runs and retained. The second run?s object has no media row because that run stopped before metadata persistence; the final run?s object has the verified row. No R2 object was deleted.

## Boundaries

- No notifications or Sadhana code, tables, functions, triggers or records were modified or tested.
- Only the database migration was deployed. Existing deployed r2-upload handled the verified requests; no frontend or Edge Function redeployment was needed for these API checks.
- Browser navigation, actual deployed frontend bundle behavior, customer screen rendering and customer-specific date/home filters were not exercised.
- Actual R2 upload coverage in this verification is PNG only. Audio, video, JSON and other supported formats were not live-uploaded in this run.
- This verification does not claim concurrent-editor race testing or browser-reload recovery of a completed upload before metadata persistence.
- TypeScript check passed after adding the live verification harness. The existing automated suite/build results remain from the implementation task; they were not substituted for live tests.
