-- Daily journal workspace upgrade
-- Adds dedicated day-level journal entries for TradeZella-style daily review workflows.

CREATE TABLE IF NOT EXISTS public.daily_journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  journal_date DATE NOT NULL,
  note TEXT,
  ai_summary TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, journal_date)
);

ALTER TABLE public.daily_journal_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "daily_journal_entries_select_own" ON public.daily_journal_entries;
DROP POLICY IF EXISTS "daily_journal_entries_insert_own" ON public.daily_journal_entries;
DROP POLICY IF EXISTS "daily_journal_entries_update_own" ON public.daily_journal_entries;
DROP POLICY IF EXISTS "daily_journal_entries_delete_own" ON public.daily_journal_entries;

CREATE POLICY "daily_journal_entries_select_own" ON public.daily_journal_entries
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "daily_journal_entries_insert_own" ON public.daily_journal_entries
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "daily_journal_entries_update_own" ON public.daily_journal_entries
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "daily_journal_entries_delete_own" ON public.daily_journal_entries
FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_daily_journal_entries_user_date
  ON public.daily_journal_entries(user_id, journal_date DESC);
