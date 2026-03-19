-- TradeOS ecosystem upgrade (deploy-ready)
-- Adds profiles, richer trades/checklist schema, calendar/event tables,
-- and RPC query functions for journal + calendar analytics.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1) Profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_own" ON public.profiles;

CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles_delete_own" ON public.profiles FOR DELETE USING (auth.uid() = id);

INSERT INTO public.profiles (id)
SELECT id FROM auth.users
ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id) VALUES (NEW.id)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;
CREATE TRIGGER on_auth_user_created_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_profile();

-- 2) Settings extension
ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 3) Trades extension (core)
ALTER TABLE public.trades
  ADD COLUMN IF NOT EXISTS direction TEXT CHECK (direction IN ('buy','sell')),
  ADD COLUMN IF NOT EXISTS rr NUMERIC,
  ADD COLUMN IF NOT EXISTS risk_amount NUMERIC,
  ADD COLUMN IF NOT EXISTS position_size NUMERIC,
  ADD COLUMN IF NOT EXISTS checklist_score NUMERIC,
  ADD COLUMN IF NOT EXISTS setup_grade TEXT CHECK (setup_grade IN ('A','B','C')),
  ADD COLUMN IF NOT EXISTS fundamental_bias TEXT,
  ADD COLUMN IF NOT EXISTS session TEXT CHECK (session IN ('london','ny','asia')),
  ADD COLUMN IF NOT EXISTS market_regime TEXT,
  ADD COLUMN IF NOT EXISTS emotion TEXT,
  ADD COLUMN IF NOT EXISTS mistake TEXT[],
  ADD COLUMN IF NOT EXISTS trade_date DATE;

-- keep existing result support while ensuring pending is allowed
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'trades_result_check'
      AND conrelid = 'public.trades'::regclass
  ) THEN
    ALTER TABLE public.trades DROP CONSTRAINT trades_result_check;
  END IF;
END $$;

ALTER TABLE public.trades
  ADD CONSTRAINT trades_result_check CHECK (result IN ('win','loss','breakeven','pending'));

UPDATE public.trades
SET trade_date = COALESCE(trade_date, created_at::date)
WHERE trade_date IS NULL;

UPDATE public.trades
SET session = 'ny'
WHERE session IN ('new-york', 'new york', 'newyork');

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'trades_session_check'
      AND conrelid = 'public.trades'::regclass
  ) THEN
    ALTER TABLE public.trades DROP CONSTRAINT trades_session_check;
  END IF;
END $$;

ALTER TABLE public.trades
  ADD CONSTRAINT trades_session_check CHECK (session IN ('london','ny','asia'));

UPDATE public.checklist_logs
SET data = jsonb_set(data, '{session}', '"ny"'::jsonb, true)
WHERE data ? 'session'
  AND lower(data->>'session') IN ('new-york', 'new york', 'newyork');

CREATE INDEX IF NOT EXISTS idx_trades_user_trade_date ON public.trades(user_id, trade_date);
CREATE INDEX IF NOT EXISTS idx_trades_user_result ON public.trades(user_id, result);
CREATE INDEX IF NOT EXISTS idx_trades_user_score ON public.trades(user_id, checklist_score);

-- 4) checklist_logs extension
ALTER TABLE public.checklist_logs
  ADD COLUMN IF NOT EXISTS trade_id UUID REFERENCES public.trades(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS context_score NUMERIC,
  ADD COLUMN IF NOT EXISTS setup_score NUMERIC,
  ADD COLUMN IF NOT EXISTS execution_score NUMERIC,
  ADD COLUMN IF NOT EXISTS data JSONB;

CREATE INDEX IF NOT EXISTS idx_checklist_logs_trade_id ON public.checklist_logs(trade_id);

-- 5) trade_images
CREATE TABLE IF NOT EXISTS public.trade_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_id UUID REFERENCES public.trades(id) ON DELETE CASCADE,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.trade_images ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "trade_images_select_own" ON public.trade_images;
DROP POLICY IF EXISTS "trade_images_insert_own" ON public.trade_images;
DROP POLICY IF EXISTS "trade_images_update_own" ON public.trade_images;
DROP POLICY IF EXISTS "trade_images_delete_own" ON public.trade_images;

CREATE POLICY "trade_images_select_own" ON public.trade_images
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.trades t
    WHERE t.id = trade_images.trade_id
      AND t.user_id = auth.uid()
  )
);

CREATE POLICY "trade_images_insert_own" ON public.trade_images
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.trades t
    WHERE t.id = trade_images.trade_id
      AND t.user_id = auth.uid()
  )
);

CREATE POLICY "trade_images_update_own" ON public.trade_images
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.trades t
    WHERE t.id = trade_images.trade_id
      AND t.user_id = auth.uid()
  )
);

CREATE POLICY "trade_images_delete_own" ON public.trade_images
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.trades t
    WHERE t.id = trade_images.trade_id
      AND t.user_id = auth.uid()
  )
);

CREATE INDEX IF NOT EXISTS idx_trade_images_trade_id ON public.trade_images(trade_id);

-- 6) economic_events
CREATE TABLE IF NOT EXISTS public.economic_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT,
  country TEXT,
  impact TEXT,
  event_date DATE,
  event_time TIME,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.economic_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "economic_events_read_all" ON public.economic_events;
CREATE POLICY "economic_events_read_all" ON public.economic_events FOR SELECT USING (true);

CREATE INDEX IF NOT EXISTS idx_economic_events_date ON public.economic_events(event_date);
CREATE INDEX IF NOT EXISTS idx_economic_events_impact ON public.economic_events(impact);

-- 7) Ensure core RLS policies still exist (user tables)
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_logs ENABLE ROW LEVEL SECURITY;

-- 8) RPC queries (calendar + journal integration)
CREATE OR REPLACE FUNCTION public.get_monthly_trade_stats(p_start date, p_end date)
RETURNS TABLE (
  trade_date date,
  total_trades bigint,
  wins bigint,
  losses bigint,
  total_rr numeric
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    t.trade_date,
    COUNT(*) AS total_trades,
    SUM(CASE WHEN t.result = 'win' THEN 1 ELSE 0 END) AS wins,
    SUM(CASE WHEN t.result = 'loss' THEN 1 ELSE 0 END) AS losses,
    COALESCE(SUM(CASE
      WHEN t.result = 'win' THEN COALESCE(t.rr, 0)
      WHEN t.result = 'loss' THEN -1 * COALESCE(NULLIF(t.rr, 0), 1)
      ELSE 0
    END), 0) AS total_rr
  FROM public.trades t
  WHERE t.user_id = auth.uid()
    AND t.trade_date BETWEEN p_start AND p_end
  GROUP BY t.trade_date
  ORDER BY t.trade_date;
$$;

CREATE OR REPLACE FUNCTION public.get_trades_by_date(p_trade_date date)
RETURNS SETOF public.trades
LANGUAGE sql
STABLE
AS $$
  SELECT *
  FROM public.trades t
  WHERE t.user_id = auth.uid()
    AND t.trade_date = p_trade_date
  ORDER BY t.created_at DESC;
$$;

CREATE OR REPLACE FUNCTION public.get_trade_event_correlation(p_start date DEFAULT NULL, p_end date DEFAULT NULL)
RETURNS TABLE (
  trade_id uuid,
  trade_date date,
  pair text,
  result text,
  rr numeric,
  event_title text,
  event_impact text
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    t.id AS trade_id,
    t.trade_date,
    t.pair,
    t.result,
    t.rr,
    e.title AS event_title,
    e.impact AS event_impact
  FROM public.trades t
  LEFT JOIN public.economic_events e
    ON e.event_date = t.trade_date
  WHERE t.user_id = auth.uid()
    AND (p_start IS NULL OR t.trade_date >= p_start)
    AND (p_end IS NULL OR t.trade_date <= p_end)
  ORDER BY t.trade_date DESC, t.created_at DESC;
$$;

CREATE OR REPLACE FUNCTION public.get_performance_by_day(p_start date DEFAULT NULL, p_end date DEFAULT NULL)
RETURNS TABLE (
  trade_date date,
  avg_rr numeric,
  trades bigint,
  win_rate numeric
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    t.trade_date,
    AVG(COALESCE(t.rr, 0)) AS avg_rr,
    COUNT(*) AS trades,
    CASE WHEN COUNT(*) = 0 THEN 0
      ELSE SUM(CASE WHEN t.result = 'win' THEN 1 ELSE 0 END)::numeric / COUNT(*)
    END AS win_rate
  FROM public.trades t
  WHERE t.user_id = auth.uid()
    AND (p_start IS NULL OR t.trade_date >= p_start)
    AND (p_end IS NULL OR t.trade_date <= p_end)
  GROUP BY t.trade_date
  ORDER BY t.trade_date;
$$;
