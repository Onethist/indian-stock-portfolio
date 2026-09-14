import { StockView } from "@/lib/types";
import { percentileRank, weightedScore } from "./util";
import { dividendCagr } from "./factors";

const FINANCIAL_SECTORS = new Set(["Banks", "NBFC", "Insurance"]);

export interface MasterScoreBreakdown {
  businessQuality: number; // /15
  growth: number; // /15
  profitability: number; // /15
  cashFlow: number; // /15
  balanceSheet: number; // /10
  valuation: number; // /20
  capitalAllocationDividend: number; // /5
  riskGovernance: number; // /5
  total: number; // /100
}

/**
 * Section 73: master score, re-weighted from the same underlying sub-scores the
 * screener's decision-support score already computes (section 19 of the portfolio
 * builder spec) rather than recomputing metric-by-metric a second time.
 */
export function computeMasterScore(stock: StockView): MasterScoreBreakdown {
  const s = stock.score;
  const businessQuality = (s.businessQualityScore / 5) * 15;
  const growth = (s.growthScore / 12) * 15;
  const profitability = (s.profitabilityScore / 12) * 15;
  const cashFlow = Math.min((s.cashFlowScore / 10) * 15, 15);
  const balanceSheet = s.balanceSheetScore; // already /10
  const valuation = (s.valuationScore / 25) * 20;
  const capitalAllocationDividend = (s.dividendScore / 10) * 5;
  let riskGovernance = (s.governanceScore / 6) * 5;
  if (s.riskStatus === "RED") riskGovernance *= 0.15;
  else if (s.riskStatus === "AMBER") riskGovernance *= 0.6;

  const total = businessQuality + growth + profitability + cashFlow + balanceSheet + valuation + capitalAllocationDividend + riskGovernance;

  return {
    businessQuality: round1(businessQuality),
    growth: round1(growth),
    profitability: round1(profitability),
    cashFlow: round1(cashFlow),
    balanceSheet: round1(balanceSheet),
    valuation: round1(valuation),
    capitalAllocationDividend: round1(capitalAllocationDividend),
    riskGovernance: round1(riskGovernance),
    total: Math.round(total),
  };
}

export interface StrategyScores {
  valueScore: number;
  growthScore: number;
  dividendScore: number;
}

/** Section 74: three strategy scores, each 0-100, scored by percentile within the universe. */
export function computeStrategyScores(stock: StockView, universe: StockView[]): StrategyScores {
  const latest = stock.fundamentals.history[0];
  const financial = FINANCIAL_SECTORS.has(stock.company.sector);

  const earningsYields = universe.map((s) => s.valuation.earningsYield);
  const fcfYields = universe.map((s) => s.valuation.fcfYield);
  const inversePes = universe.map((s) => (s.valuation.pe ? -s.valuation.pe : null));
  const divYields = universe.map((s) => s.valuation.dividendYield);
  const negPegs = universe.map((s) => (s.valuation.peg ? -s.valuation.peg : null));
  const inverseDes = universe.map((s) => (s.fundamentals.history[0].debtToEquity !== null ? -s.fundamentals.history[0].debtToEquity : null));
  const capAdequacies = universe.map((s) => s.fundamentals.history[0].capitalAdequacyRatio);
  const roeOrRoas = universe.map((s) => s.fundamentals.history[0].roe ?? s.fundamentals.history[0].roa);
  const salesCagrs = universe.map((s) => s.fundamentals.salesCagr5y);
  const profitCagrs = universe.map((s) => s.fundamentals.profitCagr5y);
  const epsCagrs = universe.map((s) => s.fundamentals.epsCagr);
  const roceOrRoas = universe.map((s) => s.fundamentals.history[0].roce ?? s.fundamentals.history[0].roa);
  const fcfToPats = universe.map((s) => s.fundamentals.history[0].fcfToPat);
  const divCagrs = universe.map((s) => dividendCagr(s));
  const payoutDistances = universe.map((s) => payoutDistanceFromIdeal(s));

  const valueScore = weightedScore([
    { percentile: percentileRank(stock.valuation.earningsYield, earningsYields), weight: 0.25 },
    { percentile: percentileRank(stock.valuation.fcfYield, fcfYields), weight: 0.2 },
    { percentile: percentileRank(stock.valuation.pe ? -stock.valuation.pe : null, inversePes), weight: 0.2 },
    { percentile: percentileRank(stock.valuation.dividendYield, divYields), weight: 0.1 },
    {
      percentile: percentileRank(
        financial ? stock.fundamentals.history[0].capitalAdequacyRatio : (latest.debtToEquity !== null ? -latest.debtToEquity : null),
        financial ? capAdequacies : inverseDes
      ),
      weight: 0.1,
    },
    { percentile: percentileRank(latest.roe ?? latest.roa, roeOrRoas), weight: 0.15 },
  ]) ?? 0;

  const growthScore = weightedScore([
    { percentile: percentileRank(stock.fundamentals.salesCagr5y, salesCagrs), weight: 0.2 },
    { percentile: percentileRank(stock.fundamentals.profitCagr5y, profitCagrs), weight: 0.3 },
    { percentile: percentileRank(stock.fundamentals.epsCagr, epsCagrs), weight: 0.15 },
    { percentile: percentileRank(latest.roce ?? latest.roa, roceOrRoas), weight: 0.2 },
    { percentile: percentileRank(stock.valuation.peg ? -stock.valuation.peg : null, negPegs), weight: 0.15 },
  ]) ?? 0;

  const dividendScore = weightedScore([
    { percentile: percentileRank(stock.valuation.dividendYield, divYields), weight: 0.3 },
    { percentile: percentileRank(dividendCagr(stock), divCagrs), weight: 0.2 },
    { percentile: percentileRank(payoutDistanceFromIdeal(stock), payoutDistances), weight: 0.2 },
    {
      percentile: percentileRank(
        financial ? stock.fundamentals.history[0].capitalAdequacyRatio : (latest.debtToEquity !== null ? -latest.debtToEquity : null),
        financial ? capAdequacies : inverseDes
      ),
      weight: 0.15,
    },
    { percentile: percentileRank(financial ? null : latest.fcfToPat, fcfToPats), weight: 0.15 },
  ]) ?? 0;

  return { valueScore, growthScore, dividendScore };
}

function payoutDistanceFromIdeal(stock: StockView): number | null {
  const latest = stock.fundamentals.history[0];
  const dps = stock.dividends[0]?.dividendPerShare;
  if (!dps || !latest.eps || latest.eps <= 0) return null;
  const payout = (dps / latest.eps) * 100;
  return -Math.abs(payout - 40); // closer to a sustainable ~40% payout scores higher
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
