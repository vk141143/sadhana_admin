# Sanatana Admin Panel — Codebase Inspection

## Scope and evidence

This report is based on the tracked source files and SQL migrations in this repository. No source code was changed. The actual Supabase database, deployed Edge Function secrets, Cloudflare bucket configuration, and the separate customer application were not queried or opened, so their live state is **Not verified**. SQL statements and schemas below describe what the repository declares, not proof that every migration has been applied.

Secret values are intentionally omitted. Environment variable names are listed where useful; values were not included in this report.

## 1. Project architecture

### Frontend, entry points, and routing

- **Frontend:** React 19, TypeScript, Vite 6, Tailwind CSS. Dependencies and scripts are in [`package.json`](./package.json); Vite configuration is in [`vite.config.ts`](./vite.config.ts).
- **Browser entry:** [`src/main.tsx`](./src/main.tsx) creates the React root and renders [`src/App.tsx`](./src/App.tsx).
- **Application shell:** `App` owns the current tab, login flag, and demo audio/player state. It renders the header, sidebar, and selected view.
- **Routing:** There is no URL router in the inspected source. [`src/components/Sidebar.tsx`](./src/components/Sidebar.tsx) calls `onSelectTab`; `App` stores that tab in React state and chooses a view in `renderCurrentView`.
- **Content route:** Sidebar item `Content` selects `content`, which renders [`src/views/ContentView.tsx`](./src/views/ContentView.tsx). This is the active scripture/chapter/sloka editor.
- **Important route discrepancy:** Sidebar item `Scriptures` selects `scriptures`, whose switch case renders `LibraryView`. Sidebar item `User Library` selects `library`, which the earlier `pending` map intercepts and renders as unavailable. [`src/views/ScripturesView.tsx`](./src/views/ScripturesView.tsx) is imported but is not selected by any active route. Do not treat it as the currently used sloka editor.
- **Layout/navigation:** [`src/components/Sidebar.tsx`](./src/components/Sidebar.tsx) defines the navigation list and collapsible sections. [`src/components/TopHeader.tsx`](./src/components/TopHeader.tsx) supplies the header. The app shell and view map are in [`src/App.tsx`](./src/App.tsx).

### Directory and important files

```text
/
├── package.json, vite.config.ts, tsconfig.json, index.html
├── .env.example
├── src/
│   ├── main.tsx, App.tsx, index.css, types.ts
│   ├── components/          # Sidebar, TopHeader, session boundary, shared UI,
│   │                         # festival wizard, media and audio components
│   ├── data/                # demo/mock dashboard and CMS records
│   ├── db/                  # context schema and SQL Editor scripts
│   ├── services/            # Supabase clients, content, auth, R2, dashboard,
│   │                         # festival, Firebase and Sadhana services
│   ├── types/               # CMS and Sadhana domain types
│   └── views/
│       ├── AuthView.tsx, ContentView.tsx, LibraryView.tsx, ScripturesView.tsx,
│       │   AudioLibraryView.tsx, DashboardView.tsx, and other admin views
│       └── cms/             # Sadhana/content module views
├── supabase/
│   ├── functions/
│   │   ├── _shared/         # admin policy, admin client, media/practice helpers
│   │   └── admin-session/, admin-dashboard/, r2-upload/, publish-content/,
│   │       sadhana-media/, sadhana-practices/, and scheduled publishing
│   ├── migrations/          # SQL migrations 001–019
│   └── schema-inspection.sql
└── tests/                   # Node tests for admin policy/session, media,
                             # practices, dashboard metrics
```

The tree is a source-oriented summary of tracked files, not a listing of generated `dist/` or dependency `node_modules/` contents.

### Backend and database

- There is no separate Express server entry point in the tracked project. Although `express` is a package dependency, no Express application was found in the inspected source.
- Backend request handlers are Supabase Deno Edge Functions under [`supabase/functions/`](./supabase/functions/). Relevant functions include `admin-session`, `r2-upload`, `publish-content`, `sadhana-media`, and `sadhana-practices`.
- The database is Supabase Postgres. Frontend Supabase access is initialized in [`src/services/supabaseClient.ts`](./src/services/supabaseClient.ts); the service layer for the active content editor is [`src/services/contentService.ts`](./src/services/contentService.ts).
- Edge functions use shared admin verification in [`supabase/functions/_shared/requireAdmin.ts`](./supabase/functions/_shared/requireAdmin.ts) and [`supabase/functions/_shared/adminPolicy.ts`](./supabase/functions/_shared/adminPolicy.ts).
- Database definitions and policies are chiefly in [`supabase/migrations/`](./supabase/migrations/). [`src/db/schema.sql`](./src/db/schema.sql) labels itself context-only; [`src/db/content_migration.sql`](./src/db/content_migration.sql) is a separate SQL Editor script. The deployable scripture catalog is defined in [`supabase/migrations/010_scripture_catalog.sql`](./supabase/migrations/010_scripture_catalog.sql).
- No separate customer-app project or customer-only source tree was found among the tracked files. [`src/views/LibraryView.tsx`](./src/views/LibraryView.tsx) contains a reader-like library view embedded in this admin app; it is reachable through the `Scriptures` tab, while the separate `User Library` tab is unavailable.

### Supabase client, R2, and environment configuration

- `supabaseClient.ts` initializes Supabase using a hard-coded project URL and client key; it does not read the declared `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, or `VITE_SUPABASE_ANON_KEY` variables. The client key is not reproduced here.
- R2 uploads from the browser generally call the authenticated `r2-upload` Edge Function via [`src/services/r2Client.ts`](./src/services/r2Client.ts). The Edge Function creates an AWS S3-compatible client for Cloudflare R2 using server-side Deno environment variables.
- The expected server-side R2 variables are `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, and `R2_PUBLIC_URL`. These are also named in [`.env.example`](./.env.example). Whether they are set in the deployed Supabase project is **Not verified**.
- The repository environment files also name `VITE_R2_PUBLIC_URL`; no source reference to it was found. The actual local `.env` contains `VITE_R2_ACCESS_KEY_ID` and `VITE_R2_SECRET_ACCESS_KEY` names; the source does not reference these variables. Because they use the `VITE_` prefix, they should not contain real secrets, even though the current R2 client appears not to consume them.
- `R2_PUBLIC_URL` is used by `r2-upload` to compose public object URLs. `sadhana-media` additionally validates that the public base URL is HTTPS.
- Supabase Edge Functions also require `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` through Deno environment variables; the service role key is used only in server-side code in the inspected implementation.
- Firebase browser configuration (`VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`, `VITE_FIREBASE_MEASUREMENT_ID`, and `VITE_FIREBASE_VAPID_KEY`) is used by [`src/services/firebaseService.ts`](./src/services/firebaseService.ts). The `VITE_FIREBASE_SA_*` names present in local environment configuration are not referenced in source; their names indicate service-account fields and they should remain server-only.
- `GEMINI_API_KEY` and `APP_URL` appear in the environment example, but no references were found in the inspected source. `DISABLE_HMR` is used by `vite.config.ts` for local development.

## 2. Admin authentication and permissions

### Login and session flow

1. `App` starts with `isAuthenticated = false` and renders [`src/views/AuthView.tsx`](./src/views/AuthView.tsx).
2. `AuthView.handleLogin` normalizes the email and calls `supabase.auth.signInWithPassword`.
3. It rejects unconfirmed accounts, then invokes `verifyAdminSession()` in [`src/services/adminSession.ts`](./src/services/adminSession.ts).
4. `verifyAdminSession` calls the `admin-session` Edge Function. Its handler calls `requireAdmin`; on success it returns the admin name, email, and role.
5. [`src/services/adminSessionResult.ts`](./src/services/adminSessionResult.ts) validates the response and distinguishes authorization failures from transport/deployment failures.
6. On success, `App` sets its in-memory login flag. The rendered application is wrapped in [`src/components/AdminSessionBoundary.tsx`](./src/components/AdminSessionBoundary.tsx), which verifies on initial render, focus, and every 60 seconds. A failed check blocks the shell and offers retry/sign-out.
7. `handleLogout` signs out of Supabase and clears the in-memory flag.

Registration calls Supabase Auth `signUp`. A database trigger provisions new registrations as inactive `viewer`; the browser does not assign an elevated role. The trigger is defined in [`supabase/migrations/007_admin_auth.sql`](./supabase/migrations/007_admin_auth.sql) and repaired in [`supabase/migrations/008_fix_admin_auth_registration.sql`](./supabase/migrations/008_fix_admin_auth_registration.sql).

### Roles and enforcement

| Role | Admin session/read APIs | Scripture catalog RLS | Write APIs |
|---|---|---|---|
| `viewer` | Allowed when active and email-confirmed | Published records are readable; admin-only policies do not grant draft access | Denied |
| `editor` | Allowed when active and email-confirmed | Admin read/write policy | Allowed |
| `super_admin` | Allowed when active and email-confirmed | Admin read/write policy | Allowed |

- `resolveAdmin` in `adminPolicy.ts` validates a bearer token through Supabase Auth, requires a confirmed email, looks up `admin_users`, requires `is_active`, checks one of the three known roles, and gates writes to `editor`/`super_admin`.
- `requireAdmin` constructs the caller-scoped Auth client and server-side service-role database client. It validates the caller token, uses the database client to resolve the admin profile, and then returns the authorized clients to the handler.
- `public.is_content_admin()` and per-table RLS policies are defined/updated in [`supabase/migrations/006_content_management.sql`](./supabase/migrations/006_content_management.sql), [`supabase/migrations/010_scripture_catalog.sql`](./supabase/migrations/010_scripture_catalog.sql), and [`supabase/migrations/011_content_admin_policies.sql`](./supabase/migrations/011_content_admin_policies.sql).
- The Content UI does not hide edit controls based on role. Authorization is enforced by Postgres RLS and write Edge Functions; a viewer can reach the UI but writes should be rejected by those backends.
- The sidebar profile/role display is sourced from `ADMIN_PROFILE` mock data, not from the verified session response. The verified role is not used to render a role-specific UI.
- No admin-role management screen was found. The migrations document approving/promoting an account through a privileged SQL update to `admin_users`; the live operational process is **Not verified**.
- `App` does not initialize its login flag from an existing Supabase session. Thus the panel returns to the login view on a page reload even if Supabase retains a session; persistence behavior beyond Supabase Auth itself is not wired into the shell.

## 3. Existing content management workflow

### Active navigation and fetching

The requested path is implemented as:

`Admin login → Sidebar → Content → ContentView → choose scripture (e.g. Bhagavad Gita) → choose chapter → sloka list → Add/Edit Sloka`

In [`src/views/ContentView.tsx`](./src/views/ContentView.tsx):

1. On mount, `scriptureService.list()` selects all rows from `public.scriptures`, ordered by name. The editor does not query `content_categories`, and it does not hard-code a Bhagavad Gita database ID. The admin chooses a scripture by its displayed name.
2. When a scripture is selected, `chapterService.list(scripture.id)` selects its `public.chapters` rows by `scripture_id`, ordered by `chapter_number`.
3. When a chapter is selected, `slokaService.list(chapter.id)` selects its `public.slokas` rows by `chapter_id`, ordered by `verse_number`.
4. The list preview fetches each row's `json_url` and displays `sanskrit.devanagari`. Individual JSON fetch failures are converted to an empty preview; the main list query reports an error in the view.

These are direct Supabase/PostgREST calls made by the browser through `contentService`; there is no REST controller specifically for scripture CRUD.

### Add and edit Sloka

- The active editor uses a JSON textarea in its Sloka modal, not a field-by-field Sanskrit form. Add opens an empty textarea; Edit fetches the existing `json_url`, serializes the object into formatted JSON, and pre-fills the textarea.
- `validateSlokaJson` parses and validates the pasted JSON:
  - Root must be an object; `verse_number` must be a positive integer.
  - `id` must match the pattern `PREFIX.chapter.verse`, such as `BG.1.1`.
  - Prefix is computed from the initials of the selected scripture name; embedded chapter and verse numbers must match the selected chapter and `verse_number`.
  - `sanskrit.devanagari` must contain Devanagari text; transliteration must contain Latin text.
  - The six required language keys are `en`, `te`, `hi`, `kn`, `ml`, and `ta`; each must provide non-empty `translation`, `meaning`, `explanation`, and `example`. Other language keys are rejected.
- Validation can be invoked explicitly with “Validate JSON”; save validates again before submitting. There is no server-side validation in `r2-upload` for the JSON schema. The separate `publish-content` function has its own, different validation rules and schema.
- `handleSaveSloka` calls `slokaService.add(chapter.id, json)` for Add and `slokaService.update(record, json)` for Edit. Edit preserves the record's `id`, `verse_id`, and `verse_number`; the service rejects changing the latter two.
- Add first checks existing rows in the selected chapter. A matching `verse_id` **or** `verse_number` causes the service to route to `update`; otherwise it uploads JSON and inserts metadata with `status: 'Published'`.
- The Content editor updates its local list and count after service completion. In the duplicate Add-to-update case, the returned existing row is appended and the local count is incremented, so the view can temporarily show a duplicate/stale count until reloaded.

The separate, currently unrouted [`src/views/ScripturesView.tsx`](./src/views/ScripturesView.tsx) has a different modal with structured fields and a different language set. It calls the same service functions, but should not be confused with the active `ContentView` workflow.

## 4. Database relationship mapping

The following columns/constraints are declared by repository migrations. Live database presence and any additional deployed columns are **Not verified**.

### Canonical active editor tables

| Table | Declared columns / keys | Relationship and operations observed |
|---|---|---|
| `public.scriptures` | `id` UUID primary key; `name`; `description`; `cover_image_url`; `status`; `created_at`; `updated_at` | `scriptureService.list` selects all; `save` inserts or updates by `id`; `delete` deletes by `id`. Parent of `chapters`. |
| `public.chapters` | `id` UUID primary key; `scripture_id`; `chapter_number`; `title`; `subtitle`; `description`; `image_url`; `sloka_count`; `status`; timestamps | `scripture_id → scriptures.id ON DELETE CASCADE`; unique `(scripture_id, chapter_number)`. `chapterService.list` selects by scripture; save inserts/updates; delete by `id`; count helper selects sloka count and updates `sloka_count`. |
| `public.slokas` | `id` UUID primary key; `chapter_id`; `verse_number`; `verse_id`; `json_url`; `status`; timestamps | `chapter_id → chapters.id ON DELETE CASCADE`; unique `(chapter_id, verse_number)` and `(chapter_id, verse_id)`. List selects by chapter; Add inserts after upload; Edit updates `json_url`/timestamp by row `id`; Delete removes by row `id`. |

`scriptures.id` is the UUID parent key and is passed as `chapters.scripture_id`. `chapters.id` is passed as `slokas.chapter_id` and is also used in reading progress. `slokas.id` is the row UUID used for UI keys and update/delete predicates. `slokas.verse_id` is the stable content ID (e.g. `BG.1.1`), stored in the JSON object's `id`, used to derive the R2 key, and used in bookmarks by convention. `verse_id` is not a foreign key.

The migration seeds are inconsistent: [`src/db/content_migration.sql`](./src/db/content_migration.sql) inserts sample scripture records including Bhagavad Gita, while the deployable [`supabase/migrations/010_scripture_catalog.sql`](./supabase/migrations/010_scripture_catalog.sql) defines the catalog but does not insert those records. Whether the live catalog contains Bhagavad Gita is **Not verified**.

### Other tables relevant to content, playback, or retrieval

| Table | Declared fields and relationships | Relevance |
|---|---|---|
| `public.content_categories` | UUID `id` primary key; `name`, unique `slug`, `type`, `description`, `status`, timestamps | Separate content pipeline; selected by `publish-content`, not by active `ContentView`. |
| `public.content_chapters` | UUID `id` primary key; `category_id`, `chapter_number`, `name`, `description`, `status`, timestamps; unique `(category_id, chapter_number)` | `category_id → content_categories.id ON DELETE CASCADE`. Separate from `public.chapters`. |
| `public.content_verses` | UUID `id` primary key; `chapter_id`, `verse_number`, unique `content_id`; status/language fields; `core_r2_path`, `language_r2_paths`, `version`, `updated_by`, `is_deleted`; `audio_status`, `audio_r2_path`, `audio_version`; timestamps | `chapter_id → content_chapters.id ON DELETE CASCADE`. This parallel schema already declares audio-related metadata, but the active Sloka editor does not read/write it. |
| `public.user_preferences` | `user_id` primary key and FK to `auth.users` with cascade; preferred language and timestamp | Read by LibraryView; upserted when language changes. No delete operation found. |
| `public.reading_progress` | UUID `id` primary key; `user_id` FK to `auth.users`; `scripture_id`, `chapter_id`, `last_verse_number`, `language`, timestamp; unique `(user_id, scripture_id, chapter_id)` | Selected by user and ordered by update time; upserted on reading progress. No delete operation found. `scripture_id` and `chapter_id` are not declared foreign keys in migration 009. |
| `public.bookmarks` | UUID `id` primary key; `user_id` FK to `auth.users`; `scripture_id`, `chapter_id`, `verse_id`, `verse_number`, timestamp; unique `(user_id, verse_id)` | Selected by user; inserted and deleted by LibraryView. No update operation found. Scripture/chapter/verse references are not declared foreign keys in migration 009. |
| `public.albums` / `public.audio_tracks` | `albums`: UUID `id` primary key, title, artist, description, cover, status, track count, timestamps. `audio_tracks`: UUID `id` primary key, title, artist, `album_id`, language, duration, premium/status, `audio_url`, timestamps. | Separate audio library. `audio_tracks.album_id → albums.id ON DELETE SET NULL`. Albums are selected/inserted/updated/deleted by AlbumsView; tracks are selected/inserted/updated/deleted by AudioLibraryView. No Sloka relationship. |
| `public.admin_users` | In [`src/db/schema.sql`](./src/db/schema.sql): UUID `id`, `full_name`, unique `email`, `mobile`, role check (`super_admin`/`editor`/`viewer`), `password_hash`, `is_active`, timestamps | Admin profile/role lookup. Supabase Auth manages passwords; migration 007's trigger writes a placeholder string to `password_hash`. No FK to `auth.users` is declared in this context schema. |

`supabase/schema-inspection.sql` contains read-only information-schema/RLS/policy queries that could be run against an authorized database. It was not run here, so no claim is made that the live database has exactly these columns or policies.

The alternate `publish-content` endpoint selects category/chapter metadata, selects existing `content_verses`, upserts verse metadata, and updates publication status. No category/chapter write or verse-delete path was found in that endpoint. `admin_users` is selected by email for authorization; signup trigger code inserts new rows or updates existing profile fields. No admin-user delete path or browser role-management screen was found.

## 5. JSON content and R2 upload lifecycle

For the active editor:

1. Admin pastes one Sloka JSON object into `ContentView` and validation confirms its shape and selected scripture/chapter IDs.
2. `slokaService.add` or `slokaService.update` calls the private `uploadSlokaJson` helper in [`src/services/contentService.ts`](./src/services/contentService.ts).
3. The helper pretty-prints JSON into a browser `File` with `application/json`.
4. Its key is `slokas/${verseId.replace(/\./g, '/')}.json`; for `BG.1.1`, that is `slokas/BG/1/1.json`.
5. It invokes Supabase Edge Function `r2-upload`, passing raw file bytes, the key in `x-r2-key`, and JSON content type.
6. [`supabase/functions/r2-upload/index.ts`](./supabase/functions/r2-upload/index.ts) calls `requireAdmin(request, true)`, validates the key, puts the bytes into the configured R2 bucket, and returns `{ key, url }`. The public URL is `R2_PUBLIC_URL` joined with the key.
7. For Add, the returned URL is inserted into `slokas.json_url` along with `chapter_id`, `verse_number`, `verse_id`, status, and timestamps. For Edit, it updates `json_url` and `updated_at` by the Sloka row UUID. The service then recalculates the chapter count.
8. The active customer-like `LibraryView` fetches the row's `json_url` directly and renders the JSON fields.

Illustrative current payload shape (all required language fields are validated):

```json
{
  "id": "BG.1.1",
  "verse_number": 1,
  "sanskrit": { "devanagari": "...", "transliteration": "..." },
  "languages": {
    "en": { "translation": "...", "meaning": "...", "explanation": "...", "example": "..." }
  }
}
```

The service does not store the R2 key separately for canonical slokas; it stores only the public `json_url`. `fetchSlokaJson` performs a plain `fetch(url)`, throws on non-2xx, and parses JSON. The `r2-upload` function sets `Cache-Control: public, max-age=0, must-revalidate` for `application/json`; no explicit application-level JSON cache was found.

### Replacement, deletion, and failure behavior

- JSON Add/Edit uses the same deterministic key for the same `verse_id`. A later `PutObject` replaces that object; no prior version is kept or deleted. The URL usually remains the same.
- If upload succeeds but the Supabase insert/update fails, the object is not rolled back. For an update, the stable key may already have been overwritten. This creates an orphan or a storage/database consistency problem.
- Individual Sloka deletion deletes the R2 object first, then deletes the database row. If the database deletion fails, the row can point to an already-deleted object.
- Deleting a chapter or scripture relies on database `ON DELETE CASCADE`; there is no corresponding bulk R2 cleanup for sloka JSON or images. Those files can remain orphaned.
- R2 upload failures are reported through the service error/toast path, but the Edge Function returns a generic 500 for most storage/configuration failures. If R2 put succeeds but `R2_PUBLIC_URL` is absent, it returns an error after the object has already been written.

## 6. Cloudflare R2 upload architecture

### Main upload endpoint

- **Endpoint:** Supabase Edge Function `r2-upload`, implemented in [`supabase/functions/r2-upload/index.ts`](./supabase/functions/r2-upload/index.ts).
- **Client wrapper:** private `upload(file, key)` in [`src/services/r2Client.ts`](./src/services/r2Client.ts).
- **Authorization:** every POST and DELETE calls `requireAdmin(request, true)`, so active editors and super admins are required.
- **Storage credentials:** Deno environment variables, not a browser-side S3 client. The Edge Function constructs `S3Client` with the account endpoint, access key, secret, and bucket.
- **Naming/key generation:** the caller passes the R2 key. Helpers generate timestamp/random suffixes for images/audio; sloka JSON uses the deterministic verse-ID path; festival JSON uses a stable filename.
- **Public URL:** `R2_PUBLIC_URL` + `/` + key. The regular endpoint checks that the base exists but does not validate HTTPS/URL structure as strictly as `sadhana-media`.
- **File constraints:** `r2-upload` has no explicit MIME allowlist or application-level size limit. It reads the full request into an `ArrayBuffer` and then a `Uint8Array`. Platform-level request limits were not verified.
- **Replacement/deletion:** a `PutObject` to an existing key overwrites it. DELETE accepts any syntactically safe key; it is not restricted to a feature-specific prefix. No file-version cleanup or automatic cleanup on database failures is implemented.
- **Filename:** `x-file-name` is allowed by CORS and sent by the client but is not used by the Edge Function to choose the key. `Content-Type` is forwarded to R2.

### Existing upload helpers and parallel upload patterns

| Helper / workflow | Behavior and current use |
|---|---|
| `uploadScriptureImageToR2`, `uploadChapterImageToR2`, `uploadImageToR2`, `uploadToR2` in `src/services/r2Client.ts` | Browser-to-Edge-Function uploads for image paths. Used in Content/Scripture screens and other admin views. |
| `uploadAudioToR2` in `src/services/r2Client.ts` | Uploads a file under `audio/{timestamp}-{random}.{filename extension}`. Used by `AudioLibraryView`; it returns a URL but no database record. |
| `uploadFestivalMediaToR2`, `uploadFestivalJsonToR2`, `deleteFromR2` in `src/services/r2Client.ts` | Festival media and JSON paths plus explicit delete. Festival media UI permits `audio/*`; resulting metadata is handled by festival service code. |
| `sadhanaMediaService.upload` and `sadhana-media` Edge Function | A separate signed direct-to-R2 workflow. Validates image/audio MIME types and size (image 10 MiB, audio 25 MiB), including WAV; `complete` verifies stored type, size, and file signature. Keys are restricted to `sadhana-practices/{uuid}.{extension}`. This is a useful security pattern, but not a drop-in sloka uploader because its keys and completion workflow are practice-specific. |
| `publish-content` Edge Function | Server-side, versioned chapter JSON publication to R2; uses a different `content_*` database schema and is not called by the active `ContentView` found in this repository. |

The `AudioLibraryView` upload path accepts any browser MIME type starting with `audio/`, uploads it with `uploadAudioToR2`, then saves its URL and duration into `audio_tracks`. Replacing a track uploads a new random key; the previous R2 object is not deleted. The view computes duration using browser audio metadata but has no explicit file-size cap or server-side WAV signature check.

## 7. Customer-facing content retrieval

### What this repository verifies

[`src/views/LibraryView.tsx`](./src/views/LibraryView.tsx) contains a customer-like reading view:

1. `loadScriptures` selects published rows from `scriptures`, ordered by name.
2. `openScripture` selects published `chapters` by `scripture_id`, ordered by chapter number.
3. `openChapter` selects published `slokas` by `chapter_id`, ordered by verse number.
4. For each row, it fetches `json_url` with browser `fetch`, discovers available languages, and loads the JSON to render Devanagari, transliteration, and language-specific text. It also reads/writes `user_preferences`, `reading_progress`, and `bookmarks`.
5. There is no explicit application cache. Chapter loading fetches each Sloka JSON once to discover languages and then fetches the JSON again in `loadChapterVerses`; browser/CDN cache behavior depends on the public R2 response headers and was not live-tested.

This code is a customer-like reader embedded in the admin app and is reachable through the `Scriptures` sidebar item. It is not proof of a separate production customer application, which was not present among tracked files. A separate customer app's actual queries, cache strategy, R2 access, and playback behavior are **Not verified**.

### Audio playback

- The library/content code has no Sloka audio URL field and no audio element for a Sloka.
- `AudioLibraryView` includes HTML `<audio>` previews for `audio_tracks.audio_url`; Sadhana practice screens also preview guided/ambient URLs.
- `AudioPlayerBar` in [`src/components/AudioPlayerBar.tsx`](./src/components/AudioPlayerBar.tsx) synthesizes tones using Web Audio API; it does not play a Sloka file URL.
- Consequently, existing audio playback components do not establish that the customer-facing Gita reader can retrieve or play an audio URL.

## 8. API and function inventory

| Feature | File path | Function/API | Purpose | Database tables |
|---|---|---|---|---|
| Admin login | [`src/views/AuthView.tsx`](./src/views/AuthView.tsx) | `handleLogin` | Supabase password login; rejects unconfirmed identity; verifies admin session | `auth.users`, `admin_users` |
| Admin registration | [`src/views/AuthView.tsx`](./src/views/AuthView.tsx) | `handleRegister` | Supabase signup; new account is signed out and awaits approval | `auth.users`, `admin_users` via trigger |
| Session check | [`src/services/adminSession.ts`](./src/services/adminSession.ts) | `verifyAdminSession` | Invokes `admin-session` and validates returned role | `admin_users` |
| Session API | [`supabase/functions/admin-session/index.ts`](./supabase/functions/admin-session/index.ts) | POST handler | Returns active admin name/email/role | `admin_users` |
| Admin authorization | [`supabase/functions/_shared/adminPolicy.ts`](./supabase/functions/_shared/adminPolicy.ts) | `resolveAdmin` | Verifies bearer token, email, active state, role, and write privilege | `admin_users`, Supabase Auth |
| Admin DB clients | [`supabase/functions/_shared/requireAdmin.ts`](./supabase/functions/_shared/requireAdmin.ts) | `requireAdmin` | Creates caller-scoped Auth client and service-role DB client | Auth; table access delegated to endpoint |
| Scripture CRUD | [`src/services/contentService.ts`](./src/services/contentService.ts) | `scriptureService.list/save/delete` | Select, insert/update, delete scripture metadata | `scriptures` |
| Chapter CRUD/count | [`src/services/contentService.ts`](./src/services/contentService.ts) | `chapterService.list/save/delete/updateSlokaCount` | Chapter queries and writes; recalculates Sloka count | `chapters`, `slokas` |
| Sloka reads/writes | [`src/services/contentService.ts`](./src/services/contentService.ts) | `slokaService.list/add/update/delete` | Metadata CRUD and upload/delete of JSON objects | `slokas`, `chapters` |
| JSON R2 upload | [`src/services/contentService.ts`](./src/services/contentService.ts) | `uploadSlokaJson` | Generates verse key, serializes JSON, invokes R2 function | None directly; called before `slokas` write |
| JSON retrieval | [`src/services/contentService.ts`](./src/services/contentService.ts) | `fetchSlokaJson` | Fetches public JSON URL and parses response | None |
| Generic R2 API | [`src/services/r2Client.ts`](./src/services/r2Client.ts) | `upload`, exported upload helpers, `deleteFromR2` | Browser-to-Edge-Function upload/delete wrappers | None directly |
| R2 API | [`supabase/functions/r2-upload/index.ts`](./supabase/functions/r2-upload/index.ts) | POST/DELETE handler | Authenticated R2 put/delete and public URL generation | Admin check only |
| Content UI | [`src/views/ContentView.tsx`](./src/views/ContentView.tsx) | `validateSlokaJson`, `reloadSlokas`, `handleSaveSloka`, `confirmDelete` | Loads and validates scripture content; routes Add/Edit/Delete | `scriptures`, `chapters`, `slokas` |
| Library retrieval | [`src/views/LibraryView.tsx`](./src/views/LibraryView.tsx) | `loadScriptures`, `openScripture`, `openChapter`, `loadChapterVerses`, `fetchJson` | Loads published scripture data and JSON for reading | `scriptures`, `chapters`, `slokas`, preferences/progress/bookmarks |
| User reading state | [`src/views/LibraryView.tsx`](./src/views/LibraryView.tsx) | `saveUserPreference`, `saveReadingProgress`, `toggleBookmark` | Persists reading preference/progress/bookmarks | `user_preferences`, `reading_progress`, `bookmarks` |
| Alternate content publisher | [`supabase/functions/publish-content/index.ts`](./supabase/functions/publish-content/index.ts) | POST handler | Validates/batches up to 10 slokas, creates versioned R2 chapter files/manifest, upserts metadata | `content_categories`, `content_chapters`, `content_verses` |
| Audio library upload | [`src/views/AudioLibraryView.tsx`](./src/views/AudioLibraryView.tsx) | `handleAudioFile`, `handleSave`, `handleDelete` | Uploads audio, persists track metadata, previews track | `albums`, `audio_tracks` |
| Audio library R2 helper | [`src/services/r2Client.ts`](./src/services/r2Client.ts) | `uploadAudioToR2` | Generates audio object key and returns URL | None directly |
| Sadhana media upload | [`src/services/sadhanaMediaService.ts`](./src/services/sadhanaMediaService.ts) | `sadhanaMediaService.upload` | Validates and uploads image/audio via signed URL, then verifies completion | Admin check; practice metadata written by separate practice service |
| Sadhana media API | [`supabase/functions/sadhana-media/index.ts`](./supabase/functions/sadhana-media/index.ts) and [`supabase/functions/_shared/sadhanaMedia.ts`](./supabase/functions/_shared/sadhanaMedia.ts) | POST `sign` / `complete` | Issues constrained upload URL and validates stored object | No content catalog table directly |

## 9. Audio upload readiness

### Verified readiness

- **Recommended UI insertion point:** the Sloka modal in active [`src/views/ContentView.tsx`](./src/views/ContentView.tsx), alongside the Sloka JSON editor and Save action. It already has the selected Sloka record and `verse_id`, so it can associate an upload with the correct verse.
- **Reusable uploader:** `uploadAudioToR2` is reusable as a basic byte uploader and accepts a `File`; the current `AudioLibraryView` demonstrates WAV-compatible browser audio handling in principle. It does not validate WAV signatures, cap size, scope storage keys to slokas, or update Sloka metadata.
- **R2 WAV support:** `r2-upload` accepts arbitrary `Content-Type` and bytes, so it does not explicitly reject WAV. The standalone `sadhana-media` path explicitly allows `audio/wav`, caps audio at 25 MiB, and checks RIFF/WAVE signature. Neither fact proves deployment or large-file success in the actual R2/Supabase environment.
- **File-size policy:** no explicit file-size limit exists in the general `r2-upload` handler, `uploadAudioToR2`, or `AudioLibraryView`. The Sadhana-specific upload flow has a 25 MiB limit, but that restriction does not apply to the general uploader.
- **Audio metadata:** `public.slokas` as declared in migration 010 has no audio column. `public.content_verses` in migration 006 declares `audio_status`, `audio_r2_path`, and `audio_version`, but this is another schema and is not connected to the active editor.
- **Customer playback:** no Sloka audio URL is queried or rendered in the library view. A separate customer app's capability is **Not verified**.

### Additional functionality needed

1. Decide and document the canonical Sloka table/schema before adding fields. Extending only `content_verses` will not make audio available to the active `ContentView`/`LibraryView`, which use `slokas`.
2. Add a migration for the chosen metadata model: at minimum a durable storage reference (`audio_r2_path` or URL) and state; consider duration, MIME type, file size, version, timestamps, and who uploaded. Prefer a key over duplicating a deployment-specific public URL if URL construction is centrally managed.
3. Add a dedicated authenticated upload/completion API or safely generalize the signed-upload pattern. Enforce allowed MIME/extensions, WAV signature, a product-approved size ceiling, editor/super-admin authorization, and a Sloka-scoped key namespace. Do not rely on the client MIME or filename alone.
4. Add upload, replace, clear, and preview behavior to the active Sloka modal. Preserve audio when editing JSON. Persist metadata only after the object is confirmed uploaded; define cleanup/compensation behavior for partial failures and replacement.
5. Update the customer reader (whose source is outside this repository or currently unavailable here) to fetch the audio reference and render a playable control with loading/error behavior. Confirm its auth/public delivery and cache behavior.
6. Test role denial/allowance, valid and invalid WAV signatures, size boundaries, network failures, metadata persistence, replacement, deletion, and end-to-end playback using a representative Vāgdhenu WAV.

## 10. Findings, risks, and uncertainties

### Verified in repository source

1. **Parallel schemas:** active Content UI uses `scriptures/chapters/slokas`; `publish-content` uses `content_categories/content_chapters/content_verses`. Audio fields exist only on the latter in the declared SQL. This is a major integration ambiguity.
2. **Competing editor implementations:** `ContentView` is active; `ScripturesView` is not routed and uses a different UI and validation/language shape. Route labels can mislead an operator about which editor is in use.
3. **Scriptures route mismatch:** the sidebar's `Scriptures` item opens `LibraryView` rather than `ScripturesView`; the separate `User Library` route is intercepted as unavailable.
4. **No Sloka audio schema/playback in active flow:** `slokas` migration has no audio fields and the library rendering has no Sloka audio element.
5. **General R2 endpoint has no explicit upload-size or MIME restrictions.** It buffers the entire object in memory and returns generic storage errors. Large audio uploads may exceed infrastructure limits; exact limits are **Not verified**.
6. **R2/database writes are not atomic:** successful upload followed by DB failure can leave orphaned objects or replaced JSON without successful metadata update. Parent cascade deletes do not clean R2 objects.
7. **R2 object replacement is not versioned in the active flow:** Sloka JSON uses a deterministic key; audio library uses a new random key when replacing a track and never removes the old file.
8. **R2 DELETE key is not feature-scoped:** `safeKey` rejects malformed/traversal-like keys but the endpoint does not restrict deletion to a feature prefix. An authorized editor can request deletion of any key accepted by that syntax.
9. **Audio library table policy is misaligned in the declared migration:** [`supabase/migrations/003_albums_audio.sql`](./supabase/migrations/003_albums_audio.sql) grants `anon` `FOR ALL` policies on `albums` and `audio_tracks`, with no authenticated admin-role policy in that migration. If deployed as written, unauthenticated clients can access those tables, while the signed-in admin UI may be denied unless another policy/grant exists. Live policy state is **Not verified**.
10. **UI role metadata is mock data and controls are not role-filtered.** Backend/RLS checks are therefore the effective permission boundary.
11. **Environment drift:** Supabase client values are hard-coded instead of using the declared Vite variables. Local `.env` names include VITE-prefixed R2 secret-like and Firebase service-account fields; source references were not found. Values were not inspected or disclosed. Confirm they contain no real secrets and remove server credentials from frontend-prefixed configuration.
12. **Customer app visibility gap:** a reader-like library view is embedded in the admin app, but no separate customer application source is present in the tracked repository. External customer retrieval and playback behavior cannot be confirmed.
13. **Library retrieval repeats JSON fetches:** for a chapter, it fetches each Sloka to discover languages and then fetches them again to build chapter content. No explicit in-memory cache was found.
14. **Potential local count/list inconsistency on duplicate Add:** `slokaService.add` may update an existing row, but `ContentView` appends the returned row and increments its local count as if it inserted a new row.
15. **Migration/deployment uncertainty:** the SQL inspection script is present but not run. Seed data differs between the standalone content migration and deployable scripture migration.

### Not verified / assumptions deliberately avoided

- Current live columns, constraints, RLS policies, trigger state, seed records, and `admin_users` contents.
- Whether every listed Supabase migration has been applied and whether the `r2-upload`/other Edge Functions are deployed.
- Whether the configured R2 bucket is public, has the required CORS settings, supports the expected WAV playback/range requests, or has lifecycle/versioning rules.
- Current deployed R2 secrets, public domain, CDN behavior, and actual edge/request size limits.
- How a separate production customer application fetches scripture content or whether it already supports audio.
- Whether current local environment values contain active credentials; no values are reproduced here.

## 11. Recommended implementation plan

1. **Establish source of truth:** inspect the live database with [`supabase/schema-inspection.sql`](./supabase/schema-inspection.sql), confirm the deployed customer application, and choose either the active `slokas` model or an explicit migration of the UI/customer workflow to the `content_*` model. Avoid adding audio only to the unused parallel schema.
2. **Define audio data contract:** choose stable key-vs-URL storage, required metadata/state, replacement semantics, public/private delivery, and maximum WAV size. Define how JSON edits affect audio (normally they should not delete or silently invalidate it).
3. **Add database migration and policies:** add fields/table to the selected canonical schema, with role-appropriate RLS and any required indexes/constraints. If using `audio_status`, specify transitions and stale/failed handling.
4. **Implement constrained upload API:** require an active editor/super admin; generate a server-controlled, Sloka-scoped key; validate content type, size, and WAV signature; use a signed upload/verification flow or bounded server streaming; return a validated key/URL. Reuse the `sadhana-media` security pattern rather than its practice-specific key namespace.
5. **Implement safe metadata lifecycle:** add upload/replace/remove controls to the active `ContentView` Sloka modal, display current audio and preview it, persist metadata after upload verification, and handle orphan cleanup and object replacement without deleting a still-referenced asset.
6. **Integrate the customer reader:** update the actual customer app to select the audio metadata, display an HTML audio control, and handle missing/failed media. Validate R2 CORS, byte-range playback, cache headers, URL format, and permissions in the deployed environment.
7. **Test and deploy incrementally:** cover role matrix, MIME/signature rejection, max size, failed R2/DB updates, idempotency/replacement, delete behavior, JSON upload regression, and real-device WAV playback. Deploy the migration before UI/API use and verify the feature against a staging bucket/project first.
