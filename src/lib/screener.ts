import { Decision, MarketCapCategory, RiskStatus, Sector, StockCategory, StockView } from "@/lib/types";

export interface ScreenerFilters {
  search: string;
  sectors: Sector[];
  marketCapCategories: MarketCapCategory[];
  minMarketCap: number | null;
  minSalesCagr5y: number | null;
  minProfitCagr5y: number | null;
  minRoce: number | null;
  minRoe: number | null;
  maxDebtToEquity: number | null;
  minFcfToPat: number | null;
  maxPe: number | null;
  maxPeg: number | null;
  minDividendYield: number | null;
  minScore: number | null;
  categories: StockCategory[];
  riskStatuses: RiskStatus[];
  decisions: Decision[];
}

export const EMPTY_FILTERS: ScreenerFilters = {
  search: "",
  sectors: [],
  marketCapCategories: [],
  minMarketCap: null,
  minSalesCagr5y: null,
  minProfitCagr5y: null,
  minRoce: null,
  minRoe: null,
  maxDebtToEquity: null,
  minFcfToPat: null,
  maxPe: null,
  maxPeg: null,
  minDividendYield: null,
  minScore: null,
  categories: [],
  riskStatuses: [],
  decisions: [],
};

export interface ScreenerPreset {
  key: string;
  label: string;
  description: string;
  filters: Partial<ScreenerFilters>;
}

export const SCREENER_PRESETS: ScreenerPreset[] = [
  {
    key: "quality-growth",
    label: "Quality Growth",
    description: "Mkt cap > ₹5,000cr, Sales CAGR ≥12%, Profit CAGR ≥15%, ROCE ≥18%, ROE ≥15%, D/E ≤0.5, FCF/PAT ≥60%",
    filters: { minMarketCap: 5000, minSalesCagr5y: 12, minProfitCagr5y: 15, minRoce: 18, minRoe: 15, maxDebtToEquity: 0.5, minFcfToPat: 60 },
  },
  {
    key: "value-quality",
    label: "Value Quality",
    description: "Mkt cap > ₹5,000cr, PE <20, ROCE ≥15%, ROE ≥12%, D/E ≤0.7, Profit CAGR ≥10%",
    filters: { minMarketCap: 5000, maxPe: 20, minRoce: 15, minRoe: 12, maxDebtToEquity: 0.7, minProfitCagr5y: 10 },
  },
  {
    key: "dividend-quality",
    label: "Dividend Quality",
    description: "Dividend yield ≥1.5%, Profit CAGR ≥8%, ROCE ≥12%, D/E ≤0.7, FCF/PAT ≥60%",
    filters: { minDividendYield: 1.5, minProfitCagr5y: 8, minRoce: 12, maxDebtToEquity: 0.7, minFcfToPat: 60 },
  },
  {
    key: "balanced",
    label: "Balanced",
    description: "Sales CAGR ≥10%, Profit CAGR ≥12%, ROCE ≥15%, ROE ≥12%, D/E ≤0.7, PE <30",
    filters: { minSalesCagr5y: 10, minProfitCagr5y: 12, minRoce: 15, minRoe: 12, maxDebtToEquity: 0.7, maxPe: 30 },
  },
  {
    key: "deep-value-watch",
    label: "Deep Value Watch",
    description: "PE <18, ROCE ≥12%, D/E ≤1, positive FCF — a watchlist, not an automatic Buy signal",
    filters: { maxPe: 18, minRoce: 12, maxDebtToEquity: 1, minFcfToPat: 0.01 },
  },
];

export function applyFilters(universe: StockView[], filters: ScreenerFilters): StockView[] {
  return universe.filter((s) => {
    const { company, fundamentals, valuation, score } = s;
    const latest = fundamentals.history[0];

    if (filters.search) {
      const q = filters.search.toLowerCase();
      if (!company.companyName.toLowerCase().includes(q) && !company.ticker.toLowerCase().includes(q)) return false;
    }
    if (filters.sectors.length && !filters.sectors.includes(company.sector)) return false;
    if (filters.marketCapCategories.length && !filters.marketCapCategories.includes(company.marketCapCategory)) return false;
    if (filters.minMarketCap !== null && company.marketCap < filters.minMarketCap) return false;
    if (filters.minSalesCagr5y !== null && (fundamentals.salesCagr5y ?? -Infinity) < filters.minSalesCagr5y) return false;
    if (filters.minProfitCagr5y !== null && (fundamentals.profitCagr5y ?? -Infinity) < filters.minProfitCagr5y) return false;
    if (filters.minRoce !== null && (latest.roce ?? -Infinity) < filters.minRoce) return false;
    if (filters.minRoe !== null && (latest.roe ?? -Infinity) < filters.minRoe) return false;
    if (filters.maxDebtToEquity !== null && latest.debtToEquity !== null && latest.debtToEquity > filters.maxDebtToEquity) return false;
    if (filters.minFcfToPat !== null && (latest.fcfToPat ?? -Infinity) < filters.minFcfToPat) return false;
    if (filters.maxPe !== null && (valuation.pe === null || valuation.pe > filters.maxPe)) return false;
    if (filters.maxPeg !== null && valuation.peg !== null && valuation.peg > filters.maxPeg) return false;
    if (filters.minDividendYield !== null && valuation.dividendYield < filters.minDividendYield) return false;
    if (filters.minScore !== null && score.totalScore < filters.minScore) return false;
    if (filters.categories.length && !filters.categories.includes(score.category)) return false;
    if (filters.riskStatuses.length && !filters.riskStatuses.includes(score.riskStatus)) return false;
    if (filters.decisions.length && !filters.decisions.includes(score.decision)) return false;
    return true;
  });
}

export type SortKey =
  | "totalScore" | "fundamentalScore" | "growthScore" | "valuationScore" | "technicalScore" | "dividendScore"
  | "roce" | "roe" | "epsCagr" | "salesCagr5y" | "profitCagr5y" | "fcfYield" | "dividendYield" | "pe" | "marketCap";

export function sortStocks(list: StockView[], key: SortKey, direction: "asc" | "desc"): StockView[] {
  const value = (s: StockView): number => {
    const latest = s.fundamentals.history[0];
    switch (key) {
      case "totalScore": return s.score.totalScore;
      case "fundamentalScore": return s.score.fundamentalScore;
      case "growthScore": return s.score.growthScore;
      case "valuationScore": return s.score.valuationScore;
      case "technicalScore": return s.score.technicalScore;
      case "dividendScore": return s.score.dividendScore;
      case "roce": return latest.roce ?? -Infinity;
      case "roe": return latest.roe ?? -Infinity;
      case "epsCagr": return s.fundamentals.epsCagr ?? -Infinity;
      case "salesCagr5y": return s.fundamentals.salesCagr5y ?? -Infinity;
      case "profitCagr5y": return s.fundamentals.profitCagr5y ?? -Infinity;
      case "fcfYield": return s.valuation.fcfYield ?? -Infinity;
      case "dividendYield": return s.valuation.dividendYield;
      case "pe": return s.valuation.pe ?? Infinity;
      case "marketCap": return s.company.marketCap;
    }
  };
  const sorted = [...list].sort((a, b) => value(a) - value(b));
  return direction === "desc" ? sorted.reverse() : sorted;
}
