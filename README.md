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
- **Real, free EOD prices/technicals via NSE's official bhavcopy archive**
  (`src/lib/providers/nseBhavcopy.ts`, "Refresh live prices (NSE)" on
  `/admin/import`) — deliberately *not* a scraper. NSE publishes a full-market
  CSV per trading day at a public archive URL, meant for bulk download, not a
  rendered page or an internal API; this is the same source most open-source
  Indian market tools use. The build spec this app follows explicitly says
  "never scrape a website merely because it displays public information if
  automated use is not permitted" (section 62) — that line is why fundamentals
  aggregators (screener.in, moneycontrol, Trendlyne, all of which prohibit
  scraping in their terms) were never touched, while this official archive was.
  - Walks backward from today downloading one whole-market file per trading
    day (skipping weekends/holidays automatically — a 404 just means try the
    previous day) and extracts every currently-imported ticker from each file
    in the same pass, so the request count depends only on how many days of
    history are requested, never on how many stocks you have imported.
  - Computes real DMA20/DMA50/RSI14/volume ratio from up to 60 real trading
    days (~50s budget, safely inside Vercel's serverless limit). Deliberately
    does **not** populate DMA100/DMA200/52-week high-low from a 60-day
    window — those stay `null` (and show "N/A") rather than being faked from
    insufficient history, exactly like everywhere else in this app.
  - NSE-listed equities only (a `.BSE` suffix is stripped and won't match).
  - Verified live in development: imported RELIANCE and TCS via CSV with
    placeholder prices, ran the refresh, and watched real NSE closing prices,
    60 real trading days, and real RSI/DMA values come back and update both
    scores accordingly (also caught and fixed a display bug this surfaced:
    a 52-week range rendered literally as "₹null – ₹null" when the two
    fields were legitimately unavailable — now shows "N/A").
  - **Runs automatically, too**: `vercel.json` schedules
    `/api/cron/refresh-prices` once daily on weekdays (13:00 UTC / 18:30 IST,
    after NSE bhavcopy is published). It refreshes every NSE-listed company
    already in Supabase — no manual clicking required once you've imported a
    stock. Requires Supabase (there'd be nothing server-side to iterate over
    otherwise) and a `CRON_SECRET` env var, which Vercel automatically sends
    as `Authorization: Bearer <value>` on the scheduled call — verified
    locally by calling the route with and without the correct header before
    wiring it into Vercel. The manual "Refresh live prices (NSE)" button on
    `/admin/import` still exists for on-demand refreshes (and is the only
    option in localStorage-only mode, where there's no server-side company
    list for a cron job to iterate over).

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

## Deployment

Deployed on Vercel, connected to this GitHub repo — every push to `main`
auto-deploys to production. `vercel.json` also configures the scheduled
price-refresh cron (see [Real, free EOD prices/technicals](#whats-implemented)
above). Production env vars (`NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
`ALPHA_VANTAGE_API_KEY`, `CRON_SECRET`) are set directly on the Vercel
project, not committed anywhere.

## Stack

Next.js (App Router) + React + TypeScript + Tailwind CSS, no external chart
library (a small inline-SVG line chart in `src/components/charts/`) to keep
the MVP dependency-free — swap in TradingView Lightweight Charts later if
needed. Optional: `@supabase/supabase-js` + `@supabase/ssr` for persistence
and auth, `pg` (dev-only) to run migrations without needing the Supabase CLI
or Docker installed.
