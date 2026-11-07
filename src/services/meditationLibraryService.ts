import { supabase } from './supabaseClient';

export type MeditationLanguage = 'te' | 'hi' | 'en' | 'kn' | 'ta' | 'ml';
export type MeditationContentStatus = 'draft' | 'published' | 'archived';

export interface MeditationCategory {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon_url: string | null;
  cover_image_url: string | null;
  display_order: number;
  is_active: boolean;
}

export interface MeditationStage {
  id: string;
  category_id: string;
  name: string;
  slug: string;
  description: string;
  stage_number: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimated_duration_minutes: number | null;
  cover_image_url: string | null;
  is_active: boolean;
  display_order: number;
}

export interface MeditationPractice {
  id: string;
  category_id: string | null;
  stage_id: string | null;
  name: string;
  slug: string;
  subtitle: string;
  description: string;
  instructions: string;
  meditation_type: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  default_duration_seconds: number;
  available_durations_seconds: number[];
  requires_audio: boolean;
  has_ambient_audio: boolean;
  has_bell: boolean;
  allow_silent_mode: boolean;
  cover_image_url: string | null;
  benefits: string[];
  tags: string[];
  is_featured: boolean;
  is_active: boolean;
  display_order: number;
}

export interface MeditationTranslation {
  id: string;
  practice_id: string;
  language_code: MeditationLanguage;
  display_name: string;
  subtitle: string;
  description: string;
  instructions: string;
  benefits: string[];
}

export interface MeditationPhase {
  id: string;
  practice_id: string;
  phase_name: string;
  phase_type: string;
  instructions: string;
  duration_seconds: number;
  display_order: number;
  audio_asset_id: string | null;
}

export interface MeditationAudioAsset {
  id: string;
  practice_id: string;
  language_code: MeditationLanguage | null;
  audio_type: string;
  title: string;
  storage_provider: string;
  storage_key: string;
  public_url: string | null;
  duration_seconds: number | null;
  file_size_bytes: number | null;
  mime_type: string | null;
  is_default: boolean;
  display_order: number;
  is_active: boolean;
}

export interface MeditationStageAssignment {
  id: string;
  stage_id: string;
  practice_id: string;
  sequence_number: number;
  is_required: boolean;
}

export interface MeditationRecommendation {
  id: string;
  practice_id: string;
  recommendation_date: string;
  title: string;
  description: string;
  display_order: number;
  is_active: boolean;
}

export interface MeditationAnalytics {
  days: number;
  active_users: number;
  started_sessions: number;
  completed_sessions: number;
  completion_rate: number;
  active_minutes: number;
  average_completed_minutes: number;
  xp_awarded: number;
  sadhana_synced_sessions: number;
}

export interface MeditationSessionActivity {
  id: string;
  firebase_uid: string;
  user_name: string;
  user_email: string;
  practice_name: string;
  stage_name: string;
  status: string;
  planned_duration_seconds: number;
  elapsed_duration_seconds: number;
  completion_percentage: number;
  xp_awarded: number;
  sadhana_synced: boolean;
  started_at: string;
  completed_at: string | null;
}

interface ApiResponse<T> {
  items?: T;
  item?: T;
}

async function invoke<T>(body: Record<string, unknown>, key: 'items' | 'item'): Promise<T> {
  const { data, error } = await supabase.functions.invoke<ApiResponse<T>>('meditation-admin', { body });
  if (error) {
    if ('context' in error && error.context instanceof Response) {
      let response: unknown;
      try {
        response = await error.context.clone().json();
      } catch {
        response = null;
      }
      if (typeof response === 'object' && response !== null &&
          'error' in response && typeof response.error === 'string') {
        throw new Error(response.error);
      }
    }
    throw new Error('Meditation administration service could not be reached. Check your administrator session and retry.');
  }
  if (!data || !(key in data) || data[key] === undefined || data[key] === null) {
    throw new Error('Meditation administration service returned an empty response.');
  }
  return data[key];
}

function list<T>(resource: string, filters: Record<string, unknown> = {}): Promise<T[]> {
  return invoke<T[]>({ action: 'list', resource, ...filters }, 'items');
}

function save<T>(resource: string, item: Record<string, unknown>): Promise<T> {
  return invoke<T>({ action: 'save', resource, item }, 'item');
}

async function remove(resource: string, id: string): Promise<void> {
  await invoke<true>({ action: 'delete', resource, id }, 'item');
}

export const meditationLibraryService = {
  listPractices: () => list<MeditationPractice>('practices'),
  savePractice: (practice: Partial<MeditationPractice> & Pick<MeditationPractice, 'name' | 'slug'>) =>
    save<MeditationPractice>('practices', practice),
  setPracticeActive: (id: string, isActive: boolean) =>
    save<MeditationPractice>('practices', { id, is_active: isActive }),

  listCategories: () => list<MeditationCategory>('categories'),
  saveCategory: (category: Partial<MeditationCategory> & Pick<MeditationCategory, 'name' | 'slug'>) =>
    save<MeditationCategory>('categories', category),
  setCategoryActive: (id: string, isActive: boolean) =>
    save<MeditationCategory>('categories', { id, is_active: isActive }),

  listStages: () => list<MeditationStage>('stages'),
  saveStage: (stage: Partial<MeditationStage> & Pick<MeditationStage, 'name' | 'slug' | 'category_id'>) =>
    save<MeditationStage>('stages', stage),
  setStageActive: (id: string, isActive: boolean) =>
    save<MeditationStage>('stages', { id, is_active: isActive }),

  listTranslations: (practiceId: string) =>
    list<MeditationTranslation>('translations', { practice_id: practiceId }),
  saveTranslation: (translation: Partial<MeditationTranslation> &
    Pick<MeditationTranslation, 'practice_id' | 'language_code'>) =>
    save<MeditationTranslation>('translations', translation),
  deleteTranslation: (id: string) => remove('translations', id),

  listPhases: (practiceId: string) => list<MeditationPhase>('phases', { practice_id: practiceId }),
  savePhase: (phase: Partial<MeditationPhase> & Pick<MeditationPhase, 'practice_id' | 'phase_name'>) =>
    save<MeditationPhase>('phases', phase),
  deletePhase: (id: string) => remove('phases', id),

  listAudioAssets: (practiceId: string) =>
    list<MeditationAudioAsset>('audio', { practice_id: practiceId }),
  saveAudioAsset: (asset: Partial<MeditationAudioAsset> &
    Pick<MeditationAudioAsset, 'practice_id' | 'audio_type' | 'storage_key'>) =>
    save<MeditationAudioAsset>('audio', asset),
  setAudioActive: (id: string, isActive: boolean) =>
    save<MeditationAudioAsset>('audio', { id, is_active: isActive }),

  listStageAssignments: () => list<MeditationStageAssignment>('assignments'),
  assignPractice: (stageId: string, practiceId: string, sequenceNumber: number, isRequired: boolean) =>
    save<MeditationStageAssignment>('assignments', {
      stage_id: stageId,
      practice_id: practiceId,
      sequence_number: sequenceNumber,
      is_required: isRequired,
    }),
  deleteAssignment: (id: string) => remove('assignments', id),

  listRecommendations: () => list<MeditationRecommendation>('recommendations'),
  saveRecommendation: (recommendation: Partial<MeditationRecommendation> &
    Pick<MeditationRecommendation, 'practice_id' | 'recommendation_date'>) =>
    save<MeditationRecommendation>('recommendations', recommendation),
  deleteRecommendation: (id: string) => remove('recommendations', id),

  getAnalytics: (days: 7 | 30 | 90) =>
    invoke<MeditationAnalytics>({ action: 'analytics', days }, 'item'),
  listRecentSessions: (days: 7 | 30 | 90) =>
    invoke<MeditationSessionActivity[]>({ action: 'tracking', days }, 'items'),
};
