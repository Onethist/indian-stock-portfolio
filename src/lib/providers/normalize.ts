import { Sector } from "@/lib/types";
import { CompanySnapshotRow } from "@/lib/importedStock/types";
import { ProviderDividendEvent, ProviderFundamentals, ProviderOwnership, ProviderQuote } from "./types";

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export interface NormalizeInput {
  ticker: string;
  sector: Sector; // the vendor's own sector label isn't trusted (see ProviderFundamentals) — the caller supplies ours
  quote: ProviderQuote | null;
  fundamentals: ProviderFundamentals | null;
  dividends: ProviderDividendEvent[] | null;
  ownership: ProviderOwnership | null;
}

/**
 * Maps raw provider output onto the exact same CompanySnapshotRow shape the
 * CSV import pipeline produces (src/lib/importedStock/types.ts), so a live
 * fetch and a CSV row are indistinguishable to everything downstream
 * (validation, scoring, the Fundamental Scanner). Anything the provider
 * didn't return stays null — never backfilled with a guess.
 */
export function normalizeToSnapshotRow(input: NormalizeInput, warnings: string[]): CompanySnapshotRow {
  const { ticker, sector, quote, fundamentals, dividends, ownership } = input;

  if (fundamentals?.currency && fundamentals.currency !== "INR" && fundamentals?.marketCap) {
    warnings.push(`Fundamentals currency reported as "${fundamentals.currency}", not INR — market cap and per-share figures may need manual conversion.`);
  }

  const marketCapCrore = fundamentals?.marketCap ? round2(fundamentals.marketCap / 1e7) : null;
  const latestDividend = dividends && dividends.length > 0 ? dividends[0].amount : fundamentals?.dividendPerShare ?? null;

  return {
    ticker: ticker.toUpperCase(),
    isin: null,
    companyName: fundamentals?.companyName ?? ticker,
    exchange: ticker.toUpperCase().endsWith(".BSE") ? "BSE" : "NSE",
    sector,
    industry: fundamentals?.providerIndustry ?? null,
    marketCap: marketCapCrore,
    marketCapCategory: null, // derived from marketCap by the existing validator if left blank
    businessDescription: null,
    price: quote?.price ?? null,

    period: "Latest (live fetch)",
    periodType: "annual",

    revenue: fundamentals?.revenueTTM ? round2(fundamentals.revenueTTM / 1e7) : null,
    revenueGrowth: fundamentals?.quarterlyRevenueGrowthYoY !== null && fundamentals?.quarterlyRevenueGrowthYoY !== undefined
      ? round2(fundamentals.quarterlyRevenueGrowthYoY * 100)
      : null,
    ebitda: null, // Alpha Vantage OVERVIEW doesn't report EBITDA directly for most symbols
    ebitdaMargin: fundamentals?.operatingMarginTTM !== null && fundamentals?.operatingMarginTTM !== undefined
      ? round2(fundamentals.operatingMarginTTM * 100)
      : null,
    pat: null,
    patMargin: fundamentals?.profitMargin !== null && fundamentals?.profitMargin !== undefined ? round2(fundamentals.profitMargin * 100) : null,
    eps: fundamentals?.eps ?? null,
    epsGrowth: fundamentals?.quarterlyEarningsGrowthYoY !== null && fundamentals?.quarterlyEarningsGrowthYoY !== undefined
      ? round2(fundamentals.quarterlyEarningsGrowthYoY * 100)
      : null,
    roe: fundamentals?.returnOnEquityTTM !== null && fundamentals?.returnOnEquityTTM !== undefined ? round2(fundamentals.returnOnEquityTTM * 100) : null,
    roce: null, // not reported by Alpha Vantage; would need EBIT + capital employed from financial statements
    roa: fundamentals?.returnOnAssetsTTM !== null && fundamentals?.returnOnAssetsTTM !== undefined ? round2(fundamentals.returnOnAssetsTTM * 100) : null,
    debt: null,
    equity: null,
    debtToEquity: null,
    interestCoverage: null,
    operatingCashFlow: null,
    capex: null,
    freeCashFlow: null,
    cfoToPat: null,
    fcfToPat: null,

    netInterestMargin: null,
    gnpa: null,
    nnpa: null,
    provisionCoverageRatio: null,
    capitalAdequacyRatio: null,
    costToIncome: null,
    creditGrowth: null,

    salesCagr3y: null,
    salesCagr5y: null,
    salesCagr10y: null,
    profitCagr3y: null,
    profitCagr5y: null,
    profitCagr10y: null,
    epsCagr: null,

    pe: fundamentals?.peRatio ?? null,
    forwardPe: null,
    pb: fundamentals?.bookValuePerShare && quote?.price ? round2(quote.price / fundamentals.bookValuePerShare) : null,
    evEbitda: null,
    priceSales: null,
    peg: fundamentals?.pegRatio ?? null,
    dividendYield: fundamentals?.dividendYield !== null && fundamentals?.dividendYield !== undefined ? round2(fundamentals.dividendYield * 100) : null,
    historicalPe: null,
    industryPe: null,

    promoterHolding: ownership?.promoterHolding ?? null,
    promoterHoldingChange: ownership?.promoterHoldingChange ?? null,
    promoterPledge: ownership?.promoterPledge ?? null,
    fiiHolding: ownership?.fiiHolding ?? null,
    fiiChange: null,
    diiHolding: ownership?.diiHolding ?? null,
    diiChange: null,
    ownershipPeriod: ownership?.asOfPeriod ?? null,

    latestDividendPerShare: latestDividend,

    dma20: null,
    dma50: fundamentals?.fiftyDayMovingAverage ?? null,
    dma100: null,
    dma200: fundamentals?.twoHundredDayMovingAverage ?? null,
    rsi14: null,
    high52w: fundamentals?.fiftyTwoWeekHigh ?? null,
    low52w: fundamentals?.fiftyTwoWeekLow ?? null,
    averageVolume: quote?.volume ?? null,
    volumeRatio: null,
  };
}
