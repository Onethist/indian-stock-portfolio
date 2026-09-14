import { Sector } from "@/lib/types";
import { parseCsv, rowsToObjects } from "@/lib/importedStock/csv";

/**
 * NSE's own official index-constituent lists — same category of data as the
 * bhavcopy archive (a public, bulk-download CSV meant for exactly this use,
 * not a scraped page). Gives a real, official sector classification
 * ("Industry") alongside the ticker/ISIN, which bhavcopy alone doesn't have.
 */
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

// NSE's macro-industry classification (from the index CSVs) mapped onto this
// app's Sector union. Not a 1:1 mapping — several NSE categories collapse
// onto the closest bucket we score against; the original NSE label is kept
// verbatim in `industry` so nothing is lost, just approximated for scoring.
const INDUSTRY_TO_SECTOR: Record<string, Sector> = {
  "Automobile and Auto Components": "Auto",
  "Capital Goods": "Industrials",
  "Chemicals": "Industrials",
  "Construction": "Industrials",
  "Construction Materials": "Industrials",
  "Consumer Durables": "Consumer Discretionary",
  "Consumer Services": "Consumer Discretionary",
  "Diversified": "Industrials",
  "Fast Moving Consumer Goods": "FMCG",
  "Financial Services": "NBFC", // refined by inferSector's name heuristic below
  "Healthcare": "Pharma",
  "Information Technology": "IT",
  "Media Entertainment & Publication": "Consumer Discretionary",
  "Metals & Mining": "Metals",
  "Oil Gas & Consumable Fuels": "Energy",
  "Power": "Utilities",
  "Realty": "Real Estate",
  "Services": "Consumer Discretionary",
  "Telecommunication": "Utilities",
  "Textiles": "Consumer Discretionary",
};

/** "Financial Services" is one NSE bucket covering banks, insurers, and NBFCs alike — split it by name. */
export function inferSector(industry: string, companyName: string): Sector {
  if (industry === "Financial Services") {
    const name = companyName.toLowerCase();
    if (/\bbank\b/.test(name)) return "Banks";
    if (/insurance/.test(name)) return "Insurance";
    return "NBFC";
  }
  return INDUSTRY_TO_SECTOR[industry] ?? "Industrials";
}

export interface IndexConstituent {
  companyName: string;
  industry: string;
  symbol: string;
  isin: string | null;
  sector: Sector;
}

/** e.g. fetchIndexConstituents("nifty500"), fetchIndexConstituents("nifty50") */
export async function fetchIndexConstituents(indexSlug: string): Promise<IndexConstituent[]> {
  const url = `https://nsearchives.nseindia.com/content/indices/ind_${indexSlug}list.csv`;
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT, Accept: "text/csv,*/*" } });
  if (!res.ok) throw new Error(`Failed to fetch ${indexSlug} constituent list: HTTP ${res.status}`);

  const text = await res.text();
  const { objects } = rowsToObjects(parseCsv(text));

  return objects
    .filter((r) => (r["Series"] ?? "EQ").trim() === "EQ")
    .map((r) => {
      const companyName = r["Company Name"]?.trim() ?? "";
      const industry = r["Industry"]?.trim() ?? "";
      return {
        companyName,
        industry,
        symbol: r["Symbol"]?.trim().toUpperCase() ?? "",
        isin: r["ISIN Code"]?.trim() || null,
        sector: inferSector(industry, companyName),
      };
    })
    .filter((r) => r.symbol);
}
