-- TradeOS Database Schema
-- Tables for trades, checklist_logs, and settings

-- 1. Settings table (stores user preferences)
CREATE TABLE IF NOT EXISTS public.settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  risk_percent DECIMAL(5,2) DEFAULT 1.0,
  account_balance DECIMAL(15,2) DEFAULT 10000.00,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- 2. Trades table (stores trading journal entries)
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

-- 3. Checklist logs table (stores checklist scoring history)
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

-- Enable Row Level Security
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for settings
DROP POLICY IF EXISTS "settings_select_own" ON public.settings;
DROP POLICY IF EXISTS "settings_insert_own" ON public.settings;
DROP POLICY IF EXISTS "settings_update_own" ON public.settings;
DROP POLICY IF EXISTS "settings_delete_own" ON public.settings;
CREATE POLICY "settings_select_own" ON public.settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "settings_insert_own" ON public.settings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "settings_update_own" ON public.settings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "settings_delete_own" ON public.settings FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for trades
DROP POLICY IF EXISTS "trades_select_own" ON public.trades;
DROP POLICY IF EXISTS "trades_insert_own" ON public.trades;
DROP POLICY IF EXISTS "trades_update_own" ON public.trades;
DROP POLICY IF EXISTS "trades_delete_own" ON public.trades;
CREATE POLICY "trades_select_own" ON public.trades FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "trades_insert_own" ON public.trades FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "trades_update_own" ON public.trades FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "trades_delete_own" ON public.trades FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for checklist_logs
DROP POLICY IF EXISTS "checklist_logs_select_own" ON public.checklist_logs;
DROP POLICY IF EXISTS "checklist_logs_insert_own" ON public.checklist_logs;
DROP POLICY IF EXISTS "checklist_logs_update_own" ON public.checklist_logs;
DROP POLICY IF EXISTS "checklist_logs_delete_own" ON public.checklist_logs;
CREATE POLICY "checklist_logs_select_own" ON public.checklist_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "checklist_logs_insert_own" ON public.checklist_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "checklist_logs_update_own" ON public.checklist_logs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "checklist_logs_delete_own" ON public.checklist_logs FOR DELETE USING (auth.uid() = user_id);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_trades_user_id ON public.trades(user_id);
CREATE INDEX IF NOT EXISTS idx_trades_created_at ON public.trades(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_checklist_logs_user_id ON public.checklist_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_settings_user_id ON public.settings(user_id);
