# Changelog

## 0.2.0 - 2026-03-22

### Added
- Alpha Vantage and Finnhub market-news ingestion for macro brief analysis.
- X feed ingestion with multi-URL RSS fallback support.
- Environment-based confidence tuning for macro scoring:
  - `MACRO_CONFIDENCE_CHECKLIST_WEIGHT`
  - `MACRO_CONFIDENCE_MACRO_WEIGHT`
  - `MACRO_CONFIDENCE_INDEX_WEIGHT`

### Changed
- Macro index scope narrowed to `S&P500` and `USTEC100`.
- Macro confidence now blends checklist, macro fundamentals, and index momentum with normalized weights.
- Source diagnostics and report language updated to reflect active providers.
- `.env.example` and `README.md` updated with new market-data and tuning variables.

### Removed
- Reuters and Bloomberg direct scraping dependencies in macro brief pipeline.
- MarketWatch source from the macro brief source list.
- VIX usage from macro engine logic and reported source list.
- Duplicate compiled dashboard route files:
  - `app/dashboard/page.js`
  - `app/dashboard/analytics/page.js`

### Notes
- Existing local API keys should be rotated if they were ever exposed in screenshots or logs.
