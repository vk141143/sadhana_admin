import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { sadhanaPracticeService } from '../../services/sadhanaPracticeService';
import { sadhanaMediaService } from '../../services/sadhanaMediaService';
import { chapterService, scriptureService, slokaService } from '../../services/contentService';
import {
  parsePracticeCreate,
  parsePracticeUpdate,
  SadhanaPracticeValidationError,
} from '../../services/sadhanaPracticeValidation';
import {
  SADHANA_PRACTICE_CATEGORIES,
  SADHANA_PRACTICE_DIFFICULTIES,
  SADHANA_TIMES_OF_DAY,
  type SadhanaPractice,
  type SadhanaPracticeCategory,
  type SadhanaPracticeDifficulty,
  type SadhanaPracticeMode,
  type SadhanaTargetType,
  type SadhanaCompletionRule,
  type SadhanaTimeOfDay,
  type SadhanaPracticeMediaKind,
  type SadhanaPracticeMediaSelection,
  type SadhanaPracticeInput,
  type SadhanaPracticeUpdate,
  type JapaConfig,
  type MantraConfig,
  type MeditationConfig,
  type GratitudeConfig,
  type ScriptureReadingConfig,
  type SadhanaContentLanguage,
  type SadhanaLocalizedContent,
} from '../../types/sadhanaPractice';
import type { Chapter, Scripture } from '../../types';

// ─── Design tokens ────────────────────────────────────────────────────────────
const ic = 'w-full rounded-xl border border-white/10 bg-[#0c1321] px-3 py-2.5 text-sm text-[#dce2f6] outline-none focus:border-[#f2ca50] disabled:opacity-60';
const btn = 'rounded-xl border border-white/10 bg-[#232a39] px-3 py-2 text-xs font-semibold text-[#dce2f6] hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50';

// ─── Local types ──────────────────────────────────────────────────────────────
type Toast = { message: string; type: 'success' | 'error' };
type StatusFilter = 'all' | 'active' | 'inactive' | 'archived';
type LocalizedDrafts = Record<SadhanaContentLanguage, { meaning: string; instructions: string }>;

type MediaSlot = {
  type: SadhanaPracticeMediaSelection;
  url: string;
  uploading: boolean;
  progress: number;
  error: string;
};

export type PracticeForm = {
  name: string;
  slug: string;
  slugTouched: boolean;
  subtitle: string;
  category: SadhanaPracticeCategory;
  description: string;
  instructions: string;
  difficulty: SadhanaPracticeDifficulty | '';
  practice_mode: SadhanaPracticeMode | '';
  target_type: SadhanaTargetType | '';
  target_count: string;
  target_unit: string;
  duration_minutes: string;
  completion_rule: SadhanaCompletionRule | '';
  time_of_day: SadhanaTimeOfDay | '';
  is_featured: boolean;
  benefits: string[];
  tags: string[];
  // category_config sub-fields
  med_is_guided: boolean;
  med_breathing: string;
  med_begin_instructions: string;
  med_end_instructions: string;
  japa_mantra_name: string;
  japa_mantra: string;
  japa_transliteration: string;
  japa_meaning: string;
  japa_count_preset: string;
  japa_counter_enabled: boolean;
  japa_mala_counter: boolean;
  japa_counter_instructions: string;
  mantra_name: string;
  mantra_text: string;
  mantra_transliteration: string;
  mantra_meaning: string;
  grat_prompts: string[];
  grat_allow_reflection: boolean;
  scripture_id: string;
  scripture_name: string;
  scripture_chapter_id: string;
  scripture_chapter_number: string;
  scripture_start_verse: string;
  scripture_end_verse: string;
  localized_content: LocalizedDrafts;
  // media slots
  cover: MediaSlot;
  guided_audio: MediaSlot;
  ambient_audio: MediaSlot;
  // legacy single media (preserved)
  media_type: SadhanaPracticeMediaSelection;
  media_url: string;
  display_order: string;
};

// ─── Label maps ───────────────────────────────────────────────────────────────
const categoryLabels: Record<SadhanaPracticeCategory, string> = {
  meditation: 'Meditation', japa: 'Japa', mantra: 'Mantra',
  gratitude: 'Gratitude', scripture_reading: 'Scripture Reading',
};
const difficultyLabels: Record<SadhanaPracticeDifficulty, string> = {
  beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced',
};
const modeLabels: Record<SadhanaPracticeMode, string> = {
  timer: 'Timer-based', repetition: 'Repetition-based',
  guided_audio: 'Guided audio', reflection: 'Reflection-based',
  scripture_reading: 'Scripture reading',
};
const targetTypeLabels: Record<SadhanaTargetType, string> = {
  none: 'None', duration: 'Duration (minutes)', repetitions: 'Repetitions',
  entries: 'Entries', verses: 'Verses', chapters: 'Chapters',
};
const completionRuleLabels: Record<SadhanaCompletionRule, string> = {
  manual: 'Manual (user marks done)', timer_elapsed: 'Timer elapsed',
  repetitions_reached: 'Repetitions reached', entries_submitted: 'Entries submitted',
  audio_completed: 'Audio completed',
};
const timeOfDayLabels: Record<SadhanaTimeOfDay, string> = {
  morning: 'Morning', afternoon: 'Afternoon', evening: 'Evening', anytime: 'Anytime',
};
const actionLabel: Record<SadhanaPracticeCategory, string> = {
  meditation: 'Start Meditation', japa: 'Begin Japa', mantra: 'Start Chanting',
  gratitude: 'Begin Reflection', scripture_reading: 'Start Reading',
};
const japaCountingContract = 'One complete recitation of the configured mantra counts as one repetition.';
const languageLabels: Record<SadhanaContentLanguage, string> = {
  en: 'English', te: 'Telugu', hi: 'Hindi', kn: 'Kannada', ta: 'Tamil', ml: 'Malayalam',
};

function emptyLocalizedDrafts(): LocalizedDrafts {
  return {
    en: { meaning: '', instructions: '' }, te: { meaning: '', instructions: '' },
    hi: { meaning: '', instructions: '' }, kn: { meaning: '', instructions: '' },
    ta: { meaning: '', instructions: '' }, ml: { meaning: '', instructions: '' },
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function slugFromName(name: string): string {
  return name.normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    .slice(0, 120).replace(/-$/g, '');
}

function emptySlot(type: SadhanaPracticeMediaSelection = 'none'): MediaSlot {
  return { type, url: '', uploading: false, progress: 0, error: '' };
}

export function emptyForm(): PracticeForm {
  return {
    name: '', slug: '', slugTouched: false, subtitle: '',
    category: 'meditation', description: '', instructions: '',
    difficulty: '', practice_mode: '', target_type: '', target_count: '',
    target_unit: '', duration_minutes: '', completion_rule: '', time_of_day: '',
    is_featured: false, benefits: [], tags: [],
    med_is_guided: false, med_breathing: '', med_begin_instructions: '', med_end_instructions: '',
    japa_mantra_name: '', japa_mantra: '', japa_transliteration: '', japa_meaning: '',
    japa_count_preset: '', japa_counter_enabled: false, japa_mala_counter: false,
    japa_counter_instructions: japaCountingContract,
    mantra_name: '', mantra_text: '', mantra_transliteration: '', mantra_meaning: '',
    grat_prompts: [], grat_allow_reflection: true,
    scripture_id: '', scripture_name: '', scripture_chapter_id: '',
    scripture_chapter_number: '', scripture_start_verse: '', scripture_end_verse: '',
    localized_content: emptyLocalizedDrafts(),
    cover: emptySlot('image'), guided_audio: emptySlot('audio'), ambient_audio: emptySlot('audio'),
    media_type: 'none', media_url: '', display_order: '0',
  };
}

function formFromPractice(p: SadhanaPractice): PracticeForm {
  const cfg = p.category_config as Record<string, unknown> | null ?? {};
  const localized = cfg.localized_content && typeof cfg.localized_content === 'object'
    ? cfg.localized_content as SadhanaLocalizedContent
    : {};
  const localizedDrafts = emptyLocalizedDrafts();
  for (const language of Object.keys(localizedDrafts) as SadhanaContentLanguage[]) {
    const value = localized[language];
    if (value) localizedDrafts[language] = {
      meaning: typeof value.meaning === 'string' ? value.meaning : '',
      instructions: typeof value.instructions === 'string' ? value.instructions : '',
    };
  }
  return {
    name: p.name, slug: p.slug, slugTouched: true, subtitle: p.subtitle ?? '',
    category: p.category, description: p.description, instructions: p.instructions,
    difficulty: p.difficulty ?? '', practice_mode: p.practice_mode ?? '',
    target_type: p.target_type ?? '', target_count: p.target_count != null ? String(p.target_count) : '',
    target_unit: p.target_unit ?? '', duration_minutes: p.duration_minutes != null ? String(p.duration_minutes) : '',
    completion_rule: p.completion_rule ?? '', time_of_day: p.time_of_day ?? '',
    is_featured: p.is_featured ?? false, benefits: p.benefits ?? [], tags: p.tags ?? [],
    med_is_guided: Boolean(cfg.is_guided),
    med_breathing: typeof cfg.breathing_guidance === 'string' ? cfg.breathing_guidance : '',
    med_begin_instructions: typeof cfg.begin_instructions === 'string' ? cfg.begin_instructions : '',
    med_end_instructions: typeof cfg.end_instructions === 'string' ? cfg.end_instructions : '',
    japa_mantra_name: typeof cfg.mantra_name === 'string' ? cfg.mantra_name : '',
    japa_mantra: typeof cfg.mantra_text === 'string' ? cfg.mantra_text : '',
    japa_transliteration: typeof cfg.transliteration === 'string' ? cfg.transliteration : '',
    japa_meaning: typeof cfg.meaning === 'string' ? cfg.meaning : '',
    japa_count_preset: cfg.count_preset !== null && cfg.count_preset !== undefined ? String(cfg.count_preset) : '',
    japa_counter_enabled: Boolean(cfg.counter_enabled),
    japa_mala_counter: Boolean(cfg.mala_counter),
    japa_counter_instructions: typeof cfg.counter_instructions === 'string' ? cfg.counter_instructions : japaCountingContract,
    mantra_name: typeof cfg.mantra_name === 'string' ? cfg.mantra_name : '',
    mantra_text: typeof cfg.mantra_text === 'string' ? cfg.mantra_text : '',
    mantra_transliteration: typeof cfg.transliteration === 'string' ? cfg.transliteration : '',
    mantra_meaning: typeof cfg.meaning === 'string' ? cfg.meaning : '',
    grat_prompts: Array.isArray(cfg.prompts) ? (cfg.prompts as string[]) : [],
    grat_allow_reflection: cfg.allow_personal_reflection !== false,
    scripture_id: typeof cfg.scripture_id === 'string' ? cfg.scripture_id : '',
    scripture_name: typeof cfg.scripture_name === 'string' ? cfg.scripture_name : '',
    scripture_chapter_id: typeof cfg.chapter_id === 'string' ? cfg.chapter_id : '',
    scripture_chapter_number: cfg.chapter_number !== null && cfg.chapter_number !== undefined ? String(cfg.chapter_number) : '',
    scripture_start_verse: cfg.start_verse !== null && cfg.start_verse !== undefined ? String(cfg.start_verse) : '',
    scripture_end_verse: cfg.end_verse !== null && cfg.end_verse !== undefined ? String(cfg.end_verse) : '',
    localized_content: localizedDrafts,
    cover: { ...emptySlot('image'), url: p.cover_image_url ?? '' },
    guided_audio: { ...emptySlot('audio'), url: p.guided_audio_url ?? '' },
    ambient_audio: { ...emptySlot('audio'), url: p.ambient_audio_url ?? '' },
    media_type: p.media_type ?? 'none', media_url: p.media_url ?? '',
    display_order: String(p.display_order),
  };
}

function localizedContentFromForm(form: PracticeForm): SadhanaLocalizedContent | null {
  const localized = Object.fromEntries(
    (Object.keys(form.localized_content) as SadhanaContentLanguage[])
      .filter(language => form.localized_content[language].meaning.trim() ||
        form.localized_content[language].instructions.trim())
      .map(language => [language, {
        meaning: form.localized_content[language].meaning.trim() || null,
        instructions: form.localized_content[language].instructions.trim() || null,
      }]),
  ) as SadhanaLocalizedContent;
  return Object.keys(localized).length ? localized : null;
}

function buildCategoryConfig(form: PracticeForm): Record<string, unknown> | null {
  const localized_content = localizedContentFromForm(form);
  switch (form.category) {
    case 'meditation': return {
      is_guided: form.med_is_guided,
      breathing_guidance: form.med_breathing.trim() || null,
      begin_instructions: form.med_begin_instructions.trim() || null,
      end_instructions: form.med_end_instructions.trim() || null,
      localized_content,
    } satisfies MeditationConfig;
    case 'japa': return {
      mantra_name: form.japa_mantra_name.trim() || null,
      mantra_text: form.japa_mantra.trim() || null,
      transliteration: form.japa_transliteration.trim() || null,
      meaning: form.japa_meaning.trim() || null,
      count_preset: form.japa_count_preset.trim() ? Number(form.japa_count_preset) : null,
      counter_enabled: form.japa_counter_enabled,
      mala_counter: form.japa_mala_counter,
      counter_instructions: form.japa_counter_instructions.trim() || null,
      localized_content,
    } satisfies JapaConfig;
    case 'mantra': return {
      mantra_name: form.mantra_name.trim() || null,
      mantra_text: form.mantra_text.trim() || null,
      transliteration: form.mantra_transliteration.trim() || null,
      meaning: form.mantra_meaning.trim() || null,
      localized_content,
    } satisfies MantraConfig;
    case 'gratitude': return {
      prompts: form.grat_prompts.length ? form.grat_prompts : null,
      allow_personal_reflection: form.grat_allow_reflection,
      localized_content,
    } satisfies GratitudeConfig;
    case 'scripture_reading': return {
      scripture_id: form.scripture_id.trim() || null,
      scripture_name: form.scripture_name.trim() || null,
      chapter_id: form.scripture_chapter_id.trim() || null,
      chapter_number: form.scripture_chapter_number.trim() ? Number(form.scripture_chapter_number) : null,
      start_verse: form.scripture_start_verse.trim() ? Number(form.scripture_start_verse) : null,
      end_verse: form.scripture_end_verse.trim() ? Number(form.scripture_end_verse) : null,
      localized_content,
    } satisfies ScriptureReadingConfig;
    default: return null;
  }
}

function inputFromForm(form: PracticeForm): Omit<SadhanaPracticeInput, 'is_active'> {
  return {
    name: form.name,
    slug: form.slug || undefined,
    subtitle: form.subtitle.trim() || null,
    category: form.category,
    description: form.description,
    instructions: form.instructions,
    difficulty: (form.difficulty as SadhanaPracticeDifficulty) || null,
    practice_mode: (form.practice_mode as SadhanaPracticeMode) || null,
    target_type: (form.target_type as SadhanaTargetType) || null,
    target_count: form.target_count.trim() ? Number(form.target_count) : null,
    target_unit: form.target_unit.trim() || null,
    duration_minutes: form.duration_minutes.trim() ? Number(form.duration_minutes) : null,
    completion_rule: (form.completion_rule as SadhanaCompletionRule) || null,
    time_of_day: (form.time_of_day as SadhanaTimeOfDay) || null,
    is_featured: form.is_featured,
    benefits: form.benefits.length ? form.benefits : null,
    tags: form.tags.length ? form.tags : null,
    category_config: buildCategoryConfig(form),
    cover_image_url: form.cover.url.trim() || null,
    guided_audio_url: form.guided_audio.url.trim() || null,
    ambient_audio_url: form.ambient_audio.url.trim() || null,
    media_type: form.media_type === 'none' ? null : form.media_type,
    media_url: form.media_url.trim() || null,
    display_order: form.display_order.trim() ? Number(form.display_order) : 0,
  };
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return 'The request could not be completed. Please retry.';
}

function isSafeHttpsUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === 'https:' && !u.username && !u.password;
  } catch { return false; }
}

function targetsForCategory(
  category: SadhanaPracticeCategory,
  mode: SadhanaPracticeMode | '' = '',
): SadhanaTargetType[] {
  if (mode === 'repetition') return category === 'japa' || category === 'mantra' ? ['none', 'repetitions'] : ['none'];
  if (mode === 'timer') return ['none', 'duration'];
  if (mode === 'reflection') return category === 'gratitude' ? ['none', 'entries'] : ['none'];
  if (mode === 'scripture_reading') return category === 'scripture_reading'
    ? ['none', 'duration', 'chapters', 'verses'] : ['none'];
  switch (category) {
    case 'meditation': return ['none', 'duration'];
    case 'japa':
    case 'mantra': return ['none', 'duration', 'repetitions'];
    case 'gratitude': return ['none', 'entries'];
    case 'scripture_reading': return ['none', 'duration', 'chapters', 'verses'];
  }
}

function modesForCategory(category: SadhanaPracticeCategory): SadhanaPracticeMode[] {
  switch (category) {
    case 'meditation': return ['timer', 'guided_audio'];
    case 'japa':
    case 'mantra': return ['timer', 'repetition', 'guided_audio'];
    case 'gratitude': return ['reflection'];
    case 'scripture_reading': return ['scripture_reading', 'timer'];
  }
}

function completionRulesFor(
  category: SadhanaPracticeCategory,
  target: SadhanaTargetType | '',
  mode: SadhanaPracticeMode | '',
  hasGuidedAudio: boolean,
  japaCounterEnabled: boolean,
): SadhanaCompletionRule[] {
  const rules: SadhanaCompletionRule[] = ['manual'];
  if (target === 'duration' && mode === 'timer') rules.push('timer_elapsed');
  if (target === 'repetitions' && (category === 'japa' || category === 'mantra') &&
      (category !== 'japa' || japaCounterEnabled)) {
    rules.push('repetitions_reached');
  }
  if (target === 'entries' && category === 'gratitude' && mode === 'reflection') rules.push('entries_submitted');
  if (mode === 'guided_audio' && hasGuidedAudio &&
      (category === 'meditation' || category === 'japa' || category === 'mantra')) {
    rules.push('audio_completed');
  }
  return rules;
}

// ─── Small reusable UI pieces ─────────────────────────────────────────────────
const Field: React.FC<{ label: string; required?: boolean; hint?: string; error?: string; children: React.ReactNode }> = (
  { label, required, hint, error, children }
) => (
  <label className="block space-y-1 text-xs font-semibold text-[#dce2f6]">
    <span>{label}{required && <span className="ml-0.5 text-rose-400">*</span>}</span>
    {children}
    {hint && !error && <span className="block font-normal text-[#d0c5af]/55">{hint}</span>}
    {error && <span role="alert" className="block font-normal text-rose-300">{error}</span>}
  </label>
);

const SectionBox: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section className="space-y-4 rounded-2xl border border-white/10 bg-[#0c1321]/50 p-4">
    <h3 className="text-sm font-bold text-[#f2ca50]">{title}</h3>
    {children}
  </section>
);

const TagInput: React.FC<{ value: string[]; onChange: (v: string[]) => void; placeholder?: string; maxItems?: number; disabled?: boolean }> = (
  { value, onChange, placeholder = 'Add…', maxItems = 30, disabled }
) => {
  const [draft, setDraft] = useState('');
  const add = () => {
    const t = draft.trim().toLowerCase().replace(/\s+/g, '-');
    if (t && !value.includes(t) && value.length < maxItems) onChange([...value, t]);
    setDraft('');
  };
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input value={draft} onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
          placeholder={placeholder} disabled={disabled} className={`${ic} flex-1`} />
        <button type="button" onClick={add} disabled={disabled || !draft.trim()} className={btn}>Add</button>
      </div>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map(tag => (
            <span key={tag} className="flex items-center gap-1 rounded-full border border-white/10 bg-[#232a39] px-2.5 py-0.5 text-xs text-[#dce2f6]">
              {tag}
              {!disabled && <button type="button" aria-label={`Remove ${tag}`} onClick={() => onChange(value.filter(t => t !== tag))} className="text-[#d0c5af]/60 hover:text-rose-300">×</button>}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

const BenefitsList: React.FC<{ value: string[]; onChange: (v: string[]) => void; disabled?: boolean }> = (
  { value, onChange, disabled }
) => {
  const [draft, setDraft] = useState('');
  const add = () => {
    const t = draft.trim();
    if (t && value.length < 20) { onChange([...value, t]); setDraft(''); }
  };
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input value={draft} onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
          placeholder="Add a benefit…" disabled={disabled} className={`${ic} flex-1`} />
        <button type="button" onClick={add} disabled={disabled || !draft.trim()} className={btn}>Add</button>
      </div>
      {value.map((b, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="flex-1 rounded-xl border border-white/10 bg-[#0c1321] px-3 py-2 text-xs text-[#dce2f6]">{b}</span>
          {!disabled && <button type="button" onClick={() => onChange(value.filter((_, j) => j !== i))} className="text-xs text-rose-300 hover:text-rose-200">Remove</button>}
        </div>
      ))}
    </div>
  );
};

const PromptsList: React.FC<{ value: string[]; onChange: (v: string[]) => void; disabled?: boolean }> = (
  { value, onChange, disabled }
) => {
  const [draft, setDraft] = useState('');
  const add = () => {
    const t = draft.trim();
    if (t && value.length < 10) { onChange([...value, t]); setDraft(''); }
  };
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input value={draft} onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
          placeholder="Add a reflection prompt…" disabled={disabled} className={`${ic} flex-1`} />
        <button type="button" onClick={add} disabled={disabled || !draft.trim()} className={btn}>Add</button>
      </div>
      {value.map((p, i) => (
        <div key={i} className="flex items-start gap-2">
          <span className="flex-1 rounded-xl border border-white/10 bg-[#0c1321] px-3 py-2 text-xs text-[#dce2f6]">{p}</span>
          {!disabled && <button type="button" onClick={() => onChange(value.filter((_, j) => j !== i))} className="mt-1 text-xs text-rose-300 hover:text-rose-200">Remove</button>}
        </div>
      ))}
    </div>
  );
};

// ─── Media asset uploader ─────────────────────────────────────────────────────
const MediaAsset: React.FC<{
  label: string;
  slot: MediaSlot;
  kind: SadhanaPracticeMediaKind;
  onUpload: (file: File) => void;
  onUrlChange: (url: string) => void;
  onRemove: () => void;
  disabled?: boolean;
}> = ({ label, slot, kind, onUpload, onUrlChange, onRemove, disabled }) => {
  const accept = kind === 'image' ? 'image/jpeg,image/png,image/webp' : 'audio/mpeg,audio/mp4,audio/wav,audio/ogg,audio/webm';
  const hint = kind === 'image' ? 'JPEG, PNG or WebP · max 10 MB' : 'MP3, M4A, WAV, OGG or WebM · max 25 MB';
  const hasPreview = isSafeHttpsUrl(slot.url);
  return (
    <div className="space-y-2 rounded-xl border border-white/10 bg-[#0c1321]/60 p-3">
      <p className="text-xs font-semibold text-[#dce2f6]">{label}</p>
      <label className="block text-xs font-normal text-[#d0c5af]/60">
        Upload to Cloudflare R2
        <input type="file" accept={accept} disabled={disabled || slot.uploading}
          onChange={e => { const f = e.currentTarget.files?.[0]; if (f) onUpload(f); e.currentTarget.value = ''; }}
          className={`mt-1 ${ic} file:mr-3 file:rounded-lg file:border-0 file:bg-[#f2ca50] file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-[#3c2f00]`} />
        <span className="mt-0.5 block">{hint}</span>
      </label>
      {slot.uploading && (
        <div role="status" className="space-y-1 text-xs text-[#dce2f6]">
          <div className="flex justify-between"><span>Uploading…</span><span>{slot.progress}%</span></div>
          <progress className="h-1.5 w-full accent-[#f2ca50]" max={100} value={slot.progress} />
        </div>
      )}
      {slot.error && <p role="alert" className="text-xs text-rose-300">{slot.error}</p>}
      <label className="block text-xs font-normal text-[#d0c5af]/60">
        Or enter HTTPS URL directly
        <input type="url" maxLength={2048} value={slot.url} disabled={disabled || slot.uploading}
          onChange={e => onUrlChange(e.target.value)} placeholder="https://…" className={`mt-1 ${ic}`} />
      </label>
      {hasPreview && (
        <div className="flex items-start gap-3 rounded-xl border border-white/10 p-2">
          <div className="min-w-0 flex-1">
            {kind === 'image'
              ? <img src={slot.url} alt={`${label} preview`} className="max-h-32 max-w-full rounded-lg object-contain" />
              : <audio controls preload="metadata" src={slot.url} className="w-full max-w-xs"><span>Audio preview unavailable.</span></audio>}
          </div>
          <button type="button" disabled={disabled} onClick={onRemove}
            className="rounded-lg border border-rose-500/30 px-2.5 py-1.5 text-xs font-semibold text-rose-300 hover:bg-rose-500/10 disabled:opacity-50">
            Remove
          </button>
        </div>
      )}
      {slot.url && !hasPreview && <p role="alert" className="text-xs text-rose-300">Enter a valid HTTPS URL to preview.</p>}
    </div>
  );
};

// ─── Customer preview panel ───────────────────────────────────────────────────
export const PreviewPanel: React.FC<{ form: PracticeForm }> = ({ form }) => {
  const guidedAudio = isSafeHttpsUrl(form.guided_audio.url) ? form.guided_audio.url : null;
  const ambientAudio = isSafeHttpsUrl(form.ambient_audio.url) ? form.ambient_audio.url : null;
  const legacyAudio = form.media_type === 'audio' && isSafeHttpsUrl(form.media_url) ? form.media_url : null;
  const coverSrc = isSafeHttpsUrl(form.cover.url) ? form.cover.url : null;
  const diff = form.difficulty ? difficultyLabels[form.difficulty as SadhanaPracticeDifficulty] : null;
  const mantraText = form.category === 'japa' ? form.japa_mantra : form.mantra_text;
  const transliteration = form.category === 'japa' ? form.japa_transliteration : form.mantra_transliteration;
  const instructions = form.category === 'meditation'
    ? [form.med_begin_instructions, form.instructions, form.med_end_instructions].filter(Boolean).join('\n\n')
    : form.instructions;
  return (
    <aside className="sticky top-4 space-y-3 rounded-2xl border border-[#f2ca50]/20 bg-[#19202e] p-4">
      <p className="text-[10px] uppercase tracking-widest text-[#d0c5af]/50">Customer preview (illustrative)</p>
      <div className="overflow-hidden rounded-xl border border-white/10 bg-[#0c1321]">
        {coverSrc
          ? <img src={coverSrc} alt="Cover" className="h-32 w-full object-cover" />
          : <div className="flex h-32 items-center justify-center bg-gradient-to-br from-[#1a2540] to-[#0c1321]">
              <span className="material-symbols-outlined text-4xl text-[#f2ca50]/30">self_improvement</span>
            </div>}
        <div className="p-3 space-y-2">
          <div className="flex flex-wrap gap-1.5">
            <span className="rounded-full border border-[#f2ca50]/30 px-2 py-0.5 text-[10px] text-[#f2ca50]">
              {categoryLabels[form.category]}
            </span>
            {diff && <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-[#d0c5af]/70">{diff}</span>}
            {(guidedAudio || ambientAudio || legacyAudio) && <span className="rounded-full border border-emerald-500/30 px-2 py-0.5 text-[10px] text-emerald-300">Audio available</span>}
            {form.time_of_day && <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-[#d0c5af]/70">{timeOfDayLabels[form.time_of_day]}</span>}
          </div>
          <p className="font-serif-headline text-base font-bold text-[#dce2f6] leading-snug">
            {form.name || <span className="text-[#d0c5af]/40">Practice name</span>}
          </p>
          {form.subtitle && <p className="text-xs text-[#d0c5af]/70">{form.subtitle}</p>}
          {form.description && <p className="line-clamp-3 text-xs text-[#d0c5af]/60">{form.description}</p>}
          {form.category === 'japa' && (
            <div className="space-y-1 rounded-lg border border-white/10 bg-white/[0.03] p-2">
              {form.japa_mantra_name && <p className="text-xs font-semibold text-[#f2ca50]">{form.japa_mantra_name}</p>}
              {mantraText && <p className="whitespace-pre-line text-sm text-[#dce2f6]">{mantraText}</p>}
              {transliteration && <p className="text-xs italic text-[#d0c5af]/70">{transliteration}</p>}
              {form.japa_count_preset && <p className="text-xs text-[#d0c5af]/70">Suggested repetitions: {form.japa_count_preset}</p>}
              {form.target_type === 'repetitions' && form.target_count &&
                <p className="text-xs text-[#d0c5af]/70">Completion target: {form.target_count} repetitions</p>}
            </div>
          )}
          {form.category === 'mantra' && (
            <div className="space-y-1">
              {form.mantra_name && <p className="text-xs font-semibold text-[#f2ca50]">{form.mantra_name}</p>}
              {mantraText && <p className="whitespace-pre-line text-sm text-[#dce2f6]">{mantraText}</p>}
              {transliteration && <p className="text-xs italic text-[#d0c5af]/70">{transliteration}</p>}
              {form.mantra_meaning && <p className="text-xs text-[#d0c5af]/70">{form.mantra_meaning}</p>}
            </div>
          )}
          {form.category === 'scripture_reading' && form.scripture_name &&
            <p className="text-xs text-[#dce2f6]">
              {form.scripture_name}{form.scripture_chapter_number ? ` · Chapter ${form.scripture_chapter_number}` : ''}
              {form.scripture_start_verse ? ` · Verse ${form.scripture_start_verse}` : ''}
              {form.scripture_end_verse ? `–${form.scripture_end_verse}` : ''}
            </p>}
          {form.category === 'gratitude' && form.grat_prompts.length > 0 && (
            <div>
              <p className="mb-1 text-[10px] uppercase tracking-wide text-[#d0c5af]/50">Reflection prompts</p>
              <ul className="list-inside list-disc space-y-0.5 text-xs text-[#d0c5af]/70">
                {form.grat_prompts.slice(0, 2).map((prompt, index) => <li key={index}>{prompt}</li>)}
              </ul>
            </div>
          )}
          {form.benefits.length > 0 && (
            <ul className="space-y-0.5">
              {form.benefits.slice(0, 3).map((b, i) => (
                <li key={i} className="flex items-start gap-1.5 text-xs text-[#d0c5af]/70">
                  <span className="mt-0.5 text-[#f2ca50]">✦</span>{b}
                </li>
              ))}
              {form.benefits.length > 3 && <li className="text-xs text-[#d0c5af]/40">+{form.benefits.length - 3} more</li>}
            </ul>
          )}
          <div className="flex flex-wrap gap-3 text-xs text-[#d0c5af]/60">
            {form.duration_minutes && <span>⏱ {form.duration_minutes} min</span>}
            {form.target_count && form.target_type && form.target_type !== 'none' && (
              <span>🎯 {form.target_count} {form.target_unit || form.target_type}</span>
            )}
          </div>
          {instructions && <p className="whitespace-pre-line text-xs text-[#d0c5af]/70">{instructions}</p>}
          {guidedAudio && <audio controls preload="metadata" src={guidedAudio} className="w-full"><span>Audio preview unavailable.</span></audio>}
          {ambientAudio && <audio controls preload="metadata" src={ambientAudio} className="w-full"><span>Ambient audio preview unavailable.</span></audio>}
          {legacyAudio && <audio controls preload="metadata" src={legacyAudio} className="w-full"><span>Audio preview unavailable.</span></audio>}
          <button type="button" disabled className="mt-1 w-full rounded-xl bg-[#f2ca50] py-2 text-xs font-bold text-[#3c2f00] opacity-80">
            {actionLabel[form.category]}
          </button>
        </div>
      </div>
      <p className="text-[10px] text-[#d0c5af]/40">
        Preview is illustrative. The customer app is a separate application.
      </p>
    </aside>
  );
};

// ─── Main view ────────────────────────────────────────────────────────────────
export const SadhanaPracticesView: React.FC = () => {
  const [practices, setPractices] = useState<SadhanaPractice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [toast, setToast] = useState<Toast | null>(null);
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<SadhanaPracticeCategory | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'form' | 'preview'>('form');
  const [form, setForm] = useState<PracticeForm>(emptyForm);
  const [editing, setEditing] = useState<SadhanaPractice | null>(null);
  const [saving, setSaving] = useState(false);
  const [validationError, setValidationError] = useState<SadhanaPracticeValidationError | null>(null);
  const [localizedLanguage, setLocalizedLanguage] = useState<SadhanaContentLanguage>('en');
  const [scriptures, setScriptures] = useState<Scripture[]>([]);
  const [scriptureLoading, setScriptureLoading] = useState(false);
  const [scriptureLoadError, setScriptureLoadError] = useState('');
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [chapterLoading, setChapterLoading] = useState(false);
  const [chapterLoadError, setChapterLoadError] = useState('');
  const [verses, setVerses] = useState<number[]>([]);
  const [verseLoading, setVerseLoading] = useState(false);
  const [mutatingId, setMutatingId] = useState<string | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<SadhanaPractice | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const initialFormRef = useRef<string | null>(null);
  const pageSize = 10;
  const isDirty = useMemo(
    () => initialFormRef.current !== null && JSON.stringify(form) !== initialFormRef.current,
    [form],
  );

  async function loadPractices(): Promise<boolean> {
    setIsLoading(true); setLoadError('');
    try { const r = await sadhanaPracticeService.list(); setPractices(r); return true; }
    catch (e) { setLoadError(errorMessage(e)); return false; }
    finally { setIsLoading(false); }
  }

  useEffect(() => { void loadPractices(); }, []);

  useEffect(() => {
    if (!isModalOpen || form.category !== 'scripture_reading') return;
    let current = true;
    setScriptureLoading(true);
    setScriptureLoadError('');
    scriptureService.list().then(rows => {
      if (current) setScriptures(rows.filter(row => row.status === 'Published'));
    }).catch(error => {
      if (current) setScriptureLoadError(errorMessage(error));
    }).finally(() => {
      if (current) setScriptureLoading(false);
    });
    return () => { current = false; };
  }, [isModalOpen, form.category]);

  useEffect(() => {
    if (!isModalOpen || form.category !== 'scripture_reading' || !form.scripture_id) {
      setChapters([]);
      setVerses([]);
      return;
    }
    let current = true;
    setChapterLoading(true);
    setChapterLoadError('');
    chapterService.list(form.scripture_id).then(rows => {
      if (current) setChapters(rows.filter(row => row.status === 'Published'));
    }).catch(error => {
      if (current) setChapterLoadError(errorMessage(error));
    }).finally(() => {
      if (current) setChapterLoading(false);
    });
    return () => { current = false; };
  }, [isModalOpen, form.category, form.scripture_id]);

  useEffect(() => {
    if (!isModalOpen || form.category !== 'scripture_reading' || !form.scripture_chapter_id) {
      setVerses([]);
      return;
    }
    let current = true;
    setVerseLoading(true);
    slokaService.list(form.scripture_chapter_id).then(rows => {
      if (current) setVerses(rows.filter(row => row.status === 'Published').map(row => row.verse_number));
    }).catch(error => {
      if (current) setChapterLoadError(errorMessage(error));
    }).finally(() => {
      if (current) setVerseLoading(false);
    });
    return () => { current = false; };
  }, [isModalOpen, form.category, form.scripture_chapter_id]);

  useEffect(() => {
    if (!isModalOpen || !isDirty) return;
    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warnBeforeUnload);
    return () => window.removeEventListener('beforeunload', warnBeforeUnload);
  }, [isDirty, isModalOpen]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 5000);
    return () => window.clearTimeout(t);
  }, [toast]);

  const filteredPractices = useMemo(() => {
    const q = query.trim().toLowerCase();
    return practices.filter(p => {
      if (categoryFilter !== 'all' && p.category !== categoryFilter) return false;
      if (statusFilter === 'active' && (!p.is_active || p.archived_at != null)) return false;
      if (statusFilter === 'inactive' && (p.is_active || p.archived_at != null)) return false;
      if (statusFilter === 'archived' && p.archived_at == null) return false;
      if (!q) return true;
      return [p.name, p.slug, p.description, p.subtitle ?? '', ...(p.tags ?? [])].some(v => v.toLowerCase().includes(q));
    });
  }, [practices, query, categoryFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredPractices.length / pageSize));
  const pageRows = filteredPractices.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const activeCount = practices.filter(p => p.is_active && p.archived_at == null).length;

  useEffect(() => { if (currentPage > totalPages) setCurrentPage(totalPages); }, [currentPage, totalPages]);

  const setField = <K extends keyof PracticeForm>(k: K, v: PracticeForm[K]) => {
    setValidationError(null);
    setForm(prev => ({ ...prev, [k]: v }));
  };

  const setLocalizedField = (field: 'meaning' | 'instructions', value: string) => {
    setValidationError(null);
    setForm(prev => ({
      ...prev,
      localized_content: {
        ...prev.localized_content,
        [localizedLanguage]: { ...prev.localized_content[localizedLanguage], [field]: value },
      },
    }));
  };

  const setSlot = (slot: 'cover' | 'guided_audio' | 'ambient_audio', patch: Partial<MediaSlot>) =>
    setForm(prev => {
      const nextSlot = { ...prev[slot], ...patch };
      const next = { ...prev, [slot]: nextSlot };
      if (slot === 'guided_audio' && !isSafeHttpsUrl(nextSlot.url) &&
          next.completion_rule === 'audio_completed') {
        next.completion_rule = '';
      }
      return next;
    });

  const openCreate = () => {
    const next = emptyForm();
    initialFormRef.current = JSON.stringify(next);
    setValidationError(null); setEditing(null); setForm(next); setActiveTab('form'); setIsModalOpen(true);
  };
  const openEdit = (p: SadhanaPractice) => {
    const next = formFromPractice(p);
    initialFormRef.current = JSON.stringify(next);
    setValidationError(null); setEditing(p); setForm(next); setActiveTab('form'); setIsModalOpen(true);
  };

  const handleUpload = async (slot: 'cover' | 'guided_audio' | 'ambient_audio', file: File) => {
    const kind: SadhanaPracticeMediaKind = slot === 'cover' ? 'image' : 'audio';
    setSlot(slot, { uploading: true, progress: 0, error: '' });
    try {
      const result = await sadhanaMediaService.upload(file, kind, pct => setSlot(slot, { progress: pct }));
      setSlot(slot, { uploading: false, url: result.media_url });
      setToast({ message: 'Media uploaded. Save the practice to persist the URL.', type: 'success' });
    } catch (e) {
      const msg = errorMessage(e);
      setSlot(slot, { uploading: false, error: msg });
      setToast({ message: msg, type: 'error' });
    }
  };

  const anyUploading = form.cover.uploading || form.guided_audio.uploading || form.ambient_audio.uploading;
  const hasGuidedAudio = isSafeHttpsUrl(form.guided_audio.url) ||
    form.media_type === 'audio' && isSafeHttpsUrl(form.media_url);
  const availableCompletionRules = completionRulesFor(
    form.category,
    form.target_type,
    form.practice_mode,
    hasGuidedAudio,
    form.japa_counter_enabled,
  );

  const closeEditor = () => {
    if (saving || anyUploading) return;
    if (isDirty && !window.confirm('Discard unsaved changes to this practice?')) return;
    setIsModalOpen(false);
    initialFormRef.current = null;
  };

  const changeCategory = (category: SadhanaPracticeCategory) => {
    const practice_mode = modesForCategory(category).includes(form.practice_mode as SadhanaPracticeMode)
      ? form.practice_mode
      : '';
    const target_type = targetsForCategory(category, practice_mode).includes(form.target_type as SadhanaTargetType)
      ? form.target_type
      : '';
    const completion_rule = completionRulesFor(category, target_type, practice_mode, hasGuidedAudio, form.japa_counter_enabled)
      .includes(form.completion_rule as SadhanaCompletionRule) ? form.completion_rule : '';
    setValidationError(null);
    setForm(previous => ({
      ...previous,
      category,
      target_type,
      target_count: target_type ? previous.target_count : '',
      target_unit: target_type ? previous.target_unit : '',
      practice_mode,
      completion_rule,
    }));
  };

  const changeTargetType = (target_type: SadhanaTargetType | '') => {
    const completion_rule = completionRulesFor(
      form.category, target_type, form.practice_mode, hasGuidedAudio, form.japa_counter_enabled,
    ).includes(form.completion_rule as SadhanaCompletionRule) ? form.completion_rule : '';
    setForm(previous => ({
      ...previous,
      target_type,
      target_count: target_type && target_type !== 'none' ? previous.target_count : '',
      target_unit: target_type && target_type !== 'none' ? previous.target_unit : '',
      completion_rule,
    }));
    setValidationError(null);
  };

  const changePracticeMode = (practice_mode: SadhanaPracticeMode | '') => {
    const target_type = targetsForCategory(form.category, practice_mode)
      .includes(form.target_type as SadhanaTargetType) ? form.target_type : '';
    const completion_rule = completionRulesFor(
      form.category, target_type, practice_mode, hasGuidedAudio, form.japa_counter_enabled,
    ).includes(form.completion_rule as SadhanaCompletionRule) ? form.completion_rule : '';
    setForm(previous => ({
      ...previous,
      practice_mode,
      target_type,
      target_count: target_type ? previous.target_count : '',
      target_unit: target_type ? previous.target_unit : '',
      completion_rule,
    }));
    setValidationError(null);
  };

  const changeScripture = (scriptureId: string) => {
    const scripture = scriptures.find(item => item.id === scriptureId);
    setForm(previous => ({
      ...previous,
      scripture_id: scriptureId,
      scripture_name: scripture?.name ?? '',
      scripture_chapter_id: '',
      scripture_chapter_number: '',
      scripture_start_verse: '',
      scripture_end_verse: '',
    }));
    setValidationError(null);
  };

  const changeChapter = (chapterId: string) => {
    const chapter = chapters.find(item => item.id === chapterId);
    setForm(previous => ({
      ...previous,
      scripture_chapter_id: chapterId,
      scripture_chapter_number: chapter ? String(chapter.chapter_number) : '',
      scripture_start_verse: '',
      scripture_end_verse: '',
    }));
    setValidationError(null);
  };

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (anyUploading) return;
    setSaving(true);
    try {
      const payload = inputFromForm(form);
      if (editing) {
        const { slug: _slug, ...rest } = payload;
        const update = parsePracticeUpdate(rest) satisfies SadhanaPracticeUpdate;
        await sadhanaPracticeService.update(editing.id, update);
      } else {
        const create = parsePracticeCreate(payload);
        await sadhanaPracticeService.create(create);
      }
      setIsModalOpen(false); setEditing(null);
      initialFormRef.current = null;
      const ok = await loadPractices();
      setToast(ok
        ? { message: editing ? 'Practice changes saved.' : 'Practice created.', type: 'success' }
        : { message: 'Saved, but the list could not be refreshed. Use Retry.', type: 'error' });
    } catch (e) {
      if (e instanceof SadhanaPracticeValidationError) setValidationError(e);
      setToast({ message: e instanceof SadhanaPracticeValidationError ? e.message : errorMessage(e), type: 'error' });
    } finally { setSaving(false); }
  };

  const handleToggleActive = async (p: SadhanaPractice) => {
    if (mutatingId) return;
    setMutatingId(p.id);
    try {
      await sadhanaPracticeService.update(p.id, { is_active: !p.is_active } satisfies SadhanaPracticeUpdate);
      const ok = await loadPractices();
      setToast(ok
        ? { message: p.is_active ? 'Practice deactivated.' : 'Practice activated.', type: 'success' }
        : { message: 'Status saved, but list could not refresh.', type: 'error' });
    } catch (e) { setToast({ message: errorMessage(e), type: 'error' }); }
    finally { setMutatingId(null); }
  };

  const handleArchive = async () => {
    if (!archiveTarget || mutatingId) return;
    setMutatingId(archiveTarget.id);
    try {
      await sadhanaPracticeService.archive(archiveTarget.id);
      setArchiveTarget(null);
      const ok = await loadPractices();
      setToast(ok
        ? { message: 'Practice archived. Existing history unchanged.', type: 'success' }
        : { message: 'Archived, but list could not refresh.', type: 'error' });
    } catch (e) { setToast({ message: errorMessage(e), type: 'error' }); }
    finally { setMutatingId(null); }
  };

  return (
    <div className="space-y-6 p-4 pb-28 md:p-8">
      {/* ── Header ── */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 text-sm text-[#d0c5af]/70">Sanatana / Sadhana Practices</p>
          <h1 className="font-serif-headline text-3xl font-bold text-[#dce2f6] md:text-4xl">Sadhana Practices</h1>
          <p className="mt-2 text-sm text-[#d0c5af]/75">Manage practice definitions. Customer progress and history remain separate.</p>
        </div>
        <div className="flex gap-3">
          <button type="button" onClick={() => void loadPractices()} disabled={isLoading} className={btn}>
            <span className="material-symbols-outlined mr-1 align-middle text-base">refresh</span>Refresh
          </button>
          <button type="button" onClick={openCreate} className="rounded-xl bg-[#f2ca50] px-4 py-2 text-sm font-bold text-[#3c2f00] hover:bg-[#ffe082]">
            <span className="material-symbols-outlined mr-1 align-middle text-base">add</span>Add practice
          </button>
        </div>
      </header>

      {/* ── Toast ── */}
      {toast && (
        <div role={toast.type === 'error' ? 'alert' : 'status'}
          className={`flex items-start justify-between gap-4 rounded-xl border p-3 text-sm ${toast.type === 'success' ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300' : 'border-rose-500/40 bg-rose-500/10 text-rose-300'}`}>
          <span>{toast.message}</span>
          <button type="button" aria-label="Dismiss" onClick={() => setToast(null)}>×</button>
        </div>
      )}

      {/* ── Stats ── */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3" aria-label="Practice counts">
        {[
          { label: 'All definitions', value: practices.length, color: 'text-[#f2ca50]' },
          { label: 'Active (visible to users)', value: activeCount, color: 'text-emerald-400' },
          { label: 'Categories', value: SADHANA_PRACTICE_CATEGORIES.length, color: 'text-[#dce2f6]' },
        ].map(s => (
          <div key={s.label} className="rounded-2xl border border-white/10 bg-[#19202e] p-4">
            <p className="text-xs uppercase tracking-wide text-[#d0c5af]/60">{s.label}</p>
            <p className={`mt-2 text-2xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </section>

      {/* ── Filters ── */}
      <section className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-[#19202e]/80 p-4 md:flex-row">
        <label className="flex-1"><span className="sr-only">Search</span>
          <input type="search" value={query} onChange={e => { setQuery(e.target.value); setCurrentPage(1); }}
            placeholder="Search name, slug, description, tags…" className={ic} />
        </label>
        <label><span className="sr-only">Category</span>
          <select value={categoryFilter} onChange={e => { setCategoryFilter(e.target.value as SadhanaPracticeCategory | 'all'); setCurrentPage(1); }} className={ic}>
            <option value="all">All categories</option>
            {SADHANA_PRACTICE_CATEGORIES.map(c => <option key={c} value={c}>{categoryLabels[c]}</option>)}
          </select>
        </label>
        <label><span className="sr-only">Status</span>
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value as StatusFilter); setCurrentPage(1); }} className={ic}>
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="archived">Archived</option>
          </select>
        </label>
      </section>

      {/* ── List ── */}
      {isLoading ? (
        <div role="status" aria-label="Loading" className="space-y-3 animate-pulse">
          {Array.from({ length: 4 }, (_, i) => <div key={i} className="h-20 rounded-xl border border-white/10 bg-white/5" />)}
          <span className="sr-only">Loading practices…</span>
        </div>
      ) : loadError ? (
        <section role="alert" className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-6">
          <h2 className="font-semibold text-rose-300">Practices could not be loaded</h2>
          <p className="mt-2 text-sm text-[#dce2f6]/80">{loadError}</p>
          <button type="button" onClick={() => void loadPractices()} className="mt-4 rounded-lg bg-[#f2ca50] px-4 py-2 text-sm font-semibold text-[#3c2f00]">Retry</button>
        </section>
      ) : practices.length === 0 ? (
        <section className="rounded-2xl border border-dashed border-white/15 bg-[#19202e]/50 p-10 text-center">
          <h2 className="font-serif-headline text-xl font-semibold text-[#dce2f6]">No practice definitions yet</h2>
          <p className="mt-2 text-sm text-[#d0c5af]/70">Create a practice to make it available in the catalogue.</p>
          <button type="button" onClick={openCreate} className="mt-5 rounded-xl bg-[#f2ca50] px-4 py-2 text-sm font-bold text-[#3c2f00]">Create first practice</button>
        </section>
      ) : filteredPractices.length === 0 ? (
        <section className="rounded-2xl border border-dashed border-white/15 p-10 text-center text-sm text-[#d0c5af]/70">No practices match those filters.</section>
      ) : (
        <>
          <div className="overflow-x-auto rounded-2xl border border-white/10 bg-[#19202e]">
            <table className="w-full min-w-[900px] text-left">
              <thead className="border-b border-white/10 text-xs uppercase tracking-wide text-[#d0c5af]/65">
                <tr>
                  <th className="px-4 py-3">Practice</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Mode / Target</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {pageRows.map(p => (
                  <tr key={p.id} className="align-top hover:bg-white/[0.025]">
                    <td className="max-w-xs px-4 py-4">
                      <div className="flex items-start gap-2">
                        {p.cover_image_url && isSafeHttpsUrl(p.cover_image_url) && (
                          <img src={p.cover_image_url} alt="" className="mt-0.5 h-10 w-10 flex-shrink-0 rounded-lg object-cover" />
                        )}
                        <div>
                          <p className="font-semibold text-[#dce2f6]">{p.name}</p>
                          {p.subtitle && <p className="text-xs text-[#d0c5af]/60">{p.subtitle}</p>}
                          <p className="mt-0.5 text-xs text-[#d0c5af]/40">{p.slug}</p>
                          {p.is_featured && <span className="mt-1 inline-block rounded-full border border-[#f2ca50]/30 px-2 py-0.5 text-[10px] text-[#f2ca50]">Featured</span>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="rounded-lg border border-white/10 bg-[#0c1321] px-2.5 py-1 text-xs text-[#f2ca50]">{categoryLabels[p.category]}</span>
                      {p.difficulty && <p className="mt-1 text-xs text-[#d0c5af]/55">{difficultyLabels[p.difficulty as SadhanaPracticeDifficulty]}</p>}
                    </td>
                    <td className="px-4 py-4 text-xs text-[#dce2f6]/80">
                      {p.practice_mode ? modeLabels[p.practice_mode as SadhanaPracticeMode] : '—'}
                      <br />
                      {p.target_count != null ? `${p.target_count} ${p.target_unit ?? p.target_type ?? ''}` : p.duration_minutes != null ? `${p.duration_minutes} min` : 'No target'}
                    </td>
                    <td className="px-4 py-4">
                      <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${p.archived_at != null ? 'border-slate-500/30 bg-slate-500/10 text-slate-300' : p.is_active ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300' : 'border-amber-500/20 bg-amber-500/10 text-amber-300'}`}>
                        {p.archived_at != null ? 'Archived' : p.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex justify-end gap-2">
                        {p.archived_at == null && (
                          <>
                            <button type="button" onClick={() => openEdit(p)} disabled={mutatingId !== null} className={btn}>Edit</button>
                            <button type="button" onClick={() => void handleToggleActive(p)} disabled={mutatingId !== null} className={btn}>
                              {mutatingId === p.id ? 'Saving…' : p.is_active ? 'Deactivate' : 'Activate'}
                            </button>
                            <button type="button" onClick={() => setArchiveTarget(p)} disabled={mutatingId !== null} className="rounded-xl border border-rose-500/20 px-3 py-2 text-xs font-semibold text-rose-300 hover:bg-rose-500/10 disabled:opacity-50">Archive</button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between text-xs text-[#d0c5af]/70">
            <span>Showing {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filteredPractices.length)} of {filteredPractices.length}</span>
            <div className="flex gap-2">
              <button type="button" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className={btn}>Previous</button>
              <span className="self-center">{currentPage} / {totalPages}</span>
              <button type="button" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className={btn}>Next</button>
            </div>
          </div>
        </>
      )}

      {/* ── Modal ── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 p-4 backdrop-blur-sm">
          <div className="mx-auto my-8 w-full max-w-5xl">
            <section role="dialog" aria-modal="true" aria-labelledby="pf-title"
              className="rounded-3xl border border-[#f2ca50]/30 bg-[#19202e] shadow-2xl">
              {/* Modal header */}
              <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
                <div>
                  <h2 id="pf-title" className="font-serif-headline text-xl font-bold text-[#f2ca50]">
                    {editing ? 'Edit practice' : 'Create practice'}
                  </h2>
                  <p className="mt-0.5 text-xs text-[#d0c5af]/60">New practices start inactive until explicitly activated.</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex rounded-xl border border-white/10 bg-[#0c1321] p-0.5">
                    {(['form', 'preview'] as const).map(tab => (
                      <button key={tab} type="button" onClick={() => setActiveTab(tab)}
                        className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${activeTab === tab ? 'bg-[#f2ca50] text-[#3c2f00]' : 'text-[#d0c5af]/70 hover:text-[#dce2f6]'}`}>
                        {tab === 'form' ? 'Edit' : 'Preview'}
                      </button>
                    ))}
                  </div>
                  <button type="button" aria-label="Close" disabled={saving || anyUploading} onClick={closeEditor} className={btn}>Close</button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-0 lg:grid-cols-[1fr_320px]">
                {/* Form column */}
                <div className={`${activeTab === 'preview' ? 'hidden lg:block' : ''} border-r border-white/10`}>
                  <form ref={formRef} onSubmit={handleSave} className="space-y-5 p-6">
                    {validationError && (
                      <div role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
                        {validationError.message}
                      </div>
                    )}

                    {/* ── Section A: Basic Information ── */}
                    <SectionBox title="A — Basic Information">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Practice name" required>
                          <input required maxLength={120} value={form.name}
                            onChange={e => {
                              const n = e.target.value;
                              setField('name', n);
                              if (!form.slugTouched) setField('slug', slugFromName(n));
                            }} className={ic} />
                        </Field>
                        <Field label="Category" required error={validationError?.field === 'category' ? validationError.message : undefined}>
                          <select required value={form.category}
                            onChange={e => changeCategory(e.target.value as SadhanaPracticeCategory)} className={ic}>
                            {SADHANA_PRACTICE_CATEGORIES.map(c => <option key={c} value={c}>{categoryLabels[c]}</option>)}
                          </select>
                        </Field>
                      </div>

                      <Field label="Stable slug" required={!editing}
                        hint={editing ? 'Slug is locked after creation to preserve practice identity.' : 'Lowercase letters, numbers and hyphens. Unique across active and archived definitions.'}>
                        <input required={!editing} readOnly={editing !== null} maxLength={120}
                          pattern="[a-z0-9]+(-[a-z0-9]+)*" value={form.slug}
                          onChange={e => { setField('slugTouched', true); setField('slug', e.target.value); }}
                          className={`${ic} ${editing ? 'cursor-not-allowed opacity-60' : ''}`} />
                      </Field>

                      <Field label="Short subtitle" hint="Shown below the practice name in the catalogue (max 200 chars).">
                        <input maxLength={200} value={form.subtitle} onChange={e => setField('subtitle', e.target.value)} className={ic} />
                      </Field>

                      <Field label="Description" hint="Up to 1000 characters. Shown in the catalogue card.">
                        <textarea rows={3} maxLength={1000} value={form.description}
                          onChange={e => setField('description', e.target.value)} className={ic} />
                      </Field>

                      <Field label="Detailed instructions" hint="Up to 10 000 characters. Shown on the practice detail screen.">
                        <textarea rows={5} maxLength={10000} value={form.instructions}
                          onChange={e => setField('instructions', e.target.value)} className={ic} />
                      </Field>

                      <div className="grid gap-4 sm:grid-cols-3">
                        <Field label="Duration (minutes)">
                          <input type="number" min={1} max={1440} step={1} value={form.duration_minutes}
                            onChange={e => setField('duration_minutes', e.target.value)} className={ic} />
                        </Field>
                        <Field label="Display order">
                          <input type="number" min={0} max={1000000} step={1} value={form.display_order}
                            onChange={e => setField('display_order', e.target.value)} className={ic} />
                        </Field>
                        <Field label="Difficulty">
                          <select value={form.difficulty} onChange={e => setField('difficulty', e.target.value as SadhanaPracticeDifficulty | '')} className={ic}>
                            <option value="">— optional —</option>
                            {SADHANA_PRACTICE_DIFFICULTIES.map(d => <option key={d} value={d}>{difficultyLabels[d]}</option>)}
                          </select>
                        </Field>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Recommended time of day">
                          <select value={form.time_of_day} onChange={e => setField('time_of_day', e.target.value as SadhanaTimeOfDay | '')} className={ic}>
                            <option value="">— optional —</option>
                            {SADHANA_TIMES_OF_DAY.map(t => <option key={t} value={t}>{timeOfDayLabels[t]}</option>)}
                          </select>
                        </Field>
                        <div className="flex items-center gap-3 pt-5">
                          <input type="checkbox" id="is_featured" checked={form.is_featured}
                            onChange={e => setField('is_featured', e.target.checked)}
                            className="h-4 w-4 accent-[#f2ca50]" />
                          <label htmlFor="is_featured" className="text-sm text-[#dce2f6]">Featured in catalogue</label>
                        </div>
                      </div>

                      <Field label="Benefits (up to 20)" hint="Each benefit is shown as a bullet in the customer detail view.">
                        <BenefitsList value={form.benefits} onChange={v => setField('benefits', v)} />
                      </Field>

                      <Field label="Tags" hint="Lowercase, hyphen-separated. Used for filtering and discovery.">
                        <TagInput value={form.tags} onChange={v => setField('tags', v)} placeholder="e.g. morning, breath, mantra" />
                      </Field>
                    </SectionBox>

                    {/* ── Section B: Practice Behaviour ── */}
                    <SectionBox title="B — Practice Behaviour">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Practice mode" hint="Controls which completion UI the customer app renders.">
                          <select value={form.practice_mode} onChange={e => changePracticeMode(e.target.value as SadhanaPracticeMode | '')} className={ic}>
                            <option value="">— optional —</option>
                            {modesForCategory(form.category).map(m => <option key={m} value={m}>{modeLabels[m]}</option>)}
                          </select>
                        </Field>
                        <Field label="Target type" error={validationError?.field === 'target_type' ? validationError.message : undefined}>
                          <select value={form.target_type} onChange={e => changeTargetType(e.target.value as SadhanaTargetType | '')} className={ic}>
                            <option value="">— optional —</option>
                            {targetsForCategory(form.category, form.practice_mode).map(t => <option key={t} value={t}>{targetTypeLabels[t]}</option>)}
                          </select>
                        </Field>
                      </div>

                      {form.target_type && form.target_type !== 'none' && (
                        <div className="grid gap-4 sm:grid-cols-2">
                          <Field label={form.target_type === 'duration' ? 'Target duration (minutes)' : 'Target value'}
                            hint="Must be a positive integer."
                            error={validationError?.field === 'target_count' ? validationError.message : undefined}>
                            <input type="number" min={1} max={100000} step={1} value={form.target_count}
                              onChange={e => setField('target_count', e.target.value)} className={ic} />
                          </Field>
                          <Field label="Unit label" hint="e.g. repetitions, verses, entries">
                            <input maxLength={40} value={form.target_unit}
                              onChange={e => setField('target_unit', e.target.value)} className={ic} />
                          </Field>
                        </div>
                      )}

                      <Field label="Completion rule"
                        hint="Manual completion requires an explicit customer action. Opening a practice or starting audio does not complete it."
                        error={validationError?.field === 'completion_rule' ? validationError.message : undefined}>
                        <select value={form.completion_rule} onChange={e => {
                          setField('completion_rule', e.target.value as SadhanaCompletionRule | '');
                        }} className={ic}>
                          <option value="">— optional —</option>
                          {availableCompletionRules.map(r => <option key={r} value={r}>{completionRuleLabels[r]}</option>)}
                        </select>
                      </Field>
                    </SectionBox>

                    {/* ── Section C: Category-Specific Configuration ── */}
                    <SectionBox title="C — Category-Specific Configuration">
                      {form.category === 'meditation' && (
                        <div className="space-y-4">
                          <div className="flex items-center gap-3">
                            <input type="checkbox" id="med_guided" checked={form.med_is_guided}
                              onChange={e => setField('med_is_guided', e.target.checked)} className="h-4 w-4 accent-[#f2ca50]" />
                            <label htmlFor="med_guided" className="text-sm text-[#dce2f6]">Guided meditation</label>
                          </div>
                          <p className="text-xs text-[#d0c5af]/55">Use the guided audio asset below for an instructor recording; use ambient audio for optional background sound.</p>
                          <Field label="Breathing guidance" hint="Optional cue text shown during the session.">
                            <textarea rows={2} maxLength={1000} value={form.med_breathing}
                              onChange={e => setField('med_breathing', e.target.value)} className={ic} />
                          </Field>
                          <div className="grid gap-4 sm:grid-cols-2">
                            <Field label="Beginning instructions" hint="How the customer should begin the session.">
                              <textarea rows={2} maxLength={1000} value={form.med_begin_instructions}
                                onChange={e => setField('med_begin_instructions', e.target.value)} className={ic} />
                            </Field>
                            <Field label="Ending instructions" hint="How the customer should conclude the session.">
                              <textarea rows={2} maxLength={1000} value={form.med_end_instructions}
                                onChange={e => setField('med_end_instructions', e.target.value)} className={ic} />
                            </Field>
                          </div>
                          <p className="text-xs text-[#d0c5af]/55">Set the duration target in Practice Behaviour. Starting or listening to audio is not completion unless a compatible rule is explicitly configured.</p>
                        </div>
                      )}

                      {form.category === 'japa' && (
                        <div className="space-y-4">
                          <Field label="Mantra display name">
                            <input maxLength={120} value={form.japa_mantra_name}
                              onChange={e => setField('japa_mantra_name', e.target.value)} className={ic} />
                          </Field>
                          <Field label="Mantra text in original script" hint="Use the original writing system; line breaks are preserved.">
                            <textarea rows={3} maxLength={2000} value={form.japa_mantra}
                              onChange={e => setField('japa_mantra', e.target.value)} className={ic} />
                          </Field>
                          <Field label="Transliteration" hint="Roman-script pronunciation guide.">
                            <textarea rows={2} maxLength={2000} value={form.japa_transliteration}
                              onChange={e => setField('japa_transliteration', e.target.value)} className={ic} />
                          </Field>
                          <Field label="Meaning or explanation">
                            <textarea rows={2} maxLength={3000} value={form.japa_meaning}
                              onChange={e => setField('japa_meaning', e.target.value)} className={ic} />
                          </Field>
                          <div className="grid gap-4 sm:grid-cols-2">
                            <Field label="Default repetition target" hint="Optional suggested counter value; 108 is not a required default. One complete recitation counts as one repetition.">
                              <input type="number" min={1} max={100000} step={1} value={form.japa_count_preset}
                                onChange={e => setField('japa_count_preset', e.target.value)} className={ic} />
                            </Field>
                            <div className="space-y-3 pt-2">
                              <div className="flex items-center gap-3">
                                <input type="checkbox" id="japa_counter" checked={form.japa_counter_enabled}
                                  onChange={e => {
                                    const enabled = e.target.checked;
                                    setForm(previous => ({
                                      ...previous,
                                      japa_counter_enabled: enabled,
                                      completion_rule: !enabled && previous.completion_rule === 'repetitions_reached'
                                        ? '' : previous.completion_rule,
                                    }));
                                    setValidationError(null);
                                  }} className="h-4 w-4 accent-[#f2ca50]" />
                                <label htmlFor="japa_counter" className="text-sm text-[#dce2f6]">Enable Japa repetition counter</label>
                              </div>
                              <div className="flex items-center gap-3">
                              <input type="checkbox" id="japa_mala" checked={form.japa_mala_counter}
                                onChange={e => setField('japa_mala_counter', e.target.checked)} className="h-4 w-4 accent-[#f2ca50]" />
                                <label htmlFor="japa_mala" className="text-sm text-[#dce2f6]">Enable optional mala counter support</label>
                              </div>
                            </div>
                          </div>
                          <Field label="Counter instructions" hint="For example, explain that one full recitation advances the count by one.">
                            <textarea rows={2} maxLength={1000} value={form.japa_counter_instructions}
                              onChange={e => setField('japa_counter_instructions', e.target.value)} className={ic} />
                          </Field>
                          <p className="text-xs text-[#d0c5af]/55">Guided chant audio is managed as the Guided audio asset in Media Management. Playback alone never increments the Japa counter.</p>
                        </div>
                      )}

                      {form.category === 'mantra' && (
                        <div className="space-y-4">
                          <Field label="Mantra name">
                            <input maxLength={120} value={form.mantra_name}
                              onChange={e => setField('mantra_name', e.target.value)} className={ic} />
                          </Field>
                          <Field label="Mantra text in original script">
                            <textarea rows={3} maxLength={2000} value={form.mantra_text}
                              onChange={e => setField('mantra_text', e.target.value)} className={ic} />
                          </Field>
                          <Field label="Transliteration">
                            <textarea rows={2} maxLength={2000} value={form.mantra_transliteration}
                              onChange={e => setField('mantra_transliteration', e.target.value)} className={ic} />
                          </Field>
                          <Field label="Meaning / translation">
                            <textarea rows={2} maxLength={3000} value={form.mantra_meaning}
                              onChange={e => setField('mantra_meaning', e.target.value)} className={ic} />
                          </Field>
                          <p className="text-xs text-[#d0c5af]/55">Choose Repetitions for chanting or Duration for listening in Practice Behaviour; set optional guided audio in Media Management.</p>
                        </div>
                      )}

                      {form.category === 'gratitude' && (
                        <div className="space-y-4">
                          <Field label="Reflection prompts (up to 10)" hint="Shown to the customer as writing prompts. Personal reflections are never stored in this definition.">
                            <PromptsList value={form.grat_prompts} onChange={v => setField('grat_prompts', v)} />
                          </Field>
                          <div className="flex items-center gap-3">
                            <input type="checkbox" id="grat_reflect" checked={form.grat_allow_reflection}
                              onChange={e => setField('grat_allow_reflection', e.target.checked)} className="h-4 w-4 accent-[#f2ca50]" />
                            <label htmlFor="grat_reflect" className="text-sm text-[#dce2f6]">Allow customer to write a personal reflection</label>
                          </div>
                          <p className="text-xs text-[#d0c5af]/50">Personal reflections are stored in the customer's own session record, not in this definition.</p>
                        </div>
                      )}

                      {form.category === 'scripture_reading' && (
                        <div className="space-y-4">
                          <Field label="Scripture" required error={validationError?.field === 'scripture_reference' ? validationError.message : undefined}
                            hint="Select an existing published scripture record.">
                            <select value={form.scripture_id} onChange={e => changeScripture(e.target.value)} className={ic} disabled={scriptureLoading}>
                              <option value="">{scriptureLoading ? 'Loading scriptures…' : 'Select a scripture'}</option>
                              {scriptures.filter(item => item.status === 'Published' || item.id === form.scripture_id)
                                .map(item => <option key={item.id} value={item.id}>{item.name}{item.status !== 'Published' ? ` (${item.status})` : ''}</option>)}
                              {form.scripture_id && !scriptures.some(item => item.id === form.scripture_id) &&
                                <option value={form.scripture_id}>Existing scripture reference</option>}
                            </select>
                          </Field>
                          {scriptureLoadError && <p role="alert" className="text-xs text-rose-300">Scriptures could not be loaded: {scriptureLoadError}</p>}
                          {form.scripture_id && (
                            <Field label="Chapter reference" hint="Only chapters already present in the selected scripture catalogue entry are offered.">
                              <select value={form.scripture_chapter_id} onChange={e => changeChapter(e.target.value)} className={ic} disabled={chapterLoading}>
                                <option value="">{chapterLoading ? 'Loading chapters…' : 'No specific chapter'}</option>
                                {chapters.filter(item => item.status === 'Published' || item.id === form.scripture_chapter_id)
                                  .map(item => <option key={item.id} value={item.id}>Chapter {item.chapter_number}: {item.title}</option>)}
                                {form.scripture_chapter_id && !chapters.some(item => item.id === form.scripture_chapter_id) &&
                                  <option value={form.scripture_chapter_id}>Existing chapter reference</option>}
                              </select>
                            </Field>
                          )}
                          {form.scripture_chapter_id && (
                            <div className="grid gap-4 sm:grid-cols-2">
                              <Field label="Start verse (optional)">
                                <select value={form.scripture_start_verse} onChange={e => setField('scripture_start_verse', e.target.value)} className={ic} disabled={verseLoading}>
                                  <option value="">{verseLoading ? 'Loading verses…' : 'No start verse'}</option>
                                  {verses.map(verse => <option key={verse} value={verse}>{verse}</option>)}
                                  {form.scripture_start_verse && !verses.includes(Number(form.scripture_start_verse)) &&
                                    <option value={form.scripture_start_verse}>Existing verse {form.scripture_start_verse}</option>}
                                </select>
                              </Field>
                              <Field label="End verse (optional)" error={validationError?.field === 'scripture_reference' ? validationError.message : undefined}>
                                <select value={form.scripture_end_verse} onChange={e => setField('scripture_end_verse', e.target.value)} className={ic} disabled={verseLoading}>
                                  <option value="">{verseLoading ? 'Loading verses…' : 'No end verse'}</option>
                                  {verses.map(verse => <option key={verse} value={verse}>{verse}</option>)}
                                  {form.scripture_end_verse && !verses.includes(Number(form.scripture_end_verse)) &&
                                    <option value={form.scripture_end_verse}>Existing verse {form.scripture_end_verse}</option>}
                                </select>
                              </Field>
                            </div>
                          )}
                          {chapterLoadError && <p role="alert" className="text-xs text-rose-300">Chapter or verse references could not be loaded: {chapterLoadError}</p>}
                          {validationError?.field === 'scripture_reference' && <p role="alert" className="text-xs text-rose-300">{validationError.message}</p>}
                          <p className="text-xs text-[#d0c5af]/50">
                            Scripture completion is limited to explicit manual or duration-based completion here. The customer reading-progress contract is not present in this admin repository, so this definition does not claim reading progress is integrated.
                          </p>
                        </div>
                      )}

                      <div className="space-y-3 border-t border-white/10 pt-4">
                        <div>
                          <h4 className="text-xs font-bold text-[#dce2f6]">Optional translations</h4>
                          <p className="mt-1 text-[11px] text-[#d0c5af]/55">Original-script text and transliteration remain the source content above. Add only reviewed translations; blank languages are not stored.</p>
                        </div>
                        <div className="flex flex-wrap gap-2" role="group" aria-label="Translation language">
                          {(Object.keys(languageLabels) as SadhanaContentLanguage[]).map(language => (
                            <button key={language} type="button" onClick={() => setLocalizedLanguage(language)}
                              aria-pressed={localizedLanguage === language}
                              className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${localizedLanguage === language ? 'bg-[#f2ca50] text-[#3c2f00]' : 'border border-white/10 bg-[#0c1321] text-[#d0c5af]'}`}>
                              {languageLabels[language]}
                            </button>
                          ))}
                        </div>
                        <Field label={`${languageLabels[localizedLanguage]} meaning or explanation`}
                          error={validationError?.field === 'localized_content' ? validationError.message : undefined}>
                          <textarea rows={2} maxLength={10000}
                            value={form.localized_content[localizedLanguage].meaning}
                            onChange={e => setLocalizedField('meaning', e.target.value)} className={ic} />
                        </Field>
                        <Field label={`${languageLabels[localizedLanguage]} instructions`}>
                          <textarea rows={3} maxLength={10000}
                            value={form.localized_content[localizedLanguage].instructions}
                            onChange={e => setLocalizedField('instructions', e.target.value)} className={ic} />
                        </Field>
                      </div>
                    </SectionBox>

                    {/* ── Section D: Media Management ── */}
                    <SectionBox title="D — Media Management">
                      <p className="text-xs text-[#d0c5af]/55">
                        Files are uploaded to Cloudflare R2 through the secure sadhana-media Edge Function.
                        R2 credentials are never exposed to the browser.
                        Removing a URL from this record does not delete the R2 object — retained to avoid breaking other references.
                      </p>
                      <MediaAsset label="Cover image"
                        slot={form.cover} kind="image"
                        onUpload={f => void handleUpload('cover', f)}
                        onUrlChange={url => setSlot('cover', { url })}
                        onRemove={() => setSlot('cover', { url: '', error: '' })}
                        disabled={saving} />
                      <MediaAsset label="Guided audio"
                        slot={form.guided_audio} kind="audio"
                        onUpload={f => void handleUpload('guided_audio', f)}
                        onUrlChange={url => setSlot('guided_audio', { url })}
                        onRemove={() => setSlot('guided_audio', { url: '', error: '' })}
                        disabled={saving} />
                      <MediaAsset label="Ambient / background audio"
                        slot={form.ambient_audio} kind="audio"
                        onUpload={f => void handleUpload('ambient_audio', f)}
                        onUrlChange={url => setSlot('ambient_audio', { url })}
                        onRemove={() => setSlot('ambient_audio', { url: '', error: '' })}
                        disabled={saving} />
                    </SectionBox>

                    {/* ── Section F: Publishing ── */}
                    <SectionBox title="F — Publishing and Visibility">
                      <div className="rounded-xl border border-white/10 bg-[#0c1321] p-3 text-xs text-[#d0c5af]/70 space-y-1">
                        <p><span className="font-semibold text-[#dce2f6]">Lifecycle:</span> New practices are created as <span className="text-amber-300">Inactive</span> (not visible to users). Use the Activate button in the list to publish.</p>
                        <p><span className="font-semibold text-[#dce2f6]">Archiving:</span> Archived practices disappear from the user catalogue. Existing customer session history is not affected.</p>
                        <p><span className="font-semibold text-[#dce2f6]">Authorization:</span> Viewers may read. Only editors and super administrators may create, edit, activate, or archive. Role checks are enforced server-side.</p>
                      </div>
                    </SectionBox>

                    {/* ── Form actions ── */}
                    <div className="flex justify-end gap-3 border-t border-white/10 pt-4">
                      <button type="button" disabled={saving || anyUploading} onClick={closeEditor} className={btn}>Cancel</button>
                      <button type="submit" disabled={saving || anyUploading}
                        className="rounded-xl bg-[#f2ca50] px-5 py-2 text-sm font-bold text-[#3c2f00] disabled:cursor-not-allowed disabled:opacity-50">
                        {anyUploading ? 'Uploading…' : saving ? 'Saving…' : editing ? 'Save changes' : 'Create practice'}
                      </button>
                    </div>
                  </form>
                </div>

                {/* Preview column */}
                <div className={`${activeTab === 'form' ? 'hidden lg:block' : ''} p-4`}>
                  <PreviewPanel form={form} />
                </div>
              </div>
            </section>
          </div>
        </div>
      )}

      {/* ── Archive confirm ── */}
      <ConfirmModal
        isOpen={archiveTarget !== null}
        title="Archive practice definition"
        message={`Archive "${archiveTarget?.name ?? ''}"? It will disappear from the user catalogue. Existing customer session history will not be changed.`}
        confirmText={mutatingId === archiveTarget?.id ? 'Archiving…' : 'Archive practice'}
        cancelText="Keep practice"
        onConfirm={() => void handleArchive()}
        onCancel={() => { if (!mutatingId) setArchiveTarget(null); }}
      />
    </div>
  );
};
