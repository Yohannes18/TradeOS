# TradeOS Changelog

## v0.3.0 — Production Upgrade (2026-03-26)

### New Features
- **AI Trade Analysis** — Real Claude API integration (`/api/ai-analysis`). Analyzes checklist + symbol and returns bias, confidence, verdict, key levels, risk note, and improvement tip. Auto-triggers when checklist score changes, with manual refresh button.
- **Live Macro Desk** — Yahoo Finance market data for DXY, Gold, SPX, NAS100, EURUSD, GBPUSD, Oil, US10Y. Auto-refreshes every 60s. Click tiles to expand bias + TradingView deep links. Sentiment gauge + macro context table.
- **Trade Result Dialog** — Log win/loss/breakeven with actual R:R, session, emotional state chips, mistake tags, and post-trade notes. P&L auto-calculated.
- **Community Hub** — Anonymized leaderboard ranked by win rate × avg R:R. Curated strategy playbooks. Platform insights and stats.
- **Analytics Charts** — Recharts equity curve, monthly P&L bar chart, result distribution donut, win rate by symbol, setup grade performance bars.
- **Quick Add Trade** — Modal in topbar for fast trade logging without leaving the dashboard.
- **CSV Export** — One-click journal export from the trade table.
- **Settings Upgrade** — Risk presets, default pair selector, timezone, notifications toggle, live risk preview calculator.

### Improvements
- Trade journal table: sortable columns, result filter, stats bar (win rate / net P/L / avg R:R), detail side panel
- Dashboard layout passes account settings to topbar for quick-add
- Trade workspace: instrument selector, AI verdict status banner, wires AI output into Supabase insert
- AI Analysis Panel: confidence bar, key levels chips, risk/improvement cards, auto-debounced on checklist changes

### Database (run scripts/006_production_upgrade.sql)
- Added `session`, `emotions`, `tags`, `screenshot_url`, `exit_time` columns to `trades`
- New `ai_insights` table with RLS
- New `settings` columns: `default_pair`, `timezone`, `theme`, `notifications_enabled`, `ai_model`
- Performance indices on trades, daily_summary, ai_insights
- `trade_date` backfill for existing trades
- `daily_summary` backfill trigger for all existing trades

## v0.2.0 — Pro Shell (2026-03-21)
- Professional dashboard with metrics, calendar, checklist score
- TradingView chart integration
- Risk calculator with multi-instrument support
- Better Auth + Supabase authentication
- Daily summary table + trigger

## v0.1.0 — Initial Release (2026-03-18)
- Base platform scaffold with Next.js 16, Tailwind v4, shadcn/ui
- Supabase auth and basic trades/settings tables
- Trade journal, pre-trade checklist, analytics pages
