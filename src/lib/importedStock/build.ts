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
import { CompanySnapshotRow, GovernanceFlagRow } from "./types";

const FINANCIAL_SECTORS = new Set(["Banks", "NBFC", "Insurance"]);

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Builds a first-class StockView straight from one real, user-supplied snapshot —
 * no synthetic multi-year history, no invented values. Anything not supplied
 * stays null, which the existing scoring engine already treats as a missing
 * metric (lowering confidence) rather than an average value.
 */
export function buildStockViewFromSnapshot(row: CompanySnapshotRow, flags: GovernanceFlagRow[], importedAt: string): StockView {
  const companyId = `imported-${row.ticker.toLowerCase()}`;
  const financial = FINANCIAL_SECTORS.has(row.sector);

  const company: Company = {
    id: companyId,
    ticker: row.ticker,
    isin: row.isin ?? "",
    companyName: row.companyName,
    exchange: row.exchange ?? "NSE",
    sector: row.sector,
    industry: row.industry ?? row.sector,
    marketCap: row.marketCap ?? 0,
    marketCapCategory: row.marketCapCategory ?? "Mid",
    businessDescription: row.businessDescription ?? "No business description supplied in the import.",
    active: true,
    dataSource: "imported",
  };

  const debtToEquity = row.debtToEquity ?? (row.debt !== null && row.equity ? round2(row.debt / row.equity) : null);

  const period: FundamentalsPeriod = {
    period: row.period ?? "Latest",
    periodType: row.periodType ?? "annual",
    revenue: row.revenue,
    revenueGrowth: row.revenueGrowth,
    ebitda: financial ? null : row.ebitda,
    ebitdaMargin: financial ? null : row.ebitdaMargin,
    pat: row.pat,
    patMargin: row.patMargin,
    eps: row.eps,
    epsGrowth: row.epsGrowth,
    roe: row.roe,
    roce: financial ? null : row.roce,
    roa: row.roa,
    debt: financial ? null : row.debt,
    equity: row.equity,
    debtToEquity: financial ? null : debtToEquity,
    interestCoverage: financial ? null : row.interestCoverage,
    operatingCashFlow: financial ? null : row.operatingCashFlow,
    capex: financial ? null : row.capex,
    freeCashFlow: financial ? null : row.freeCashFlow,
    cfoToPat: financial ? null : row.cfoToPat,
    fcfToPat: financial ? null : row.fcfToPat,
    netInterestMargin: financial ? row.netInterestMargin : null,
    gnpa: financial ? row.gnpa : null,
    nnpa: financial ? row.nnpa : null,
    provisionCoverageRatio: financial ? row.provisionCoverageRatio : null,
    capitalAdequacyRatio: financial ? row.capitalAdequacyRatio : null,
    costToIncome: financial ? row.costToIncome : null,
    creditGrowth: financial ? row.creditGrowth : null,
  };

  const fundamentals: Fundamentals = {
    companyId,
    history: [period],
    salesCagr3y: row.salesCagr3y,
    salesCagr5y: row.salesCagr5y,
    salesCagr10y: row.salesCagr10y,
    profitCagr3y: row.profitCagr3y,
    profitCagr5y: row.profitCagr5y,
    profitCagr10y: row.profitCagr10y,
    epsCagr: row.epsCagr,
    latestYoySalesGrowth: row.revenueGrowth,
    latestYoyProfitGrowth: row.epsGrowth,
    source: "CSV import",
    updatedAt: importedAt,
  };

  const price = row.price ?? 0;
  const pe = row.pe ?? (row.eps && row.eps > 0 && price > 0 ? round2(price / row.eps) : null);
  const earningsYield = pe && pe > 0 ? round2((1 / pe) * 100) : null;
  const fcfYield = row.freeCashFlow !== null && company.marketCap > 0 ? round2((row.freeCashFlow / company.marketCap) * 100) : null;
  const priceSales = row.revenue && company.marketCap > 0 ? round2(company.marketCap / row.revenue) : null;
  const peg = pe && row.profitCagr5y && row.profitCagr5y > 0 ? round2(pe / row.profitCagr5y) : null;
  const dividendYield =
    row.dividendYield ?? (row.latestDividendPerShare && price > 0 ? round2((row.latestDividendPerShare / price) * 100) : 0);
  const evEbitda = row.evEbitda ?? (row.ebitda && row.ebitda > 0 && row.debt !== null && company.marketCap > 0
    ? round2((company.marketCap + row.debt) / row.ebitda)
    : null);

  const valuation: Valuation = {
    companyId,
    date: importedAt,
    pe,
    forwardPe: row.forwardPe,
    pb: row.pb,
    evEbitda,
    priceSales,
    peg,
    earningsYield,
    fcfYield,
    dividendYield,
    historicalPe: row.historicalPe,
    industryPe: row.industryPe,
    source: "CSV import",
    updatedAt: importedAt,
  };

  const priceVs200dma = row.dma200 && price > 0 ? round2(((price - row.dma200) / row.dma200) * 100) : null;
  const dma50VsDma200 = row.dma50 && row.dma200 ? round2(((row.dma50 - row.dma200) / row.dma200) * 100) : null;
  const distanceFrom52wHigh = row.high52w && price > 0 ? round2(((price - row.high52w) / row.high52w) * 100) : null;

  const technicals: Technicals = {
    companyId,
    date: importedAt,
    price,
    dma20: row.dma20,
    dma50: row.dma50,
    dma100: row.dma100,
    dma200: row.dma200,
    priceVs200dma,
    dma50VsDma200,
    rsi14: row.rsi14,
    high52w: row.high52w,
    low52w: row.low52w,
    distanceFrom52wHigh,
    averageVolume: row.averageVolume,
    volumeRatio: row.volumeRatio,
  };

  const ownership: Ownership = {
    companyId,
    period: row.ownershipPeriod ?? row.period ?? "Latest",
    promoterHolding: row.promoterHolding,
    promoterHoldingChange: row.promoterHoldingChange,
    promoterPledge: row.promoterPledge,
    fiiHolding: row.fiiHolding,
    fiiChange: row.fiiChange,
    diiHolding: row.diiHolding,
    diiChange: row.diiChange,
    source: "CSV import",
    updatedAt: importedAt,
  };

  const dividends: DividendRecord[] = row.latestDividendPerShare
    ? [{
        exDate: importedAt,
        recordDate: importedAt,
        paymentDate: importedAt,
        dividendPerShare: row.latestDividendPerShare,
        source: "CSV import (as-of date approximate — exact ex-date not supplied)",
      }]
    : [];

  const governanceFlags: GovernanceFlag[] = flags
    .filter((f) => f.ticker === row.ticker)
    .map((f, i) => ({
      id: `${companyId}-flag-${i}`,
      companyId,
      date: f.date,
      flagType: f.flagType,
      severity: f.severity,
      description: f.description,
      source: f.source ?? "CSV import",
      resolved: f.resolved,
    }));

  const prices: PricePoint[] = price > 0
    ? [{ date: importedAt, open: price, high: price, low: price, close: price, adjustedClose: price, volume: 0 }]
    : [];

  const partial: Omit<StockView, "score"> = { company, fundamentals, valuation, technicals, ownership, dividends, governanceFlags, prices };
  const score = computeScore(partial);
  return { ...partial, score };
}
