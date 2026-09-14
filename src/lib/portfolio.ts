import { AllocationSettings, PortfolioHolding, StockCategory, StockView } from "@/lib/types";

export const DEFAULT_ALLOCATION_SETTINGS: AllocationSettings = {
  capital: 50000,
  growthPct: 40,
  valuePct: 35,
  dividendPct: 20,
  opportunityPct: 5,
  maxPositions: 10,
  tranches: 8,
  maxSectorExposurePct: 30,
  maxSingleStockPct: { large: 15, mid: 10, small: 5, opportunity: 5 },
};

export const CATEGORY_PCT_KEY: Record<StockCategory, "growthPct" | "valuePct" | "dividendPct" | "opportunityPct"> = {
  Growth: "growthPct",
  Value: "valuePct",
  Dividend: "dividendPct",
  Opportunity: "opportunityPct",
};

export function categoryBudget(settings: AllocationSettings, category: StockCategory): number {
  const pct = settings[CATEGORY_PCT_KEY[category]] as number;
  return (settings.capital * pct) / 100;
}

export function maxSingleStockPct(stock: StockView, settings: AllocationSettings): number {
  if (stock.score.category === "Opportunity") return settings.maxSingleStockPct.opportunity;
  switch (stock.company.marketCapCategory) {
    case "Large": return settings.maxSingleStockPct.large;
    case "Mid": return settings.maxSingleStockPct.mid;
    case "Small": return settings.maxSingleStockPct.small;
  }
}

/**
 * Suggested target allocation (section 25): weighted by score/risk within the
 * category budget, capped by the per-stock and market-cap-category maximums.
 * Never derived purely from score — risk and valuation richness pull it down.
 */
export function suggestTargetAllocation(
  stock: StockView,
  categoryPeers: StockView[],
  settings: AllocationSettings
): number {
  const budget = categoryBudget(settings, stock.score.category);
  const cap = (settings.capital * maxSingleStockPct(stock, settings)) / 100;

  const weight = (s: StockView) => {
    let w = Math.max(s.score.totalScore - 40, 5);
    if (s.score.riskStatus === "AMBER") w *= 0.6;
    if (s.score.riskStatus === "RED") w *= 0.25;
    if (s.score.decision === "WATCH / WAIT FOR BETTER PRICE") w *= 0.7;
    return w;
  };
  const totalWeight = categoryPeers.reduce((sum, s) => sum + weight(s), 0);
  const share = totalWeight > 0 ? weight(stock) / totalWeight : 1 / Math.max(categoryPeers.length, 1);

  const raw = budget * share;
  return Math.min(raw, cap);
}

export interface SipPlan {
  targetAmount: number;
  investedAmount: number;
  remainingAmount: number;
  nextTrancheAmount: number;
  tranchesPlanned: number;
  tranchesCompleted: number;
}

/** Staged buying logic (section 27): never require the full target at once. */
export function buildSipPlan(holding: PortfolioHolding, settings: AllocationSettings): SipPlan {
  const targetAmount = holding.targetAllocation;
  const investedAmount = holding.investedAmount;
  const remainingAmount = Math.max(0, targetAmount - investedAmount);
  const perTranche = targetAmount / settings.tranches;
  const tranchesCompleted = perTranche > 0 ? Math.round(investedAmount / perTranche) : 0;
  const nextTrancheAmount = Math.min(remainingAmount, perTranche > 0 ? perTranche : remainingAmount);

  return {
    targetAmount,
    investedAmount,
    remainingAmount,
    nextTrancheAmount: Math.round(nextTrancheAmount),
    tranchesPlanned: settings.tranches,
    tranchesCompleted: Math.min(tranchesCompleted, settings.tranches),
  };
}

export interface PortfolioWarning {
  level: "AMBER" | "RED";
  message: string;
}

export function computeAllocationWarnings(
  holdings: PortfolioHolding[],
  universe: StockView[],
  settings: AllocationSettings
): PortfolioWarning[] {
  const warnings: PortfolioWarning[] = [];
  const totalInvested = holdings.reduce((s, h) => s + h.investedAmount, 0) || 1;

  for (const h of holdings) {
    const stock = universe.find((s) => s.company.id === h.companyId);
    if (!stock) continue;
    const pct = (h.investedAmount / totalInvested) * 100;
    const cap = maxSingleStockPct(stock, settings);
    if (pct > cap) {
      warnings.push({ level: "AMBER", message: `${stock.company.ticker} is ${pct.toFixed(1)}% of the portfolio, above its ${cap}% maximum.` });
    }
  }

  const bySector = new Map<string, number>();
  for (const h of holdings) {
    const stock = universe.find((s) => s.company.id === h.companyId);
    if (!stock) continue;
    bySector.set(stock.company.sector, (bySector.get(stock.company.sector) ?? 0) + h.investedAmount);
  }
  for (const [sector, amount] of bySector) {
    const pct = (amount / totalInvested) * 100;
    if (pct > settings.maxSectorExposurePct) {
      warnings.push({ level: "AMBER", message: `${sector} sector is ${pct.toFixed(1)}% of the portfolio, above the ${settings.maxSectorExposurePct}% target.` });
    }
  }

  const opportunityAmount = holdings
    .filter((h) => h.category === "Opportunity")
    .reduce((s, h) => s + h.investedAmount, 0);
  const opportunityPct = (opportunityAmount / totalInvested) * 100;
  if (opportunityPct > 5) {
    warnings.push({ level: "AMBER", message: `Opportunity bucket is ${opportunityPct.toFixed(1)}% of the portfolio, above the 5% guideline.` });
  }

  if (holdings.length > settings.maxPositions) {
    warnings.push({ level: "AMBER", message: `${holdings.length} positions exceeds the target maximum of ${settings.maxPositions}.` });
  }

  return warnings;
}

export interface PortfolioSummary {
  investedAmount: number;
  currentValue: number;
  pl: number;
  plPct: number;
  byCategory: Record<StockCategory, { invested: number; current: number }>;
}

export function computePortfolioSummary(holdings: PortfolioHolding[], universe: StockView[]): PortfolioSummary {
  const byCategory: Record<StockCategory, { invested: number; current: number }> = {
    Growth: { invested: 0, current: 0 },
    Value: { invested: 0, current: 0 },
    Dividend: { invested: 0, current: 0 },
    Opportunity: { invested: 0, current: 0 },
  };
  let investedAmount = 0;
  let currentValue = 0;
  for (const h of holdings) {
    const stock = universe.find((s) => s.company.id === h.companyId);
    const price = stock?.technicals.price ?? h.averageBuyPrice;
    const current = h.shares * price;
    investedAmount += h.investedAmount;
    currentValue += current;
    byCategory[h.category].invested += h.investedAmount;
    byCategory[h.category].current += current;
  }
  const pl = currentValue - investedAmount;
  const plPct = investedAmount > 0 ? (pl / investedAmount) * 100 : 0;
  return { investedAmount, currentValue, pl, plPct, byCategory };
}
