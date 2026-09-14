import { Sector } from "@/lib/types";
import { toBool, toNumber, toStringOrNull } from "./csv";
import { CompanySnapshotRow, GovernanceFlagRow, RowValidation } from "./types";

export const VALID_SECTORS: Sector[] = [
  "Banks", "NBFC", "Insurance", "IT", "FMCG", "Pharma", "Auto",
  "Industrials", "Utilities", "Energy", "Metals", "Real Estate", "Consumer Discretionary",
];

function pctInRange(v: number | null, min: number, max: number, label: string, warnings: string[]) {
  if (v !== null && (v < min || v > max)) {
    warnings.push(`${label} of ${v} looks out of a typical ${min} to ${max} range — double-check it.`);
  }
}

/** Section 35: validate prices/market cap/debt/percentages, and reject duplicate tickers within the file. */
export function validateSnapshotRows(objects: Record<string, string>[]): RowValidation<CompanySnapshotRow>[] {
  const seenTickers = new Set<string>();

  return objects.map((raw, i) => {
    const errors: string[] = [];
    const warnings: string[] = [];
    const rowIndex = i + 2; // header is row 1

    const ticker = toStringOrNull(raw.ticker)?.toUpperCase() ?? null;
    const companyName = toStringOrNull(raw.companyName);
    const sectorRaw = toStringOrNull(raw.sector);
    const sector = sectorRaw && VALID_SECTORS.includes(sectorRaw as Sector) ? (sectorRaw as Sector) : null;

    if (!ticker) errors.push("ticker is required.");
    if (!companyName) errors.push("companyName is required.");
    if (!sectorRaw) errors.push("sector is required.");
    else if (!sector) errors.push(`sector "${sectorRaw}" is not one of: ${VALID_SECTORS.join(", ")}.`);

    if (ticker) {
      if (seenTickers.has(ticker)) {
        errors.push(`duplicate ticker "${ticker}" in this file — only the first occurrence is kept.`);
      }
      seenTickers.add(ticker);
    }

    const marketCap = toNumber(raw.marketCap);
    if (marketCap !== null && marketCap < 0) errors.push("marketCap cannot be negative.");

    const price = toNumber(raw.price);
    if (price !== null && price <= 0) errors.push("price must be greater than 0.");

    const debt = toNumber(raw.debt);
    if (debt !== null && debt < 0) errors.push("debt cannot be negative.");

    const pe = toNumber(raw.pe);
    if (pe !== null && pe < 0) warnings.push("PE is negative — only expected for a loss-making company; verify this is correct.");

    const dividendYield = toNumber(raw.dividendYield);
    if (dividendYield !== null && dividendYield > 15) warnings.push(`Dividend yield of ${dividendYield}% is unusually high — verify (could be a special dividend or a data error).`);

    pctInRange(toNumber(raw.roe), -100, 100, "ROE", warnings);
    pctInRange(toNumber(raw.roce), -100, 100, "ROCE", warnings);
    pctInRange(toNumber(raw.promoterHolding), 0, 100, "Promoter holding", warnings);
    pctInRange(toNumber(raw.promoterPledge), 0, 100, "Promoter pledge", warnings);
    pctInRange(toNumber(raw.fiiHolding), 0, 100, "FII holding", warnings);
    pctInRange(toNumber(raw.diiHolding), 0, 100, "DII holding", warnings);
    pctInRange(toNumber(raw.ebitdaMargin), -100, 100, "EBITDA margin", warnings);
    pctInRange(toNumber(raw.patMargin), -100, 100, "PAT margin", warnings);

    const marketCapCategoryRaw = toStringOrNull(raw.marketCapCategory);
    const marketCapCategory =
      marketCapCategoryRaw === "Large" || marketCapCategoryRaw === "Mid" || marketCapCategoryRaw === "Small"
        ? marketCapCategoryRaw
        : marketCap !== null
        ? (marketCap >= 20000 ? "Large" : marketCap >= 5000 ? "Mid" : "Small")
        : null;
    if (!marketCapCategoryRaw && marketCapCategory) {
      warnings.push(`marketCapCategory not supplied — inferred "${marketCapCategory}" from marketCap (rough heuristic: ≥₹20,000cr Large, ≥₹5,000cr Mid, else Small).`);
    }

    const exchangeRaw = toStringOrNull(raw.exchange);
    const exchange = exchangeRaw === "NSE" || exchangeRaw === "BSE" ? exchangeRaw : "NSE";

    const valid = errors.length === 0;
    const parsed: CompanySnapshotRow | null = valid
      ? {
          ticker: ticker as string,
          isin: toStringOrNull(raw.isin),
          companyName: companyName as string,
          exchange,
          sector: sector as Sector,
          industry: toStringOrNull(raw.industry),
          marketCap,
          marketCapCategory,
          businessDescription: toStringOrNull(raw.businessDescription),
          price,
          period: toStringOrNull(raw.period),
          periodType: raw.periodType === "quarterly" ? "quarterly" : "annual",
          revenue: toNumber(raw.revenue),
          revenueGrowth: toNumber(raw.revenueGrowth),
          ebitda: toNumber(raw.ebitda),
          ebitdaMargin: toNumber(raw.ebitdaMargin),
          pat: toNumber(raw.pat),
          patMargin: toNumber(raw.patMargin),
          eps: toNumber(raw.eps),
          epsGrowth: toNumber(raw.epsGrowth),
          roe: toNumber(raw.roe),
          roce: toNumber(raw.roce),
          roa: toNumber(raw.roa),
          debt,
          equity: toNumber(raw.equity),
          debtToEquity: toNumber(raw.debtToEquity),
          interestCoverage: toNumber(raw.interestCoverage),
          operatingCashFlow: toNumber(raw.operatingCashFlow),
          capex: toNumber(raw.capex),
          freeCashFlow: toNumber(raw.freeCashFlow),
          cfoToPat: toNumber(raw.cfoToPat),
          fcfToPat: toNumber(raw.fcfToPat),
          netInterestMargin: toNumber(raw.netInterestMargin),
          gnpa: toNumber(raw.gnpa),
          nnpa: toNumber(raw.nnpa),
          provisionCoverageRatio: toNumber(raw.provisionCoverageRatio),
          capitalAdequacyRatio: toNumber(raw.capitalAdequacyRatio),
          costToIncome: toNumber(raw.costToIncome),
          creditGrowth: toNumber(raw.creditGrowth),
          salesCagr3y: toNumber(raw.salesCagr3y),
          salesCagr5y: toNumber(raw.salesCagr5y),
          salesCagr10y: toNumber(raw.salesCagr10y),
          profitCagr3y: toNumber(raw.profitCagr3y),
          profitCagr5y: toNumber(raw.profitCagr5y),
          profitCagr10y: toNumber(raw.profitCagr10y),
          epsCagr: toNumber(raw.epsCagr),
          pe,
          forwardPe: toNumber(raw.forwardPe),
          pb: toNumber(raw.pb),
          evEbitda: toNumber(raw.evEbitda),
          priceSales: toNumber(raw.priceSales),
          peg: toNumber(raw.peg),
          dividendYield,
          historicalPe: toNumber(raw.historicalPe),
          industryPe: toNumber(raw.industryPe),
          promoterHolding: toNumber(raw.promoterHolding),
          promoterHoldingChange: toNumber(raw.promoterHoldingChange),
          promoterPledge: toNumber(raw.promoterPledge),
          fiiHolding: toNumber(raw.fiiHolding),
          fiiChange: toNumber(raw.fiiChange),
          diiHolding: toNumber(raw.diiHolding),
          diiChange: toNumber(raw.diiChange),
          ownershipPeriod: toStringOrNull(raw.ownershipPeriod),
          latestDividendPerShare: toNumber(raw.latestDividendPerShare),
          dma20: toNumber(raw.dma20),
          dma50: toNumber(raw.dma50),
          dma100: toNumber(raw.dma100),
          dma200: toNumber(raw.dma200),
          rsi14: toNumber(raw.rsi14),
          high52w: toNumber(raw.high52w),
          low52w: toNumber(raw.low52w),
          averageVolume: toNumber(raw.averageVolume),
          volumeRatio: toNumber(raw.volumeRatio),
        }
      : null;

    return { rowIndex, raw, parsed, errors, warnings, valid };
  });
}

export function validateGovernanceRows(objects: Record<string, string>[], knownTickers: Set<string>): RowValidation<GovernanceFlagRow>[] {
  return objects.map((raw, i) => {
    const errors: string[] = [];
    const warnings: string[] = [];
    const rowIndex = i + 2;

    const ticker = toStringOrNull(raw.ticker)?.toUpperCase() ?? null;
    const date = toStringOrNull(raw.date);
    const flagType = toStringOrNull(raw.flagType);
    const description = toStringOrNull(raw.description);
    const severityRaw = toStringOrNull(raw.severity)?.toLowerCase() ?? null;
    const severity = severityRaw === "low" || severityRaw === "medium" || severityRaw === "high" ? severityRaw : null;

    if (!ticker) errors.push("ticker is required.");
    else if (!knownTickers.has(ticker)) warnings.push(`ticker "${ticker}" is not in the companies you're importing in this batch — it will still be saved and matched if that ticker exists.`);
    if (!date || Number.isNaN(Date.parse(date))) errors.push("date is missing or not a valid date.");
    if (!flagType) errors.push("flagType is required.");
    if (!description) errors.push("description is required.");
    if (!severity) errors.push('severity must be "low", "medium", or "high".');

    const valid = errors.length === 0;
    const parsed: GovernanceFlagRow | null = valid
      ? {
          ticker: ticker as string,
          date: date as string,
          flagType: flagType as string,
          severity: severity as "low" | "medium" | "high",
          description: description as string,
          source: toStringOrNull(raw.source),
          resolved: toBool(raw.resolved, false),
        }
      : null;

    return { rowIndex, raw, parsed, errors, warnings, valid };
  });
}
