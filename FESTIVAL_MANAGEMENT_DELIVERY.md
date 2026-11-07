# Festival management delivery report

> Follow-up: migration 023 has now been deployed and authenticated live API verification completed. See [FESTIVAL_LIVE_VERIFICATION.md](FESTIVAL_LIVE_VERIFICATION.md). The implementation-stage limitations below describe the earlier checkpoint.

Verification date: 7 November 2026 (Asia/Calcutta).

## Delivery status

Local implementation and automated checks are complete for the changes described below. Production readiness is blocked on deployment and authenticated end-to-end verification. The live database currently lacks `festivals.wizard_state`. No deployed data was created, published, archived, removed, or uploaded during this task. Notifications and Sadhana implementation were not modified.

## Nine wizard steps

1. Festival Details
2. Panchanga
3. Timings
4. Fasting
5. Content
6. Puja
7. Related Content
8. Media (includes Home Page Settings)
9. Review & Publish

## Complete field mapping

The mappings below were checked against the existing components, TypeScript types and migrations 004, 012, 013, 014, 015 and 022. Live read-only schema checks confirmed the mapped columns in all five tables, except the undeployed wizard_state column. The five existing tables are reused; no new tables or upload endpoints are introduced.

`F` = festivals; `O` = festival_occurrences; `C` = festival_content; `S` = festival_settings; `M` = festival_media.

Every O/C/S/M row has `festival_id -> festivals.id`. C/M optionally have `occurrence_id -> festival_occurrences.id`. `F.cover_media_id -> M.id` uses an image belonging to the same festival. Related-content IDs are existing JSON references, not SQL foreign keys. Dedicated columns retain existing JSON structures only where the schema already uses JSON.

| Step | Field / column | Table | Required and validation | Media |
|---|---|---|---|---|
| 1 | `name` | F | Required by existing wizard validation; nonblank text. | No |
| 1 | `alternate_name` | F | Optional; existing value preserved. | No |
| 1 | `slug` | F | Required effective value; generated from name if blank; lowercase alphanumeric/hyphens; database unique. | No |
| 1 | `festival_type` | F | Required; existing eight-value selection. | No |
| 1 | `primary_deity` | F | Optional; existing value preserved. | No |
| 1 | `associated_deities` | F | Preserved {name, role?} array; no input in current nine-step UI. | No |
| 1 | `tradition` | F | Optional; general/vaishnava/shaiva/shakta/smarta/other. | No |
| 1 | `short_description` | F | Required by existing wizard validation; nonblank text. | No |
| 1 | `is_active` | F | Boolean; affects customer visibility only when Published. | No |
| 1 | `cover_media_id` | F | Optional; image/banner/gallery media FK owned by festival. | Media FK |
| 2 | `year` | O | Whole year 1?9999; must match date; unique (festival_id, year). | No |
| 2 | `festival_date` | O | Required to leave Panchanga/publish; optional for draft; real YYYY-MM-DD. | No |
| 2 | `tithi_name` | O | Optional; existing value preserved. | No |
| 2 | `paksha` | O | Optional; Shukla Paksha or Krishna Paksha. | No |
| 2 | `nakshatra_name` | O | Optional; existing value preserved. | No |
| 2 | `yoga_name` | O | Optional; existing value preserved. | No |
| 3 | `shubha_muhurta_start` | O | Optional valid timestamp; end must be at/after start; editor displays Asia/Kolkata. | No |
| 3 | `shubha_muhurta_end` | O | Optional valid timestamp; end must be at/after start; editor displays Asia/Kolkata. | No |
| 6 | `puja_time_start` | O | Optional valid timestamp; end must be at/after start; editor displays Asia/Kolkata. | No |
| 6 | `puja_time_end` | O | Optional valid timestamp; end must be at/after start; editor displays Asia/Kolkata. | No |
| 3 | `rahu_kalam_start` | O | Optional valid timestamp; end must be at/after start; editor displays Asia/Kolkata. | No |
| 3 | `rahu_kalam_end` | O | Optional valid timestamp; end must be at/after start; editor displays Asia/Kolkata. | No |
| 3 | `yamagandam_start` | O | Optional valid timestamp; end must be at/after start; editor displays Asia/Kolkata. | No |
| 3 | `yamagandam_end` | O | Optional valid timestamp; end must be at/after start; editor displays Asia/Kolkata. | No |
| 3 | `gulika_kalam_start` | O | Optional valid timestamp; end must be at/after start; editor displays Asia/Kolkata. | No |
| 3 | `gulika_kalam_end` | O | Optional valid timestamp; end must be at/after start; editor displays Asia/Kolkata. | No |
| 4 | `fasting_enabled` | O | Boolean. Conditional controls retain hidden values. | No |
| 4 | `fasting_type` | O | Optional; existing value preserved. | No |
| 4 | `parana_required` | O | Boolean. Conditional controls retain hidden values. | No |
| 4 | `parana_time` | O | Valid timestamp if supplied; required for publishing when fasting and Parana are enabled. | No |
| 4 | `fasting_rules` | O | Optional; existing value preserved. | No |
| 3 | `custom_timings` | O | Optional array; each {name, start, end, description}; nonblank name, HH:mm times, ordered range. | No |
| 5 | `festival_description` | C | Optional; existing value preserved. | No |
| 5 | `spiritual_significance` | C | Optional; existing value preserved. | No |
| 5 | `festival_story` | C | Optional ordered sections {title, content}; ## headings parsed into sections. | No |
| 5 | `scriptural_references` | C | Preserved {reference, text} array; no dedicated input in current wizard. | No |
| 6 | `puja_name` | C | Optional; existing value preserved. | No |
| 6 | `puja_duration_minutes` | C | Preserved optional positive integer; no input in current wizard. | No |
| 6 | `puja_description` | C | Optional; existing value preserved. | No |
| 6 | `puja_samagri` | C | Optional {item, quantity, required} array; nonblank item per added row; quantity optional; required is boolean. | No |
| 5, 6 | `puja_vidhi` | C | Optional ordered sections {title, content}; both editors share same column. | No |
| 5 | `story_r2_key` | C | Optional; populated from successful secure JSON upload, persisted in content. | R2 key |
| 5 | `story_r2_url` | C | Optional; populated from successful secure JSON upload, persisted in content. | R2 URL |
| 5 | `puja_r2_key` | C | Optional; populated from successful secure JSON upload, persisted in content. | R2 key |
| 5 | `puja_r2_url` | C | Optional; populated from successful secure JSON upload, persisted in content. | R2 URL |
| 7 | `related_scriptures` | C | Optional {id, title} array; title required per added row; content ID optional. | No |
| 7 | `related_slokas` | C | Optional {id, title} array; title required per added row; content ID optional. | No |
| 7 | `related_mantras` | C | Optional {id, title} array; title required per added row; content ID optional. | No |
| 7 | `related_stotrams` | C | Optional {id, title} array; title required per added row; content ID optional. | No |
| 7 | `related_music` | C | Optional {id, title} array; title required per added row; content ID optional. | No |
| 7 | `related_stories` | C | Optional {id, title} array; title required per added row; content ID optional. | No |
| 8 | `show_on_home` | S | Boolean; home/calendar visibility preferences. | No |
| 8 | `is_featured` | S | Boolean; home/calendar visibility preferences. | No |
| 8 | `priority` | S | Integer 0?100. | No |
| 8 | `show_from` | S | Optional real YYYY-MM-DD; until cannot precede from. | No |
| 8 | `show_until` | S | Optional real YYYY-MM-DD; until cannot precede from. | No |
| 8 | `show_in_calendar` | S | Boolean; home/calendar visibility preferences. | No |
| 1, 9 | `status` | F | Draft / Published / Archived; publication validates complete required data. | No |
| 9 | `status` | O | Derived draft / published / archived; existing review state remains a schema value. | No |
| All | `wizard_state.step` | F | Resume step 1?9. | No |
| All | `wizard_state.occurrence_id` | F | Selected saved occurrence ID; retained across resume. | No |
| 2?4 | `wizard_state.occurrence_draft` | F | Temporary incomplete occurrence only while required date is missing; moved into O when date is supplied. | No |

Step 9 has a read-only summary and lifecycle actions, not another set of fields. The unused generated client banner URL is derived from the cover media row, never saved as an invented festival column.

### Media fields and metadata

| Step | Existing control | Storage and relationship | Validation |
|---|---|---|---|
| 1 | Cover image | R2 object -> M public_url/r2_key/storage_key; F.cover_media_id set through set_festival_cover | JPEG, PNG, WebP; nonempty, up to 10 MiB |
| 5 | Story JSON | R2 object + M media_type=story_json + C.story_r2_key/story_r2_url | Valid generated JSON, nonempty, up to 2 MiB |
| 5 | Puja Vidhi JSON | R2 object + M media_type=puja_json + C.puja_r2_key/puja_r2_url | Valid generated JSON, nonempty, up to 2 MiB |
| 8 | Festival images | R2 object + M media_type=image; existing banner/gallery rows also displayed | JPEG, PNG, WebP; up to 10 MiB each |
| 8 | Audio | R2 object + M media_type=audio | MPEG, MP4 audio, WAV, OGG, WebM audio; up to 25 MiB |
| 8 | Video | R2 object + M media_type=video | MP4/WebM; up to 100 MiB |

| M column | Source / validation |
|---|---|
| `id` | Database-generated UUID; reused for edits/retries. |
| `festival_id` | Actual saved parent ID; required FK. |
| `occurrence_id` | Optional existing occurrence FK; file pickers currently create festival-wide references. |
| `media_type` | Existing allowed media category; no new categories. |
| `r2_key` | Successful R2 object key. |
| `storage_key` | Existing legacy key alias; same object reference. |
| `public_url` | Successful HTTPS upload result. |
| `file_name` | Selected filename or generated story.json / puja-vidhi.json. |
| `mime_type` | Validated actual upload MIME declaration. |
| `file_size` | File/Blob byte length, validated against type limit. |
| `is_cover` | False on insertion; atomic cover selection updates flag and parent FK. |
| `sort_order` | Existing display position. |
| `display_order` | Existing ordering alias. |
| `title` | Cover title or existing metadata; optional. |
| `description` | Optional existing metadata. |
| `language_code` | Optional existing metadata. |
| `alt_text` | Optional existing metadata. |
| `caption` | Optional existing metadata. |
| `duration_seconds` | Optional existing metadata; null for new uploads. |
| `created_by` | Database-managed existing audit metadata. |
| `created_at / updated_at` | Existing database defaults/triggers; preserved on updates. |

## Persistence and retry behavior

- New records receive real database IDs. RPC saves are atomic and serialize child decisions with a parent lock. Existing RPC validation/authorization errors are surfaced, never retried through less strict writes.
- The missing-RPC fallback remains available. It updates the parent, saves occurrences using the existing (festival_id, year) conflict key, settings using festival_id, and content by its existing identity/occurrence association. It never invents a date or substitutes another occurrence?s content. The parent ID is retained when child persistence fails.
- Fallback saves are sequential, not transactional. They place the parent in Draft until the final confirmed write. A failure can leave a partially saved draft and is reported as incomplete. Resume metadata requires the wizard_state migration; the deployed missing column is reported explicitly.
- Next validates the current step and saves before advancing when the whole draft is saveable. If another step contains invalid values, navigation retains them and explicitly reports that correction is needed before saving. Back retains state. Save Draft does not require a date or all nine steps, but supplied invalid values/empty structured rows still require correction.
- Reopen fetches all occurrence rows, settings, content and media, chooses the recorded occurrence (otherwise latest year), and restores the saved step. The existing UI still edits one occurrence at a time; no historical-occurrence management page was introduced.
- Uploads use the existing authenticated r2-upload function with editor authorization and browser-safe session credentials. No R2 or service-role secrets are added to the frontend.
- A successful R2 upload is cached by SHA-256 content identity in the current tab. Re-selecting the same file/retrying JSON reuses that object when database persistence failed. Existing media is reconciled by festival_id and r2_key before insertion. Retry instructions are displayed on failure. This cache survives step navigation, not a full browser reload.
- Cover replacement uses the existing atomic cover RPC. Old objects and unrelated media remain intact. JSON replacement preserves prior media references. Removing a reference uses the existing database action and never deletes an R2 object.

## Customer contract and lifecycle

The normalized parent/occurrence/content/settings/media structure is preserved. Published and active parents are customer-readable under the existing parent RLS. Migration 023 replaces both historical public occurrence policy names so occurrence reads also require a published, active parent. Editor/super-admin policies are preserved. Archive changes status without deleting relationships. Display dates and show_in_calendar/show_on_home remain available for customer query filters.

No separate customer application source is present in this workspace. Customer screen rendering and its date/home filters have therefore not been verified or changed. This is a separate integration verification requirement.

## Verification

| Area | Result / evidence |
|---|---|
| Admin unit/integration suite | 103 tests passed, including 13 new festival tests; Supabase and XHR are mocked in festival integration tests. |
| Nine save steps | Automated payload coverage for steps 1?9, dedicated column whitelists, nested content/occurrence preservation. |
| Draft/create/resume | Automated real-ID propagation, partial child failure, missing-RPC fallback, no fabricated date, resume occurrence/content/cover selection. |
| Edit / duplicates | Automated repeated fallback updates and cross-occurrence protection; settings conflict key asserted. |
| Media | Automated supported MIME/size/path checks, same-object binary/JSON retry, existing metadata reuse. No actual R2 upload performed. |
| Publish/archive | Automated fallback lifecycle sequencing and no-delete behavior. SQL policies reviewed, not executed. |
| Roles | Existing admin authorization tests pass; RPC authorization failures never fall back. Deployed role writes not tested. |
| TypeScript | npm run lint passed. |
| Production build | npm run build passed; existing large-bundle warning remains. |
| Live Supabase reads | Mapped column projections for all five tables returned HTTP 200. wizard_state returned HTTP 400 / 42703 (missing column). Anonymous hidden-parent query returned zero rows. |
| Browser Back/Next / file previews | Code reviewed; no automated browser interaction or authenticated manual session was available. |
| Live Supabase writes / R2 | Not verified. No admin session, live write or upload was used. |

The sandbox initially blocked the test runner?s Windows user lookup and Vite configuration access; tests/build succeeded when run with approved external execution. Read-only network access likewise required escalation. The read-only smoke check is reproducible with `node tests/festivalLiveReadOnly.mjs` and performs GET requests only.

## Files changed in this task

- src/components/FestivalWizard.tsx
- src/components/Step1BasicInfo.tsx
- src/components/Step4Content.tsx
- src/components/StepMedia.tsx
- src/services/festivalService.ts
- src/services/festivalValidation.ts
- src/services/r2Client.ts
- src/types.ts (optional full occurrence list only)
- supabase/migrations/023_festival_persistence_completion.sql
- tests/festivals.test.ts
- tests/festivalLiveReadOnly.mjs
- FESTIVAL_MANAGEMENT_DELIVERY.md

The workspace already contained extensive uncommitted changes. Those changes were preserved; the git diff against HEAD includes unrelated pre-existing work and is not the list of changes made in this task. Existing migration 022 and the R2 Edge Function were inspected and retained.

## Deployment requirements and remaining limits

1. Review/apply migration 023 to the linked Supabase project. It carries forward the existing 022 wizard/cover functions and publication validation, adds wizard_state if missing, records the occurrence selection, validates custom timing order, and tightens public occurrence reads. No rows or R2 objects are deleted. Do not blindly push unrelated pending migrations from this already-modified workspace.
2. Ensure the existing r2-upload Edge Function and its shared authorization/media-validation imports are deployed. Configure its existing server-only R2 secrets and public URL. Deploy the rebuilt admin bundle.
3. In an authenticated editor session, exercise all nine steps, draft reopen, repeated saves, all media types, replacement, interrupted upload/metadata save, publication, active toggle and archive. Verify customer list/detail/date filtering separately. Test viewer rejection and super-admin access. These deployed checks remain outstanding.
4. Before testing publication in the real project, account for any pre-existing notification side effects outside this task. No notification code, function, policy, trigger or test was added or changed here.
5. Fallback writes cannot offer the RPC?s cross-request transaction/locking guarantees. Content/media do not have a newly invented unique constraint. Sequential repeated saves are reconciled; concurrent clients require the deployed RPC for atomic wizard saves.
6. Retry reuse currently lasts for the current tab. A page reload after an R2 success but before a confirmed metadata write can leave an unreferenced retained object. No destructive cleanup is attempted.
7. SQL migration execution, deployed RLS roles, customer rendering, and live R2 persistence are not claimed as verified. Production completion depends on these deployment checks.
