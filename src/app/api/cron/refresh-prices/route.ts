import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { computeTechnicalsFromHistory, fetchPriceHistory } from "@/lib/providers/nseBhavcopy";

// Vercel Cron invokes this on a schedule (see vercel.json) — Hobby plan allows
// up to 2 cron jobs at a once-per-day cadence, which is exactly what this needs.
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  // Vercel automatically sends `Authorization: Bearer <CRON_SECRET>` for scheduled
  // invocations when CRON_SECRET is set as a project env var — this rejects anyone
  // else who finds the URL and calls it directly.
  const expected = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");
  if (!expected || authHeader !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  if (!supabase) {
    return NextResponse.json({ message: "Supabase not configured on this deployment — nothing to refresh." });
  }

  const { data: companies, error } = await supabase.from("companies").select("ticker").eq("exchange", "NSE");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!companies || companies.length === 0) {
    return NextResponse.json({ message: "No NSE-listed imported companies to refresh.", updated: 0 });
  }

  const tickers = companies.map((c) => c.ticker as string);
  const result = await fetchPriceHistory(tickers, { maxTradingDays: 60, maxCalendarLookbackDays: 100, deadlineMs: 50_000 });

  const today = new Date().toISOString().slice(0, 10);
  let updated = 0;
  for (const [ticker, points] of result.series) {
    const tech = computeTechnicalsFromHistory(points);
    if (!tech) continue;
    updated++;
    await supabase.from("technicals").upsert(
      {
        company_id: `imported-${ticker.toLowerCase()}`,
        date: today,
        price: tech.price,
        dma20: tech.dma20,
        dma50: tech.dma50,
        rsi14: tech.rsi14,
        average_volume: tech.averageVolume,
        volume_ratio: tech.volumeRatio,
      },
      { onConflict: "company_id" }
    );
  }

  return NextResponse.json({
    updated,
    totalNseCompanies: tickers.length,
    tradingDaysFetched: result.tradingDaysFetched,
    latestTradingDate: result.latestTradingDate,
    warnings: result.warnings,
  });
}
