import React, { useEffect, useRef, useState } from 'react';
import {
  Area,
  AreaChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { getDashboardMetrics } from '../services/dashboardService';
import {
  aggregateEngagement,
  DASHBOARD_PERIODS,
  getPracticeCategoryLabel,
  type DashboardDays,
  type DashboardMetrics,
  type EngagementResolution,
  type PracticeCategory,
} from '../services/dashboardMetrics';

const categoryLabels: Record<PracticeCategory, string> = {
  meditation: 'Meditation',
  japa: 'Japa',
  mantra: 'Mantra',
  gratitude: 'Gratitude',
};
const categoryColors: Record<PracticeCategory, string> = {
  meditation: '#f2ca50',
  japa: '#34d399',
  mantra: '#60a5fa',
  gratitude: '#c084fc',
};
const numberFormat = new Intl.NumberFormat();
const utcDateLabel = (date: string) =>
  new Date(`${date}T00:00:00.000Z`).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });

function MetricCard({ label, value, detail }: { label: string; value: number; detail?: string }) {
  return (
    <article className="glass-card rounded-2xl border border-white/10 p-5">
      <p className="text-xs font-semibold uppercase tracking-wider text-[#d0c5af]/75">{label}</p>
      <p className="mt-3 font-serif-headline text-3xl font-bold text-[#f2ca50]">
        {numberFormat.format(value)}
      </p>
      {detail && <p className="mt-2 text-xs text-[#d0c5af]/60">{detail}</p>}
    </article>
  );
}

function LoadingDashboard() {
  return (
    <div role="status" aria-label="Loading dashboard data" className="space-y-6 animate-pulse">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 7 }, (_, index) => (
          <div key={index} className="h-28 rounded-2xl border border-white/10 bg-white/5" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="h-80 rounded-2xl border border-white/10 bg-white/5 xl:col-span-2" />
        <div className="h-80 rounded-2xl border border-white/10 bg-white/5" />
      </div>
      <span className="sr-only">Loading dashboard data…</span>
    </div>
  );
}

export const DashboardView: React.FC = () => {
  const [days, setDays] = useState<DashboardDays>(30);
  const [resolution, setResolution] = useState<EngagementResolution>('daily');
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshNumber, setRefreshNumber] = useState(0);
  const requestId = useRef(0);

  useEffect(() => {
    const id = ++requestId.current;
    setLoading(true);
    setError('');
    void getDashboardMetrics(days, refreshNumber > 0)
      .then(result => {
        if (requestId.current === id) setMetrics(result);
      })
      .catch(() => {
        if (requestId.current === id) setError('Dashboard data could not be loaded. Retry or verify the admin dashboard service is deployed.');
      })
      .finally(() => {
        if (requestId.current === id) setLoading(false);
      });
    return () => {
      requestId.current += 1;
    };
  }, [days, refreshNumber]);

  const refresh = () => setRefreshNumber(value => value + 1);
  const chartData = metrics ? aggregateEngagement(metrics.dailyEngagement, resolution) : [];
  const hasActivity = chartData.some(day => day.sessions > 0 || day.newUsers > 0);
  const hasCategoryActivity = metrics?.practiceCategories.some(category => category.sessions > 0) ?? false;

  return (
    <div className="space-y-7 p-4 pb-28 md:p-10">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 text-sm text-[#d0c5af]/70">Sanatana / Dashboard</p>
          <h1 className="font-serif-headline text-3xl font-bold tracking-tight text-[#dce2f6] md:text-5xl">
            Dashboard
          </h1>
          <p className="mt-2 text-sm text-[#d0c5af]/80">
            Aggregated registrations, published scripture and recorded Sadhana activity.
          </p>
        </div>
        <label className="flex items-center gap-3 text-sm text-[#dce2f6]">
          <span>Activity period</span>
          <select
            value={days}
            onChange={event => setDays(Number(event.target.value) as DashboardDays)}
            className="rounded-lg border border-white/10 bg-[#19202e] px-3 py-2 text-sm outline-none focus:border-[#f2ca50]"
          >
            {DASHBOARD_PERIODS.map(period => (
              <option key={period} value={period}>Last {period} days</option>
            ))}
          </select>
        </label>
      </header>

      {loading && <LoadingDashboard />}

      {!loading && error && (
        <section role="alert" className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-6">
          <h2 className="font-semibold text-rose-300">Unable to load dashboard</h2>
          <p className="mt-2 text-sm text-[#dce2f6]/80">{error}</p>
          <button
            type="button"
            onClick={refresh}
            className="mt-4 rounded-lg bg-[#f2ca50] px-4 py-2 text-sm font-semibold text-[#3c2f00]"
          >
            Retry
          </button>
        </section>
      )}

      {!loading && !error && metrics && (
        <>
          <section aria-label="Dashboard metrics" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Registered users" value={metrics.totalUsers} />
            <MetricCard label={`New users · ${days} days`} value={metrics.newUsers} />
            <MetricCard label="Published scriptures" value={metrics.publishedScriptures} />
            <MetricCard label="Published chapters" value={metrics.publishedChapters} />
            <MetricCard label="Published slokas" value={metrics.publishedSlokas} />
            <MetricCard label={`Active practitioners · ${days} days`} value={metrics.activeUsers} detail="Distinct users with a recorded practice log" />
            <MetricCard label="Total Sadhana sessions" value={metrics.totalSadhanaSessions} detail="Recorded practice-log entries" />
          </section>

          <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <article className="glass-card rounded-2xl border-t-2 border-[#f2ca50]/40 p-5 md:p-7 xl:col-span-2">
              <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="font-serif-headline text-xl font-semibold text-[#dce2f6]">Engagement trend</h2>
                  <p className="mt-1 text-xs text-[#d0c5af]/70">Daily totals can be grouped by UTC week.</p>
                </div>
                <label className="flex items-center gap-2 text-xs text-[#dce2f6]">
                  <span>Group by</span>
                  <select
                    value={resolution}
                    onChange={event => setResolution(event.target.value as EngagementResolution)}
                    className="rounded-md border border-white/10 bg-[#19202e] px-2 py-1.5 outline-none focus:border-[#f2ca50]"
                  >
                    <option value="daily">Day</option>
                    <option value="weekly">Week</option>
                  </select>
                </label>
              </div>
              {hasActivity ? (
                <div className="h-72" aria-label="Sadhana sessions and new registrations over time">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="dashboardSessions" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f2ca50" stopOpacity={0.35} />
                          <stop offset="95%" stopColor="#f2ca50" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="date" tickFormatter={utcDateLabel} stroke="#99907c" tickLine={false} />
                      <YAxis allowDecimals={false} stroke="#99907c" tickLine={false} />
                      <Tooltip
                        labelFormatter={label => utcDateLabel(String(label))}
                        contentStyle={{ backgroundColor: '#19202e', borderColor: '#d4af37', borderRadius: 8, color: '#dce2f6' }}
                      />
                      <Area type="monotone" dataKey="sessions" name="Practice sessions" stroke="#f2ca50" fill="url(#dashboardSessions)" />
                      <Area type="monotone" dataKey="newUsers" name="New users" stroke="#60a5fa" fill="#60a5fa" fillOpacity={0.08} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="flex h-72 items-center justify-center rounded-xl border border-dashed border-white/10 text-sm text-[#d0c5af]/70">
                  No practice sessions or registrations were recorded in this period.
                </div>
              )}
            </article>

            <article className="glass-card rounded-2xl border-t-2 border-[#f2ca50]/40 p-5 md:p-7">
              <h2 className="font-serif-headline text-xl font-semibold text-[#dce2f6]">Practice participation</h2>
              <p className="mt-1 text-xs text-[#d0c5af]/70">Recorded activity by Sadhana category · {days} days</p>
              {hasCategoryActivity ? (
                <>
                  <div className="mt-3 h-56" aria-label="Recorded practice sessions by category">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={metrics.practiceCategories} dataKey="sessions" nameKey="category" innerRadius={52} outerRadius={82} paddingAngle={3}>
                          {metrics.practiceCategories.map(item => (
                            <Cell key={item.category} fill={categoryColors[item.category]} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value, _name, item) => [value, getPracticeCategoryLabel(item.payload.category)]}
                          contentStyle={{ backgroundColor: '#19202e', borderColor: '#d4af37', borderRadius: 8, color: '#dce2f6' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <ul className="mt-3 space-y-2">
                    {metrics.practiceCategories.map(item => (
                      <li key={item.category} className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-2 text-[#dce2f6]">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: categoryColors[item.category] }} />
                          {categoryLabels[item.category]}
                        </span>
                        <span className="font-semibold text-[#d0c5af]">{numberFormat.format(item.sessions)}</span>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <div className="mt-5 flex h-64 items-center justify-center rounded-xl border border-dashed border-white/10 text-center text-sm text-[#d0c5af]/70">
                  No practice records were found for this period.
                </div>
              )}
            </article>
          </section>

          <p className="text-xs text-[#d0c5af]/55">
            Registered-user totals use public user profiles. Activity metrics count practice-log records; completion status and customer details are not inferred.
            {hasCategoryActivity && ' Category totals cover the selected period only.'}
          </p>
        </>
      )}
    </div>
  );
};
