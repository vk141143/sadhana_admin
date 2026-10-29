import {
  SADHANA_PRACTICE_CATEGORIES,
  SADHANA_PRACTICE_DIFFICULTIES,
  SADHANA_PRACTICE_MODES,
  SADHANA_TARGET_TYPES,
  SADHANA_COMPLETION_RULES,
  SADHANA_TIMES_OF_DAY,
  type SadhanaPracticeMediaKind,
  type SadhanaPracticeCategory,
  type SadhanaPracticeDifficulty,
  type SadhanaPracticeMode,
  type SadhanaTargetType,
  type SadhanaCompletionRule,
  type SadhanaTimeOfDay,
  type SadhanaCategoryConfig,
  type SadhanaContentLanguage,
  type SadhanaPracticeInput,
  type SadhanaPracticeUpdate,
} from '../types/sadhanaPractice.ts';

export class SadhanaPracticeValidationError extends Error {
  constructor(message: string, public readonly field?: string) {
    super(message);
  }
}

const allowedFields = new Set([
  'name', 'slug', 'subtitle', 'description', 'category', 'instructions',
  'difficulty', 'practice_mode', 'target_type', 'target_count', 'target_unit',
  'duration_minutes', 'completion_rule', 'time_of_day', 'is_featured',
  'benefits', 'tags', 'category_config',
  'cover_image_url', 'guided_audio_url', 'ambient_audio_url',
  'media_type', 'media_url', 'display_order', 'is_active',
]);

export function isPracticeId(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isMediaKind(value: unknown): value is SadhanaPracticeMediaKind {
  return value === 'image' || value === 'audio';
}

function optionalText(
  input: Record<string, unknown>,
  key: string,
  maxLength: number,
): string | undefined {
  if (!(key in input)) return undefined;
  if (typeof input[key] !== 'string') throw new SadhanaPracticeValidationError(`${key} must be text.`);
  const value = (input[key] as string).trim();
  if (value.length > maxLength) throw new SadhanaPracticeValidationError(`${key} is too long.`);
  return value;
}

function optionalNullableText(
  input: Record<string, unknown>,
  key: string,
  maxLength: number,
): string | null | undefined {
  if (!(key in input)) return undefined;
  if (input[key] === null || input[key] === '') return null;
  if (typeof input[key] !== 'string') throw new SadhanaPracticeValidationError(`${key} must be text.`);
  const value = (input[key] as string).trim();
  if (!value.length) return null;
  if (value.length > maxLength) throw new SadhanaPracticeValidationError(`${key} is too long.`);
  return value;
}

function optionalInteger(
  input: Record<string, unknown>,
  key: string,
  minimum: number,
  maximum: number,
  nullable = false,
): number | null | undefined {
  if (!(key in input)) return undefined;
  const value = input[key];
  if (nullable && value === null) return null;
  if (typeof value !== 'number' || !Number.isInteger(value) || value < minimum || value > maximum) {
    throw new SadhanaPracticeValidationError(`${key} must be an integer between ${minimum} and ${maximum}.`);
  }
  return value as number;
}

function optionalHttpsUrl(
  input: Record<string, unknown>,
  key: string,
): string | null | undefined {
  if (!(key in input)) return undefined;
  const raw = input[key];
  if (raw === null || raw === '') return null;
  if (typeof raw !== 'string' || raw.length > 2048) {
    throw new SadhanaPracticeValidationError(`${key} must be an HTTPS URL under 2048 characters.`);
  }
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new SadhanaPracticeValidationError(`${key} must be a valid HTTPS URL.`);
  }
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password) {
    throw new SadhanaPracticeValidationError(`${key} must be a valid HTTPS URL without credentials.`);
  }
  return parsed.toString();
}

function optionalEnum<T extends string>(
  input: Record<string, unknown>,
  key: string,
  allowed: readonly T[],
  nullable = false,
): T | null | undefined {
  if (!(key in input)) return undefined;
  if (nullable && input[key] === null) return null;
  if (!allowed.includes(input[key] as T)) {
    throw new SadhanaPracticeValidationError(`${key} must be one of: ${allowed.join(', ')}.`);
  }
  return input[key] as T;
}

function optionalStringArray(
  input: Record<string, unknown>,
  key: string,
  maxItems: number,
  maxItemLength: number,
): string[] | null | undefined {
  if (!(key in input)) return undefined;
  if (input[key] === null) return null;
  if (!Array.isArray(input[key])) throw new SadhanaPracticeValidationError(`${key} must be an array.`);
  const arr = input[key] as unknown[];
  if (arr.length > maxItems) throw new SadhanaPracticeValidationError(`${key} may have at most ${maxItems} items.`);
  return arr.map((item, i) => {
    if (typeof item !== 'string') throw new SadhanaPracticeValidationError(`${key}[${i}] must be a string.`);
    const trimmed = item.trim();
    if (!trimmed.length) throw new SadhanaPracticeValidationError(`${key}[${i}] must not be empty.`);
    if (trimmed.length > maxItemLength) throw new SadhanaPracticeValidationError(`${key}[${i}] is too long.`);
    return trimmed;
  });
}

function validateCategoryConfig(
  input: Record<string, unknown>,
  category: SadhanaPracticeCategory | undefined,
): SadhanaCategoryConfig | undefined {
  if (!('category_config' in input)) return undefined;
  if (input.category_config === null) return null;
  if (!isRecord(input.category_config)) {
    throw new SadhanaPracticeValidationError('category_config must be an object or null.');
  }
  const cfg = input.category_config;
  const textFields: Record<SadhanaPracticeCategory, Record<string, number>> = {
    meditation: { breathing_guidance: 1000 },
    japa: {
      mantra_name: 120, mantra_text: 2000, transliteration: 2000,
      meaning: 3000, counter_instructions: 1000,
    },
    mantra: { mantra_name: 120, mantra_text: 2000, transliteration: 2000, meaning: 3000 },
    gratitude: {},
    scripture_reading: { scripture_name: 200 },
  };
  if (category) {
    for (const [key, maxLength] of Object.entries(textFields[category])) {
      if (key in cfg && cfg[key] !== null &&
          (typeof cfg[key] !== 'string' || cfg[key].length > maxLength)) {
        throw new SadhanaPracticeValidationError(`category_config.${key} must be text under ${maxLength} characters.`, 'category_config');
      }
    }
  }

  if ('localized_content' in cfg && cfg.localized_content !== null) {
    if (!isRecord(cfg.localized_content)) {
      throw new SadhanaPracticeValidationError('Localized content must be an object.', 'localized_content');
    }
    const allowedLanguages = new Set<SadhanaContentLanguage>(['en', 'te', 'hi', 'kn', 'ta', 'ml']);
    for (const [language, fields] of Object.entries(cfg.localized_content)) {
      if (!allowedLanguages.has(language as SadhanaContentLanguage) || !isRecord(fields)) {
        throw new SadhanaPracticeValidationError('Localized content contains an unsupported language.', 'localized_content');
      }
      for (const key of Object.keys(fields)) {
        if (key !== 'meaning' && key !== 'instructions') {
          throw new SadhanaPracticeValidationError('Localized content contains an unsupported field.', 'localized_content');
        }
        const text = fields[key];
        if (text !== null && (typeof text !== 'string' || text.length > 10000)) {
          throw new SadhanaPracticeValidationError(`Localized ${key} must be text under 10000 characters.`, 'localized_content');
        }
      }
    }
  }

  if (category === 'japa') {
    if ('count_preset' in cfg && cfg.count_preset !== null) {
      if (typeof cfg.count_preset !== 'number' || !Number.isInteger(cfg.count_preset) ||
          cfg.count_preset < 1 || cfg.count_preset > 100000) {
        throw new SadhanaPracticeValidationError('Default repetition target must be a positive integer up to 100000.', 'category_config');
      }
    }
    for (const key of ['mala_counter', 'counter_enabled']) {
      if (key in cfg && typeof cfg[key] !== 'boolean') {
        throw new SadhanaPracticeValidationError(`category_config.${key} must be a boolean.`, 'category_config');
      }
    }
  }
  if (category === 'meditation' && 'is_guided' in cfg && typeof cfg.is_guided !== 'boolean') {
    throw new SadhanaPracticeValidationError('Meditation mode must be guided or silent.', 'category_config');
  }
  if (category === 'gratitude') {
    if ('prompts' in cfg && cfg.prompts !== null) {
      if (!Array.isArray(cfg.prompts) || cfg.prompts.length > 10) {
        throw new SadhanaPracticeValidationError('Reflection prompts must contain up to 10 strings.', 'category_config');
      }
      for (const p of cfg.prompts as unknown[]) {
        if (typeof p !== 'string' || p.trim().length === 0 || p.length > 300) {
          throw new SadhanaPracticeValidationError('Each reflection prompt must be a non-empty string under 300 characters.', 'category_config');
        }
      }
    }
    if ('allow_personal_reflection' in cfg && typeof cfg.allow_personal_reflection !== 'boolean') {
      throw new SadhanaPracticeValidationError('Personal reflection must be enabled or disabled.', 'category_config');
    }
  }
  if (category === 'scripture_reading') {
    for (const key of ['scripture_id', 'chapter_id']) {
      if (key in cfg && cfg[key] !== null &&
          (typeof cfg[key] !== 'string' || !isPracticeId(cfg[key]))) {
        throw new SadhanaPracticeValidationError(`${key === 'scripture_id' ? 'Scripture' : 'Chapter'} must be selected from the catalogue.`, 'scripture_reference');
      }
    }
    const chapterId = cfg.chapter_id;
    if (chapterId && !cfg.scripture_id) {
      throw new SadhanaPracticeValidationError('Select a scripture before choosing a chapter.', 'scripture_reference');
    }
    if ((cfg.chapter_number !== undefined && cfg.chapter_number !== null ||
        cfg.start_verse !== undefined && cfg.start_verse !== null ||
        cfg.end_verse !== undefined && cfg.end_verse !== null) && !chapterId) {
      throw new SadhanaPracticeValidationError('Select a catalogue chapter before specifying chapter or verse references.', 'scripture_reference');
    }
    const chapterNumber = cfg.chapter_number;
    if (chapterNumber !== undefined && chapterNumber !== null &&
        (typeof chapterNumber !== 'number' || !Number.isInteger(chapterNumber) || chapterNumber < 1)) {
      throw new SadhanaPracticeValidationError('Chapter number must be a positive integer.', 'scripture_reference');
    }
    const startVerse = cfg.start_verse;
    const endVerse = cfg.end_verse;
    for (const [key, value] of [['start_verse', startVerse], ['end_verse', endVerse]] as const) {
      if (value !== undefined && value !== null &&
          (typeof value !== 'number' || !Number.isInteger(value) || value < 1)) {
        throw new SadhanaPracticeValidationError(`${key === 'start_verse' ? 'Start' : 'End'} verse must be a positive integer.`, 'scripture_reference');
      }
    }
    if (typeof startVerse === 'number' && typeof endVerse === 'number' && endVerse < startVerse) {
      throw new SadhanaPracticeValidationError('End verse must not be before start verse.', 'scripture_reference');
    }
  }
  return cfg as SadhanaCategoryConfig;
}

export function validatePracticeBehavior(
  input: Partial<SadhanaPracticeInput>,
  strict = true,
): void {
  const { category, target_type, target_count, completion_rule, practice_mode } = input;
  const cfg = input.category_config;
  const config = isRecord(cfg) ? cfg : {};
  const hasGuidedAudio = typeof input.guided_audio_url === 'string' && input.guided_audio_url.length > 0 ||
    input.media_type === 'audio' && typeof input.media_url === 'string' && input.media_url.length > 0;

  if (target_type === 'none' && target_count !== undefined && target_count !== null) {
    throw new SadhanaPracticeValidationError('Remove the target value when target type is None.', 'target_count');
  }
  if (strict && target_type && target_type !== 'none' &&
      (!Number.isInteger(target_count) || (target_count ?? 0) < 1)) {
    throw new SadhanaPracticeValidationError('A selected target type requires a positive integer target value.', 'target_count');
  }
  if (target_type === 'duration' && typeof target_count === 'number' && target_count > 1440) {
    throw new SadhanaPracticeValidationError('Duration targets must not exceed 1440 minutes.', 'target_count');
  }
  if (target_type && target_type !== 'none' && target_count !== undefined && target_count !== null && target_count < 1) {
    throw new SadhanaPracticeValidationError('Target must be a positive integer.', 'target_count');
  }

  const targetsByCategory: Record<SadhanaPracticeCategory, SadhanaTargetType[]> = {
    meditation: ['none', 'duration'],
    japa: ['none', 'duration', 'repetitions'],
    mantra: ['none', 'duration', 'repetitions'],
    gratitude: ['none', 'entries'],
    scripture_reading: ['none', 'duration', 'verses', 'chapters'],
  };
  if (category && target_type && !targetsByCategory[category].includes(target_type)) {
    throw new SadhanaPracticeValidationError(`${target_type} is not a supported target for ${category.replace('_', ' ')}.`, 'target_type');
  }

  const modesByCategory: Record<SadhanaPracticeCategory, SadhanaPracticeMode[]> = {
    meditation: ['timer', 'guided_audio'],
    japa: ['timer', 'repetition', 'guided_audio'],
    mantra: ['timer', 'repetition', 'guided_audio'],
    gratitude: ['reflection'],
    scripture_reading: ['scripture_reading', 'timer'],
  };
  if (category && practice_mode && !modesByCategory[category].includes(practice_mode)) {
    throw new SadhanaPracticeValidationError(`${practice_mode.replace('_', ' ')} mode is not supported for ${category.replace('_', ' ')}.`, 'practice_mode');
  }
  if (practice_mode === 'repetition' && target_type && target_type !== 'repetitions') {
    throw new SadhanaPracticeValidationError('Repetition mode requires a repetition target.', 'target_type');
  }
  if (strict && practice_mode === 'repetition' && target_type !== 'repetitions') {
    throw new SadhanaPracticeValidationError('Repetition mode requires a repetition target.', 'target_type');
  }
  if (target_type === 'duration' && practice_mode === 'repetition' ||
      target_type === 'entries' && practice_mode && practice_mode !== 'reflection' ||
      (target_type === 'chapters' || target_type === 'verses') &&
        practice_mode && practice_mode !== 'scripture_reading' ||
      practice_mode === 'timer' && target_type && !['none', 'duration'].includes(target_type) ||
      practice_mode === 'reflection' && target_type && !['none', 'entries'].includes(target_type)) {
    throw new SadhanaPracticeValidationError('The selected mode is incompatible with this target type.', 'practice_mode');
  }
  if (practice_mode === 'scripture_reading' && target_type &&
      !['none', 'chapters', 'verses', 'duration'].includes(target_type)) {
    throw new SadhanaPracticeValidationError('Scripture reading requires a chapter, verse, or duration target.', 'target_type');
  }

  if (completion_rule === 'repetitions_reached' &&
      (target_type !== 'repetitions' || !Number.isInteger(target_count) || (target_count ?? 0) < 1)) {
    throw new SadhanaPracticeValidationError('Repetitions reached requires a positive repetition target.', 'target_count');
  }
  if (completion_rule === 'repetitions_reached' &&
      (practice_mode && !['repetition', 'guided_audio'].includes(practice_mode) ||
        category === 'japa' && config.counter_enabled !== true)) {
    throw new SadhanaPracticeValidationError('Repetition completion requires an enabled Japa counter or repetition mode.', 'category_config');
  }
  if (completion_rule === 'timer_elapsed' &&
      (target_type !== 'duration' || !Number.isInteger(target_count) || (target_count ?? 0) < 1 ||
        practice_mode && practice_mode !== 'timer')) {
    throw new SadhanaPracticeValidationError('Timer elapsed requires a positive duration target in minutes.', 'target_count');
  }
  if (completion_rule === 'entries_submitted' &&
      (category !== 'gratitude' || target_type !== 'entries' ||
        !Number.isInteger(target_count) || (target_count ?? 0) < 1 || practice_mode !== 'reflection')) {
    throw new SadhanaPracticeValidationError('Entries submitted requires a positive gratitude entry target.', 'target_count');
  }
  if (completion_rule === 'audio_completed' &&
      (practice_mode !== 'guided_audio' || !hasGuidedAudio)) {
    throw new SadhanaPracticeValidationError('Audio completed requires guided-audio mode and a playable guided audio URL.', 'guided_audio_url');
  }
  if (category === 'scripture_reading' && completion_rule &&
      completion_rule !== 'manual' && completion_rule !== 'timer_elapsed') {
    throw new SadhanaPracticeValidationError('Scripture reading supports manual completion or a configured duration timer; reading-progress completion is not integrated here.', 'completion_rule');
  }
  if (strict && category === 'scripture_reading' &&
      (!isRecord(config) || typeof config.scripture_id !== 'string' || !isPracticeId(config.scripture_id))) {
    throw new SadhanaPracticeValidationError('Select an existing scripture from the catalogue.', 'scripture_reference');
  }

  if (strict && completion_rule === 'timer_elapsed' && target_type !== 'duration') {
    throw new SadhanaPracticeValidationError('Timer elapsed requires a duration target.', 'target_type');
  }

  if (completion_rule === 'manual' && strict && !category) {
    throw new SadhanaPracticeValidationError('Select a practice category before choosing manual completion.', 'category');
  }
}

function parseInput(value: unknown, creating: boolean): SadhanaPracticeUpdate {
  if (!isRecord(value)) throw new SadhanaPracticeValidationError('A JSON object is required.');
  if (Object.keys(value).some(key => !allowedFields.has(key) || (!creating && key === 'slug'))) {
    throw new SadhanaPracticeValidationError('The request contains unsupported fields.');
  }

  const input: SadhanaPracticeUpdate = {};

  const name = optionalText(value, 'name', 120);
  if (creating && !name?.length) throw new SadhanaPracticeValidationError('Practice name is required.');
  if (name !== undefined) {
    if (!name.length) throw new SadhanaPracticeValidationError('Practice name is required.');
    input.name = name;
  }

  const slug = optionalText(value, 'slug', 120);
  if (slug !== undefined) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      throw new SadhanaPracticeValidationError('Slug must contain lowercase letters, numbers and single hyphens.');
    }
    input.slug = slug;
  }

  const subtitle = optionalNullableText(value, 'subtitle', 200);
  if (subtitle !== undefined) input.subtitle = subtitle;

  const description = optionalText(value, 'description', 1000);
  if (description !== undefined) input.description = description;

  const instructions = optionalText(value, 'instructions', 10000);
  if (instructions !== undefined) input.instructions = instructions;

  if (creating && !('category' in value)) {
    throw new SadhanaPracticeValidationError('Practice category is required.');
  }
  let category: SadhanaPracticeCategory | undefined;
  if ('category' in value) {
    if (typeof value.category !== 'string' ||
        !SADHANA_PRACTICE_CATEGORIES.includes(value.category as SadhanaPracticeCategory)) {
      throw new SadhanaPracticeValidationError('Choose a supported practice category.');
    }
    category = value.category as SadhanaPracticeCategory;
    input.category = category;
  }

  const difficulty = optionalEnum(value, 'difficulty', SADHANA_PRACTICE_DIFFICULTIES, true);
  if (difficulty !== undefined) input.difficulty = difficulty as SadhanaPracticeDifficulty | null;

  const practiceMode = optionalEnum(value, 'practice_mode', SADHANA_PRACTICE_MODES, true);
  if (practiceMode !== undefined) input.practice_mode = practiceMode as SadhanaPracticeMode | null;

  const targetType = optionalEnum(value, 'target_type', SADHANA_TARGET_TYPES, true);
  if (targetType !== undefined) input.target_type = targetType as SadhanaTargetType | null;

  const targetCount = optionalInteger(value, 'target_count', 1, 100000, true);
  if (targetCount !== undefined) input.target_count = targetCount;

  const targetUnit = optionalNullableText(value, 'target_unit', 40);
  if (targetUnit !== undefined) input.target_unit = targetUnit;

  const duration = optionalInteger(value, 'duration_minutes', 1, 1440, true);
  if (duration !== undefined) input.duration_minutes = duration;

  const completionRule = optionalEnum(value, 'completion_rule', SADHANA_COMPLETION_RULES, true);
  if (completionRule !== undefined) input.completion_rule = completionRule as SadhanaCompletionRule | null;

  const timeOfDay = optionalEnum(value, 'time_of_day', SADHANA_TIMES_OF_DAY, true);
  if (timeOfDay !== undefined) input.time_of_day = timeOfDay as SadhanaTimeOfDay | null;

  if ('is_featured' in value) {
    if (typeof value.is_featured !== 'boolean') throw new SadhanaPracticeValidationError('is_featured must be true or false.');
    input.is_featured = value.is_featured;
  }

  const benefits = optionalStringArray(value, 'benefits', 20, 300);
  if (benefits !== undefined) input.benefits = benefits;

  const tags = optionalStringArray(value, 'tags', 30, 60);
  if (tags !== undefined) input.tags = tags;

  const categoryConfig = validateCategoryConfig(value, category);
  if (categoryConfig !== undefined) input.category_config = categoryConfig;

  const coverImageUrl = optionalHttpsUrl(value, 'cover_image_url');
  if (coverImageUrl !== undefined) input.cover_image_url = coverImageUrl;

  const guidedAudioUrl = optionalHttpsUrl(value, 'guided_audio_url');
  if (guidedAudioUrl !== undefined) input.guided_audio_url = guidedAudioUrl;

  const ambientAudioUrl = optionalHttpsUrl(value, 'ambient_audio_url');
  if (ambientAudioUrl !== undefined) input.ambient_audio_url = ambientAudioUrl;

  if ('media_type' in value) {
    if (value.media_type !== null && !isMediaKind(value.media_type)) {
      throw new SadhanaPracticeValidationError('Media type must be image, audio, or none.');
    }
    input.media_type = isMediaKind(value.media_type) ? value.media_type : null;
  }

  const mediaUrl = optionalHttpsUrl(value, 'media_url');
  if (mediaUrl !== undefined) input.media_url = mediaUrl;

  const displayOrder = optionalInteger(value, 'display_order', 0, 1000000);
  if (displayOrder !== undefined) input.display_order = displayOrder;

  if ('is_active' in value) {
    if (typeof value.is_active !== 'boolean') throw new SadhanaPracticeValidationError('is_active must be true or false.');
    input.is_active = value.is_active;
  }

  validatePracticeBehavior(input, creating);

  if (!creating && Object.keys(input).length === 0) {
    throw new SadhanaPracticeValidationError('At least one practice field must be provided.');
  }
  return input;
}

export function parsePracticeCreate(value: unknown): SadhanaPracticeInput {
  const parsed = parseInput(value, true);
  const name = parsed.name!;
  if (!parsed.slug) {
    const slug = name.normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
      .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 120).replace(/-$/g, '');
    if (!slug) throw new SadhanaPracticeValidationError('Provide a slug using lowercase letters and numbers.');
    parsed.slug = slug;
  }
  return {
    name,
    slug: parsed.slug,
    subtitle: parsed.subtitle ?? null,
    category: parsed.category!,
    description: parsed.description ?? '',
    instructions: parsed.instructions ?? '',
    difficulty: parsed.difficulty ?? null,
    practice_mode: parsed.practice_mode ?? null,
    target_type: parsed.target_type ?? null,
    target_count: parsed.target_count ?? null,
    target_unit: parsed.target_unit ?? null,
    duration_minutes: parsed.duration_minutes ?? null,
    completion_rule: parsed.completion_rule ?? null,
    time_of_day: parsed.time_of_day ?? null,
    is_featured: parsed.is_featured ?? false,
    benefits: parsed.benefits ?? null,
    tags: parsed.tags ?? null,
    category_config: parsed.category_config ?? null,
    cover_image_url: parsed.cover_image_url ?? null,
    guided_audio_url: parsed.guided_audio_url ?? null,
    ambient_audio_url: parsed.ambient_audio_url ?? null,
    media_type: parsed.media_type ?? null,
    media_url: parsed.media_url ?? null,
    display_order: parsed.display_order ?? 0,
    is_active: parsed.is_active ?? false,
  };
}

export function parsePracticeUpdate(value: unknown): SadhanaPracticeUpdate {
  return parseInput(value, false);
}
