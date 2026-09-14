# Indian Stock Portfolio Builder

A decision-support tool for screening, scoring, and building a long-term Indian
equity portfolio — built from `Indian_Stock_Portfolio_Builder_COMPLETE.md`.

This is **Phase 1 + core of Phase 3** of that spec's phased plan: the stock
database, scoring/risk/decision engine, screener, stock detail pages, a
portfolio + SIP planner, a real market-data provider, and optional Supabase
persistence with auth. See [What's not built yet](#whats-not-built-yet) for
what's still deferred.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). No environment variables
or database are required — the app runs entirely on generated demo data with
localStorage persistence out of the box. See
[Supabase persistence](#supabase-persistence-optional) to switch to real,
multi-device storage.

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
  plans, and allocation/sector-concentration warnings. Persists to
  localStorage or Supabase depending on configuration — see below.
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
- **CSV data import** (`/admin/import`, section 32) — bring real companies
  into every part of the app (screener, dashboard, portfolio, Scanner) without
  any API key. Two templates: a companies-and-latest-fundamentals snapshot,
  and an optional governance-flags file. Validates per section 35 (price > 0,
  market cap/debt ≥ 0, out-of-range percentages, negative PE, duplicate
  tickers) and shows a per-row pass/fail preview before committing anything.
  Critically, an imported row is treated as one real snapshot, **never**
  expanded into a fabricated multi-year history the way the demo generator
  works — anything you don't supply (a CAGR, a DMA, a governance flag) stays
  null and is reflected honestly as a lower confidence score and a 0-weighted
  sub-score, not an invented average. Imported companies are tagged
  "Imported" everywhere they appear (see `src/lib/importedStock/` and
  `src/lib/store/importedStore.tsx`).
- **`MarketDataProvider` interface + a real Alpha Vantage adapter**
  (`src/lib/providers/`, section 6) — the app is not hard-coded around one
  vendor. `MarketDataProvider` declares `getQuotes` / `getHistoricalPrices` /
  `getFundamentals` / `getDividends` / `getOwnership`, all returning
  `{ data, warnings, rateLimited }` so a partial or rate-limited response
  degrades gracefully instead of crashing or being silently swallowed.
  `AlphaVantageProvider` implements it against the real, genuinely-free
  [Alpha Vantage API](https://www.alphavantage.co/support/#api-key) — tested
  live against IBM in development, including a run where the DIVIDENDS
  sub-call got a demo-key throttling notice while the quote and fundamentals
  calls still succeeded, and the row still built correctly with that one gap
  surfaced as a warning. Reachable from `/admin/import` → "2. Or fetch one
  stock live". Known, honestly-surfaced limits:
  - NSE isn't supported directly; BSE-listed symbols work with a `.BSE`
    suffix (e.g. `RELIANCE.BSE`).
  - Free tier is ~25 requests/day, 5/minute — this adapter fetches one
    symbol at a time and does not batch or retry aggressively.
  - `OVERVIEW` (fundamentals) coverage for Indian symbols is inconsistent;
    many BSE tickers return nothing, surfaced as a warning rather than a
    guess. ROCE, cash flow, and CAGR fields specifically aren't available
    from this provider at all — the API key is server-only
    (`ALPHA_VANTAGE_API_KEY`, see `.env.example`), read only inside the
    `/api/market-data/fetch` route handler, never in client code.
  - **`getOwnership` always returns null data.** No global market-data API
    tracks Indian shareholding-pattern data (promoter holding/pledge,
    FII/DII split) — that has to come from NSE/BSE disclosures or CSV import.
  - A live fetch is normalized into the exact same `CompanySnapshotRow`
    shape the CSV pipeline produces (`src/lib/providers/normalize.ts`), so
    everything downstream — validation, scoring, the Fundamental Scanner —
    treats a live-fetched stock and a CSV-imported one identically.

## Supabase persistence (optional)

By default the app persists everything to `localStorage` and needs zero
setup. Setting the Supabase env vars switches the **entire app** — portfolio,
watchlist, thesis notes, allocation settings, and imported stocks — over to
real Postgres persistence with email/password auth, without any page needing
to know which backend is active (`usePortfolio()` / `useImportedData()` stay
the same either way; see `src/lib/store/portfolioContext.ts` and
`importedContext.ts`).

**Setup:**
1. Create a free project at [supabase.com/dashboard](https://supabase.com/dashboard).
2. Copy `.env.example` to `.env.local` and fill in the Supabase block: the
   Project URL and anon/publishable key (Project Settings → Data API), the
   secret/service_role key (Project Settings → API Keys — server-only, keep
   this private), and a Postgres connection string for migrations (Project
   Settings → Database → Connection string → URI).
3. Run `npm run migrate` — applies `supabase/migrations/0001_init.sql`
   directly over that connection string (no Supabase CLI or Docker needed;
   see `scripts/migrate.mjs`).
4. Restart `npm run dev`. A "Sign in" link appears in the nav; sign up and
   your portfolio/watchlist/imports now sync across devices.

**Schema design notes** (`supabase/migrations/0001_init.sql`):
- Two data domains, mirroring section 38 ("stock market data can be shared
  globally"): `companies` + its related tables (fundamentals, valuation,
  dividends, ownership, governance flags, technicals) are **publicly
  readable by anyone**, writable only by signed-in users, and track a
  `created_by` column so "remove"/"clear all" in the app — and matching
  row-level-security policies — only ever touch a user's own imports, never
  another visitor's. `portfolio_holdings` / `transactions` / `watchlist` /
  `thesis_notes` / `allocation_settings` are private, RLS-scoped to
  `auth.uid()`.
- `companies.id` is a plain **text** id matching the app's in-memory scheme
  (e.g. `imported-reliance`), not an auto-generated uuid — and per-user
  tables reference `company_id` as free text with **no foreign key**,
  deliberately: demo stocks (e.g. `nimbus-tech`) are synthetic and never
  written to Supabase, so a user has to be able to hold or watch one without
  it existing in the `companies` table at all.
- The demo-data generator never touches Supabase — it stays exactly as
  described above, in-memory and synthetic, on every deployment.
- Verified against a real Supabase project during development: sign-up,
  buying a demo stock into the portfolio, CSV-importing a real company,
  confirming both wrote correctly (checked directly via `psql`-equivalent
  queries), reloading in a fresh tab to confirm the session and data
  persisted, and confirming a signed-out visitor can still read the shared
  imported universe but not write to it.

## What's not built yet

Per the spec's own phasing (section 65), these are intentionally deferred:

- Scheduled/batch ingestion across the full stock universe (section 33/61) —
  today's provider adapter fetches one symbol at a time, on demand.
- A second `MarketDataProvider` implementation (e.g. Twelve Data) — the
  interface is provider-agnostic by design, but only Alpha Vantage is wired
  up so far.
- Alerts, benchmarking (XIRR vs NIFTY), and performance attribution
  (Phases 4, 5).

The `Company`/`Fundamentals`/`Valuation`/etc. shapes in `src/lib/types.ts`
mirror the spec's table schema closely enough to generate a real Postgres
schema from later.

## Stack

Next.js (App Router) + React + TypeScript + Tailwind CSS, no external chart
library (a small inline-SVG line chart in `src/components/charts/`) to keep
the MVP dependency-free — swap in TradingView Lightweight Charts later if
needed. Optional: `@supabase/supabase-js` + `@supabase/ssr` for persistence
and auth, `pg` (dev-only) to run migrations without needing the Supabase CLI
or Docker installed.
