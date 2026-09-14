# Indian Stock Portfolio Builder

A decision-support tool for screening, scoring, and building a long-term Indian
equity portfolio — built from `Indian_Stock_Portfolio_Builder_COMPLETE.md`.

This is **Phase 1 + core of Phase 3** of that spec's phased plan: the stock
database, scoring/risk/decision engine, screener, stock detail pages, and a
client-side portfolio + SIP planner, all running on generated demo data so it
works with zero configuration. Live market-data ingestion, Supabase
persistence, and multi-user auth (Phase 2 / later) are not built yet — see
[What's not built yet](#whats-not-built-yet).

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). No environment variables
or database are required — see `.env.example` for what Phase 2 will need.

## What's implemented

- **Demo data generator** (`src/lib/demo/`) — 15 fictional Indian companies
  across Banks, NBFC, Insurance, IT, FMCG, Pharma, Auto, Industrials,
  Utilities, Energy, Metals, Real Estate, and Consumer Discretionary, each with
  7-9 years of fundamentals, a generated daily price series, valuation,
  ownership, dividends, and (for a few) governance red flags — deliberately
  spanning strong compounders, a growth-but-expensive name, a value trap, a
  turnaround, and an auditor-resignation case so every part of the scoring and
  risk engine has something to fire on. Clearly labeled "DEMO DATA — NOT LIVE
  MARKET DATA" everywhere, per the spec's sample-data-mode requirement.
- **Scoring engine** (`src/lib/scoring.ts`) — the 100-point breakdown from
  section 19 (Growth/Profitability/Balance sheet/Cash flow/Governance/Business
  quality = 55, Valuation = 25, Technical = 10, Dividend = 10), sector-aware
  for Banks/NBFC/Insurance (ROA/NIM/GNPA/capital adequacy instead of
  ROCE/D-E/CFO), a confidence engine based on missing-metric coverage, and a
  decision engine that overrides on red risk flags and on
  "strong business + expensive valuation" per section 48.
- **Risk engine** — GREEN/AMBER/RED from governance flags, promoter pledge,
  negative FCF, rapid debt growth, and profit deterioration; a RED flag always
  overrides the score-based decision.
- **Screener** (`/screener`) — the 5 named presets (Quality Growth, Value
  Quality, Dividend Quality, Balanced, Deep Value Watch), full-text search,
  sortable columns, CSV export, and add-to-watchlist.
- **Stock detail page** (`/stock/[ticker]`) — Overview, Fundamentals, Cash
  Flow, Valuation, Dividend, Technical, Risk, Portfolio, and Thesis tabs, with
  charts and the "why it qualifies / why it might fail" assessment from
  section 23.
- **Portfolio + SIP planner** (`/portfolio`) — editable ₹ capital and
  Growth/Value/Dividend/Opportunity allocation, suggested position sizing
  (capped by market-cap category and category budget), staged-tranche SIP
  plans, and allocation/sector-concentration warnings. State is kept in
  `localStorage` (no backend yet — see below).
- **Watchlist** (`/watchlist`) and a **dashboard** (`/`) pulling top
  candidates, accumulation opportunities, risk alerts, and upcoming SIP
  tranches.
- **Fundamental Scanner** (`src/lib/scanner/`, the "Scanner" tab on every stock
  page) — a second, parallel analysis layer implementing the key scored parts
  of `docs/Indian_Long_Term_Fundamental_Analysis_Master_Framework.md`:
  - The three **strategy scores** (Value / Growth / Dividend, section 74) and
    the **master score** (section 73's 100-point re-weighting — Business
    Quality 15, Growth 15, Profitability 15, Cash Flow 15, Balance Sheet 10,
    Valuation 20, Capital Allocation/Dividend 5, Risk/Governance 5), computed
    by re-weighting the same underlying sub-scores rather than re-deriving
    metrics twice.
  - A **factor exposure dashboard** (section 70-71: Value/Quality/Growth/
    Dividend/Size/Investment/Momentum/Volatility) rated by real percentile
    rank within the demo universe — momentum and volatility are computed from
    the actual generated daily price series, not placeholders.
  - A simple **two-stage DCF** with bear/base/bull scenarios and a margin of
    safety (sections 29, 64, 65) — shown with its assumptions, and flagged as
    unreliable for low-FCF-yield/cyclical names rather than presenting a
    misleadingly precise number (section 54).
  - **Value/Growth/Dividend trap detection** (sections 66-68) and a final
    **A+ Compounder → F Avoid classification** (section 75).
  - Deliberately out of scope: DuPont decomposition, Piotroski F-Score,
    Altman Z-Score, and Beneish M-Score (sections 6, 43-45) need balance-sheet
    fields (asset turnover, historical distress inputs) the demo data model
    doesn't carry — rather than fabricate them, the scanner omits these
    diagnostics instead of faking a number.

## What's not built yet

Per the spec's own phasing (section 65), these are intentionally deferred:

- Real market-data providers (Alpha Vantage / Twelve Data), scheduled
  ingestion, and the `MarketDataProvider` abstraction — all data today comes
  from the in-memory demo generator in `src/lib/demo/`.
- Postgres/Supabase persistence and auth — portfolio/watchlist state lives in
  the browser's `localStorage` only.
- CSV import/admin page, alerts, benchmarking (XIRR vs NIFTY), and performance
  attribution (Phases 2, 4, 5).

The `Company`/`Fundamentals`/`Valuation`/etc. shapes in `src/lib/types.ts`
mirror the spec's table schema closely enough to generate a real Postgres
schema from later.

## Stack

Next.js (App Router) + React + TypeScript + Tailwind CSS, no external chart
library (a small inline-SVG line chart in `src/components/charts/`) to keep
the MVP dependency-free — swap in TradingView Lightweight Charts later if
needed.
