export const DASHBOARD_PERIODS = [7, 30, 90] as const;
export type DashboardDays = (typeof DASHBOARD_PERIODS)[number];
export type PracticeCategory = 'meditation' | 'japa' | 'mantra' | 'gratitude';
export type EngagementResolution = 'daily' | 'weekly';

export interface DailyEngagement {
  date: string;
  sessions: number;
  newUsers: number;
}

export interface PracticeCategoryCount {
  category: PracticeCategory;
  sessions: number;
}

export interface DashboardMetrics {
  days: DashboardDays;
  totalUsers: number;
  newUsers: number;
  publishedScriptures: number;
  publishedChapters: number;
  publishedSlokas: number;
  activeUsers: number;
  totalSadhanaSessions: number;
  dailyEngagement: DailyEngagement[];
  practiceCategories: PracticeCategoryCount[];
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const isCount = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
function requireCount(value: unknown): number {
  if (!isCount(value)) throw new Error('Dashboard returned an invalid response.');
  return value;
}
const isDate = (value: unknown): value is string => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
};
const isDashboardDays = (value: unknown): value is DashboardDays =>
  value === 7 || value === 30 || value === 90;
const isPracticeCategory = (value: unknown): value is PracticeCategory =>
  value === 'meditation' || value === 'japa' || value === 'mantra' || value === 'gratitude';
export function getPracticeCategoryLabel(value: unknown): string {
  return isPracticeCategory(value) ? value[0].toUpperCase() + value.slice(1) : String(value);
}

export function parseDashboardMetrics(value: unknown): DashboardMetrics {
  if (!isRecord(value) || !isDashboardDays(value.days)) {
    throw new Error('Dashboard returned an invalid response.');
  }

  const totalUsers = requireCount(value.totalUsers);
  const newUsers = requireCount(value.newUsers);
  const publishedScriptures = requireCount(value.publishedScriptures);
  const publishedChapters = requireCount(value.publishedChapters);
  const publishedSlokas = requireCount(value.publishedSlokas);
  const activeUsers = requireCount(value.activeUsers);
  const totalSadhanaSessions = requireCount(value.totalSadhanaSessions);
  if (!Array.isArray(value.dailyEngagement)) {
    throw new Error('Dashboard returned an invalid response.');
  }
  const dailyEngagement = value.dailyEngagement.map(item => {
    if (!isRecord(item) || !isDate(item.date) || !isCount(item.sessions) || !isCount(item.newUsers)) {
      throw new Error('Dashboard returned an invalid response.');
    }
    return { date: item.date, sessions: item.sessions, newUsers: item.newUsers };
  });
  if (!Array.isArray(value.practiceCategories)) {
    throw new Error('Dashboard returned an invalid response.');
  }
  const practiceCounts = value.practiceCategories.map(item => {
    if (!isRecord(item) || !isPracticeCategory(item.category) || !isCount(item.sessions)) {
      throw new Error('Dashboard returned an invalid response.');
    }
    return { category: item.category, sessions: item.sessions };
  });

  return {
    days: value.days,
    totalUsers,
    newUsers,
    publishedScriptures,
    publishedChapters,
    publishedSlokas,
    activeUsers,
    totalSadhanaSessions,
    dailyEngagement,
    practiceCategories: practiceCounts,
  };
}

export function aggregateEngagement(
  dailyEngagement: DailyEngagement[],
  resolution: EngagementResolution,
): DailyEngagement[] {
  if (resolution === 'daily') return dailyEngagement;

  const weeks = new Map<string, DailyEngagement>();
  for (const day of dailyEngagement) {
    const weekStart = new Date(`${day.date}T00:00:00.000Z`);
    weekStart.setUTCDate(weekStart.getUTCDate() - ((weekStart.getUTCDay() + 6) % 7));
    const date = weekStart.toISOString().slice(0, 10);
    const aggregate = weeks.get(date) ?? { date, sessions: 0, newUsers: 0 };
    aggregate.sessions += day.sessions;
    aggregate.newUsers += day.newUsers;
    weeks.set(date, aggregate);
  }
  return [...weeks.values()];
}
