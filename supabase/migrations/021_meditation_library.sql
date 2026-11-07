
BEGIN;

-- =========================================================
-- 1. MEDITATION CATEGORIES
-- =========================================================

CREATE TABLE IF NOT EXISTS public.meditation_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT DEFAULT '',
    icon_url TEXT,
    cover_image_url TEXT,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- =========================================================
-- 2. MEDITATION STAGES
-- =========================================================

CREATE TABLE IF NOT EXISTS public.meditation_stages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID NOT NULL
        REFERENCES public.meditation_categories(id)
        ON DELETE CASCADE,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    description TEXT DEFAULT '',
    stage_number INTEGER NOT NULL DEFAULT 1,
    difficulty TEXT NOT NULL DEFAULT 'beginner'
        CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
    estimated_duration_minutes INTEGER DEFAULT 5,
    cover_image_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(category_id, slug),
    UNIQUE(category_id, stage_number)
);


-- =========================================================
-- 3. MEDITATION PRACTICES
-- Independent from sadhana_practices catalog
-- =========================================================

CREATE TABLE IF NOT EXISTS public.meditation_practices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID REFERENCES public.meditation_categories(id)
        ON DELETE SET NULL,
    stage_id UUID REFERENCES public.meditation_stages(id)
        ON DELETE SET NULL,

    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    subtitle TEXT DEFAULT '',
    description TEXT DEFAULT '',
    instructions TEXT DEFAULT '',

    meditation_type TEXT NOT NULL DEFAULT 'guided'
        CHECK (meditation_type IN (
            'guided',
            'silent',
            'breathing',
            mantra,
            visualization,
            mindfulness,
            relaxation,
            other
        )),

    difficulty TEXT NOT NULL DEFAULT 'beginner'
        CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),

    default_duration_seconds INTEGER NOT NULL DEFAULT 300
        CHECK (default_duration_seconds > 0),

    available_durations_seconds INTEGER[]
        DEFAULT ARRAY[60, 180, 300, 600, 900, 1200],

    requires_audio BOOLEAN NOT NULL DEFAULT FALSE,
    has_ambient_audio BOOLEAN NOT NULL DEFAULT FALSE,
    has_bell BOOLEAN NOT NULL DEFAULT TRUE,
    allow_silent_mode BOOLEAN NOT NULL DEFAULT TRUE,

    cover_image_url TEXT,
    benefits JSONB NOT NULL DEFAULT '[]'::jsonb,
    tags JSONB NOT NULL DEFAULT '[]'::jsonb,

    is_featured BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    display_order INTEGER NOT NULL DEFAULT 0,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- =========================================================
-- 4. PRACTICE TRANSLATIONS
-- =========================================================

CREATE TABLE IF NOT EXISTS public.meditation_practice_translations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    practice_id UUID NOT NULL
        REFERENCES public.meditation_practices(id)
        ON DELETE CASCADE,

    language_code TEXT NOT NULL
        CHECK (language_code IN ('te', 'hi', 'en', 'kn', 'ta', 'ml')),

    display_name TEXT,
    subtitle TEXT,
    description TEXT,
    instructions TEXT,
    benefits JSONB DEFAULT '[]'::jsonb,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(practice_id, language_code)
);


-- =========================================================
-- 5. MEDITATION AUDIO ASSETS (Cloudflare R2)
-- =========================================================

CREATE TABLE IF NOT EXISTS public.meditation_audio_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    practice_id UUID NOT NULL
        REFERENCES public.meditation_practices(id)
        ON DELETE CASCADE,

    audio_type TEXT NOT NULL
        CHECK (audio_type IN (
            'guided',
            'ambient',
            'background',
            'bell',
            'instruction',
            other
        )),

    language_code TEXT
        CHECK (language_code IN ('te', 'hi', 'en', 'kn', 'ta', 'ml')),

    title TEXT DEFAULT '',
    storage_provider TEXT NOT NULL DEFAULT 'cloudflare_r2',
    storage_key TEXT NOT NULL,
    public_url TEXT,

    duration_seconds INTEGER,
    file_size_bytes BIGINT,
    mime_type TEXT DEFAULT 'audio/mpeg',

    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    display_order INTEGER NOT NULL DEFAULT 0,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- =========================================================
-- 6. SESSION PHASES
-- Example: Preparation -> Breathing -> Meditation -> Closing
-- =========================================================

CREATE TABLE IF NOT EXISTS public.meditation_session_phases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    practice_id UUID NOT NULL
        REFERENCES public.meditation_practices(id)
        ON DELETE CASCADE,

    phase_name TEXT NOT NULL,
    phase_type TEXT NOT NULL DEFAULT 'meditation'
        CHECK (phase_type IN (
            'preparation',
            'breathing',
            meditation,
            mantra,
            silence,
            closing,
            other
        )),

    duration_seconds INTEGER NOT NULL DEFAULT 60,
    instructions TEXT DEFAULT '',
    audio_asset_id UUID
        REFERENCES public.meditation_audio_assets(id)
        ON DELETE SET NULL,

    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- =========================================================
-- 7. STAGE-PRACTICE MAPPING
-- =========================================================

CREATE TABLE IF NOT EXISTS public.meditation_stage_practices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    stage_id UUID NOT NULL
        REFERENCES public.meditation_stages(id)
        ON DELETE CASCADE,

    practice_id UUID NOT NULL
        REFERENCES public.meditation_practices(id)
        ON DELETE CASCADE,

    sequence_number INTEGER NOT NULL DEFAULT 1,
    is_required BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(stage_id, practice_id),
    UNIQUE(stage_id, sequence_number)
);


-- =========================================================
-- 8. USER MEDITATION PREFERENCES
-- Firebase UID references public.users(firebase_uid)
-- =========================================================

CREATE TABLE IF NOT EXISTS public.user_meditation_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    firebase_uid TEXT NOT NULL UNIQUE
        REFERENCES public.users(firebase_uid)
        ON DELETE CASCADE,

    preferred_language TEXT DEFAULT 'en'
        CHECK (preferred_language IN ('te', 'hi', 'en', 'kn', 'ta', 'ml')),

    preferred_duration_seconds INTEGER DEFAULT 300,
    preferred_meditation_type TEXT DEFAULT 'guided',

    enable_bell BOOLEAN NOT NULL DEFAULT TRUE,
    enable_ambient_audio BOOLEAN NOT NULL DEFAULT TRUE,
    enable_guidance BOOLEAN NOT NULL DEFAULT TRUE,

    reminder_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    reminder_time TIME,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- =========================================================
-- 9. MEDITATION SESSIONS
-- =========================================================

CREATE TABLE IF NOT EXISTS public.user_meditation_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    firebase_uid TEXT NOT NULL
        REFERENCES public.users(firebase_uid)
        ON DELETE CASCADE,

    practice_id UUID
        REFERENCES public.meditation_practices(id)
        ON DELETE SET NULL,

    stage_id UUID
        REFERENCES public.meditation_stages(id)
        ON DELETE SET NULL,

    client_session_key UUID NOT NULL,

    status TEXT NOT NULL DEFAULT 'active'
        CHECK (status IN (
            'active',
            'paused',
            'completed',
            'abandoned'
        )),

    planned_duration_seconds INTEGER NOT NULL DEFAULT 300,
    elapsed_duration_seconds INTEGER NOT NULL DEFAULT 0,

    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    completion_percentage NUMERIC(5,2) NOT NULL DEFAULT 0,

    xp_awarded INTEGER NOT NULL DEFAULT 0,
    sadhana_synced BOOLEAN NOT NULL DEFAULT FALSE,

    version INTEGER NOT NULL DEFAULT 0,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(firebase_uid, client_session_key)
);


-- =========================================================
-- 10. MEDITATION REFLECTIONS
-- =========================================================

CREATE TABLE IF NOT EXISTS public.user_meditation_reflections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    firebase_uid TEXT NOT NULL
        REFERENCES public.users(firebase_uid)
        ON DELETE CASCADE,

    session_id UUID NOT NULL UNIQUE
        REFERENCES public.user_meditation_sessions(id)
        ON DELETE CASCADE,

    mood_before TEXT,
    mood_after TEXT,

    reflection_text TEXT
        CHECK (char_length(reflection_text) <= 5000),

    gratitude_text TEXT
        CHECK (char_length(gratitude_text) <= 2000),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- =========================================================
-- 11. DAILY MEDITATION RECOMMENDATIONS
-- =========================================================

CREATE TABLE IF NOT EXISTS public.meditation_daily_recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    practice_id UUID NOT NULL
        REFERENCES public.meditation_practices(id)
        ON DELETE CASCADE,

    recommendation_date DATE NOT NULL,
    title TEXT DEFAULT '',
    description TEXT DEFAULT '',
    display_order INTEGER NOT NULL DEFAULT 0,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(practice_id, recommendation_date)
);


-- =========================================================
-- 12. INDEXES
-- =========================================================

CREATE INDEX IF NOT EXISTS idx_meditation_stages_category
    ON public.meditation_stages(category_id);

CREATE INDEX IF NOT EXISTS idx_meditation_practices_category
    ON public.meditation_practices(category_id);

CREATE INDEX IF NOT EXISTS idx_meditation_practices_stage
    ON public.meditation_practices(stage_id);

CREATE INDEX IF NOT EXISTS idx_meditation_translations_practice
    ON public.meditation_practice_translations(practice_id);

CREATE INDEX IF NOT EXISTS idx_meditation_audio_practice
    ON public.meditation_audio_assets(practice_id);

CREATE INDEX IF NOT EXISTS idx_meditation_sessions_user_date
    ON public.user_meditation_sessions(firebase_uid, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_meditation_sessions_status
    ON public.user_meditation_sessions(status);

CREATE INDEX IF NOT EXISTS idx_meditation_stage_mapping
    ON public.meditation_stage_practices(stage_id, sequence_number);

CREATE INDEX IF NOT EXISTS idx_meditation_recommendations_date
    ON public.meditation_daily_recommendations(recommendation_date);


-- =========================================================
-- 13. FIX EXISTING FRONTEND QUERY
-- The existing practiceCatalog.ts expects this column.
-- This is nullable and does not modify existing records.
-- =========================================================

ALTER TABLE public.sadhana_practices
    ADD COLUMN IF NOT EXISTS meditation_category_id UUID;


-- =========================================================
-- 14. Sadhana progress: Firebase identity column
-- Do not backfill legacy user_id automatically.
-- =========================================================

ALTER TABLE public.sadhana_progress
    ADD COLUMN IF NOT EXISTS firebase_uid TEXT;

-- Add FK only if it does not already exist.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'sadhana_progress_firebase_uid_fkey'
          AND conrelid = 'public.sadhana_progress'::regclass
    ) THEN
        ALTER TABLE public.sadhana_progress
            ADD CONSTRAINT sadhana_progress_firebase_uid_fkey
            FOREIGN KEY (firebase_uid)
            REFERENCES public.users(firebase_uid);
    END IF;
END $$;


-- =========================================================
-- 15. Sadhana practice log: Firebase identity and session link
-- =========================================================

ALTER TABLE public.sadhana_practice_log
    ADD COLUMN IF NOT EXISTS firebase_uid TEXT;

ALTER TABLE public.sadhana_practice_log
    ADD COLUMN IF NOT EXISTS meditation_session_id UUID;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'sadhana_practice_log_firebase_uid_fkey'
          AND conrelid = 'public.sadhana_practice_log'::regclass
    ) THEN
        ALTER TABLE public.sadhana_practice_log
            ADD CONSTRAINT sadhana_practice_log_firebase_uid_fkey
            FOREIGN KEY (firebase_uid)
            REFERENCES public.users(firebase_uid);
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'sadhana_practice_log_meditation_session_fkey'
          AND conrelid = 'public.sadhana_practice_log'::regclass
    ) THEN
        ALTER TABLE public.sadhana_practice_log
            ADD CONSTRAINT sadhana_practice_log_meditation_session_fkey
            FOREIGN KEY (meditation_session_id)
            REFERENCES public.user_meditation_sessions(id)
            ON DELETE SET NULL;
    END IF;
END $$;


-- =========================================================
-- 16. UNIQUE INDEXES FOR FIREBASE PROGRESS
-- Only applies to non-null Firebase UIDs.
-- =========================================================

CREATE UNIQUE INDEX IF NOT EXISTS
    uq_sadhana_progress_firebase_uid
ON public.sadhana_progress(firebase_uid)
WHERE firebase_uid IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS
    uq_sadhana_log_meditation_session
ON public.sadhana_practice_log(meditation_session_id)
WHERE meditation_session_id IS NOT NULL;


-- =========================================================
-- 17. UPDATED_AT TRIGGER FUNCTION
-- =========================================================

CREATE OR REPLACE FUNCTION public.set_meditation_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


-- =========================================================
-- 18. UPDATED_AT TRIGGERS
-- =========================================================

DO $$
DECLARE
    t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'meditation_categories',
        'meditation_stages',
        'meditation_practices',
        'meditation_practice_translations',
        'meditation_audio_assets',
        'user_meditation_preferences',
        'user_meditation_sessions',
        'user_meditation_reflections'
    ]
    LOOP
        EXECUTE format(
            'DROP TRIGGER IF EXISTS trg_%I_updated_at ON public.%I',
            t, t
        );

        EXECUTE format(
            'CREATE TRIGGER trg_%I_updated_at
             BEFORE UPDATE ON public.%I
             FOR EACH ROW
             EXECUTE FUNCTION public.set_meditation_updated_at()',
            t, t
        );
    END LOOP;
END $$;


-- =========================================================
-- 19. ENABLE ROW LEVEL SECURITY
-- =========================================================

ALTER TABLE public.meditation_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meditation_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meditation_practices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meditation_practice_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meditation_audio_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meditation_session_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meditation_stage_practices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_meditation_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_meditation_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_meditation_reflections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meditation_daily_recommendations ENABLE ROW LEVEL SECURITY;


-- =========================================================
-- 20. PUBLIC READ POLICIES FOR PUBLISHED/ACTIVE CONTENT
-- =========================================================

DROP POLICY IF EXISTS meditation_categories_public_read
    ON public.meditation_categories;

CREATE POLICY meditation_categories_public_read
ON public.meditation_categories
FOR SELECT
TO anon, authenticated
USING (is_active = TRUE);


DROP POLICY IF EXISTS meditation_stages_public_read
    ON public.meditation_stages;

CREATE POLICY meditation_stages_public_read
ON public.meditation_stages
FOR SELECT
TO anon, authenticated
USING (is_active = TRUE);


DROP POLICY IF EXISTS meditation_practices_public_read
    ON public.meditation_practices;

CREATE POLICY meditation_practices_public_read
ON public.meditation_practices
FOR SELECT
TO anon, authenticated
USING (is_active = TRUE);


DROP POLICY IF EXISTS meditation_translations_public_read
    ON public.meditation_practice_translations;

CREATE POLICY meditation_translations_public_read
ON public.meditation_practice_translations
FOR SELECT
TO anon, authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.meditation_practices p
        WHERE p.id = practice_id
          AND p.is_active = TRUE
    )
);


DROP POLICY IF EXISTS meditation_audio_public_read
    ON public.meditation_audio_assets;

CREATE POLICY meditation_audio_public_read
ON public.meditation_audio_assets
FOR SELECT
TO anon, authenticated
USING (
    is_active = TRUE
    AND EXISTS (
        SELECT 1
        FROM public.meditation_practices p
        WHERE p.id = practice_id
          AND p.is_active = TRUE
    )
);


DROP POLICY IF EXISTS meditation_phases_public_read
    ON public.meditation_session_phases;

CREATE POLICY meditation_phases_public_read
ON public.meditation_session_phases
FOR SELECT
TO anon, authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.meditation_practices p
        WHERE p.id = practice_id
          AND p.is_active = TRUE
    )
);


DROP POLICY IF EXISTS meditation_stage_practices_public_read
    ON public.meditation_stage_practices;

CREATE POLICY meditation_stage_practices_public_read
ON public.meditation_stage_practices
FOR SELECT
TO anon, authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.meditation_stages s
        WHERE s.id = stage_id
          AND s.is_active = TRUE
    )
);


DROP POLICY IF EXISTS meditation_recommendations_public_read
    ON public.meditation_daily_recommendations;

CREATE POLICY meditation_recommendations_public_read
ON public.meditation_daily_recommendations
FOR SELECT
TO anon, authenticated
USING (
    is_active = TRUE
    AND EXISTS (
        SELECT 1
        FROM public.meditation_practices p
        WHERE p.id = practice_id
          AND p.is_active = TRUE
    )
);


-- =========================================================
-- 21. USER DATA: NO DIRECT CLIENT ACCESS
-- Firebase-authenticated API / Edge Functions should access
-- these using trusted server-side credentials.
-- =========================================================

DROP POLICY IF EXISTS meditation_preferences_no_client_access
    ON public.user_meditation_preferences;

CREATE POLICY meditation_preferences_no_client_access
ON public.user_meditation_preferences
FOR ALL
TO anon, authenticated
USING (FALSE)
WITH CHECK (FALSE);


DROP POLICY IF EXISTS meditation_sessions_no_client_access
    ON public.user_meditation_sessions;

CREATE POLICY meditation_sessions_no_client_access
ON public.user_meditation_sessions
FOR ALL
TO anon, authenticated
USING (FALSE)
WITH CHECK (FALSE);


DROP POLICY IF EXISTS meditation_reflections_no_client_access
    ON public.user_meditation_reflections;

CREATE POLICY meditation_reflections_no_client_access
ON public.user_meditation_reflections
FOR ALL
TO anon, authenticated
USING (FALSE)
WITH CHECK (FALSE);


-- =========================================================
-- 22. GRANTS
-- =========================================================

GRANT SELECT ON
    public.meditation_categories,
    public.meditation_stages,
    public.meditation_practices,
    public.meditation_practice_translations,
    public.meditation_audio_assets,
    public.meditation_session_phases,
    public.meditation_stage_practices,
    public.meditation_daily_recommendations
TO anon, authenticated;

GRANT ALL ON
    public.meditation_categories,
    public.meditation_stages,
    public.meditation_practices,
    public.meditation_practice_translations,
    public.meditation_audio_assets,
    public.meditation_session_phases,
    public.meditation_stage_practices,
    public.meditation_daily_recommendations
TO service_role;

GRANT ALL ON
    public.user_meditation_preferences,
    public.user_meditation_sessions,
    public.user_meditation_reflections
TO service_role;

GRANT EXECUTE ON FUNCTION public.set_meditation_updated_at()
TO service_role;


-- =========================================================
-- 23. RELOAD POSTGREST SCHEMA CACHE
-- =========================================================

NOTIFY pgrst, 'reload schema';

COMMIT;
