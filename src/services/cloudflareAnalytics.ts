export interface CF_Storage {
  used: number;
  unit: string;
  standard: number;
  infrequent: number;
}

export interface CF_Requests {
  classA: number;
  classB: number;
  total: number;
}

export interface CF_Retrieved {
  bytes: number;
}

export interface CF_Region {
  country: string;
  code: string;
  requests: number;
  bandwidth: number;
  storageUsed: number;
  lat: number;
  lng: number;
}

export interface CF_TimelinePoint {
  time: string;
  storage: number;
  classA: number;
  classB: number;
}

export interface CF_Activity {
  id: string;
  action: 'uploaded' | 'deleted' | 'updated' | 'downloaded';
  file: string;
  timestamp: string;
  size: string;
  status: 'success' | 'error';
}

export interface CF_Limits {
  storage: { used: number; max: number };
  classA: { used: number; max: number };
  classB: { used: number; max: number };
}

export interface CF_Analytics {
  storage: CF_Storage;
  requests: CF_Requests;
  retrieved: CF_Retrieved;
  regions: CF_Region[];
  timeline: CF_TimelinePoint[];
  recentActivity: CF_Activity[];
  limits: CF_Limits;
}

// ── Seed deterministic mock timeline ──────────────────────────────────────────
function buildTimeline(): CF_TimelinePoint[] {
  const now = Date.now();
  return Array.from({ length: 24 }, (_, i) => {
    const t = new Date(now - (23 - i) * 3600_000);
    return {
      time: t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      storage: parseFloat((9.8 + Math.sin(i * 0.4) * 0.3 + i * 0.015).toFixed(2)),
      classA: Math.floor(Math.random() * 3),
      classB: Math.floor(Math.random() * 4),
    };
  });
}

function buildActivity(): CF_Activity[] {
  const items: CF_Activity[] = [
    { id: '1', action: 'uploaded',   file: 'Bhagavad_Gita.json',  timestamp: '2 min ago',  size: '1.2 MB', status: 'success' },
    { id: '2', action: 'deleted',    file: 'audio001.webp',        timestamp: '15 min ago', size: '340 KB', status: 'success' },
    { id: '3', action: 'updated',    file: 'Ramayan.json',         timestamp: '1 hr ago',   size: '2.8 MB', status: 'success' },
    { id: '4', action: 'downloaded', file: 'Krishna.webp',         timestamp: '3 hr ago',   size: '512 KB', status: 'success' },
    { id: '5', action: 'uploaded',   file: 'Mahabharata.json',     timestamp: '5 hr ago',   size: '4.1 MB', status: 'success' },
    { id: '6', action: 'deleted',    file: 'old_banner.png',       timestamp: '8 hr ago',   size: '88 KB',  status: 'error'   },
  ];
  return items;
}

function buildRegions(): CF_Region[] {
  return [
    { country: 'India',          code: 'IN', requests: 7,  bandwidth: 0,    storageUsed: 8.2,  lat: 20.6,  lng: 78.9  },
    { country: 'United States',  code: 'US', requests: 3,  bandwidth: 0,    storageUsed: 1.5,  lat: 37.1,  lng: -95.7 },
    { country: 'Germany',        code: 'DE', requests: 1,  bandwidth: 0,    storageUsed: 0.47, lat: 51.2,  lng: 10.4  },
    { country: 'Singapore',      code: 'SG', requests: 1,  bandwidth: 0,    storageUsed: 0.0,  lat: 1.35,  lng: 103.8 },
  ];
}

// ── Fetch (falls back to mock when API unavailable) ────────────────────────────
export async function fetchCFAnalytics(): Promise<CF_Analytics> {
  try {
    const res = await fetch('/api/cloudflare/analytics', { signal: AbortSignal.timeout(6000) });
    if (!res.ok) throw new Error('non-2xx');
    const data = await res.json();
    // Hydrate optional fields the backend may omit
    if (!data.timeline?.length)      data.timeline      = buildTimeline();
    if (!data.recentActivity?.length) data.recentActivity = buildActivity();
    if (!data.regions?.length)        data.regions        = buildRegions();
    return data as CF_Analytics;
  } catch {
    // Return rich mock so the UI is always populated
    return {
      storage:   { used: 10.17, unit: 'MB', standard: 10.17, infrequent: 0 },
      requests:  { classA: 5, classB: 7, total: 12 },
      retrieved: { bytes: 0 },
      regions:   buildRegions(),
      timeline:  buildTimeline(),
      recentActivity: buildActivity(),
      limits: {
        storage: { used: 10.17, max: 10240 },
        classA:  { used: 5,     max: 1_000_000 },
        classB:  { used: 7,     max: 10_000_000 },
      },
    };
  }
}
