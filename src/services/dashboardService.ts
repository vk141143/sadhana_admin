import { supabase } from './supabaseClient';
import {
  parseDashboardMetrics,
  type DashboardDays,
  type DashboardMetrics,
} from './dashboardMetrics';

type DashboardFunctionResult = { data: unknown; error: unknown };
type DashboardInvoker = (days: DashboardDays) => Promise<DashboardFunctionResult>;

const CACHE_TTL_MS = 30_000;
const cache = new Map<DashboardDays, { expiresAt: number; value: DashboardMetrics }>();
const inFlight = new Map<DashboardDays, Promise<DashboardMetrics>>();

const invokeDashboard: DashboardInvoker = async days => {
  const { data, error } = await supabase.functions.invoke('admin-dashboard', { body: { days } });
  return { data, error };
};

export async function requestDashboardMetrics(
  days: DashboardDays,
  invoke: DashboardInvoker = invokeDashboard,
): Promise<DashboardMetrics> {
  const { data, error } = await invoke(days);
  if (error) throw new Error('Dashboard data could not be loaded. Check your administrator session and retry.');
  return parseDashboardMetrics(data);
}

export function getDashboardMetrics(
  days: DashboardDays,
  refresh = false,
): Promise<DashboardMetrics> {
  const pending = inFlight.get(days);
  if (pending) return pending;

  const cached = cache.get(days);
  if (!refresh && cached && cached.expiresAt > Date.now()) {
    return Promise.resolve(cached.value);
  }

  const request = requestDashboardMetrics(days, invokeDashboard)
    .then(value => {
      cache.set(days, { value, expiresAt: Date.now() + CACHE_TTL_MS });
      return value;
    })
    .finally(() => inFlight.delete(days));
  inFlight.set(days, request);
  return request;
}
