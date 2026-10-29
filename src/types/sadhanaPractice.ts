export const SADHANA_PRACTICE_CATEGORIES = [
  'meditation',
  'japa',
  'mantra',
  'gratitude',
  'scripture_reading',
] as const;

export type SadhanaPracticeCategory = (typeof SADHANA_PRACTICE_CATEGORIES)[number];

export const SADHANA_PRACTICE_DIFFICULTIES = ['beginner', 'intermediate', 'advanced'] as const;
export type SadhanaPracticeDifficulty = (typeof SADHANA_PRACTICE_DIFFICULTIES)[number];

export const SADHANA_PRACTICE_MODES = [
  'timer',
  'repetition',
  'guided_audio',
  'reflection',
  'scripture_reading',
] as const;
export type SadhanaPracticeMode = (typeof SADHANA_PRACTICE_MODES)[number];

export const SADHANA_TARGET_TYPES = [
  'none',
  'duration',
  'repetitions',
  'entries',
  'verses',
  'chapters',
] as const;
export type SadhanaTargetType = (typeof SADHANA_TARGET_TYPES)[number];

export const SADHANA_COMPLETION_RULES = [
  'manual',
  'timer_elapsed',
  'repetitions_reached',
  'entries_submitted',
  'audio_completed',
] as const;
export type SadhanaCompletionRule = (typeof SADHANA_COMPLETION_RULES)[number];

export const SADHANA_TIMES_OF_DAY = ['morning', 'afternoon', 'evening', 'anytime'] as const;
export type SadhanaTimeOfDay = (typeof SADHANA_TIMES_OF_DAY)[number];

export type SadhanaPracticeMediaKind = 'image' | 'audio';
export type SadhanaPracticeMediaSelection = 'none' | SadhanaPracticeMediaKind;

export const SADHANA_CONTENT_LANGUAGES = ['en', 'te', 'hi', 'kn', 'ta', 'ml'] as const;
export type SadhanaContentLanguage = (typeof SADHANA_CONTENT_LANGUAGES)[number];

export interface SadhanaLocalizedText {
  meaning?: string | null;
  instructions?: string | null;
}

export type SadhanaLocalizedContent = Partial<Record<SadhanaContentLanguage, SadhanaLocalizedText>>;

// Category-specific configuration shapes stored in category_config JSONB.
export interface MeditationConfig {
  is_guided: boolean;
  breathing_guidance?: string | null;
  begin_instructions?: string | null;
  end_instructions?: string | null;
  localized_content?: SadhanaLocalizedContent | null;
}
export interface JapaConfig {
  mantra_name?: string | null;
  mantra_text?: string | null;
  transliteration?: string | null;
  meaning?: string | null;
  count_preset?: number | null; // e.g. 108 — optional preset, not a universal default
  counter_enabled?: boolean;
  mala_counter: boolean;
  counter_instructions?: string | null;
  localized_content?: SadhanaLocalizedContent | null;
}
export interface MantraConfig {
  mantra_name?: string | null;
  mantra_text?: string | null;
  transliteration?: string | null;
  meaning?: string | null;
  localized_content?: SadhanaLocalizedContent | null;
}
export interface GratitudeConfig {
  prompts?: string[] | null;
  allow_personal_reflection: boolean;
  localized_content?: SadhanaLocalizedContent | null;
}
export interface ScriptureReadingConfig {
  scripture_id?: string | null;
  scripture_name?: string | null;
  chapter_id?: string | null;
  chapter_number?: number | null;
  start_verse?: number | null;
  end_verse?: number | null;
  localized_content?: SadhanaLocalizedContent | null;
}

export type SadhanaCategoryConfig =
  | MeditationConfig
  | JapaConfig
  | MantraConfig
  | GratitudeConfig
  | ScriptureReadingConfig
  | null;

export interface SadhanaPractice {
  id: string;
  name: string;
  slug: string;
  subtitle?: string | null;
  description: string;
  category: SadhanaPracticeCategory;
  instructions: string;
  difficulty?: SadhanaPracticeDifficulty | null;
  practice_mode?: SadhanaPracticeMode | null;
  target_type?: SadhanaTargetType | null;
  target_count?: number | null;
  target_unit?: string | null;
  duration_minutes?: number | null;
  completion_rule?: SadhanaCompletionRule | null;
  time_of_day?: SadhanaTimeOfDay | null;
  is_featured?: boolean;
  benefits?: string[] | null;
  tags?: string[] | null;
  category_config?: SadhanaCategoryConfig;
  cover_image_url?: string | null;
  guided_audio_url?: string | null;
  ambient_audio_url?: string | null;
  media_type?: SadhanaPracticeMediaKind | null;
  media_url?: string | null;
  display_order: number;
  is_active: boolean;
  archived_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface SadhanaPracticeInput {
  name: string;
  slug?: string;
  subtitle?: string | null;
  category: SadhanaPracticeCategory;
  description?: string;
  instructions?: string;
  difficulty?: SadhanaPracticeDifficulty | null;
  practice_mode?: SadhanaPracticeMode | null;
  target_type?: SadhanaTargetType | null;
  target_count?: number | null;
  target_unit?: string | null;
  duration_minutes?: number | null;
  completion_rule?: SadhanaCompletionRule | null;
  time_of_day?: SadhanaTimeOfDay | null;
  is_featured?: boolean;
  benefits?: string[] | null;
  tags?: string[] | null;
  category_config?: SadhanaCategoryConfig;
  cover_image_url?: string | null;
  guided_audio_url?: string | null;
  ambient_audio_url?: string | null;
  media_type?: SadhanaPracticeMediaKind | null;
  media_url?: string | null;
  display_order?: number;
  is_active?: boolean;
}

export type SadhanaPracticeUpdate = Partial<SadhanaPracticeInput>;
