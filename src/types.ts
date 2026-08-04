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
  | 'banners';

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
