import { Exchange, GovernanceSeverity, MarketCapCategory, Sector } from "@/lib/types";

/**
 * One row of the "Companies & Latest Snapshot" CSV template — a single, real
 * reporting period per company (not a multi-year synthetic history like the
 * demo generator). Every field except the identity fields is optional: an
 * omitted field stays null downstream rather than being invented, which
 * correctly lowers the confidence score (section 20 of the portfolio spec).
 */
export interface CompanySnapshotRow {
  ticker: string;
  isin: string | null;
  companyName: string;
  exchange: Exchange | null;
  sector: Sector;
  industry: string | null;
  marketCap: number | null;
  marketCapCategory: MarketCapCategory | null;
  businessDescription: string | null;
  price: number | null;

  period: string | null;
  periodType: "annual" | "quarterly" | null;

  revenue: number | null;
  revenueGrowth: number | null;
  ebitda: number | null;
  ebitdaMargin: number | null;
  pat: number | null;
  patMargin: number | null;
  eps: number | null;
  epsGrowth: number | null;
  roe: number | null;
  roce: number | null;
  roa: number | null;
  debt: number | null;
  equity: number | null;
  debtToEquity: number | null;
  interestCoverage: number | null;
  operatingCashFlow: number | null;
  capex: number | null;
  freeCashFlow: number | null;
  cfoToPat: number | null;
  fcfToPat: number | null;

  netInterestMargin: number | null;
  gnpa: number | null;
  nnpa: number | null;
  provisionCoverageRatio: number | null;
  capitalAdequacyRatio: number | null;
  costToIncome: number | null;
  creditGrowth: number | null;

  salesCagr3y: number | null;
  salesCagr5y: number | null;
  salesCagr10y: number | null;
  profitCagr3y: number | null;
  profitCagr5y: number | null;
  profitCagr10y: number | null;
  epsCagr: number | null;

  pe: number | null;
  forwardPe: number | null;
  pb: number | null;
  evEbitda: number | null;
  priceSales: number | null;
  peg: number | null;
  dividendYield: number | null;
  historicalPe: number | null;
  industryPe: number | null;

  promoterHolding: number | null;
  promoterHoldingChange: number | null;
  promoterPledge: number | null;
  fiiHolding: number | null;
  fiiChange: number | null;
  diiHolding: number | null;
  diiChange: number | null;
  ownershipPeriod: string | null;

  latestDividendPerShare: number | null;

  dma20: number | null;
  dma50: number | null;
  dma100: number | null;
  dma200: number | null;
  rsi14: number | null;
  high52w: number | null;
  low52w: number | null;
  averageVolume: number | null;
  volumeRatio: number | null;
}

/** One row of the optional "Governance Flags" CSV template. */
export interface GovernanceFlagRow {
  ticker: string;
  date: string;
  flagType: string;
  severity: GovernanceSeverity;
  description: string;
  source: string | null;
  resolved: boolean;
}

export interface RowValidation<T> {
  rowIndex: number; // 1-based, matching a spreadsheet row (header = row 1)
  raw: Record<string, string>;
  parsed: T | null;
  errors: string[];
  warnings: string[];
  valid: boolean;
}
