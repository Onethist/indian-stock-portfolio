import { NextRequest, NextResponse } from "next/server";
import { AlphaVantageProvider } from "@/lib/providers/alphaVantageProvider";
import { normalizeToSnapshotRow } from "@/lib/providers/normalize";
import { VALID_SECTORS } from "@/lib/importedStock/validate";
import { Sector } from "@/lib/types";

export async function POST(req: NextRequest) {
  // The API key is read server-side only (section 36) — it never reaches the client bundle.
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "ALPHA_VANTAGE_API_KEY is not configured on the server. Add it to .env.local (see .env.example), restart the dev server, and try again. Until then, use CSV import." },
      { status: 400 }
    );
  }

  let symbol: string;
  let sector: Sector;
  try {
    const body = await req.json();
    symbol = String(body.symbol ?? "").trim().toUpperCase();
    sector = body.sector as Sector;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!symbol) return NextResponse.json({ error: "symbol is required, e.g. RELIANCE.BSE" }, { status: 400 });
  if (!VALID_SECTORS.includes(sector)) {
    return NextResponse.json({ error: `sector must be one of: ${VALID_SECTORS.join(", ")}` }, { status: 400 });
  }

  const provider = new AlphaVantageProvider(apiKey);
  const warnings: string[] = [];
  let rateLimited = false;

  const [quoteResult, fundamentalsResult, dividendsResult, ownershipResult] = await Promise.all([
    provider.getQuotes([symbol]),
    provider.getFundamentals(symbol),
    provider.getDividends(symbol),
    provider.getOwnership(symbol),
  ]);

  for (const r of [quoteResult, fundamentalsResult, dividendsResult, ownershipResult]) {
    warnings.push(...r.warnings);
    if (r.rateLimited) rateLimited = true;
  }

  if (rateLimited) {
    return NextResponse.json(
      { error: "Alpha Vantage rate limit reached (free tier: ~25 requests/day, 5/minute). Wait and try again, or use CSV import in the meantime.", warnings },
      { status: 429 }
    );
  }

  const quote = quoteResult.data?.[0] ?? null;
  if (!quote) {
    return NextResponse.json(
      { error: `No quote data returned for "${symbol}". Double-check the symbol — Indian equities need a .BSE suffix (e.g. RELIANCE.BSE); NSE isn't supported by this provider.`, warnings },
      { status: 404 }
    );
  }

  const row = normalizeToSnapshotRow(
    { ticker: symbol, sector, quote, fundamentals: fundamentalsResult.data, dividends: dividendsResult.data, ownership: ownershipResult.data },
    warnings
  );

  return NextResponse.json({ row, warnings, provider: provider.name });
}
