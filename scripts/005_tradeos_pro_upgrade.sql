-- TradeOS Pro 2026 upgrade
-- Adds structured JSON fields and daily summary table for pro dashboard/calendar.

ALTER TABLE public.trades
  ADD COLUMN IF NOT EXISTS ai_recommendation TEXT,
  ADD COLUMN IF NOT EXISTS checklist_json JSONB,
  ADD COLUMN IF NOT EXISTS risk_json JSONB,
  ADD COLUMN IF NOT EXISTS ai_analysis_json JSONB;

CREATE TABLE IF NOT EXISTS public.daily_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  summary_date DATE NOT NULL,
  trade_count INTEGER NOT NULL DEFAULT 0,
  win_count INTEGER NOT NULL DEFAULT 0,
  loss_count INTEGER NOT NULL DEFAULT 0,
  breakeven_count INTEGER NOT NULL DEFAULT 0,
  net_pl NUMERIC NOT NULL DEFAULT 0,
  r_multiple NUMERIC NOT NULL DEFAULT 0,
  win_rate NUMERIC NOT NULL DEFAULT 0,
  top_setup TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, summary_date)
);

ALTER TABLE public.daily_summary ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "daily_summary_select_own" ON public.daily_summary;
DROP POLICY IF EXISTS "daily_summary_insert_own" ON public.daily_summary;
DROP POLICY IF EXISTS "daily_summary_update_own" ON public.daily_summary;
DROP POLICY IF EXISTS "daily_summary_delete_own" ON public.daily_summary;

CREATE POLICY "daily_summary_select_own" ON public.daily_summary
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "daily_summary_insert_own" ON public.daily_summary
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "daily_summary_update_own" ON public.daily_summary
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "daily_summary_delete_own" ON public.daily_summary
FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_daily_summary_user_date
  ON public.daily_summary(user_id, summary_date DESC);

CREATE OR REPLACE FUNCTION public.refresh_daily_summary_for_trade(p_trade_id uuid)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_trade_date date;
BEGIN
  SELECT t.user_id, COALESCE(t.trade_date, t.created_at::date)
  INTO v_user_id, v_trade_date
  FROM public.trades t
  WHERE t.id = p_trade_id;

  IF v_user_id IS NULL OR v_trade_date IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO public.daily_summary (
    user_id,
    summary_date,
    trade_count,
    win_count,
    loss_count,
    breakeven_count,
    net_pl,
    r_multiple,
    win_rate,
    top_setup,
    updated_at
  )
  SELECT
    t.user_id,
    COALESCE(t.trade_date, t.created_at::date) AS summary_date,
    COUNT(*)::integer,
    SUM(CASE WHEN t.result = 'win' THEN 1 ELSE 0 END)::integer,
    SUM(CASE WHEN t.result = 'loss' THEN 1 ELSE 0 END)::integer,
    SUM(CASE WHEN t.result = 'breakeven' THEN 1 ELSE 0 END)::integer,
    COALESCE(SUM(
      CASE
        WHEN t.result = 'win' THEN COALESCE(t.risk_amount, 0) * COALESCE(t.rr, 0)
        WHEN t.result = 'loss' THEN -COALESCE(t.risk_amount, 0)
        ELSE 0
      END
    ), 0) AS net_pl,
    COALESCE(SUM(
      CASE
        WHEN t.result = 'win' THEN COALESCE(t.rr, 0)
        WHEN t.result = 'loss' THEN -1
        ELSE 0
      END
    ), 0) AS r_multiple,
    CASE WHEN COUNT(*) = 0 THEN 0
      ELSE ROUND((SUM(CASE WHEN t.result = 'win' THEN 1 ELSE 0 END)::numeric / COUNT(*)) * 100, 2)
    END AS win_rate,
    MAX(t.setup_grade) FILTER (WHERE t.setup_grade IS NOT NULL) AS top_setup,
    NOW()
  FROM public.trades t
  WHERE t.user_id = v_user_id
    AND COALESCE(t.trade_date, t.created_at::date) = v_trade_date
  GROUP BY t.user_id, COALESCE(t.trade_date, t.created_at::date)
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
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_refresh_daily_summary()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.refresh_daily_summary_for_trade(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_trades_refresh_daily_summary ON public.trades;

CREATE TRIGGER trg_trades_refresh_daily_summary
AFTER INSERT OR UPDATE OF result, rr, risk_amount, trade_date, setup_grade
ON public.trades
FOR EACH ROW
EXECUTE FUNCTION public.trg_refresh_daily_summary();
