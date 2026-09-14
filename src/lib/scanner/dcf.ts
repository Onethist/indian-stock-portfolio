import { RiskStatus, StockView } from "@/lib/types";

export interface DcfScenario {
  intrinsicValue: number;
  growthAssumption: number;
  discountRate: number;
}

export interface DcfResult {
  bear: DcfScenario;
  base: DcfScenario;
  bull: DcfScenario;
  marginOfSafety: number; // % based on base case
  terminalGrowth: number;
  years: number;
}

function riskDiscountRate(risk: RiskStatus): number {
  if (risk === "RED") return 14.5;
  if (risk === "AMBER") return 12.5;
  return 11;
}

function projectDcf(fcfPerShare: number, growthPct: number, discountPct: number, terminalGrowthPct: number, years: number): number {
  const g = growthPct / 100;
  const r = discountPct / 100;
  const tg = terminalGrowthPct / 100;
  let pv = 0;
  let fcf = fcfPerShare;
  for (let t = 1; t <= years; t++) {
    fcf *= 1 + g;
    pv += fcf / Math.pow(1 + r, t);
  }
  const terminalFcf = fcf * (1 + tg);
  const terminalValue = terminalFcf / (r - tg);
  pv += terminalValue / Math.pow(1 + r, years);
  return pv;
}

/**
 * A simple two-stage FCFE-style DCF (section 29): 5 years of explicit growth
 * fading into a 4% terminal growth perpetuity, discounted at a risk-adjusted
 * cost of equity. This is a deliberately simple illustrative model, not a
 * precision valuation — always shown with its assumptions and as a
 * bear/base/bull range per section 64, never a single point estimate.
 * Returns null when FCF is unavailable or non-positive (never invented).
 */
export function computeDcf(stock: StockView): DcfResult | null {
  const { valuation, technicals, score, fundamentals } = stock;
  if (valuation.fcfYield === null || valuation.fcfYield <= 0) return null;

  const fcfPerShare = technicals.price * (valuation.fcfYield / 100);
  if (fcfPerShare <= 0) return null;

  const discountRate = riskDiscountRate(score.riskStatus);
  const terminalGrowth = 4;
  if (discountRate <= terminalGrowth) return null;

  const years = 5;
  const baseGrowth = clamp(fundamentals.profitCagr5y ?? 8, -5, 22);
  const bearGrowth = clamp(baseGrowth * 0.4, -8, 12);
  const bullGrowth = clamp(baseGrowth * 1.3, -2, 30);

  const base: DcfScenario = { intrinsicValue: round2(projectDcf(fcfPerShare, baseGrowth, discountRate, terminalGrowth, years)), growthAssumption: baseGrowth, discountRate };
  const bear: DcfScenario = { intrinsicValue: round2(projectDcf(fcfPerShare, bearGrowth, discountRate + 1, terminalGrowth, years)), growthAssumption: bearGrowth, discountRate: discountRate + 1 };
  const bull: DcfScenario = { intrinsicValue: round2(projectDcf(fcfPerShare, bullGrowth, discountRate - 0.5, terminalGrowth, years)), growthAssumption: bullGrowth, discountRate: discountRate - 0.5 };

  const marginOfSafety = round2(((base.intrinsicValue - technicals.price) / base.intrinsicValue) * 100);

  return { bear, base, bull, marginOfSafety, terminalGrowth, years };
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
