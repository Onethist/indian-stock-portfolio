import { PricePoint } from "@/lib/types";

/** Percentile rank (0-100) of `value` within `pool`, higher value = higher percentile. */
export function percentileRank(value: number | null, pool: (number | null)[]): number | null {
  if (value === null) return null;
  const clean = pool.filter((v): v is number => v !== null);
  if (clean.length === 0) return null;
  const below = clean.filter((v) => v <= value).length;
  return Math.round((below / clean.length) * 100);
}

export interface WeightedPart {
  percentile: number | null;
  weight: number;
}

/** Weighted average of percentiles, renormalizing weights across only the available parts. */
export function weightedScore(parts: WeightedPart[]): number | null {
  const present = parts.filter((p) => p.percentile !== null);
  if (present.length === 0) return null;
  const totalWeight = present.reduce((s, p) => s + p.weight, 0);
  const sum = present.reduce((s, p) => s + (p.percentile as number) * p.weight, 0);
  return Math.round(sum / totalWeight);
}

export type FactorRating = "+" | "++" | "+++" | "++++";

export function toPluses(percentile: number | null): FactorRating | "N/A" {
  if (percentile === null) return "N/A";
  if (percentile >= 75) return "++++";
  if (percentile >= 50) return "+++";
  if (percentile >= 25) return "++";
  return "+";
}

export type VolatilityRating = "LOW" | "MEDIUM" | "HIGH" | "N/A";

export function toVolatilityRating(percentile: number | null): VolatilityRating {
  if (percentile === null) return "N/A";
  if (percentile < 33) return "LOW";
  if (percentile < 67) return "MEDIUM";
  return "HIGH";
}

function tradingDaysReturn(prices: PricePoint[], daysAgo: number): number | null {
  if (prices.length <= daysAgo) return null;
  const latest = prices[prices.length - 1].close;
  const past = prices[prices.length - 1 - daysAgo].close;
  if (past <= 0) return null;
  return ((latest - past) / past) * 100;
}

export interface MomentumStats {
  return3m: number | null;
  return6m: number | null;
  return12m: number | null;
}

/** Real momentum computed from the generated daily price series (~21 trading days/month). */
export function computeMomentum(prices: PricePoint[]): MomentumStats {
  return {
    return3m: tradingDaysReturn(prices, 63),
    return6m: tradingDaysReturn(prices, 126),
    return12m: tradingDaysReturn(prices, 252),
  };
}

/** Annualized volatility (%) from daily log returns of the generated price series. */
export function computeAnnualizedVolatility(prices: PricePoint[]): number | null {
  if (prices.length < 30) return null;
  const returns: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    const prev = prices[i - 1].close;
    const cur = prices[i].close;
    if (prev > 0 && cur > 0) returns.push(Math.log(cur / prev));
  }
  if (returns.length < 20) return null;
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((a, b) => a + (b - mean) ** 2, 0) / returns.length;
  const dailyVol = Math.sqrt(variance);
  return Math.round(dailyVol * Math.sqrt(252) * 1000) / 10; // annualized %, 1 decimal
}
