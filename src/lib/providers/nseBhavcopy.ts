import { rsi, sma } from "@/lib/technicalMath";

/**
 * Real, free, legitimate EOD price data — NSE's own published daily "bhavcopy"
 * archive (one CSV per trading day, covering the whole market), not a scraped
 * page or an internal API meant only for NSE's own frontend. This is the same
 * public data source most open-source Indian market tools use.
 *
 * Deliberately NOT used here: screener.in / moneycontrol / Trendlyne-style
 * fundamentals aggregators. Their terms of service prohibit automated
 * scraping — see docs, section 62 of the portfolio spec ("never scrape a
 * website merely because it displays public information if automated use is
 * not permitted"). Fundamentals stay on the CSV/live-fetch import path.
 */

const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

function formatDateForUrl(d: Date): string {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}${mm}${yyyy}`;
}

interface DayRow {
  close: number;
  volume: number;
}

async function fetchOneDay(date: Date): Promise<{ tradingDate: string; rows: Map<string, DayRow> } | null> {
  const url = `https://archives.nseindia.com/products/content/sec_bhavdata_full_${formatDateForUrl(date)}.csv`;
  let res: Response;
  try {
    res = await fetch(url, { headers: { "User-Agent": USER_AGENT, Accept: "text/csv,*/*" } });
  } catch {
    return null;
  }
  if (!res.ok) return null;

  const text = await res.text();
  const lines = text.split("\n").filter((l) => l.trim().length > 0);
  if (lines.length < 2) return null;

  const headers = lines[0].split(",").map((h) => h.trim().toUpperCase());
  const symbolIdx = headers.indexOf("SYMBOL");
  const seriesIdx = headers.indexOf("SERIES");
  const closeIdx = headers.indexOf("CLOSE_PRICE");
  const qtyIdx = headers.indexOf("TTL_TRD_QNTY");
  const dateIdx = headers.indexOf("DATE1");
  if (symbolIdx === -1 || closeIdx === -1) return null;

  const rows = new Map<string, DayRow>();
  let tradingDate = formatDateForUrl(date);
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",").map((c) => c.trim());
    if (seriesIdx !== -1 && cols[seriesIdx] !== "EQ") continue; // equity series only — skip debt/ETF/etc rows
    const symbol = cols[symbolIdx];
    const close = Number(cols[closeIdx]);
    const volume = qtyIdx !== -1 ? Number(cols[qtyIdx]) : 0;
    if (!symbol || !Number.isFinite(close)) continue;
    rows.set(symbol, { close, volume: Number.isFinite(volume) ? volume : 0 });
    if (dateIdx !== -1 && cols[dateIdx]) tradingDate = cols[dateIdx];
  }
  return rows.size > 0 ? { tradingDate, rows } : null;
}

export interface PriceHistoryResult {
  /** ticker -> chronological (oldest first) closes/volumes actually found */
  series: Map<string, { close: number; volume: number }[]>;
  tradingDaysFetched: number;
  latestTradingDate: string | null;
  warnings: string[];
}

/**
 * Walks backward day by day from today, downloading each day's full-market
 * bhavcopy exactly once and pulling out every requested ticker's row from it
 * — so the request count depends only on how many days of history you want,
 * never on how many tickers you're asking for.
 */
export async function fetchPriceHistory(
  tickers: string[],
  opts: { maxTradingDays: number; maxCalendarLookbackDays: number; deadlineMs: number }
): Promise<PriceHistoryResult> {
  const wanted = new Set(tickers.map((t) => t.toUpperCase()));
  const series = new Map<string, { close: number; volume: number }[]>();
  const warnings: string[] = [];
  const start = Date.now();

  let tradingDaysFetched = 0;
  let latestTradingDate: string | null = null;
  let calendarDaysChecked = 0;
  const cursor = new Date();

  while (
    tradingDaysFetched < opts.maxTradingDays &&
    calendarDaysChecked < opts.maxCalendarLookbackDays &&
    Date.now() - start < opts.deadlineMs
  ) {
    const day = await fetchOneDay(cursor);
    calendarDaysChecked++;
    cursor.setDate(cursor.getDate() - 1);

    if (!day) continue; // weekend/holiday/unavailable — try the previous day

    tradingDaysFetched++;
    if (!latestTradingDate) latestTradingDate = day.tradingDate;

    for (const ticker of wanted) {
      const row = day.rows.get(ticker);
      if (!row) continue;
      const list = series.get(ticker) ?? [];
      list.push(row);
      series.set(ticker, list);
    }
  }

  if (Date.now() - start >= opts.deadlineMs) {
    warnings.push(`Stopped early after ${tradingDaysFetched} trading day(s) to stay within the time budget — some indicators may be based on less history than usual.`);
  }
  for (const ticker of wanted) {
    if (!series.has(ticker)) warnings.push(`${ticker}: not found in NSE bhavcopy — check it's an NSE-listed equity symbol (not .BSE, not delisted).`);
  }

  // Series were built newest-first (walking backward); reverse to chronological order.
  for (const [ticker, points] of series) {
    series.set(ticker, points.slice().reverse());
  }

  return { series, tradingDaysFetched, latestTradingDate, warnings };
}

export interface TechnicalsFromHistory {
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

/** Computes what's honestly derivable from however many real trading days were fetched — never DMA200/52-week from a 60-day window. */
export function computeTechnicalsFromHistory(points: { close: number; volume: number }[]): TechnicalsFromHistory | null {
  if (points.length === 0) return null;
  const closes = points.map((p) => p.close);
  const volumes = points.map((p) => p.volume);
  const last = closes.length - 1;

  const avgVolWindow = volumes.slice(Math.max(0, volumes.length - 20));
  const averageVolume = avgVolWindow.length > 0 ? Math.round(avgVolWindow.reduce((a, b) => a + b, 0) / avgVolWindow.length) : null;
  const recentAvg = volumes.slice(Math.max(0, volumes.length - 5)).reduce((a, b) => a + b, 0) / Math.min(5, volumes.length);

  return {
    price: closes[last],
    dma20: sma(closes, 20, last),
    dma50: sma(closes, 50, last),
    rsi14: rsi(closes, 14, last),
    averageVolume,
    volumeRatio: averageVolume ? Math.round((recentAvg / averageVolume) * 100) / 100 : null,
    periodHigh: Math.max(...closes),
    periodLow: Math.min(...closes),
    daysUsed: closes.length,
  };
}
