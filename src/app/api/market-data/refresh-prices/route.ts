import { NextRequest, NextResponse } from "next/server";
import { computeTechnicalsFromHistory, fetchPriceHistory } from "@/lib/providers/nseBhavcopy";

// Vercel Hobby allows up to 60s per function — this fetches one whole-market
// bhavcopy file per trading day looked back, regardless of ticker count.
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  let tickers: string[];
  try {
    const body = await req.json();
    tickers = Array.isArray(body.tickers) ? body.tickers.filter((t: unknown) => typeof t === "string" && t.trim()) : [];
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (tickers.length === 0) {
    return NextResponse.json({ error: "No tickers to refresh." }, { status: 400 });
  }

  // NSE bhavcopy only covers NSE-listed equities under their plain trading symbol.
  const nseTickers = tickers.map((t) => t.replace(/\.(BSE|NSE)$/i, "").toUpperCase());

  const result = await fetchPriceHistory(nseTickers, {
    maxTradingDays: 60,
    maxCalendarLookbackDays: 100,
    deadlineMs: 50_000,
  });

  const updates: Record<string, ReturnType<typeof computeTechnicalsFromHistory>> = {};
  for (const [ticker, points] of result.series) {
    updates[ticker] = computeTechnicalsFromHistory(points);
  }

  return NextResponse.json({
    updates,
    tradingDaysFetched: result.tradingDaysFetched,
    latestTradingDate: result.latestTradingDate,
    warnings: result.warnings,
    source: "NSE bhavcopy (archives.nseindia.com)",
  });
}
