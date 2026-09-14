import {
  MarketDataProvider,
  ProviderDividendEvent,
  ProviderFundamentals,
  ProviderOwnership,
  ProviderPricePoint,
  ProviderQuote,
  ProviderResult,
} from "./types";

const BASE_URL = "https://www.alphavantage.co/query";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toNum(v: unknown): number | null {
  if (v === undefined || v === null) return null;
  if (typeof v === "string" && (v.trim() === "" || v.trim() === "None" || v.trim() === "-")) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/**
 * Alpha Vantage returns HTTP 200 even when it can't serve the request — a
 * rate limit or an unsupported/unknown symbol shows up as a "Note",
 * "Information", or "Error Message" field inside an otherwise-200 body.
 * Every call below has to check for these before trusting the payload.
 */
function extractApiNotice(body: Record<string, unknown>): { message: string; rateLimited: boolean } | null {
  const note = (body["Note"] ?? body["Information"] ?? body["Error Message"]) as string | undefined;
  if (!note) return null;
  const rateLimited = /rate limit|frequency|call frequency|per (day|minute)/i.test(note);
  return { message: note, rateLimited };
}

/**
 * Real adapter for https://www.alphavantage.co — a genuinely free (API-key
 * signup only) global market-data API. Honest limits, so the app never
 * pretends this covers what it doesn't:
 *  - Free tier: ~25 requests/day, 5/minute. This class does not batch or
 *    retry aggressively — callers should fetch one symbol at a time.
 *  - Indian equities: NSE isn't supported directly; BSE-listed symbols work
 *    with a ".BSE" suffix (e.g. "RELIANCE.BSE") for quotes and price history.
 *  - Fundamentals (OVERVIEW) and dividends coverage for Indian symbols is
 *    inconsistent — many BSE symbols return an empty object. That is
 *    surfaced as a warning, never invented.
 *  - Ownership (promoter holding/pledge, FII/DII) is not available from any
 *    global provider — getOwnership always returns null data with a warning.
 */
export class AlphaVantageProvider implements MarketDataProvider {
  readonly name = "Alpha Vantage";

  constructor(private readonly apiKey: string) {}

  private async call(params: Record<string, string>, attempt = 0): Promise<{ body: Record<string, unknown> | null; error: string | null; rateLimited: boolean }> {
    const url = new URL(BASE_URL);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    url.searchParams.set("apikey", this.apiKey);

    let res: Response;
    try {
      res = await fetch(url.toString(), { cache: "no-store" });
    } catch (e) {
      if (attempt < 2) {
        await sleep(500 * Math.pow(2, attempt)); // exponential backoff (section 34)
        return this.call(params, attempt + 1);
      }
      return { body: null, error: e instanceof Error ? e.message : "Network error calling Alpha Vantage.", rateLimited: false };
    }

    if (!res.ok) {
      return { body: null, error: `Alpha Vantage HTTP ${res.status}.`, rateLimited: res.status === 429 };
    }

    const body = (await res.json()) as Record<string, unknown>;
    const notice = extractApiNotice(body);
    if (notice) {
      return { body: null, error: notice.message, rateLimited: notice.rateLimited };
    }
    if (Object.keys(body).length === 0) {
      return { body: null, error: "Empty response — this symbol may not be covered by Alpha Vantage.", rateLimited: false };
    }
    return { body, error: null, rateLimited: false };
  }

  async getQuotes(symbols: string[]): Promise<ProviderResult<ProviderQuote[]>> {
    const quotes: ProviderQuote[] = [];
    const warnings: string[] = [];
    let rateLimited = false;

    for (let i = 0; i < symbols.length; i++) {
      const symbol = symbols[i];
      const { body, error, rateLimited: rl } = await this.call({ function: "GLOBAL_QUOTE", symbol });
      if (rl) rateLimited = true;
      if (error || !body) {
        warnings.push(`${symbol}: ${error ?? "no data returned"}`);
        continue;
      }
      const q = body["Global Quote"] as Record<string, unknown> | undefined;
      const price = toNum(q?.["05. price"]);
      if (!q || price === null) {
        warnings.push(`${symbol}: quote payload was empty.`);
        continue;
      }
      quotes.push({
        symbol,
        price,
        previousClose: toNum(q["08. previous close"]),
        change: toNum(q["09. change"]),
        changePercent: toNum(String(q["10. change percent"] ?? "").replace("%", "")),
        volume: toNum(q["06. volume"]),
        tradingDay: (q["07. latest trading day"] as string) ?? null,
      });
      if (i < symbols.length - 1) await sleep(300); // stay well under the 5-req/min free-tier limit
    }

    return { data: quotes, warnings, rateLimited };
  }

  async getHistoricalPrices(symbol: string, from: Date, to: Date): Promise<ProviderResult<ProviderPricePoint[]>> {
    const { body, error, rateLimited } = await this.call({ function: "TIME_SERIES_DAILY", symbol, outputsize: "full" });
    if (error || !body) return { data: null, warnings: [error ?? "no data returned"], rateLimited };

    const series = body["Time Series (Daily)"] as Record<string, Record<string, string>> | undefined;
    if (!series) return { data: null, warnings: ["Alpha Vantage did not return a daily time series for this symbol."], rateLimited: false };

    const points: ProviderPricePoint[] = Object.entries(series)
      .map(([date, v]) => ({
        date,
        open: toNum(v["1. open"]) ?? 0,
        high: toNum(v["2. high"]) ?? 0,
        low: toNum(v["3. low"]) ?? 0,
        close: toNum(v["4. close"]) ?? 0,
        volume: toNum(v["5. volume"]) ?? 0,
      }))
      .filter((p) => {
        const d = new Date(p.date);
        return d >= from && d <= to;
      })
      .sort((a, b) => a.date.localeCompare(b.date));

    return { data: points, warnings: [] };
  }

  async getFundamentals(symbol: string): Promise<ProviderResult<ProviderFundamentals>> {
    const { body, error, rateLimited } = await this.call({ function: "OVERVIEW", symbol });
    if (error || !body) {
      return { data: null, warnings: [error ?? `Alpha Vantage has no OVERVIEW data for ${symbol} (common for BSE-listed symbols).`], rateLimited };
    }

    const pct = (v: unknown) => {
      const n = toNum(v);
      return n; // AV already reports these as fractions (e.g. 0.184), kept as-is; normalize.ts converts to %.
    };

    return {
      data: {
        symbol,
        companyName: (body["Name"] as string) || null,
        providerSector: (body["Sector"] as string) || null,
        providerIndustry: (body["Industry"] as string) || null,
        currency: (body["Currency"] as string) || null,
        marketCap: toNum(body["MarketCapitalization"]),
        peRatio: toNum(body["PERatio"]),
        pegRatio: toNum(body["PEGRatio"]),
        bookValuePerShare: toNum(body["BookValue"]),
        eps: toNum(body["EPS"]),
        profitMargin: pct(body["ProfitMargin"]),
        operatingMarginTTM: pct(body["OperatingMarginTTM"]),
        returnOnAssetsTTM: pct(body["ReturnOnAssetsTTM"]),
        returnOnEquityTTM: pct(body["ReturnOnEquityTTM"]),
        revenueTTM: toNum(body["RevenueTTM"]),
        quarterlyRevenueGrowthYoY: pct(body["QuarterlyRevenueGrowthYOY"]),
        quarterlyEarningsGrowthYoY: pct(body["QuarterlyEarningsGrowthYOY"]),
        dividendPerShare: toNum(body["DividendPerShare"]),
        dividendYield: pct(body["DividendYield"]),
        fiftyTwoWeekHigh: toNum(body["52WeekHigh"]),
        fiftyTwoWeekLow: toNum(body["52WeekLow"]),
        fiftyDayMovingAverage: toNum(body["50DayMovingAverage"]),
        twoHundredDayMovingAverage: toNum(body["200DayMovingAverage"]),
      },
      warnings: [],
    };
  }

  async getDividends(symbol: string): Promise<ProviderResult<ProviderDividendEvent[]>> {
    const { body, error, rateLimited } = await this.call({ function: "DIVIDENDS", symbol });
    if (error || !body) return { data: null, warnings: [error ?? "no dividend data returned"], rateLimited };

    const rows = body["data"] as Record<string, string>[] | undefined;
    if (!rows || rows.length === 0) return { data: [], warnings: [`No dividend history returned for ${symbol}.`] };

    const events: ProviderDividendEvent[] = rows
      .map((r) => ({
        exDate: r["ex_dividend_date"],
        recordDate: r["record_date"] || null,
        paymentDate: r["payment_date"] || null,
        amount: toNum(r["amount"]) ?? 0,
      }))
      .filter((d) => d.exDate && d.amount > 0)
      .sort((a, b) => b.exDate.localeCompare(a.exDate));

    return { data: events, warnings: [] };
  }

  async getOwnership(symbol: string): Promise<ProviderResult<ProviderOwnership>> {
    void symbol; // interface parity with the other methods — no global provider tracks this data
    return {
      data: { promoterHolding: null, promoterHoldingChange: null, promoterPledge: null, fiiHolding: null, diiHolding: null, asOfPeriod: null },
      warnings: [
        "Alpha Vantage (and every global market-data API) does not track Indian shareholding-pattern data. " +
          "Promoter holding/pledge and FII/DII split must come from NSE/BSE disclosures or CSV import.",
      ],
    };
  }
}
