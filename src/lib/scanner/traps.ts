import { StockView } from "@/lib/types";

export interface TrapAssessment {
  valueTrap: boolean;
  growthTrap: boolean;
  dividendTrap: boolean;
  reasons: string[];
}

const FINANCIAL_SECTORS = new Set(["Banks", "NBFC", "Insurance"]);

/** Sections 66-68: cheap/fast-growing/high-yield alone are never enough — check for deterioration underneath. */
export function assessTraps(stock: StockView): TrapAssessment {
  const { valuation, fundamentals, company } = stock;
  const latest = fundamentals.history[0];
  const financial = FINANCIAL_SECTORS.has(company.sector);
  const reasons: string[] = [];

  const cheap = valuation.pe !== null && valuation.industryPe !== null && valuation.pe < valuation.industryPe * 0.75;
  const deteriorating =
    (fundamentals.profitCagr5y !== null && fundamentals.profitCagr5y < 0) ||
    (!financial && latest.fcfToPat !== null && latest.fcfToPat < 0) ||
    (latest.roce !== null && latest.roce < 10) ||
    (fundamentals.latestYoyProfitGrowth !== null && fundamentals.latestYoyProfitGrowth < -10);
  const valueTrap = cheap && deteriorating;
  if (valueTrap) {
    reasons.push("Value trap risk: trades at a discount to industry PE, but profit growth, ROCE, or cash conversion are deteriorating rather than merely cyclically weak.");
  }

  const fastGrowing = fundamentals.salesCagr5y !== null && fundamentals.salesCagr5y >= 15;
  const weakeningReturns =
    (latest.roce !== null && latest.roce < 12 && !financial) ||
    (!financial && latest.fcfToPat !== null && latest.fcfToPat < 30) ||
    (valuation.peg !== null && valuation.peg > 2.5);
  const growthTrap = fastGrowing && weakeningReturns;
  if (growthTrap) {
    reasons.push("Growth trap risk: strong top-line growth is not converting into strong incremental returns on capital or free cash flow.");
  }

  const dps = stock.dividends[0]?.dividendPerShare;
  const payout = dps && latest.eps && latest.eps > 0 ? (dps / latest.eps) * 100 : null;
  const highYield = valuation.dividendYield >= 3;
  const unsustainable =
    (fundamentals.profitCagr5y !== null && fundamentals.profitCagr5y < 0) ||
    (!financial && latest.fcfToPat !== null && latest.fcfToPat < 0) ||
    (payout !== null && payout > 90);
  const dividendTrap = highYield && unsustainable;
  if (dividendTrap) {
    reasons.push("Dividend trap risk: an above-average yield alongside falling earnings, negative free cash flow, or a payout ratio that looks unsustainable.");
  }

  if (reasons.length === 0) reasons.push("No value, growth, or dividend trap pattern detected in available data.");

  return { valueTrap, growthTrap, dividendTrap, reasons };
}
