# Sadhana Practice Admin and Customer Data Flow Inspection

**Inspection date:** 2026-10-31  
**Scope:** Admin repository and the adjacent `app/sanatana` customer application. Inspection only; no application code, schema, or deployment was changed.

## Executive findings

There are two distinct customer experiences that can be described as “Sadhana/Japa”:

1. **Sadhana Tracker → Sacred Practice** (`src/components/SadhanaPracticesView.tsx` in the customer app) already reads `public.sadhana_practices`. Its table, category values, selected columns, and `is_active` / `archived_at` filters match the admin implementation. Newly created admin records are **inactive by default**, so they do not appear in this screen until activated.
2. **Japa Counter / Chant library** (`JapaCounterModal` → `ChantExperience`) reads the separate `public.chants` catalogue and filters `status = 'published'`. It does **not** read `sadhana_practices`. Admin-created Sadhana definitions therefore will not appear in this Japa modal, even if active. The modal's session API also expects IDs from `chants`, so simply swapping its list query to Sadhana practice IDs would break session creation.

The customer project contains a practice-based Japa/Mantra catalogue adapter (`src/lib/practiceChantCatalog.ts`) that queries `sadhana_practices`, but the adapter is not wired into the visible Chant/Japa experience. This strongly suggests the intended integration has not been completed.

The local customer `.env.local` Supabase URL was compared to the admin client's configured project URL without displaying either value; they match. The deployment environment and live database contents were not queried. I cannot determine whether the practices entered by the administrator are active or whether migrations/policies have been applied in the live project.

## 1. Admin page architecture

### Navigation and component

- The admin does not define a browser URL route for this screen. It is an SPA navigation tab, `sadhana-practices`.
- `src/components/Sidebar.tsx` adds the **Sadhana Practices** tab.
- `src/App.tsx` maps that tab to `SadhanaPracticesView`; the authenticated application is wrapped by `AdminSessionBoundary`.
- The page component is `src/views/cms/SadhanaPracticesView.tsx`.
- Related UI includes `ConfirmModal` for archive confirmation and the page's inline form, preview, validation messages, filters, list, status controls, and media controls. No separate Sadhana-specific React hook was found.

### Related admin files and functions

- `src/views/cms/SadhanaPracticesView.tsx`
  - `loadPractices()` loads the complete admin list.
  - `formFromPractice()` populates the edit form.
  - `buildCategoryConfig()` constructs category-specific JSON.
  - `inputFromForm()` creates the practice payload.
  - `handleSave()` validates and creates or updates.
  - `handleToggleActive()` activates/deactivates.
  - `handleArchive()` archives (the UI calls this after confirmation).
  - `handleUpload()` uploads media.
  - `openCreate()` / `openEdit()` initialize the editor.
  - `PreviewPanel` renders a customer-style preview.
- `src/services/sadhanaPracticeValidation.ts`
  - `parsePracticeCreate()` / `parsePracticeUpdate()` validate and normalize inputs.
  - `validatePracticeBehavior()` checks mode/target/completion combinations.
  - `validateCategoryConfig()` validates category-specific JSON fields and localized content.
- `src/services/sadhanaPracticeService.ts`
  - `list()`, `get()`, `create()`, `update()`, `archive()`, and `listActiveForUsers()`.
- `src/services/sadhanaMediaService.ts`
  - `upload()` obtains an upload authorization, uploads to R2, then confirms the upload.
- Edge Functions:
  - `supabase/functions/sadhana-practices/index.ts` adapts repository operations to Supabase.
  - `supabase/functions/_shared/sadhanaPractices.ts` implements the HTTP handler and request validation.
  - `supabase/functions/_shared/requireAdmin.ts` and `adminPolicy.ts` enforce admin access.
  - `supabase/functions/sadhana-media/index.ts` and `_shared/sadhanaMedia.ts` implement secure R2 uploads.
- Scripture-reading references use `chapterService`, `scriptureService`, and `slokaService` in `src/services/contentService.ts`.

### Categories and behavior

The five categories are stored as strings, not category-table IDs:

`meditation`, `japa`, `mantra`, `gratitude`, `scripture_reading`.

The form supports category-specific data:

- **Meditation:** guided flag and breathing/begin/end guidance.
- **Japa:** mantra name/text/transliteration/meaning, optional count preset, counter flags, and counter instructions.
- **Mantra:** mantra name/text/transliteration/meaning.
- **Gratitude:** prompts and `allow_personal_reflection`.
- **Scripture reading:** scripture/chapter IDs and labels, chapter number, and verse bounds.

Practice modes are `timer`, `repetition`, `guided_audio`, `reflection`, and `scripture_reading`. Target types are `none`, `duration`, `repetitions`, `entries`, `verses`, and `chapters`. Completion rules are `manual`, `timer_elapsed`, `repetitions_reached`, `entries_submitted`, and `audio_completed`.

## 2. Admin practice lifecycle and exact data path

1. **Form state:** `emptyForm()` initializes category to `meditation` and `display_order` to `0`; `inputFromForm()` translates form fields into typed inputs and `buildCategoryConfig()` creates JSON for the chosen category.
2. **Submit and validation:** `handleSave()` calls `parsePracticeCreate()` for a new record or `parsePracticeUpdate()` for an edit. The Edge Function parses and validates the request again with the same validators before writing.
3. **Client/service call:** `sadhanaPracticeService` calls `supabase.functions.invoke('sadhana-practices', ...)`. This is not a direct browser-side insert for admin CRUD.
4. **Authentication/authorization:** `requireAdmin()` verifies the Supabase bearer token via `auth.getUser()`, looks up the active admin profile, and checks role. Readers may list; only `editor` and `super_admin` may write.
5. **Database repository:** `supabase/functions/sadhana-practices/index.ts` uses the server-side database client and `db.from('sadhana_practices')`.
6. **Create:** `POST /sadhana-practices` → `parsePracticeCreate()` → `.insert(input).select('*').single()`.
7. **Edit:** `PATCH /sadhana-practices?id=<uuid>` → `parsePracticeUpdate()` → `.update(input).eq('id', id).is('archived_at', null).select('*').maybeSingle()`. The UI intentionally omits `slug` when editing, preserving the slug after creation.
8. **Activate/deactivate:** `handleToggleActive()` sends `{ is_active: !p.is_active }` through the PATCH flow. This is the publication mechanism; there is no Sadhana `is_published` or `status` column.
9. **Archive/delete:** the UI's Archive action invokes the service's DELETE method, but the Edge Function performs a **soft archive**, not a SQL DELETE: `.update({ is_active: false, archived_at: now }).eq('id', id).is('archived_at', null)`. Existing records/history are retained.
10. **Refresh:** after mutations, `loadPractices()` calls the admin GET endpoint and reloads the full list. Its list query does not filter inactive or archived rows.

### Admin list and filtering

`sadhanaPracticeService.list()` → Edge Function `GET /sadhana-practices` → `.from('sadhana_practices').select('*').order('display_order', ascending).order('name', ascending)`.

There is no SQL status/category/search filter on this admin list. `SadhanaPracticesView` applies search, category, and status filters in memory. The initial status filter is `all`, and the UI paginates ten records at a time. Thus the admin page can display inactive and archived definitions (subject to admin authorization and successful query).

### Validation and error handling

- Validation enforces names/slugs, supported categories, string lengths, integer ranges, HTTPS URLs, JSON-array constraints, localized-language shape, and mode/target/completion compatibility.
- Create defaults `is_active` to `false`; inactive is therefore the expected state immediately after creation.
- Scripture references are validated by checking `scriptures.id`; optional chapters are checked against `chapters.id` and `scripture_id`; specified verses are checked in `slokas`. These are lookups, not foreign keys from `sadhana_practices`.
- Admin UI catches request/validation errors and shows them in an alert/toast. Service errors are surfaced as errors; the function maps most database failures to generic 503 responses and duplicate-slug errors to 409. The Sadhana function path does not log database details in the inspected handler.
- `listActiveForUsers()` in the admin service uses a direct table query and throws a generic error on Supabase failure; it is **not called by the admin page**.

## 3. Supabase table/schema established by repository files

The migration files define and extend `public.sadhana_practices`:

- `supabase/migrations/017_sadhana_practice_definitions.sql`
- `supabase/migrations/018_sadhana_practice_media_type.sql`
- `supabase/migrations/019_sadhana_practice_extended_fields.sql`

These files establish the repository's expected schema. They do not prove that the migrations ran against the current live database. `supabase/schema-inspection.sql` is an inspection query, not a schema dump.

### Columns

Types, nullability, constraints, and defaults below are inferred from the migrations and `src/types/sadhanaPractice.ts`.

| Column | Inferred database type | Null/default/meaning |
|---|---|---|
| `id` | `uuid` | Primary key; `gen_random_uuid()` default. |
| `name` | `text` | Required; trimmed length 1–120. |
| `slug` | `text` | Required and unique; lowercase alphanumeric segments separated by single hyphens. |
| `subtitle` | `text` | Nullable; 1–200 characters when set. |
| `description` | `text` | Required; defaults to `''`; max 1000 characters. |
| `category` | `text` | Required; constrained to the five category strings above. |
| `instructions` | `text` | Required; defaults to `''`; max 10000 characters. |
| `difficulty` | `text` | Nullable; `beginner`, `intermediate`, or `advanced`. |
| `practice_mode` | `text` | Nullable; one of the five mode values above. |
| `target_type` | `text` | Nullable; one of the six target types above. |
| `target_count` | `integer` | Nullable; 1–100000. Its meaning depends on `target_type`. |
| `target_unit` | `text` | Nullable; 1–40 characters. |
| `duration_minutes` | `integer` | Nullable; 1–1440. |
| `completion_rule` | `text` | Nullable; one of the five completion-rule values above. |
| `time_of_day` | `text` | Nullable; `morning`, `afternoon`, `evening`, or `anytime`. |
| `is_featured` | `boolean` | Not null; defaults to `false`. |
| `benefits` | `jsonb` | Nullable; if non-null, an array with at most 20 entries. |
| `tags` | `jsonb` | Nullable; if non-null, an array with at most 30 entries. |
| `category_config` | `jsonb` | Nullable; category-specific definition and optional `localized_content`. |
| `cover_image_url` | `text` | Nullable; HTTPS URL up to 2048 characters. |
| `guided_audio_url` | `text` | Nullable; HTTPS URL up to 2048 characters. |
| `ambient_audio_url` | `text` | Nullable; HTTPS URL up to 2048 characters. |
| `media_type` | `text` | Nullable; `image` or `audio`. |
| `media_url` | `text` | Nullable; HTTPS URL up to 2048 characters; legacy/general media field. |
| `display_order` | `integer` | Not null; defaults to `0`; 0–1000000. |
| `is_active` | `boolean` | Not null; defaults to `false`. Active and not archived is user-visible. |
| `archived_at` | `timestamptz` | Nullable; archived rows must be inactive. |
| `created_at` | `timestamptz` | Not null; defaults to `now()`. |
| `updated_at` | `timestamptz` | Not null; defaults to `now()` and updated by a trigger. |

`category_config` has no database-level JSON schema constraint in these migrations; the TypeScript validator enforces the supported shape. Japa JSON fields include `mantra_name`, `mantra_text`, `transliteration`, `meaning`, `count_preset`, `counter_enabled`, `mala_counter`, and `counter_instructions`. Localized content supports `en`, `te`, `hi`, `kn`, `ta`, and `ml`, with optional `meaning` and `instructions`.

There is **no frequency column**. Repetition goals use `target_type = 'repetitions'`, `target_count`/`target_unit`, and optionally Japa's `category_config.count_preset`. `time_of_day` is a recommendation, not a schedule/frequency field.

### Keys, relationships, indexes, and ordering

- Primary key: `id`.
- Unique key: `slug`.
- No foreign keys are declared on `sadhana_practices`.
- Scripture identifiers live inside JSON and are checked by application lookups; there is no relational join from this table.
- Media is represented by URL strings; there is no media table relation.
- Indexes support active/unarchived ordering, active category ordering, featured ordering, and difficulty ordering.
- Admin and customer practice catalogue queries sort by `display_order`, then `name`. The customer Japa-specific practice adapter additionally uses `id` as a stable tie-breaker.

## 4. Authentication, RLS, and permissions

### Admin

- Browser client: `src/services/supabaseClient.ts`, using Supabase JS with the admin project's URL and anon key. No service-role key is present in the browser client.
- Admin sign-in/session: `src/components/AdminSessionBoundary.tsx` calls `verifyAdminSession()` in `src/services/adminSession.ts`. `src/App.tsx` signs out through Supabase Auth.
- Edge Function: `supabase/functions/_shared/requireAdmin.ts` creates a user-scoped client with the incoming bearer token and a server-only service-role database client. The service-role key is read from the function environment and is not exposed to the browser.
- `resolveAdmin()` validates a verified Supabase Auth user and an active `admin_users` profile. `viewer` can read; `editor` and `super_admin` can write.
- Because the Edge Function repository uses the server-side service-role client, the admin CRUD operations bypass table RLS after the function's role checks.

### Customer

- `src/lib/supabase.ts` creates a Supabase client from `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
- The Sadhana screen gates catalogue loading on Firebase `onAuthStateChanged`, but the inspected Supabase client does not bridge the Firebase token into a Supabase Auth session. Its catalogue read therefore relies on public/anon table access, not an authenticated Supabase admin role.
- Migration 017 enables RLS, grants `SELECT` to `anon` and `authenticated`, and defines a select policy requiring `is_active = true AND archived_at IS NULL`. It grants write privileges to `service_role`; no public insert/update/delete policy is defined.
- Local `.env.local` project URL was checked internally and matches the admin project URL. No environment values or keys are included in this report. Production/deployed configuration remains to be verified.

## 5. Existing practices: retrieval and visibility

- The admin fetches records from the same `sadhana_practices` table it writes, through the `sadhana-practices` Edge Function. Admin GET has no active/archive filter.
- Admin status tabs (`all`, `active`, `inactive`, `archived`) are client-side only. The initial view is `all`.
- A newly created practice defaults to `is_active = false`, which the UI labels **Inactive** and describes as not visible to users. Activating sets `is_active = true`.
- There is no separate Sadhana publish flag. `is_active = true` and `archived_at IS NULL` are the publication/visibility contract.
- Archived practices are forced inactive and excluded from customer reads.
- The code cannot establish the current status/count of the specific practices entered by the user; no live data query was run.

## 6. Customer App comparison

### Sadhana Tracker → Sacred Practice

Path:

`src/components/SadhanaTracker.tsx` → `src/components/SadhanaPracticesView.tsx` → `fetchActiveSadhanaPractices()` in `src/services/sadhana/practiceCatalog.ts`.

The view requires a signed-in Firebase user before fetching. Its Supabase query selects the practice columns from `sadhana_practices`, filters `is_active = true` and `archived_at IS NULL`, and orders by `display_order`, then `name`. It also filters/sorts the returned records in the client. The five category strings match the admin exactly. There is no table-name, column-name, or category mismatch on this screen.

The customer selects all fields needed to render these definitions, including `category_config` and media URL fields. Scripture reading resolves the JSON references separately through `src/services/sadhana/practiceReading.ts` and the published scripture catalogue; no Sadhana-table join is expected.

### Japa Counter / Chant library

Path:

`src/components/JapaCounterModal.tsx` → `src/components/chant/ChantExperience.tsx` → `ChantExperienceContent` / `useChantLibrary` → `chantLibrary` in `src/lib/chantCatalog.ts`.

This screen reads **`chants`**, not `sadhana_practices`. Its public catalogue filters `chants.status = 'published'`, orders by `featured`, `sort_order`, and `id`, and checks that any related `chant_categories` row is also published. Optional text/media come from `chant_translations` and `chant_media`. Its category/type model is different: `chants.mantra_type` includes `mantra`, `nama_japa`, and `stotram`, with optional `category_id` referencing `chant_categories`.

The matching customer migration, `supabase/migrations/202610180001_chant.sql`, defines `chants` and separate `chant_categories`, `chant_translations`, and `chant_media` tables. Its public policy uses `status = 'published'`, unlike the Sadhana table's `is_active` flag.

Private chant session/favourite calls use `chantApi` (`src/lib/chantTransport.ts`) and `${VITE_API_BASE_URL}/api/chant`. The server validates a chant against `public.chants` with `status = 'published'`; `chant_sessions.chant_id` has a foreign key to `chants.id`. This is a separate data model and backend lifecycle, not an endpoint for Sadhana practices.

### Dormant practice-based Japa adapter

`src/lib/practiceChantCatalog.ts` defines a second catalogue that selects from `sadhana_practices`, filters active/unarchived rows and `category IN ('mantra','japa')`, and maps Japa configuration. `src/lib/practiceChant.ts` instantiates it, and `src/components/chant/usePracticeChants.ts` provides a generic hook. Repository search found no UI importing/using `practiceChantCatalogue` or `usePracticeChants` to drive `ChantExperience`; the live Japa modal continues to use `chantLibrary` from `chants`.

The adapter can provide practice definitions, but it does not by itself solve the session foreign-key/API mismatch described above.

## 7. Customer integration contract for `sadhana_practices`

### Read contract

Use the existing project Supabase client and `public.sadhana_practices`. For the full customer Sadhana catalogue, select:

```text
id,name,slug,subtitle,description,category,instructions,difficulty,practice_mode,
target_type,target_count,target_unit,duration_minutes,completion_rule,time_of_day,
is_featured,benefits,tags,category_config,cover_image_url,guided_audio_url,
ambient_audio_url,media_type,media_url,display_order,is_active,archived_at
```

`created_at` and `updated_at` are present in the admin service response but are not required by the inspected customer catalogue renderer. For a Japa/Mantra-only view, the implementation's category values are `'japa'` and `'mantra'` (not `nama_japa`).

Example based strictly on the current query contract:

```ts
const { data, error } = await supabase
  .from('sadhana_practices')
  .select(
    'id,name,slug,subtitle,description,category,instructions,difficulty,practice_mode,target_type,target_count,target_unit,duration_minutes,completion_rule,time_of_day,is_featured,benefits,tags,category_config,cover_image_url,guided_audio_url,ambient_audio_url,media_type,media_url,display_order,is_active,archived_at'
  )
  .eq('is_active', true)
  .is('archived_at', null)
  .order('display_order', { ascending: true })
  .order('name', { ascending: true });

if (error) throw error;
```

For a Japa/Mantra-only catalogue, append:

```ts
.in('category', ['japa', 'mantra'])
```

Do **not** filter this table on `status = 'published'` or `is_published`; those columns are not part of this table contract.

### Category configuration, related content, and media

- Categories are plain text enum values; there is no category join/table.
- Japa data is in `category_config` JSONB. Read its optional values defensively; not every record needs a preset or enabled counter.
- Scripture references in `category_config` are IDs/labels; resolve them through the scripture catalogue as `practiceReading.ts` does. Do not expect database foreign-key joins.
- Media columns contain HTTPS URLs, not R2 object IDs requiring a database join. The admin's secure upload flow stores the returned public `media_url` in the selected URL field. Use `cover_image_url` for artwork, `guided_audio_url` and `ambient_audio_url` for their named tracks, and consult legacy `media_type`/`media_url` only as fallback. The customer practice catalogue already applies those media rules in `getPracticeMedia()`.
- Sort by `display_order ASC`, then `name ASC`; optional stable `id ASC` is used by the Japa-only adapter.
- Apply the public filter `is_active = true AND archived_at IS NULL`; this matches both the customer query and the migration's public RLS policy.

## 8. Exact likely causes and what remains unverified

### Proven by code

1. **If the user is looking at the Japa Counter / Chant modal:** admin records cannot appear there because that UI reads `chants` and `status = 'published'`, not `sadhana_practices` and `is_active`. This is a definite source/model mismatch.
2. **If the user is looking at Sadhana Tracker → Sacred Practice:** newly created admin records are inactive by default, while the customer query requires active and unarchived. They will remain hidden until activated. This is the most likely explanation if the target is that screen.
3. **Firebase sign-in is required to trigger the Sadhana practice fetch.** An unsigned-in user sees the sign-in message and the catalogue query is not issued.
4. The customer practice catalogue category values match the admin values. The separate legacy Chant catalogue has different `mantra_type` and category-ID concepts.
5. The practice-based Japa adapter exists but is unwired to the visible Chant/Japa experience.

### Not established without live Supabase/deployment inspection

- Whether the entered rows exist in the live project and their exact `is_active` / `archived_at` values.
- Whether migrations 017–019 and their RLS policy are deployed to that project.
- Whether production's `VITE_SUPABASE_URL` and anon key point to the same project as local configuration.
- Whether the running application is the Sadhana Practice screen or the legacy Japa Counter modal.

## 9. Recommended next fix (no changes made)

1. First check the admin list's **Active** status and activate the intended rows if they are inactive. This is sufficient for the Sadhana Tracker → Sacred Practice screen, assuming migrations/RLS and deployed project configuration are correct.
2. If the intended destination is the Japa Counter/Chant modal, decide whether it should consume admin Sadhana Japa definitions or continue to use the independent Chant CMS. For practice definitions, the customer-side integration points are:
   - `../../sanatana/src/lib/practiceChant.ts`
   - `../../sanatana/src/lib/practiceChantCatalog.ts`
   - `../../sanatana/src/components/chant/usePracticeChants.ts`
   - `../../sanatana/src/components/chant/ChantExperience.tsx`
   - `../../sanatana/src/components/chant/ChantExperienceContent.tsx`
   - `../../sanatana/src/components/chant/ChantHomeSection.tsx` if the home preview should also use these practices.
3. Before wiring a Sadhana practice into the existing Japa session actions, reconcile the current server contract: `server/chantRouter.ts` checks `chants.status = 'published'` and session rows require `chant_sessions.chant_id` to reference `chants.id`. A Sadhana practice ID is not a valid substitute. Keep session IDs/model semantics intact or implement an explicit, reviewed mapping; do not make a blind list-query replacement.
4. Add/update focused customer tests for active/archive filters, the intended category mapping, and the session/detail behavior after the UX choice is made.

## 10. Supabase Dashboard / deployment checks needed

Use an authorized Supabase Dashboard/SQL session to verify, without exposing keys:

1. `public.sadhana_practices` exists and has all columns in migrations 017–019.
2. The actual rows' `category`, `is_active`, and `archived_at` values, plus `display_order`.
3. RLS is enabled and the effective anon/authenticated SELECT policy is `is_active = true AND archived_at IS NULL`; grants and policy state match migration 017.
4. The customer deployment is configured for the same Supabase project as the admin deployment.
5. Whether the user intended the Sadhana Tracker's Sacred Practice catalogue or the separate Japa Counter/Chant modal.

`supabase/schema-inspection.sql` is available as a read-only column/policy inventory query in the admin repository, but it was not run during this inspection.

## Evidence and limits

The conclusions above are based on the checked-in migrations, service code, Edge Function handlers, customer query code, and tests. No live database was queried, no secrets were printed, and no application code or schema was changed. Both worktrees had pre-existing local changes/untracked files at inspection time; those were left untouched.
