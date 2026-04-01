-- TradeOS full database bootstrap
-- Run this once in Supabase SQL Editor

-- Ensure UUID generation is available
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1) Core tables
CREATE TABLE IF NOT EXISTS public.settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  risk_percent DECIMAL(5,2) DEFAULT 1.0,
  account_balance DECIMAL(15,2) DEFAULT 10000.00,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE TABLE IF NOT EXISTS public.trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pair TEXT NOT NULL,
  score INTEGER CHECK (score >= 0 AND score <= 10),
  bias TEXT CHECK (bias IN ('bullish', 'bearish', 'neutral')),
  entry DECIMAL(20,5),
  sl DECIMAL(20,5),
  tp DECIMAL(20,5),
  result TEXT CHECK (result IN ('win', 'loss', 'breakeven', 'pending')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.checklist_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trend BOOLEAN DEFAULT FALSE,
  zone BOOLEAN DEFAULT FALSE,
  liquidity BOOLEAN DEFAULT FALSE,
  structure BOOLEAN DEFAULT FALSE,
  rr BOOLEAN DEFAULT FALSE,
  total_score INTEGER CHECK (total_score >= 0 AND total_score <= 10),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2) RLS
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "settings_select_own" ON public.settings;
DROP POLICY IF EXISTS "settings_insert_own" ON public.settings;
DROP POLICY IF EXISTS "settings_update_own" ON public.settings;
DROP POLICY IF EXISTS "settings_delete_own" ON public.settings;
CREATE POLICY "settings_select_own" ON public.settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "settings_insert_own" ON public.settings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "settings_update_own" ON public.settings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "settings_delete_own" ON public.settings FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "trades_select_own" ON public.trades;
DROP POLICY IF EXISTS "trades_insert_own" ON public.trades;
DROP POLICY IF EXISTS "trades_update_own" ON public.trades;
DROP POLICY IF EXISTS "trades_delete_own" ON public.trades;
CREATE POLICY "trades_select_own" ON public.trades FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "trades_insert_own" ON public.trades FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "trades_update_own" ON public.trades FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "trades_delete_own" ON public.trades FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "checklist_logs_select_own" ON public.checklist_logs;
DROP POLICY IF EXISTS "checklist_logs_insert_own" ON public.checklist_logs;
DROP POLICY IF EXISTS "checklist_logs_update_own" ON public.checklist_logs;
DROP POLICY IF EXISTS "checklist_logs_delete_own" ON public.checklist_logs;
CREATE POLICY "checklist_logs_select_own" ON public.checklist_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "checklist_logs_insert_own" ON public.checklist_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "checklist_logs_update_own" ON public.checklist_logs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "checklist_logs_delete_own" ON public.checklist_logs FOR DELETE USING (auth.uid() = user_id);

-- 3) Indexes
CREATE INDEX IF NOT EXISTS idx_trades_user_id ON public.trades(user_id);
CREATE INDEX IF NOT EXISTS idx_trades_created_at ON public.trades(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_checklist_logs_user_id ON public.checklist_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_settings_user_id ON public.settings(user_id);

-- 4) Auto-create settings for new users
CREATE OR REPLACE FUNCTION public.handle_new_user_settings()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.settings (user_id, risk_percent, account_balance)
  VALUES (NEW.id, 1.0, 10000.00)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_settings ON auth.users;
CREATE TRIGGER on_auth_user_created_settings
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_settings();

-- 5) Backfill settings for users that already exist
INSERT INTO public.settings (user_id, risk_percent, account_balance)
SELECT id, 1.0, 10000.00
FROM auth.users
ON CONFLICT (user_id) DO NOTHING;
