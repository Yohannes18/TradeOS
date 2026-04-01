-- TradeOS Decision Engine Upgrade
-- Run after the existing production upgrade scripts.

ALTER TABLE public.economic_events
  ADD COLUMN IF NOT EXISTS forecast TEXT,
  ADD COLUMN IF NOT EXISTS actual TEXT,
  ADD COLUMN IF NOT EXISTS historical_reaction_summary TEXT,
  ADD COLUMN IF NOT EXISTS expected_behavior TEXT;

ALTER TABLE public.trades
  ADD COLUMN IF NOT EXISTS checklist_json JSONB,
  ADD COLUMN IF NOT EXISTS risk_json JSONB,
  ADD COLUMN IF NOT EXISTS ai_analysis_json JSONB;

CREATE INDEX IF NOT EXISTS idx_economic_events_title_date
  ON public.economic_events(title, event_date DESC);

CREATE INDEX IF NOT EXISTS idx_trades_checklist_json
  ON public.trades USING gin (checklist_json);
