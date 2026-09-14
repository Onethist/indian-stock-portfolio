// One-time (or re-run-able) bulk seed of the NIFTY 500 universe into Supabase.
// Real tickers/sectors/prices from NSE's own official public data — never
// fabricated — with fundamentals deliberately left blank (per the decision
// not to build a bulk fundamentals pipeline against sites whose terms
// prohibit scraping). Run with: npx tsx scripts/seed-nifty500.ts
//
// Requires NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in the
// environment (e.g. `set -a && source .env.local && set +a` first).

import { createAdminClient } from "../src/lib/supabase/admin";
import { fetchIndexConstituents } from "../src/lib/providers/nseIndexConstituents";
import { computeTechnicalsFromHistory, fetchPriceHistory } from "../src/lib/providers/nseBhavcopy";

async function main() {
  const supabase = createAdminClient();
  if (!supabase) {
    console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY first.");
    process.exit(1);
  }

  console.log("Fetching NIFTY 500 constituent list from NSE...");
  const constituents = await fetchIndexConstituents("nifty500");
  console.log(`Got ${constituents.length} constituents.`);

  console.log("Fetching up to 60 real trading days of NSE bhavcopy for all of them (this takes a minute)...");
  const symbols = constituents.map((c) => c.symbol);
  const priceResult = await fetchPriceHistory(symbols, { maxTradingDays: 60, maxCalendarLookbackDays: 100, deadlineMs: 180_000 });
  console.log(`Fetched ${priceResult.tradingDaysFetched} trading days, latest: ${priceResult.latestTradingDate}.`);
  if (priceResult.warnings.length > 0) {
    console.log(`Warnings (${priceResult.warnings.length}), showing first 5:`);
    priceResult.warnings.slice(0, 5).forEach((w) => console.log(`  ${w}`));
  }

  const now = new Date().toISOString();
  const today = now.slice(0, 10);

  // Only seed companies with at least one real price match — a company with no
  // bhavcopy match at all would otherwise get price: 0, which breaks PE/buy-flow
  // math and would display as a nonsensical "₹0.00". Skipped ones are almost
  // always a symbol rename, very recent listing, or delisting.
  const technicalsRows: Record<string, unknown>[] = [];
  const seededSymbols = new Set<string>();
  for (const c of constituents) {
    const points = priceResult.series.get(c.symbol);
    if (!points || points.length === 0) continue;
    const tech = computeTechnicalsFromHistory(points);
    if (!tech || tech.price <= 0) continue;
    seededSymbols.add(c.symbol);
    technicalsRows.push({
      company_id: `imported-${c.symbol.toLowerCase()}`,
      date: today,
      price: tech.price,
      dma20: tech.dma20,
      dma50: tech.dma50,
      rsi14: tech.rsi14,
      average_volume: tech.averageVolume,
      volume_ratio: tech.volumeRatio,
    });
  }
  const skipped = constituents.filter((c) => !seededSymbols.has(c.symbol));
  if (skipped.length > 0) {
    console.log(`Skipping ${skipped.length} symbol(s) with no real price match in the fetched window: ${skipped.map((c) => c.symbol).join(", ")}`);
  }

  const seeded = constituents.filter((c) => seededSymbols.has(c.symbol));

  const companiesRows = seeded.map((c) => ({
    id: `imported-${c.symbol.toLowerCase()}`,
    ticker: c.symbol,
    isin: c.isin,
    company_name: c.companyName,
    exchange: "NSE",
    sector: c.sector,
    industry: c.industry,
    market_cap: null,
    market_cap_category: null,
    business_description: null,
    active: true,
    created_by: null, // system-seeded shared universe, not owned by any one user
    updated_at: now,
  }));

  const valuationRows = seeded.map((c) => ({
    company_id: `imported-${c.symbol.toLowerCase()}`,
    date: today,
    dividend_yield: 0,
    source: "NSE index constituent seed (fundamentals not populated)",
    updated_at: now,
  }));

  console.log(`Upserting ${companiesRows.length} companies...`);
  const chunked = <T,>(arr: T[], size: number) => Array.from({ length: Math.ceil(arr.length / size) }, (_, i) => arr.slice(i * size, i * size + size));

  for (const chunk of chunked(companiesRows, 100)) {
    const { error } = await supabase.from("companies").upsert(chunk, { onConflict: "id" });
    if (error) throw error;
  }
  console.log("Companies done. Upserting valuation placeholders...");
  for (const chunk of chunked(valuationRows, 100)) {
    const { error } = await supabase.from("valuation").upsert(chunk, { onConflict: "company_id" });
    if (error) throw error;
  }
  console.log(`Valuation done. Upserting technicals for ${technicalsRows.length} matched symbols...`);
  for (const chunk of chunked(technicalsRows, 100)) {
    const { error } = await supabase.from("technicals").upsert(chunk, { onConflict: "company_id" });
    if (error) throw error;
  }

  console.log(`\nDone. Seeded ${companiesRows.length} of ${constituents.length} NIFTY 500 companies, all with real current prices/technicals.`);
  console.log("Fundamentals are intentionally blank — import per-stock via CSV or the Alpha Vantage adapter to add them.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
