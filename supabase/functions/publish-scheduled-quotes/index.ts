// Supabase Edge Function: publish-scheduled-quotes
// Deploy: supabase functions deploy publish-scheduled-quotes
// Schedule via Supabase Dashboard → Edge Functions → Cron: "* * * * *" (every minute)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const now = new Date().toISOString();

  // 1. Find quotes due to be published (scheduled_datetime <= now, status = 'scheduled')
  const { data: due, error: fetchErr } = await supabase
    .from('quote_schedules')
    .select('id')
    .eq('status', 'scheduled')
    .lte('scheduled_datetime', now);

  if (fetchErr) return new Response(fetchErr.message, { status: 500 });
  if (!due || due.length === 0) return new Response('nothing to publish', { status: 200 });

  // 2. Expire any currently published quote
  await supabase
    .from('quote_schedules')
    .update({ status: 'expired', updated_at: now })
    .eq('status', 'published');

  // 3. Publish the most recently scheduled due quote (latest scheduled_datetime wins)
  const { data: latest } = await supabase
    .from('quote_schedules')
    .select('id')
    .eq('status', 'scheduled')
    .lte('scheduled_datetime', now)
    .order('scheduled_datetime', { ascending: false })
    .limit(1)
    .single();

  if (!latest) return new Response('no due quote found', { status: 200 });

  const { error: pubErr } = await supabase
    .from('quote_schedules')
    .update({ status: 'published', published_at: now, updated_at: now })
    .eq('id', latest.id);

  if (pubErr) return new Response(pubErr.message, { status: 500 });

  // 4. Mark remaining overdue scheduled quotes as expired (missed slots)
  await supabase
    .from('quote_schedules')
    .update({ status: 'expired', updated_at: now })
    .eq('status', 'scheduled')
    .lte('scheduled_datetime', now)
    .neq('id', latest.id);

  return new Response(JSON.stringify({ published: latest.id }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
