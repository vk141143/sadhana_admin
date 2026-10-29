import { mockDB } from './supabaseClient';
import {
  INITIAL_EMOTIONS,
  INITIAL_HEALING_CONTENT,
  INITIAL_USER_JOURNEYS,
  INITIAL_ACHIEVEMENTS,
  INITIAL_BADGES,
  INITIAL_STREAK_RULES,
  INITIAL_STREAK_MILESTONES,
  INITIAL_DAILY_CHALLENGES,
  INITIAL_GUIDED_SESSIONS,
  INITIAL_MEDITATION_COLLECTIONS,
  INITIAL_RECOMMENDATIONS,
  INITIAL_SPIRITUAL_INSIGHTS,
} from '../data/cmsMockData';

import {
  EmotionItem,
  HealingContentItem,
  UserJourneyItem,
  AchievementItem,
  BadgeItem,
  StreakGlobalRules,
  StreakMilestone,
  DailyChallengeItem,
  GuidedSessionItem,
  MeditationCollectionItem,
  MeditationLibraryItem,
  RecommendationRuleItem,
  SpiritualInsightItem,
} from '../types/cmsTypes';

// Initialize tables in Mock Supabase DB
mockDB.initTable('emotions', INITIAL_EMOTIONS);
mockDB.initTable('healing_content', INITIAL_HEALING_CONTENT);
mockDB.initTable('user_journeys', INITIAL_USER_JOURNEYS);
mockDB.initTable('achievements', INITIAL_ACHIEVEMENTS);
mockDB.initTable('badges', INITIAL_BADGES);
mockDB.initTable('streak_milestones', INITIAL_STREAK_MILESTONES);
mockDB.initTable('daily_challenges', INITIAL_DAILY_CHALLENGES);
mockDB.initTable('guided_sessions', INITIAL_GUIDED_SESSIONS);
mockDB.initTable('meditation_collections', INITIAL_MEDITATION_COLLECTIONS);
mockDB.initTable('recommendation_rules', INITIAL_RECOMMENDATIONS);
mockDB.initTable('spiritual_insights', INITIAL_SPIRITUAL_INSIGHTS);

// Global Streak Configuration
let streakRulesState: StreakGlobalRules = { ...INITIAL_STREAK_RULES };

export const cmsService = {
  // 1. Emotions Service
  emotions: {
    getAll: async (): Promise<EmotionItem[]> => mockDB.getAll<EmotionItem>('emotions'),
    create: async (item: Partial<EmotionItem>): Promise<EmotionItem> =>
      mockDB.insert('emotions', item as any),
    update: async (id: string, updates: Partial<EmotionItem>): Promise<EmotionItem | null> =>
      mockDB.update('emotions', id, updates),
    delete: async (id: string): Promise<boolean> => mockDB.delete('emotions', id),
    deleteMany: async (ids: string[]): Promise<number> => mockDB.deleteMany('emotions', ids),
  },

  // 2. Healing Content Service
  healing: {
    getAll: async (): Promise<HealingContentItem[]> => mockDB.getAll<HealingContentItem>('healing_content'),
    create: async (item: Partial<HealingContentItem>): Promise<HealingContentItem> =>
      mockDB.insert('healing_content', item as any),
    update: async (id: string, updates: Partial<HealingContentItem>): Promise<HealingContentItem | null> =>
      mockDB.update('healing_content', id, updates),
    delete: async (id: string): Promise<boolean> => mockDB.delete('healing_content', id),
    deleteMany: async (ids: string[]): Promise<number> => mockDB.deleteMany('healing_content', ids),
  },

  // 3. User Journeys Service
  journeys: {
    getAll: async (): Promise<UserJourneyItem[]> => mockDB.getAll<UserJourneyItem>('user_journeys'),
    create: async (item: Partial<UserJourneyItem>): Promise<UserJourneyItem> =>
      mockDB.insert('user_journeys', item as any),
    update: async (id: string, updates: Partial<UserJourneyItem>): Promise<UserJourneyItem | null> =>
      mockDB.update('user_journeys', id, updates),
    delete: async (id: string): Promise<boolean> => mockDB.delete('user_journeys', id),
    deleteMany: async (ids: string[]): Promise<number> => mockDB.deleteMany('user_journeys', ids),
  },

  // 5. Achievements Service
  achievements: {
    getAll: async (): Promise<AchievementItem[]> => mockDB.getAll<AchievementItem>('achievements'),
    create: async (item: Partial<AchievementItem>): Promise<AchievementItem> =>
      mockDB.insert('achievements', item as any),
    update: async (id: string, updates: Partial<AchievementItem>): Promise<AchievementItem | null> =>
      mockDB.update('achievements', id, updates),
    delete: async (id: string): Promise<boolean> => mockDB.delete('achievements', id),
    deleteMany: async (ids: string[]): Promise<number> => mockDB.deleteMany('achievements', ids),
  },

  // 6. Badges Service
  badges: {
    getAll: async (): Promise<BadgeItem[]> => mockDB.getAll<BadgeItem>('badges'),
    create: async (item: Partial<BadgeItem>): Promise<BadgeItem> =>
      mockDB.insert('badges', item as any),
    update: async (id: string, updates: Partial<BadgeItem>): Promise<BadgeItem | null> =>
      mockDB.update('badges', id, updates),
    delete: async (id: string): Promise<boolean> => mockDB.delete('badges', id),
    deleteMany: async (ids: string[]): Promise<number> => mockDB.deleteMany('badges', ids),
  },

  // 7. Streak System Service
  streaks: {
    getRules: async (): Promise<StreakGlobalRules> => ({ ...streakRulesState }),
    updateRules: async (newRules: Partial<StreakGlobalRules>): Promise<StreakGlobalRules> => {
      streakRulesState = { ...streakRulesState, ...newRules };
      return streakRulesState;
    },
    getMilestones: async (): Promise<StreakMilestone[]> => mockDB.getAll<StreakMilestone>('streak_milestones'),
    createMilestone: async (item: Partial<StreakMilestone>): Promise<StreakMilestone> =>
      mockDB.insert('streak_milestones', item as any),
    updateMilestone: async (id: string, updates: Partial<StreakMilestone>): Promise<StreakMilestone | null> =>
      mockDB.update('streak_milestones', id, updates),
    deleteMilestone: async (id: string): Promise<boolean> => mockDB.delete('streak_milestones', id),
  },

  // 8. Daily Challenges Service
  challenges: {
    getAll: async (): Promise<DailyChallengeItem[]> => mockDB.getAll<DailyChallengeItem>('daily_challenges'),
    create: async (item: Partial<DailyChallengeItem>): Promise<DailyChallengeItem> =>
      mockDB.insert('daily_challenges', item as any),
    update: async (id: string, updates: Partial<DailyChallengeItem>): Promise<DailyChallengeItem | null> =>
      mockDB.update('daily_challenges', id, updates),
    delete: async (id: string): Promise<boolean> => mockDB.delete('daily_challenges', id),
    deleteMany: async (ids: string[]): Promise<number> => mockDB.deleteMany('daily_challenges', ids),
  },

  // 9. Guided Sessions Service
  sessions: {
    getAll: async (): Promise<GuidedSessionItem[]> => mockDB.getAll<GuidedSessionItem>('guided_sessions'),
    create: async (item: Partial<GuidedSessionItem>): Promise<GuidedSessionItem> =>
      mockDB.insert('guided_sessions', item as any),
    update: async (id: string, updates: Partial<GuidedSessionItem>): Promise<GuidedSessionItem | null> =>
      mockDB.update('guided_sessions', id, updates),
    delete: async (id: string): Promise<boolean> => mockDB.delete('guided_sessions', id),
    deleteMany: async (ids: string[]): Promise<number> => mockDB.deleteMany('guided_sessions', ids),
  },

  // 10. Meditation Library Service
  meditations: {
    getAll: async (): Promise<MeditationLibraryItem[]> => {
      throw new Error('Meditation tracks are not connected to a persistent backend. Collection records cannot be used as audio tracks.');
    },
    create: async (item: Partial<MeditationCollectionItem>): Promise<MeditationCollectionItem> =>
      mockDB.insert('meditation_collections', item as any),
    update: async (
      id: string,
      updates: Partial<MeditationCollectionItem>
    ): Promise<MeditationCollectionItem | null> => mockDB.update('meditation_collections', id, updates),
    delete: async (id: string): Promise<boolean> => mockDB.delete('meditation_collections', id),
    deleteMany: async (ids: string[]): Promise<number> => mockDB.deleteMany('meditation_collections', ids),
  },

  // 11. Recommendations Service
  recommendations: {
    getAll: async (): Promise<RecommendationRuleItem[]> => mockDB.getAll<RecommendationRuleItem>('recommendation_rules'),
    create: async (item: Partial<RecommendationRuleItem>): Promise<RecommendationRuleItem> =>
      mockDB.insert('recommendation_rules', item as any),
    update: async (id: string, updates: Partial<RecommendationRuleItem>): Promise<RecommendationRuleItem | null> =>
      mockDB.update('recommendation_rules', id, updates),
    delete: async (id: string): Promise<boolean> => mockDB.delete('recommendation_rules', id),
    deleteMany: async (ids: string[]): Promise<number> => mockDB.deleteMany('recommendation_rules', ids),
  },

  // 12. Spiritual Insights Service
  insights: {
    getAll: async (): Promise<SpiritualInsightItem[]> => mockDB.getAll<SpiritualInsightItem>('spiritual_insights'),
    create: async (item: Partial<SpiritualInsightItem>): Promise<SpiritualInsightItem> =>
      mockDB.insert('spiritual_insights', item as any),
    update: async (id: string, updates: Partial<SpiritualInsightItem>): Promise<SpiritualInsightItem | null> =>
      mockDB.update('spiritual_insights', id, updates),
    delete: async (id: string): Promise<boolean> => mockDB.delete('spiritual_insights', id),
    deleteMany: async (ids: string[]): Promise<number> => mockDB.deleteMany('spiritual_insights', ids),
  },
};
