import {
  Company,
  DividendRecord,
  Fundamentals,
  FundamentalsPeriod,
  GovernanceFlag,
  Ownership,
  PricePoint,
  StockView,
  Technicals,
  Valuation,
} from "@/lib/types";
import { computeScore } from "@/lib/scoring";

/** PostgREST embeds a to-one relation as an object when it can prove uniqueness, but
 *  returns a single-element array in some client/query shapes — normalize both. */
function one<T>(v: T | T[] | null | undefined): T | null {
  if (v === null || v === undefined) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

function num(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/**
 * Maps one row from the nested Supabase query in supabaseImportedProvider.tsx
 * (companies + fundamentals_periods + fundamentals_summary + valuation +
 * ownership + dividends + governance_flags + technicals) into a first-class
 * StockView, run through the same real scoring engine as every other stock.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function stockViewFromSupabaseRow(row: any): StockView {
  const companyId = row.id as string;

  const company: Company = {
    id: companyId,
    ticker: row.ticker,
    isin: row.isin ?? "",
    companyName: row.company_name,
    exchange: row.exchange,
    sector: row.sector,
    industry: row.industry ?? row.sector,
    marketCap: num(row.market_cap) ?? 0,
    marketCapCategory: row.market_cap_category ?? "Mid",
    businessDescription: row.business_description ?? "No business description supplied in the import.",
    active: row.active,
    dataSource: "imported",
  };

  const periodsRaw: Record<string, unknown>[] = Array.isArray(row.fundamentals_periods) ? row.fundamentals_periods : [];
  const history: FundamentalsPeriod[] = periodsRaw.length > 0
    ? periodsRaw.map((p) => ({
        period: p.period as string,
        periodType: p.period_type as "annual" | "quarterly",
        revenue: num(p.revenue), revenueGrowth: num(p.revenue_growth), ebitda: num(p.ebitda), ebitdaMargin: num(p.ebitda_margin),
        pat: num(p.pat), patMargin: num(p.pat_margin), eps: num(p.eps), epsGrowth: num(p.eps_growth),
        roe: num(p.roe), roce: num(p.roce), roa: num(p.roa),
        debt: num(p.debt), equity: num(p.equity), debtToEquity: num(p.debt_to_equity), interestCoverage: num(p.interest_coverage),
        operatingCashFlow: num(p.operating_cash_flow), capex: num(p.capex), freeCashFlow: num(p.free_cash_flow),
        cfoToPat: num(p.cfo_to_pat), fcfToPat: num(p.fcf_to_pat),
        netInterestMargin: num(p.net_interest_margin), gnpa: num(p.gnpa), nnpa: num(p.nnpa),
        provisionCoverageRatio: num(p.provision_coverage_ratio), capitalAdequacyRatio: num(p.capital_adequacy_ratio),
        costToIncome: num(p.cost_to_income), creditGrowth: num(p.credit_growth),
      }))
    : [{
        period: "Latest", periodType: "annual",
        revenue: null, revenueGrowth: null, ebitda: null, ebitdaMargin: null, pat: null, patMargin: null,
        eps: null, epsGrowth: null, roe: null, roce: null, roa: null, debt: null, equity: null, debtToEquity: null,
        interestCoverage: null, operatingCashFlow: null, capex: null, freeCashFlow: null, cfoToPat: null, fcfToPat: null,
        netInterestMargin: null, gnpa: null, nnpa: null, provisionCoverageRatio: null, capitalAdequacyRatio: null,
        costToIncome: null, creditGrowth: null,
      }];

  const summary = one<Record<string, unknown>>(row.fundamentals_summary);
  const fundamentals: Fundamentals = {
    companyId,
    history,
    salesCagr3y: num(summary?.sales_cagr_3y), salesCagr5y: num(summary?.sales_cagr_5y), salesCagr10y: num(summary?.sales_cagr_10y),
    profitCagr3y: num(summary?.profit_cagr_3y), profitCagr5y: num(summary?.profit_cagr_5y), profitCagr10y: num(summary?.profit_cagr_10y),
    epsCagr: num(summary?.eps_cagr),
    latestYoySalesGrowth: history[0]?.revenueGrowth ?? null,
    latestYoyProfitGrowth: history[0]?.epsGrowth ?? null,
    source: (summary?.source as string) ?? "Supabase",
    updatedAt: (summary?.updated_at as string) ?? row.updated_at,
  };

  const v = one<Record<string, unknown>>(row.valuation);
  const valuation: Valuation = {
    companyId,
    date: (v?.date as string) ?? new Date().toISOString().slice(0, 10),
    pe: num(v?.pe), forwardPe: num(v?.forward_pe), pb: num(v?.pb), evEbitda: num(v?.ev_ebitda), priceSales: num(v?.price_sales),
    peg: num(v?.peg), earningsYield: num(v?.earnings_yield), fcfYield: num(v?.fcf_yield), dividendYield: num(v?.dividend_yield) ?? 0,
    historicalPe: num(v?.historical_pe), industryPe: num(v?.industry_pe),
    source: (v?.source as string) ?? "Supabase", updatedAt: (v?.updated_at as string) ?? row.updated_at,
  };

  const t = one<Record<string, unknown>>(row.technicals);
  const price = num(t?.price) ?? 0;
  const technicals: Technicals = {
    companyId,
    date: (t?.date as string) ?? new Date().toISOString().slice(0, 10),
    price,
    dma20: num(t?.dma20), dma50: num(t?.dma50), dma100: num(t?.dma100), dma200: num(t?.dma200),
    priceVs200dma: num(t?.price_vs_200dma), dma50VsDma200: num(t?.dma50_vs_dma200), rsi14: num(t?.rsi14),
    high52w: num(t?.high_52w), low52w: num(t?.low_52w), distanceFrom52wHigh: num(t?.distance_from_52w_high),
    averageVolume: num(t?.average_volume), volumeRatio: num(t?.volume_ratio),
  };

  const o = one<Record<string, unknown>>(row.ownership);
  const ownership: Ownership = {
    companyId,
    period: (o?.period as string) ?? null,
    promoterHolding: num(o?.promoter_holding), promoterHoldingChange: num(o?.promoter_holding_change), promoterPledge: num(o?.promoter_pledge),
    fiiHolding: num(o?.fii_holding), fiiChange: num(o?.fii_change), diiHolding: num(o?.dii_holding), diiChange: num(o?.dii_change),
    source: (o?.source as string) ?? "Supabase", updatedAt: (o?.updated_at as string) ?? row.updated_at,
  };

  const dividendsRaw: Record<string, unknown>[] = Array.isArray(row.dividends) ? row.dividends : [];
  const dividends: DividendRecord[] = dividendsRaw
    .map((d) => ({
      exDate: d.ex_date as string,
      recordDate: (d.record_date as string) ?? (d.ex_date as string),
      paymentDate: (d.payment_date as string) ?? (d.ex_date as string),
      dividendPerShare: num(d.dividend_per_share) ?? 0,
      source: (d.source as string) ?? "Supabase",
    }))
    .sort((a, b) => b.exDate.localeCompare(a.exDate));

  const flagsRaw: Record<string, unknown>[] = Array.isArray(row.governance_flags) ? row.governance_flags : [];
  const governanceFlags: GovernanceFlag[] = flagsRaw.map((f) => ({
    id: f.id as string,
    companyId,
    date: f.date as string,
    flagType: f.flag_type as string,
    severity: f.severity as GovernanceFlag["severity"],
    description: f.description as string,
    source: (f.source as string) ?? "Supabase",
    resolved: Boolean(f.resolved),
  }));

  const prices: PricePoint[] = price > 0
    ? [{ date: technicals.date, open: price, high: price, low: price, close: price, adjustedClose: price, volume: 0 }]
    : [];

  const partial: Omit<StockView, "score"> = { company, fundamentals, valuation, technicals, ownership, dividends, governanceFlags, prices };
  return { ...partial, score: computeScore(partial) };
}
