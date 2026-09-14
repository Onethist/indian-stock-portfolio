export interface TechnicalsUpdate {
  price: number;
  dma20: number | null;
  dma50: number | null;
  rsi14: number | null;
  averageVolume: number | null;
  volumeRatio: number | null;
  periodHigh: number;
  periodLow: number;
  daysUsed: number;
}

export interface RefreshPricesApiResult {
  updates: Record<string, TechnicalsUpdate | null>;
  tradingDaysFetched: number;
  latestTradingDate: string | null;
  warnings: string[];
}

/** Client-side call into /api/market-data/refresh-prices (server-side NSE bhavcopy fetch). */
export async function callRefreshPricesApi(tickers: string[]): Promise<RefreshPricesApiResult> {
  const res = await fetch("/api/market-data/refresh-prices", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tickers }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Failed to refresh prices.");
  return json as RefreshPricesApiResult;
}
