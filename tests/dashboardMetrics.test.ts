import test from 'node:test';
import assert from 'node:assert/strict';
import {
  aggregateEngagement,
  getPracticeCategoryLabel,
  parseDashboardMetrics,
  type DashboardMetrics,
} from '../src/services/dashboardMetrics.ts';
import { requestDashboardMetrics } from '../src/services/dashboardService.ts';

const metrics: DashboardMetrics = {
  days: 7,
  totalUsers: 120,
  newUsers: 8,
  publishedScriptures: 3,
  publishedChapters: 18,
  publishedSlokas: 252,
  activeUsers: 5,
  totalSadhanaSessions: 420,
  dailyEngagement: [
    { date: '2026-10-12', sessions: 2, newUsers: 1 },
    { date: '2026-10-13', sessions: 3, newUsers: 0 },
    { date: '2026-10-19', sessions: 4, newUsers: 2 },
  ],
  practiceCategories: [
    { category: 'meditation', sessions: 2 },
    { category: 'japa', sessions: 3 },
    { category: 'mantra', sessions: 3 },
    { category: 'gratitude', sessions: 1 },
  ],
};

test('parses valid server metrics and preserves genuine zero counts', () => {
  const parsed = parseDashboardMetrics({ ...metrics, activeUsers: 0 });
  assert.equal(parsed.totalUsers, 120);
  assert.equal(parsed.activeUsers, 0);
  assert.equal(parsed.publishedSlokas, 252);
});

test('rejects missing, negative, unsafe and malformed metric values', () => {
  assert.throws(() => parseDashboardMetrics(null), /invalid response/);
  assert.throws(() => parseDashboardMetrics({ ...metrics, totalUsers: -1 }), /invalid response/);
  assert.throws(() => parseDashboardMetrics({ ...metrics, totalUsers: Number.MAX_SAFE_INTEGER + 1 }), /invalid response/);
  assert.throws(() => parseDashboardMetrics({ ...metrics, dailyEngagement: [{ date: '2026-99-99', sessions: 0, newUsers: 0 }] }), /invalid response/);
  assert.throws(() => parseDashboardMetrics({ ...metrics, practiceCategories: [{ category: 'other', sessions: 1 }] }), /invalid response/);
});

test('weekly engagement groups by Monday in UTC and sums the daily counts', () => {
  const weekly = aggregateEngagement(metrics.dailyEngagement, 'weekly');
  assert.deepEqual(weekly, [
    { date: '2026-10-12', sessions: 5, newUsers: 1 },
    { date: '2026-10-19', sessions: 4, newUsers: 2 },
  ]);
  assert.deepEqual(aggregateEngagement(metrics.dailyEngagement, 'daily'), metrics.dailyEngagement);
  assert.equal(getPracticeCategoryLabel('japa'), 'Japa');
  assert.equal(getPracticeCategoryLabel('unknown'), 'unknown');
});

test('dashboard request reports API failure without leaking server response text', async () => {
  await assert.rejects(
    requestDashboardMetrics(7, async () => ({
      data: null,
      error: new Error('database password must not reach the UI'),
    })),
    error => error instanceof Error &&
      error.message.includes('administrator session') &&
      !error.message.includes('database password'),
  );
});

test('dashboard request rejects malformed successful payloads', async () => {
  await assert.rejects(
    requestDashboardMetrics(30, async () => ({ data: { totalUsers: 1 }, error: null })),
    /invalid response/,
  );
});
