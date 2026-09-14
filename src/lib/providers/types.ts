/**
 * The data-provider abstraction from section 6 of the portfolio-builder spec:
 * the rest of the app must never be hard-coded around one market-data vendor.
 * Every method returns raw, provider-shaped data — normalization into the
 * app's own CompanySnapshotRow shape happens separately (see normalize.ts),
 * mirroring the spec's "External data -> Normalize -> Store" pipeline.
 */

export interface ProviderQuote {
  symbol: string;
  price: number;
  previousClose: number | null;
  change: number | null;
  changePercent: number | null;
  volume: number | null;
  tradingDay: string | null; // ISO date
}

export interface ProviderPricePoint {
  date: string; // ISO date
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/**
 * Raw fundamentals as a provider reports them — field availability and units
 * vary a lot by vendor and by symbol, which is exactly why this is kept
 * separate from the app's internal Fundamentals shape. Never assume every
 * field below will be populated for every symbol.
 */
export interface ProviderFundamentals {
  symbol: string;
  companyName: string | null;
  providerSector: string | null; // the vendor's own sector label - do not trust as our Sector union
  providerIndustry: string | null;
  currency: string | null;
  marketCap: number | null; // in the provider's native currency units (not crore)
  peRatio: number | null;
  pegRatio: number | null;
  bookValuePerShare: number | null;
  eps: number | null;
  profitMargin: number | null; // fraction, e.g. 0.184
  operatingMarginTTM: number | null;
  returnOnAssetsTTM: number | null; // fraction
  returnOnEquityTTM: number | null; // fraction
  revenueTTM: number | null;
  quarterlyRevenueGrowthYoY: number | null; // fraction
  quarterlyEarningsGrowthYoY: number | null; // fraction
  dividendPerShare: number | null;
  dividendYield: number | null; // fraction
  fiftyTwoWeekHigh: number | null;
  fiftyTwoWeekLow: number | null;
  fiftyDayMovingAverage: number | null;
  twoHundredDayMovingAverage: number | null;
}

export interface ProviderDividendEvent {
  exDate: string;
  recordDate: string | null;
  paymentDate: string | null;
  amount: number;
}

/**
 * Indian shareholding-pattern data (promoter holding/pledge, FII/DII split) is
 * not tracked by any global market-data API — this shape exists so the
 * interface stays complete per the spec, but a real global-provider adapter
 * is expected to return null data with an explanatory warning, not fabricate
 * a number. NSE/BSE corporate-filing scrapers or a paid Indian data vendor
 * would be the real source for this (see section 62's provider hierarchy).
 */
export interface ProviderOwnership {
  promoterHolding: number | null;
  promoterHoldingChange: number | null;
  promoterPledge: number | null;
  fiiHolding: number | null;
  diiHolding: number | null;
  asOfPeriod: string | null;
}

export interface ProviderResult<T> {
  data: T | null;
  warnings: string[];
  /** True when the provider signaled a rate limit / quota exhaustion rather than "no data for this symbol". */
  rateLimited?: boolean;
}

export interface MarketDataProvider {
  readonly name: string;
  getQuotes(symbols: string[]): Promise<ProviderResult<ProviderQuote[]>>;
  getHistoricalPrices(symbol: string, from: Date, to: Date): Promise<ProviderResult<ProviderPricePoint[]>>;
  getFundamentals(symbol: string): Promise<ProviderResult<ProviderFundamentals>>;
  getDividends(symbol: string): Promise<ProviderResult<ProviderDividendEvent[]>>;
  getOwnership(symbol: string): Promise<ProviderResult<ProviderOwnership>>;
}
