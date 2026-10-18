// Scripture / Chapter / Sloka — new content system
export interface Scripture {
  id: string;
  name: string;
  description: string;
  cover_image_url: string;
  status: 'Draft' | 'Published' | 'Archived';
  created_at: string;
  updated_at: string;
}

export interface Chapter {
  id: string;
  scripture_id: string;
  chapter_number: number;
  title: string;
  subtitle: string;
  description: string;
  image_url: string;
  sloka_count: number;
  status: 'Draft' | 'Published' | 'Archived';
  created_at: string;
  updated_at: string;
}

export interface SlokaRecord {
  id: string;
  chapter_id: string;
  verse_number: number;
  verse_id: string;
  json_url: string;
  status: 'Draft' | 'Published' | 'Archived';
  created_at: string;
  updated_at: string;
}

export interface SlokaJson {
  id: string;
  verse_number: number;
  sanskrit: { devanagari: string; transliteration: string };
  languages: Record<string, { translation: string; meaning: string; explanation: string; example: string }>;
}

// Admin CMS user — matches public.admin_users table
export interface AdminUser {
  id: string;
  full_name: string;
  email: string;
  mobile: string;
  role: 'super_admin' | 'editor' | 'viewer';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Matches public.users table schema
export interface SupabaseUser {
  id: string;
  firebase_uid: string;
  full_name: string;
  email: string;
  mobile: string;
  avatar_url: string;
  day_streak: number;
  books_read: number;
  events_count: number;
  chant_count: number;
  bookmarks: string[];
  created_at: string;
  updated_at: string;
}

// Matches public.quote_schedules table
export interface QuoteSchedule {
  id: string;
  title: string;
  sloka: string;
  source: string;
  meaning: string;
  language: string;
  image_url: string;
  scheduled_date: string;
  scheduled_time: string;
  scheduled_datetime: string;
  day_name: string;
  status: 'scheduled' | 'published' | 'expired';
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export type NavigationTab =
  | 'dashboard'
  | 'library'
  | 'users'
  | 'subscriptions'
  | 'content'
  | 'audio'
  | 'albums'
  | 'scriptures'
  | 'festivals'
  | 'analytics'
  | 'reports'
  | 'support'
  | 'settings'
  // New Sadhana CMS Tabs
  | 'emotions'
  | 'healing-content'
  | 'user-journeys'
  | 'sadhana-practices'
  | 'achievements'
  | 'streak-system'
  | 'daily-challenges'
  | 'badges'
  | 'guided-sessions'
  | 'meditation-library'
  | 'recommendation-engine'
  | 'spiritual-insights'
  | 'daily-content'
  | 'banners'
  | 'notifications';

export type ContentStatus = 'Draft' | 'Published' | 'Archived';

export interface ContentCategory {
  id: string; name: string; slug: string; type: string; description: string;
  status: ContentStatus; created_at: string; updated_at: string;
}

export interface ContentChapter {
  id: string; category_id: string; chapter_number: number; name: string;
  description: string; status: ContentStatus; created_at: string; updated_at: string;
}

export interface ContentVerse {
  id: string; chapter_id: string; verse_number: number; content_id: string;
  status: ContentStatus; available_languages: string[]; core_r2_path: string;
  language_r2_paths: Record<string, string>; version: number;
  audio_status: 'not_generated' | 'generating' | 'available' | 'stale' | 'failed';
  audio_r2_path: string | null; audio_version: number | null;
  created_at: string; updated_at: string;
}

export interface UserSeeker {
  id: string;
  name: string;
  email: string;
  country: string;
  countryCode: string;
  flag: string;
  avatarUrl: string;
  joinedDate: string;
  subscription: 'Dharma Elite' | 'Sadhaka Pro' | 'Free Seeker';
  status: 'Active' | 'Inactive' | 'Suspended';
  phone?: string;
  totalSadhanas?: number;
}

export interface AudioTrack {
  id: string;
  trackNumber: string;
  title: string;
  artist: string;
  category: string;
  language: string;
  duration: string;
  durationSeconds: number;
  isPremium: boolean;
  status: 'Active' | 'Processing' | 'Draft';
  albumId?: string;
  audioUrl?: string; // HTML5 playable audio sample or synth generator
  coverUrl?: string;
}

export interface Album {
  id: string;
  title: string;
  artist: string;
  description: string;
  releaseYear: number;
  coverUrl: string;
  tag: string;
  trackCount: number;
  totalDuration: string;
  status: 'Premium' | 'Public' | 'Draft';
  tracks?: AudioTrack[];
}

export interface Transaction {
  id: string;
  timestamp: string;
  contributor: string;
  service: string;
  status: 'Completed' | 'Processing' | 'Pending' | 'Refunded';
  amount: number;
  timeframeCategory: 'Daily' | 'Monthly' | 'Yearly';
}

export interface Renewal {
  id: string;
  user: string;
  userInitials: string;
  plan: 'Premium Gold' | 'Standard Vedic' | 'Free Trial';
  dueDate: string;
  amount: number;
  avatarBg: string;
}

export interface RecentActivity {
  id: string;
  title: string;
  description: string;
  timeAgo: string;
  type: 'gold' | 'emerald' | 'gray';
}

export interface ScriptureItem {
  id: string;
  title: string;
  sanskritTitle: string;
  versesCount: number;
  chaptersCount: number;
  category: string;
  description: string;
}

export interface FestivalEvent {
  id: string;
  title: string;
  sanskritName: string;
  date: string;
  significance: string;
  status: 'Upcoming' | 'Active' | 'Completed';
  devoteesExpected: number;
}

// ── Festival Management System ────────────────────────────────

export type FestivalType = 'Major Festival' | 'Ekadashi' | 'Purnima' | 'Amavasya' | 'Jayanti' | 'Vrata' | 'Utsava' | 'Other';
export type FestivalStatus = 'Draft' | 'Published' | 'Archived';
export type FestivalOccurrenceStatus = 'draft' | 'review' | 'published' | 'archived';
export type FestivalTradition = 'vaishnava' | 'shaiva' | 'shakta' | 'smarta' | 'general' | 'other';
export type FestivalMediaType = 'image' | 'audio' | 'video' | 'story_json' | 'puja_json' | 'banner' | 'gallery' | 'notification';

export interface CustomTiming {
  name: string;
  start: string;
  end: string;
  description: string;
}

// Master festival identity (permanent, year-agnostic)
// Columns removed in migration 014: tithi, paksha, tithi_start, tithi_end,
// nakshatra, nakshatra_start, nakshatra_end, yoga, karana, festival_date,
// description, story_url, story_storage_key, puja_url, puja_storage_key,
// banner_url, banner_storage_key, story_audio_url, story_audio_key,
// story_video_url, story_video_key
export interface Festival {
  id: string;
  name: string;
  alternate_name: string;
  slug: string;
  festival_type: FestivalType;
  primary_deity: string;
  associated_deities: Array<{ name: string; role?: string }>;
  tradition: FestivalTradition;
  short_description: string;
  cover_media_id: string | null;
  is_active: boolean;
  created_by: string | null;
  status: FestivalStatus;
  created_at: string;
  updated_at: string;
  // Runtime shim — populated by fetchFestivalFull from cover media join
  // Not a DB column; used only to initialise wizard bannerUrl state
  banner_url?: string;
}

// Yearly occurrence of a festival
export interface FestivalOccurrence {
  id: string;
  festival_id: string;
  year: number;
  festival_date: string;
  // Panchanga
  tithi_name: string;
  paksha: '' | 'Shukla Paksha' | 'Krishna Paksha';
  nakshatra_name: string;
  yoga_name: string;
  // Auspicious timings
  shubha_muhurta_start: string | null;
  shubha_muhurta_end: string | null;
  puja_time_start: string | null;
  puja_time_end: string | null;
  // Inauspicious timings
  rahu_kalam_start: string | null;
  rahu_kalam_end: string | null;
  yamagandam_start: string | null;
  yamagandam_end: string | null;
  gulika_kalam_start: string | null;
  gulika_kalam_end: string | null;
  // Fasting
  fasting_enabled: boolean;
  fasting_type: string;
  parana_required: boolean;
  parana_time: string | null;
  fasting_rules: string;
  // Custom timings
  custom_timings: CustomTiming[];
  // Status & audit
  status: FestivalOccurrenceStatus;
  created_by: string | null;
  updated_by: string | null;
  published_by: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

// Festival content (descriptions, story, puja, related content)
export interface FestivalContent {
  id: string;
  festival_id: string;
  occurrence_id: string | null;
  festival_description: string;
  spiritual_significance: string;
  festival_story: Array<{ title: string; content: string }>;
  scriptural_references: Array<{ reference: string; text: string }>;
  puja_name: string;
  puja_duration_minutes: number | null;
  puja_description: string;
  puja_samagri: Array<{ item: string; quantity: string; required: boolean }>;
  puja_vidhi: Array<{ title: string; content: string }>;
  story_r2_key: string;
  story_r2_url: string;
  puja_r2_key: string;
  puja_r2_url: string;
  related_scriptures: Array<{ id: string; title: string }>;
  related_slokas: Array<{ id: string; title: string }>;
  related_mantras: Array<{ id: string; title: string }>;
  related_stotrams: Array<{ id: string; title: string }>;
  related_music: Array<{ id: string; title: string }>;
  related_stories: Array<{ id: string; title: string }>;
  created_at: string;
  updated_at: string;
}

export interface FestivalMedia {
  id: string;
  festival_id: string;
  occurrence_id: string | null;
  media_type: FestivalMediaType;
  title: string;
  description: string;
  file_name: string;
  r2_key: string;
  storage_key: string; // legacy alias — still in DB
  public_url: string;
  mime_type: string;
  file_size: number;
  duration_seconds: number | null;
  language_code: string;
  alt_text: string;
  caption: string;
  sort_order: number;
  display_order: number; // legacy alias — still in DB
  is_cover: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string; // added in migration 014
}

export interface FestivalSettings {
  id: string;
  festival_id: string;
  show_on_home: boolean;
  is_featured: boolean;
  priority: number;
  show_from: string | null;
  show_until: string | null;
  show_in_calendar: boolean;
  created_at: string;
  updated_at: string;
}

// Full festival with all relations (used in wizard / edit)
export interface FestivalFull extends Festival {
  occurrence: FestivalOccurrence | null;
  content: FestivalContent | null;
  media: FestivalMedia[];
  settings: FestivalSettings | null;
}
