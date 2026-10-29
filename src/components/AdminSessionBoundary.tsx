import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { verifyAdminSession } from '../services/adminSession';

/** UI guard only: database RLS and backend authorization remain mandatory. */
export function AdminSessionBoundary({ children, onExpired }: { children: React.ReactNode; onExpired: () => void }) {
  const [state, setState] = useState<'loading' | 'ready' | 'denied'>('loading');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let disposed = false;
    let checking = false;
    const check = async () => {
      if (checking) return;
      checking = true;
      try {
        await verifyAdminSession();
        if (!disposed) setState('ready');
      } catch {
        if (!disposed) setState('denied');
      } finally { checking = false; }
    };
    void check();
    const timer = window.setInterval(check, 60_000);
    const { data } = supabase.auth.onAuthStateChange(event => {
      if (event === 'SIGNED_OUT' && !disposed) setState('denied');
    });
    window.addEventListener('focus', check);
    return () => { disposed = true; clearInterval(timer); data.subscription.unsubscribe(); window.removeEventListener('focus', check); };
  }, [attempt]);
  if (state === 'loading') return <main className="p-8" role="status">Verifying administrator access…</main>;
  if (state === 'denied') return <main className="p-8 space-y-4"><h1 className="text-xl">Administrator access unavailable</h1><p role="alert">Your session may have expired, your access may have changed, or the verification service may be unavailable.</p><button className="border rounded px-4 py-2" onClick={() => { setState('loading'); setAttempt(value => value + 1); }}>Retry</button> <button className="border rounded px-4 py-2" onClick={onExpired}>Return to sign in</button></main>;
  return <>{children}</>;
}
