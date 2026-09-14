import { StockView } from "@/lib/types";
import { computeAnnualizedVolatility, computeMomentum, percentileRank, toPluses, toVolatilityRating } from "./util";

const FINANCIAL_SECTORS = new Set(["Banks", "NBFC", "Insurance"]);

export interface FactorDashboard {
  value: ReturnType<typeof toPluses>;
  quality: ReturnType<typeof toPluses>;
  growth: ReturnType<typeof toPluses>;
  dividend: ReturnType<typeof toPluses>;
  size: ReturnType<typeof toPluses>;
  investment: ReturnType<typeof toPluses>;
  momentum: ReturnType<typeof toPluses>;
  volatility: ReturnType<typeof toVolatilityRating>;
  momentum12m: number | null;
  annualizedVolatility: number | null;
}

/** Section 70-71: factor exposure dashboard, rated by percentile within the universe. */
export function computeFactorDashboard(stock: StockView, universe: StockView[]): FactorDashboard {
  const latest = stock.fundamentals.history[0];
  const financial = FINANCIAL_SECTORS.has(stock.company.sector);

  const earningsYields = universe.map((s) => s.valuation.earningsYield);
  const fcfYields = universe.map((s) => s.valuation.fcfYield);
  const divYields = universe.map((s) => s.valuation.dividendYield);
  const inversePes = universe.map((s) => (s.valuation.pe ? -s.valuation.pe : null));
  const roes = universe.map((s) => s.fundamentals.history[0].roe);
  const roceOrRoas = universe.map((s) => s.fundamentals.history[0].roce ?? s.fundamentals.history[0].roa);
  const cfoToPats = universe.map((s) => s.fundamentals.history[0].cfoToPat);
  const salesCagrs = universe.map((s) => s.fundamentals.salesCagr5y);
  const profitCagrs = universe.map((s) => s.fundamentals.profitCagr5y);
  const epsCagrs = universe.map((s) => s.fundamentals.epsCagr);
  const divCagrs = universe.map((s) => dividendCagr(s));
  const marketCaps = universe.map((s) => s.company.marketCap);
  const investmentIntensities = universe.map((s) => investmentIntensity(s));
  const momentums = universe.map((s) => computeMomentum(s.prices).return12m);
  const vols = universe.map((s) => computeAnnualizedVolatility(s.prices));

  const valuePct = weightedAvgPercentile([
    percentileRank(stock.valuation.earningsYield, earningsYields),
    percentileRank(stock.valuation.fcfYield, fcfYields),
    percentileRank(stock.valuation.dividendYield, divYields),
    percentileRank(stock.valuation.pe ? -stock.valuation.pe : null, inversePes),
  ]);

  const qualityPct = weightedAvgPercentile([
    percentileRank(latest.roe, roes),
    percentileRank(latest.roce ?? latest.roa, roceOrRoas),
    percentileRank(financial ? null : latest.cfoToPat, cfoToPats),
  ]);

  const growthPct = weightedAvgPercentile([
    percentileRank(stock.fundamentals.salesCagr5y, salesCagrs),
    percentileRank(stock.fundamentals.profitCagr5y, profitCagrs),
    percentileRank(stock.fundamentals.epsCagr, epsCagrs),
  ]);

  const dividendPct = weightedAvgPercentile([
    percentileRank(stock.valuation.dividendYield, divYields),
    percentileRank(dividendCagr(stock), divCagrs),
  ]);

  const sizePct = percentileRank(stock.company.marketCap, marketCaps);
  const investmentPct = percentileRank(investmentIntensity(stock), investmentIntensities);
  const momentumStats = computeMomentum(stock.prices);
  const momentumPct = percentileRank(momentumStats.return12m, momentums);
  const vol = computeAnnualizedVolatility(stock.prices);
  const volPct = percentileRank(vol, vols);

  return {
    value: toPluses(valuePct),
    quality: toPluses(qualityPct),
    growth: toPluses(growthPct),
    dividend: toPluses(dividendPct),
    size: toPluses(sizePct),
    investment: toPluses(investmentPct),
    momentum: toPluses(momentumPct),
    volatility: toVolatilityRating(volPct),
    momentum12m: momentumStats.return12m,
    annualizedVolatility: vol,
  };
}

function investmentIntensity(stock: StockView): number | null {
  const latest = stock.fundamentals.history[0];
  if (FINANCIAL_SECTORS.has(stock.company.sector)) return latest.creditGrowth;
  if (latest.capex === null || !latest.revenue) return null;
  return (latest.capex / latest.revenue) * 100;
}

export function dividendCagr(stock: StockView): number | null {
  const dps = stock.dividends.map((d) => d.dividendPerShare);
  if (dps.length < 2) return null;
  const years = dps.length - 1;
  if (dps[dps.length - 1] <= 0) return null;
  return (Math.pow(dps[0] / dps[dps.length - 1], 1 / years) - 1) * 100;
}

function weightedAvgPercentile(percentiles: (number | null)[]): number | null {
  const present = percentiles.filter((p): p is number => p !== null);
  if (present.length === 0) return null;
  return Math.round(present.reduce((a, b) => a + b, 0) / present.length);
}
