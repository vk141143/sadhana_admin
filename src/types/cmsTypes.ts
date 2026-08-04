export type ContentStatus = 'Draft' | 'Published' | 'Scheduled' | 'Archived';
export type EmotionType =
  | 'Stress'
  | 'Anxiety'
  | 'Fear'
  | 'Anger'
  | 'Peace'
  | 'Gratitude'
  | 'Confidence'
  | 'Loneliness'
  | 'Overthinking'
  | 'Sadness'
  | 'Joy'
  | 'Hope';

export type ContentMediaType = 'Audio' | 'Image' | 'Video' | 'Scripture' | 'Practice' | 'Meditation';
export type DifficultyLevel = 'Beginner' | 'Intermediate' | 'Advanced' | 'All Levels';
export type RecommendedTimeOfDay = 'Morning' | 'Evening' | 'Night' | 'Anytime';
export type RarityLevel = 'Common' | 'Rare' | 'Epic' | 'Legendary';
export type InsightCategory = 'Daily Insight' | 'Weekly Insight' | 'Monthly Insight' | 'Verse of the Day' | 'Reflection' | 'Wisdom Quote';

// 1. Emotion Interface
export interface EmotionItem {
  id: string;
  icon: string;
  name: EmotionType;
  description: string;
  colorTheme: string; // e.g., '#f2ca50', '#ef4444', '#3b82f6'
  priority: number; // 1-10
  recommendedPractices: string[];
  recommendedAudio: string[];
  recommendedScriptures: string[];
  recommendedQuotes: string[];
  recommendedMeditation: string[];
  status: ContentStatus;
  createdAt: string;
  updatedAt: string;
}

// 2. Healing Content Interface
export interface HealingContentItem {
  id: string;
  title: string;
  description: string;
  emotionCategory: EmotionType;
  contentType: ContentMediaType;
  mediaUrl: string;
  thumbnailUrl: string;
  associatedScriptureId?: string;
  duration: string; // e.g., "15 mins"
  durationSeconds: number;
  difficulty: DifficultyLevel;
  isPremium: boolean;
  isFeatured: boolean;
  language: string;
  status: ContentStatus;
  publishDate: string;
  scheduleDate?: string;
  viewsCount: number;
  completionRate: number; // percentage
}

// 3. User Journey Interface
export interface UserJourneyItem {
  id: string;
  name: string;
  coverImage: string;
  description: string;
  durationDays: number;
  dailyPracticesCount: number;
  dailySchedule: { day: number; title: string; practiceId: string; audioId?: string }[];
  progressRules: string;
  completionRewardBadge: string;
  completionRewardCertificate: boolean;
  isPremium: boolean;
  status: ContentStatus;
  activeEnrollees: number;
  completionCount: number;
}

// 4. Sadhana Practice Interface
export interface SadhanaPracticeItem {
  id: string;
  name: string;
  category: 'Pranayama' | 'Mantra Chanting' | 'Japa' | 'Dhyana' | 'Kriya' | 'Pooja';
  duration: string;
  benefits: string[];
  instructions: string;
  difficulty: DifficultyLevel;
  requiredMaterials: string[];
  thumbnailUrl: string;
  audioUrl?: string;
  videoUrl?: string;
  images: string[];
  recommendedTime: RecommendedTimeOfDay;
  recommendedLevel: DifficultyLevel;
  status: ContentStatus;
  completionCount: number;
}

// 5. Achievement Interface
export interface AchievementItem {
  id: string;
  name: string;
  icon: string;
  description: string;
  xpReward: number;
  badgeName: string;
  unlockCondition: string;
  rarity: RarityLevel;
  isHidden: boolean;
  status: ContentStatus;
  unlockedByCount: number;
}

// 6. Badge Interface
export interface BadgeItem {
  id: string;
  name: string;
  icon: string;
  description: string;
  colorTheme: string;
  unlockRule: string;
  animationType: 'Glow' | 'Pulse' | 'Shine' | 'Particle' | 'Spin';
  isVisible: boolean;
  status: ContentStatus;
}

// 7. Streak System Interface
export interface StreakGlobalRules {
  minPracticeTimeMinutes: number;
  freezeDaysAllowed: number;
  recoveryOptionEnabled: boolean;
  bonusRewardsMultiplier: number; // e.g. 1.5x
}

export interface StreakMilestone {
  id: string;
  days: number;
  rewardText: string;
  badgeName: string;
  animation: string;
  notificationMessage: string;
  xpBonus: number;
  status: ContentStatus;
}

// 8. Daily Challenge Interface
export interface DailyChallengeItem {
  id: string;
  name: string;
  description: string;
  duration: string;
  xpReward: number;
  badgeReward?: string;
  difficulty: DifficultyLevel;
  startDate: string;
  endDate: string;
  isRecurring: boolean;
  isFeatured: boolean;
  status: ContentStatus;
  participantsCount: number;
}

// 9. Guided Session Interface
export interface GuidedSessionItem {
  id: string;
  title: string;
  audioUrl: string;
  imageUrl: string;
  description: string;
  duration: string;
  category: 'Meditation' | 'Breathing' | 'Yoga' | 'Prayer' | 'Relaxation' | 'Sleep' | 'Visualization';
  difficulty: DifficultyLevel;
  instructor: string;
  language: string;
  status: ContentStatus;
  listensCount: number;
}

// 10. Meditation Library Interface
export interface MeditationCollectionItem {
  id: string;
  title: string;
  category: string;
  level: DifficultyLevel;
  description: string;
  coverImage: string;
  trackIds: string[];
  tracksCount: number;
  totalDuration: string;
  status: ContentStatus;
}

export interface MeditationLibraryItem {
  id: string;
  title: string;
  audioUrl?: string;
  coverImage: string;
  duration: string;
  tags?: string[];
  binauralFrequencyHz?: string;
  ambientNoiseType?: string;
  status: ContentStatus;
  playsCount: number;
}

// 11. Recommendation Rule Interface
export interface RecommendationRuleItem {
  id: string;
  ruleName: string;
  triggerEmotion?: EmotionType;
  userLevel?: DifficultyLevel;
  contentType?: string;
  recommendedItemIds?: string[];
  priority?: number;
  triggerTimeOfDay?: RecommendedTimeOfDay;
  triggerMinStreak?: number;
  triggerFestival?: string;
  userGoal?: string;
  premiumStatusOnly?: boolean;
  recommendedType?: ContentMediaType;
  recommendedItemId?: string;
  priorityScore?: number;
  status: ContentStatus;
}

// 12. Spiritual Insight Interface
export interface SpiritualInsightItem {
  id: string;
  title: string;
  quoteText?: string;
  scriptureSource?: string;
  sanskritText?: string;
  translation?: string;
  explanation?: string;
  audioCommentaryUrl?: string;
  author?: string;
  content?: string;
  category: InsightCategory | string;
  publishDate: string;
  isFeatured?: boolean;
  likesCount: number;
  sharesCount: number;
  status: ContentStatus;
}
