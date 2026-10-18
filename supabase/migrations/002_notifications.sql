-- ============================================================
-- Migration: notifications table
-- Run in Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS public.notifications (
  id               uuid        NOT NULL DEFAULT gen_random_uuid(),
  title            text        NOT NULL DEFAULT '',
  body             text        NOT NULL DEFAULT '',
  target_type      text        NOT NULL DEFAULT 'all' CHECK (target_type IN ('all', 'individual')),
  target_user_ids  uuid[]               DEFAULT '{}',
  sent_at          timestamptz          DEFAULT now(),
  created_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT notifications_pkey PRIMARY KEY (id)
);

-- RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon full access notifications" ON public.notifications;
CREATE POLICY "anon full access notifications"
  ON public.notifications FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);
