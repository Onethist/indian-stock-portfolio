import type { SupabaseClient } from "@supabase/supabase-js";
import { CompanySnapshotRow, GovernanceFlagRow } from "./types";

/** Upserts one CSV/live-fetch snapshot across the shared Supabase tables. Mirrors buildStockViewFromSnapshot's
 *  field mapping exactly, just as SQL writes instead of an in-memory StockView. */
export async function upsertSnapshotToSupabase(supabase: SupabaseClient, row: CompanySnapshotRow, userId: string): Promise<string> {
  const companyId = `imported-${row.ticker.toLowerCase()}`;
  const now = new Date().toISOString();

  const { error: companyError } = await supabase.from("companies").upsert(
    {
      id: companyId,
      ticker: row.ticker,
      isin: row.isin,
      company_name: row.companyName,
      exchange: row.exchange ?? "NSE",
      sector: row.sector,
      industry: row.industry,
      market_cap: row.marketCap,
      market_cap_category: row.marketCapCategory,
      business_description: row.businessDescription,
      active: true,
      created_by: userId,
      updated_at: now,
    },
    { onConflict: "id" }
  );
  if (companyError) throw companyError;

  await supabase.from("fundamentals_periods").upsert(
    {
      company_id: companyId,
      period: row.period ?? "Latest",
      period_type: row.periodType ?? "annual",
      revenue: row.revenue, revenue_growth: row.revenueGrowth, ebitda: row.ebitda, ebitda_margin: row.ebitdaMargin,
      pat: row.pat, pat_margin: row.patMargin, eps: row.eps, eps_growth: row.epsGrowth,
      roe: row.roe, roce: row.roce, roa: row.roa,
      debt: row.debt, equity: row.equity, debt_to_equity: row.debtToEquity, interest_coverage: row.interestCoverage,
      operating_cash_flow: row.operatingCashFlow, capex: row.capex, free_cash_flow: row.freeCashFlow,
      cfo_to_pat: row.cfoToPat, fcf_to_pat: row.fcfToPat,
      net_interest_margin: row.netInterestMargin, gnpa: row.gnpa, nnpa: row.nnpa,
      provision_coverage_ratio: row.provisionCoverageRatio, capital_adequacy_ratio: row.capitalAdequacyRatio,
      cost_to_income: row.costToIncome, credit_growth: row.creditGrowth,
      source: "CSV/live import", updated_at: now,
    },
    { onConflict: "company_id,period,period_type" }
  );

  await supabase.from("fundamentals_summary").upsert(
    {
      company_id: companyId,
      sales_cagr_3y: row.salesCagr3y, sales_cagr_5y: row.salesCagr5y, sales_cagr_10y: row.salesCagr10y,
      profit_cagr_3y: row.profitCagr3y, profit_cagr_5y: row.profitCagr5y, profit_cagr_10y: row.profitCagr10y,
      eps_cagr: row.epsCagr, source: "CSV/live import", updated_at: now,
    },
    { onConflict: "company_id" }
  );

  const price = row.price ?? 0;
  const pe = row.pe ?? (row.eps && row.eps > 0 && price > 0 ? round2(price / row.eps) : null);
  const marketCap = row.marketCap ?? 0;
  const fcfYield = row.freeCashFlow !== null && marketCap > 0 ? round2((row.freeCashFlow / marketCap) * 100) : null;
  const priceSales = row.revenue && marketCap > 0 ? round2(marketCap / row.revenue) : null;
  const peg = pe && row.profitCagr5y && row.profitCagr5y > 0 ? round2(pe / row.profitCagr5y) : null;
  const dividendYield = row.dividendYield ?? (row.latestDividendPerShare && price > 0 ? round2((row.latestDividendPerShare / price) * 100) : 0);
  const evEbitda = row.evEbitda ?? (row.ebitda && row.ebitda > 0 && row.debt !== null && marketCap > 0 ? round2((marketCap + row.debt) / row.ebitda) : null);

  await supabase.from("valuation").upsert(
    {
      company_id: companyId, date: now.slice(0, 10),
      pe, forward_pe: row.forwardPe, pb: row.pb, ev_ebitda: evEbitda, price_sales: priceSales, peg,
      earnings_yield: pe && pe > 0 ? round2((1 / pe) * 100) : null, fcf_yield: fcfYield, dividend_yield: dividendYield,
      historical_pe: row.historicalPe, industry_pe: row.industryPe, source: "CSV/live import", updated_at: now,
    },
    { onConflict: "company_id" }
  );

  await supabase.from("ownership").upsert(
    {
      company_id: companyId, period: row.ownershipPeriod ?? row.period ?? "Latest",
      promoter_holding: row.promoterHolding, promoter_holding_change: row.promoterHoldingChange, promoter_pledge: row.promoterPledge,
      fii_holding: row.fiiHolding, fii_change: row.fiiChange, dii_holding: row.diiHolding, dii_change: row.diiChange,
      source: "CSV/live import", updated_at: now,
    },
    { onConflict: "company_id" }
  );

  if (price > 0) {
    const priceVs200dma = row.dma200 ? round2(((price - row.dma200) / row.dma200) * 100) : null;
    const dma50VsDma200 = row.dma50 && row.dma200 ? round2(((row.dma50 - row.dma200) / row.dma200) * 100) : null;
    const distanceFrom52wHigh = row.high52w ? round2(((price - row.high52w) / row.high52w) * 100) : null;
    await supabase.from("technicals").upsert(
      {
        company_id: companyId, date: now.slice(0, 10), price,
        dma20: row.dma20, dma50: row.dma50, dma100: row.dma100, dma200: row.dma200,
        price_vs_200dma: priceVs200dma, dma50_vs_dma200: dma50VsDma200, rsi14: row.rsi14,
        high_52w: row.high52w, low_52w: row.low52w, distance_from_52w_high: distanceFrom52wHigh,
        average_volume: row.averageVolume, volume_ratio: row.volumeRatio,
      },
      { onConflict: "company_id" }
    );
  }

  if (row.latestDividendPerShare) {
    await supabase.from("dividends").insert({
      company_id: companyId,
      ex_date: now.slice(0, 10),
      dividend_per_share: row.latestDividendPerShare,
      source: "CSV/live import (as-of date approximate)",
    });
  }

  return companyId;
}

export async function insertGovernanceFlagsToSupabase(supabase: SupabaseClient, rows: GovernanceFlagRow[]): Promise<void> {
  for (const f of rows) {
    const { data: company } = await supabase.from("companies").select("id").eq("ticker", f.ticker).maybeSingle();
    if (!company) continue; // ticker not found — nothing to attach the flag to
    await supabase.from("governance_flags").insert({
      company_id: company.id,
      date: f.date,
      flag_type: f.flagType,
      severity: f.severity,
      description: f.description,
      source: f.source,
      resolved: f.resolved,
    });
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
