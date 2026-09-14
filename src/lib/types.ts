// Core domain types for the Indian Stock Portfolio Builder.
// This models the tables described in the build spec (section 9) closely enough
// that a real Postgres/Supabase schema can be generated from these shapes later.

export type Exchange = "NSE" | "BSE";

export type MarketCapCategory = "Large" | "Mid" | "Small";

export type Sector =
  | "Banks"
  | "NBFC"
  | "Insurance"
  | "IT"
  | "FMCG"
  | "Pharma"
  | "Auto"
  | "Industrials"
  | "Utilities"
  | "Energy"
  | "Metals"
  | "Real Estate"
  | "Consumer Discretionary";

export interface Company {
  id: string;
  ticker: string;
  isin: string;
  companyName: string;
  exchange: Exchange;
  sector: Sector;
  industry: string;
  marketCap: number; // in crore INR
  marketCapCategory: MarketCapCategory;
  businessDescription: string;
  active: boolean;
  /** "demo" = generated sample data, "imported" = uploaded via the CSV import page. Undefined is treated as "demo". */
  dataSource?: "demo" | "imported";
}

export interface PricePoint {
  date: string; // ISO date
  open: number;
  high: number;
  low: number;
  close: number;
  adjustedClose: number;
  volume: number;
}

export interface FundamentalsPeriod {
  period: string; // e.g. "FY26" or "Q1FY27"
  periodType: "annual" | "quarterly";
  revenue: number | null; // crore INR
  revenueGrowth: number | null; // % YoY
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
  cfoToPat: number | null; // %
  fcfToPat: number | null; // %
  // Bank / NBFC / Insurance specific (section 12) — optional, only populated for financials.
  netInterestMargin: number | null; // %
  gnpa: number | null; // %
  nnpa: number | null; // %
  provisionCoverageRatio: number | null; // %
  capitalAdequacyRatio: number | null; // %
  costToIncome: number | null; // %
  creditGrowth: number | null; // % YoY
}

export interface Fundamentals {
  companyId: string;
  history: FundamentalsPeriod[]; // most recent first
  salesCagr3y: number | null;
  salesCagr5y: number | null;
  salesCagr10y: number | null;
  profitCagr3y: number | null;
  profitCagr5y: number | null;
  profitCagr10y: number | null;
  epsCagr: number | null;
  latestYoySalesGrowth: number | null;
  latestYoyProfitGrowth: number | null;
  source: string;
  updatedAt: string;
}

export interface Valuation {
  companyId: string;
  date: string;
  pe: number | null;
  forwardPe: number | null;
  pb: number | null;
  evEbitda: number | null;
  priceSales: number | null;
  peg: number | null;
  earningsYield: number | null;
  fcfYield: number | null;
  dividendYield: number;
  historicalPe: number | null; // 5y avg
  industryPe: number | null;
  source: string;
  updatedAt: string;
}

export interface DividendRecord {
  exDate: string;
  recordDate: string;
  paymentDate: string;
  dividendPerShare: number;
  source: string;
}

export interface Ownership {
  companyId: string;
  period: string;
  promoterHolding: number | null; // %
  promoterHoldingChange: number | null; // pp QoQ
  promoterPledge: number | null; // %
  fiiHolding: number | null;
  fiiChange: number | null;
  diiHolding: number | null;
  diiChange: number | null;
  source: string;
  updatedAt: string;
}

export type GovernanceSeverity = "low" | "medium" | "high";

export interface GovernanceFlag {
  id: string;
  companyId: string;
  date: string;
  flagType: string;
  severity: GovernanceSeverity;
  description: string;
  source: string;
  resolved: boolean;
}

export interface Technicals {
  companyId: string;
  date: string;
  price: number;
  dma20: number | null;
  dma50: number | null;
  dma100: number | null;
  dma200: number | null;
  priceVs200dma: number | null; // %
  dma50VsDma200: number | null; // %
  rsi14: number | null;
  high52w: number | null;
  low52w: number | null;
  distanceFrom52wHigh: number | null; // %
  averageVolume: number | null;
  volumeRatio: number | null;
}

export type StockCategory = "Growth" | "Value" | "Dividend" | "Opportunity";

export type Decision =
  | "STRONG BUY / HIGH PRIORITY"
  | "ACCUMULATE"
  | "WATCH"
  | "WATCH / WAIT FOR BETTER PRICE"
  | "REVIEW"
  | "AVOID / LOW PRIORITY";

export type Confidence = "HIGH" | "MEDIUM" | "LOW";

export type RiskStatus = "GREEN" | "AMBER" | "RED";

export interface ScoreBreakdown {
  companyId: string;
  date: string;
  growthScore: number; // /12
  profitabilityScore: number; // /12
  balanceSheetScore: number; // /10
  cashFlowScore: number; // /10
  governanceScore: number; // /6
  businessQualityScore: number; // /5
  fundamentalScore: number; // /55 sum of above
  valuationScore: number; // /25
  technicalScore: number; // /10
  dividendScore: number; // /10
  totalScore: number; // /100
  confidence: Confidence;
  missingMetrics: string[];
  category: StockCategory;
  decision: Decision;
  riskStatus: RiskStatus;
  riskReasons: string[];
  reasonsFor: string[];
  reasonsAgainst: string[];
}

export interface RiskAssessment {
  status: RiskStatus;
  flags: GovernanceFlag[];
  reasons: string[];
}

export interface StockView {
  company: Company;
  fundamentals: Fundamentals;
  valuation: Valuation;
  technicals: Technicals;
  ownership: Ownership;
  dividends: DividendRecord[];
  governanceFlags: GovernanceFlag[];
  score: ScoreBreakdown;
  prices: PricePoint[];
}

export interface PortfolioHolding {
  id: string;
  companyId: string;
  category: StockCategory;
  shares: number;
  averageBuyPrice: number;
  investedAmount: number;
  targetAllocation: number; // in INR
}

export type TransactionType = "BUY" | "SELL" | "DIVIDEND";

export interface Transaction {
  id: string;
  companyId: string;
  transactionType: TransactionType;
  date: string;
  shares: number;
  price: number;
  fees: number;
  taxes: number;
  amount: number;
}

export interface WatchlistItem {
  id: string;
  companyId: string;
  targetPrice: number | null;
  targetScore: number | null;
  notes: string;
  createdAt: string;
}

export interface AllocationSettings {
  capital: number;
  growthPct: number;
  valuePct: number;
  dividendPct: number;
  opportunityPct: number;
  maxPositions: number;
  tranches: number;
  maxSectorExposurePct: number;
  maxSingleStockPct: {
    large: number;
    mid: number;
    small: number;
    opportunity: number;
  };
}
