-- Indian Stock Portfolio Builder — initial schema (section 9 of the spec).
--
-- Two data domains:
--  - "Shared" company data (companies, fundamentals, valuation, dividends,
--    ownership, governance flags, technicals) is readable by anyone, per
--    section 38 ("Stock market data can be shared globally"), and writable
--    only by signed-in users (this is where CSV import / live-fetch import
--    write to). The in-memory demo generator never touches these tables —
--    demo data stays synthetic and ephemeral by design.
--  - Per-user data (portfolio holdings, transactions, watchlist, thesis
--    notes, allocation settings) is private, enforced by row-level security
--    scoped to auth.uid().

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Shared company data
-- ---------------------------------------------------------------------------

create table companies (
  -- Matches the app's in-memory id scheme exactly (e.g. "imported-reliance"),
  -- so a Supabase-backed company and its in-memory StockView share one id
  -- space with the demo companies (which are never written here).
  id text primary key,
  ticker text not null unique,
  isin text,
  company_name text not null,
  exchange text not null check (exchange in ('NSE', 'BSE')),
  sector text not null,
  industry text,
  market_cap numeric,
  market_cap_category text check (market_cap_category in ('Large', 'Mid', 'Small')),
  business_description text,
  active boolean not null default true,
  -- Tracks who imported this company so "remove"/"clear all" in the app only
  -- ever touches a user's own imports, even though the table itself is
  -- readable by everyone (section 38 — market data is shared globally).
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table fundamentals_periods (
  id uuid primary key default gen_random_uuid(),
  company_id text not null references companies(id) on delete cascade,
  period text not null,
  period_type text not null check (period_type in ('annual', 'quarterly')),
  revenue numeric,
  revenue_growth numeric,
  ebitda numeric,
  ebitda_margin numeric,
  pat numeric,
  pat_margin numeric,
  eps numeric,
  eps_growth numeric,
  roe numeric,
  roce numeric,
  roa numeric,
  debt numeric,
  equity numeric,
  debt_to_equity numeric,
  interest_coverage numeric,
  operating_cash_flow numeric,
  capex numeric,
  free_cash_flow numeric,
  cfo_to_pat numeric,
  fcf_to_pat numeric,
  net_interest_margin numeric,
  gnpa numeric,
  nnpa numeric,
  provision_coverage_ratio numeric,
  capital_adequacy_ratio numeric,
  cost_to_income numeric,
  credit_growth numeric,
  source text,
  updated_at timestamptz not null default now(),
  unique (company_id, period, period_type)
);

create table fundamentals_summary (
  company_id text primary key references companies(id) on delete cascade,
  sales_cagr_3y numeric,
  sales_cagr_5y numeric,
  sales_cagr_10y numeric,
  profit_cagr_3y numeric,
  profit_cagr_5y numeric,
  profit_cagr_10y numeric,
  eps_cagr numeric,
  latest_yoy_sales_growth numeric,
  latest_yoy_profit_growth numeric,
  source text,
  updated_at timestamptz not null default now()
);

create table valuation (
  company_id text primary key references companies(id) on delete cascade,
  date date not null default current_date,
  pe numeric,
  forward_pe numeric,
  pb numeric,
  ev_ebitda numeric,
  price_sales numeric,
  peg numeric,
  earnings_yield numeric,
  fcf_yield numeric,
  dividend_yield numeric not null default 0,
  historical_pe numeric,
  industry_pe numeric,
  source text,
  updated_at timestamptz not null default now()
);

create table dividends (
  id uuid primary key default gen_random_uuid(),
  company_id text not null references companies(id) on delete cascade,
  ex_date date not null,
  record_date date,
  payment_date date,
  dividend_per_share numeric not null,
  source text
);

create table ownership (
  company_id text primary key references companies(id) on delete cascade,
  period text,
  promoter_holding numeric,
  promoter_holding_change numeric,
  promoter_pledge numeric,
  fii_holding numeric,
  fii_change numeric,
  dii_holding numeric,
  dii_change numeric,
  source text,
  updated_at timestamptz not null default now()
);

create table governance_flags (
  id uuid primary key default gen_random_uuid(),
  company_id text not null references companies(id) on delete cascade,
  date date not null,
  flag_type text not null,
  severity text not null check (severity in ('low', 'medium', 'high')),
  description text not null,
  source text,
  resolved boolean not null default false
);

create table technicals (
  company_id text primary key references companies(id) on delete cascade,
  date date not null default current_date,
  price numeric not null,
  dma20 numeric,
  dma50 numeric,
  dma100 numeric,
  dma200 numeric,
  price_vs_200dma numeric,
  dma50_vs_dma200 numeric,
  rsi14 numeric,
  high_52w numeric,
  low_52w numeric,
  distance_from_52w_high numeric,
  average_volume numeric,
  volume_ratio numeric
);

-- ---------------------------------------------------------------------------
-- Per-user data
-- ---------------------------------------------------------------------------

-- Note: company_id here is the app's internal company id (e.g. "nimbus-tech"
-- for a demo stock, or "imported-reliance" for one from the shared companies
-- table below) — deliberately NOT a foreign key. Demo stocks are synthetic
-- and never written to the companies table, so a user must be able to hold
-- or watch one without it existing there; the app resolves display details
-- by looking company_id up against its current in-memory + Supabase universe.
create table portfolio_holdings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company_id text not null,
  category text not null check (category in ('Growth', 'Value', 'Dividend', 'Opportunity')),
  shares numeric not null,
  average_buy_price numeric not null,
  invested_amount numeric not null,
  target_allocation numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, company_id)
);

create table transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company_id text not null,
  transaction_type text not null check (transaction_type in ('BUY', 'SELL', 'DIVIDEND')),
  date date not null,
  shares numeric not null,
  price numeric not null,
  fees numeric not null default 0,
  taxes numeric not null default 0,
  amount numeric not null,
  created_at timestamptz not null default now()
);

create table watchlist (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company_id text not null,
  target_price numeric,
  target_score numeric,
  notes text not null default '',
  created_at timestamptz not null default now(),
  unique (user_id, company_id)
);

create table thesis_notes (
  user_id uuid not null references auth.users(id) on delete cascade,
  company_id text not null,
  why_i_bought text not null default '',
  what_i_expect text not null default '',
  what_could_go_wrong text not null default '',
  what_would_make_me_sell text not null default '',
  last_reviewed date,
  primary key (user_id, company_id)
);

create table allocation_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  capital numeric not null default 50000,
  growth_pct numeric not null default 40,
  value_pct numeric not null default 35,
  dividend_pct numeric not null default 20,
  opportunity_pct numeric not null default 5,
  max_positions int not null default 10,
  tranches int not null default 8,
  max_sector_exposure_pct numeric not null default 30,
  max_single_stock_large numeric not null default 15,
  max_single_stock_mid numeric not null default 10,
  max_single_stock_small numeric not null default 5,
  max_single_stock_opportunity numeric not null default 5,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------

alter table companies enable row level security;
alter table fundamentals_periods enable row level security;
alter table fundamentals_summary enable row level security;
alter table valuation enable row level security;
alter table dividends enable row level security;
alter table ownership enable row level security;
alter table governance_flags enable row level security;
alter table technicals enable row level security;
alter table portfolio_holdings enable row level security;
alter table transactions enable row level security;
alter table watchlist enable row level security;
alter table thesis_notes enable row level security;
alter table allocation_settings enable row level security;

-- Shared company data: anyone can read (including anonymous visitors),
-- only signed-in users can write (CSV / live-fetch import).
create policy "companies readable by anyone" on companies for select using (true);
create policy "companies insertable by authenticated users" on companies for insert
  to authenticated with check (true);
create policy "companies updatable by authenticated users" on companies for update
  to authenticated using (true) with check (true);
create policy "companies deletable by owner" on companies for delete
  to authenticated using (created_by = auth.uid());

create policy "fundamentals_periods readable by anyone" on fundamentals_periods for select using (true);
create policy "fundamentals_periods writable by authenticated users" on fundamentals_periods for all
  to authenticated using (true) with check (true);

create policy "fundamentals_summary readable by anyone" on fundamentals_summary for select using (true);
create policy "fundamentals_summary writable by authenticated users" on fundamentals_summary for all
  to authenticated using (true) with check (true);

create policy "valuation readable by anyone" on valuation for select using (true);
create policy "valuation writable by authenticated users" on valuation for all
  to authenticated using (true) with check (true);

create policy "dividends readable by anyone" on dividends for select using (true);
create policy "dividends writable by authenticated users" on dividends for all
  to authenticated using (true) with check (true);

create policy "ownership readable by anyone" on ownership for select using (true);
create policy "ownership writable by authenticated users" on ownership for all
  to authenticated using (true) with check (true);

create policy "governance_flags readable by anyone" on governance_flags for select using (true);
create policy "governance_flags writable by authenticated users" on governance_flags for all
  to authenticated using (true) with check (true);

create policy "technicals readable by anyone" on technicals for select using (true);
create policy "technicals writable by authenticated users" on technicals for all
  to authenticated using (true) with check (true);

-- Per-user data: strictly scoped to the owning user.
create policy "own holdings" on portfolio_holdings for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own transactions" on transactions for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own watchlist" on watchlist for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own thesis notes" on thesis_notes for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own allocation settings" on allocation_settings for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
