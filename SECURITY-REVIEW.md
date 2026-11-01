# Meditation Library Security Review

## Scope and disposition

Read-only review of the Meditation Library implementation, with emphasis on migration `supabase/migrations/021_meditation_library.sql` and the Customer Firebase-authenticated API. No application changes were made, no migration was applied, and no production data was accessed or changed.

Two medium-severity findings remain unresolved. Do not apply migration 021 to production until the legacy progress identity mapping and write authorization issues below are resolved and verified against the live policies and grants.

## Findings

### MEDIUM — Legacy progress policies may allow Firebase UID ownership claims

- **Evidence:** `supabase/migrations/021_meditation_library.sql`, lines 227–229, adds the nullable `firebase_uid` column and its unique index without changing the existing client write policies or column privileges on `public.sadhana_progress`.
- **Legacy policy evidence:** Customer repository `sadhana_progress.sql`, lines 127–132, defines insert/update policies based on `auth.uid() = user_id`. Those checks do not bind `firebase_uid` to the authenticated Supabase user.
- **Impact:** If the deployed grants and policies match these definitions, an authenticated client able to write its own progress row may set or change `firebase_uid` to another person's known Firebase UID. The service-role API then selects progress by that Firebase UID, so it could update the claimed row. The unique Firebase UID index prevents a second claim after a row exists, but does not prevent an initial claim.
- **Confidence:** 9/10.
- **Recommendation:** Make `firebase_uid` and other backend-owned progress fields unwritable to clients, or replace the legacy write path with an identity-bound server-side operation. Verify effective production grants and policies before rollout.

### MEDIUM — Existing Supabase-Auth progress is not mapped to Firebase identity

- **Evidence:** `supabase/migrations/021_meditation_library.sql`, lines 227–229, adds `firebase_uid` but does not populate it for existing rows. The migration makes `user_id` nullable while retaining its legacy relationship.
- **Legacy schema evidence:** Customer repository `sadhana_progress.sql`, lines 13–15, defines `user_id` as a non-null foreign key to `auth.users(id)`.
- **New-flow evidence:** `supabase/migrations/021_meditation_library.sql`, around lines 547–566, inserts a Firebase-keyed progress row when no row exists for the Firebase UID, then reads progress by that UID.
- **Impact:** Existing XP, streak, levels, and totals can remain in the legacy row while the Firebase-backed meditation flow creates and uses a separate row. The old row is not deleted, but its history may appear lost to the Firebase-backed customer flow. The repository does not establish a reliable mapping from an existing Supabase Auth UUID to a Firebase UID, so a safe backfill cannot be inferred from code alone.
- **Confidence:** 9/10.
- **Recommendation:** Before rollout, establish and verify a one-to-one identity mapping, reconcile any existing and duplicate progress records, and prepare a reviewed backfill. If no authoritative mapping exists, stop and decide an explicit legacy-account continuity policy rather than silently starting a separate progress record.

## Safeguards observed

- The Customer meditation API verifies Firebase ID tokens with the Firebase Admin SDK and derives the UID from the verified token; it does not rely on a client-supplied UID as the authenticated identity.
- The reviewed session-action RPC is locked down for service-role execution. Session row locking/version checks and the unique meditation-session log provide concurrency/idempotency safeguards for completion.
- Admin content policies use the existing admin authorization check.
- These safeguards do not remediate the progress-table write-policy or legacy-identity continuity findings above.

## Required production verification

1. Inspect effective production grants and RLS policies on `public.sadhana_progress`, including any policies or grants not represented by repository SQL.
2. Verify whether existing users have an authoritative mapping between `auth.users.id` and `public.users.firebase_uid`.
3. If a mapping exists, measure unmatched and duplicate identities and validate a non-destructive backfill plan before considering deployment.
4. Re-run the security and data-integrity review against the final migration and verified production schema. Do not apply migration 021 until the two findings are addressed.
