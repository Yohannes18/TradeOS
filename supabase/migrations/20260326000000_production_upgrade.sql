-- TradeOS Production Upgrade v1.0
-- Run in Supabase SQL Editor

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- 1. Add missing columns to trades table
-- ============================================================
DO $$
BEGIN
  IF to_regclass('public.trades') IS NOT NULL THEN
    ALTER TABLE public.trades
      ADD COLUMN IF NOT EXISTS bias TEXT,
      ADD COLUMN IF NOT EXISTS setup_grade TEXT,
      ADD COLUMN IF NOT EXISTS checklist_score NUMERIC(5,2),
      ADD COLUMN IF NOT EXISTS trade_date DATE,
      ADD COLUMN IF NOT EXISTS session TEXT,
      ADD COLUMN IF NOT EXISTS mistake TEXT[],
      ADD COLUMN IF NOT EXISTS tags TEXT[],
      ADD COLUMN IF NOT EXISTS screenshot_url TEXT,
      ADD COLUMN IF NOT EXISTS exit_time TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS emotions TEXT;
  END IF;
END $$;

-- ============================================================
-- 2. Ensure daily_summary view / materialized table exists
-- ============================================================
CREATE TABLE IF NOT EXISTS daily_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  summary_date DATE NOT NULL,
  trade_count INTEGER NOT NULL DEFAULT 0,
  win_count INTEGER NOT NULL DEFAULT 0,
  loss_count INTEGER NOT NULL DEFAULT 0,
  breakeven_count INTEGER NOT NULL DEFAULT 0,
  net_pl NUMERIC(12,2) NOT NULL DEFAULT 0,
  r_multiple NUMERIC(6,2) NOT NULL DEFAULT 0,
  win_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  top_setup TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, summary_date)
);

ALTER TABLE daily_summary ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'daily_summary'
      AND policyname = 'Users manage own daily_summary'
  ) THEN
    CREATE POLICY "Users manage own daily_summary"
      ON public.daily_summary
      FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- ============================================================
-- 3. AI insights table
-- ============================================================
CREATE TABLE IF NOT EXISTS ai_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trade_id UUID,
  insight_type TEXT NOT NULL DEFAULT 'trade_review',
  content TEXT NOT NULL,
  sentiment TEXT,
  symbols TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

DO $$
BEGIN
  IF to_regclass('public.trades') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_constraint
       WHERE conname = 'ai_insights_trade_id_fkey'
         AND conrelid = 'public.ai_insights'::regclass
     ) THEN
    ALTER TABLE public.ai_insights
      ADD CONSTRAINT ai_insights_trade_id_fkey
      FOREIGN KEY (trade_id)
      REFERENCES public.trades(id)
      ON DELETE SET NULL;
  END IF;
END $$;

ALTER TABLE ai_insights ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'ai_insights'
      AND policyname = 'Users manage own ai_insights'
  ) THEN
    CREATE POLICY "Users manage own ai_insights"
      ON public.ai_insights
      FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- ============================================================
-- 4. Function: auto-update daily_summary after trade insert/update
-- ============================================================
CREATE OR REPLACE FUNCTION refresh_daily_summary()
RETURNS TRIGGER AS $$
DECLARE
  _date DATE;
  _uid UUID;
BEGIN
  _uid := COALESCE(NEW.user_id, OLD.user_id);
  _date := COALESCE(NEW.trade_date, DATE(COALESCE(NEW.created_at, NOW())));

  INSERT INTO daily_summary (
    user_id, summary_date, trade_count, win_count, loss_count,
    breakeven_count, net_pl, r_multiple, win_rate, top_setup
  )
  SELECT
    _uid,
    _date,
    COUNT(*)::INTEGER,
    COUNT(*) FILTER (WHERE result = 'win')::INTEGER,
    COUNT(*) FILTER (WHERE result = 'loss')::INTEGER,
    COUNT(*) FILTER (WHERE result = 'breakeven')::INTEGER,
    COALESCE(SUM(
      CASE result
        WHEN 'win' THEN risk_amount * COALESCE(rr, 1)
        WHEN 'loss' THEN -risk_amount
        ELSE 0
      END
    ), 0),
    COALESCE(AVG(COALESCE(rr, 0)), 0),
    CASE WHEN COUNT(*) FILTER (WHERE result IN ('win','loss','breakeven')) = 0 THEN 0
         ELSE ROUND(COUNT(*) FILTER (WHERE result = 'win') * 100.0 /
              NULLIF(COUNT(*) FILTER (WHERE result IN ('win','loss','breakeven')), 0), 2)
    END,
    MODE() WITHIN GROUP (ORDER BY setup_grade) FILTER (WHERE setup_grade IS NOT NULL)
  FROM public.trades
  WHERE user_id = _uid
    AND (trade_date = _date OR DATE(created_at) = _date)
  ON CONFLICT (user_id, summary_date)
  DO UPDATE SET
    trade_count = EXCLUDED.trade_count,
    win_count = EXCLUDED.win_count,
    loss_count = EXCLUDED.loss_count,
    breakeven_count = EXCLUDED.breakeven_count,
    net_pl = EXCLUDED.net_pl,
    r_multiple = EXCLUDED.r_multiple,
    win_rate = EXCLUDED.win_rate,
    top_setup = EXCLUDED.top_setup,
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DO $$
BEGIN
  IF to_regclass('public.trades') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS trg_refresh_daily_summary ON public.trades;
    CREATE TRIGGER trg_refresh_daily_summary
      AFTER INSERT OR UPDATE OR DELETE ON public.trades
      FOR EACH ROW EXECUTE FUNCTION refresh_daily_summary();
  END IF;
END $$;

-- ============================================================
-- 5. Performance indices
-- ============================================================
DO $$
BEGIN
  IF to_regclass('public.trades') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS idx_trades_user_date ON public.trades(user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_trades_user_result ON public.trades(user_id, result);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_daily_summary_user_date ON public.daily_summary(user_id, summary_date DESC);
CREATE INDEX IF NOT EXISTS idx_ai_insights_user ON public.ai_insights(user_id, created_at DESC);

-- ============================================================
-- 6. Settings: ensure all columns exist
-- ============================================================
DO $$
BEGIN
  IF to_regclass('public.settings') IS NOT NULL THEN
    ALTER TABLE public.settings
      ADD COLUMN IF NOT EXISTS default_pair TEXT DEFAULT 'XAUUSD',
      ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'UTC',
      ADD COLUMN IF NOT EXISTS theme TEXT DEFAULT 'dark',
      ADD COLUMN IF NOT EXISTS notifications_enabled BOOLEAN DEFAULT true,
      ADD COLUMN IF NOT EXISTS ai_model TEXT DEFAULT 'claude-sonnet-4-20250514';
  END IF;
END $$;
