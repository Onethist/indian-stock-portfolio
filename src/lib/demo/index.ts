import {
  DividendRecord,
  Fundamentals,
  GovernanceFlag,
  Ownership,
  StockView,
  Valuation,
} from "@/lib/types";
import { COMPANY_SEEDS, CompanySeed } from "./companies";
import { buildFundamentals } from "./fundamentalsBuilder";
import { computeTechnicals, generatePriceSeries } from "./priceSeries";
import { computeScore } from "@/lib/scoring";

const SOURCE = "Demo Data Generator";
const UPDATED_AT = "2026-09-10";

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

const FINANCIAL_SECTORS = new Set(["Banks", "NBFC", "Insurance"]);

function nullNonFinancialFields(fundamentals: Fundamentals): void {
  for (const period of fundamentals.history) {
    period.roce = null;
    period.ebitda = null;
    period.ebitdaMargin = null;
    period.debtToEquity = null;
    period.interestCoverage = null;
    period.operatingCashFlow = null;
    period.capex = null;
    period.freeCashFlow = null;
    period.cfoToPat = null;
    period.fcfToPat = null;
  }
}

function buildDividends(companyId: string, perShareHistory: number[] | null): DividendRecord[] {
  if (!perShareHistory) return [];
  return perShareHistory.map((dps, i) => {
    const year = 2026 - i;
    return {
      exDate: `${year}-08-10`,
      recordDate: `${year}-08-11`,
      paymentDate: `${year}-09-05`,
      dividendPerShare: dps,
      source: SOURCE,
    };
  }).map((d) => ({ ...d, companyId } as unknown as DividendRecord));
}

function buildOwnership(companyId: string, seed: CompanySeed): Ownership {
  const o = seed.ownership;
  return {
    companyId,
    period: o.period,
    promoterHolding: o.promoterHolding,
    promoterHoldingChange: o.promoterHoldingChange,
    promoterPledge: seed.missingFields?.includes("promoterPledge") ? null : o.promoterPledge,
    fiiHolding: o.fiiHolding,
    fiiChange: o.fiiChange,
    diiHolding: o.diiHolding,
    diiChange: o.diiChange,
    source: SOURCE,
    updatedAt: UPDATED_AT,
  };
}

function buildValuation(companyId: string, seed: CompanySeed, price: number, fundamentals: Fundamentals): Valuation {
  const latest = fundamentals.history[0];
  const eps = latest.eps ?? null;
  const pe = eps && eps > 0 ? round2(price / eps) : null;
  const forwardPe = seed.forwardPeFactor && pe && !seed.missingFields?.includes("forwardPe")
    ? round2(pe * seed.forwardPeFactor)
    : null;
  const pb = round2(price / seed.bookValuePerShare);
  const fcf = latest.freeCashFlow;
  const fcfYield = fcf ? round2((fcf / seed.company.marketCap) * 100) : null;
  const earningsYield = pe ? round2((1 / pe) * 100) : null;
  const latestDps = seed.dividendsPerShareHistory?.[0] ?? 0;
  const dividendYield = latestDps ? round2((latestDps / price) * 100) : 0;
  const debt = latest.debt ?? 0;
  const evEbitda = latest.ebitda && latest.ebitda > 0
    ? round2((seed.company.marketCap + debt) / latest.ebitda)
    : null;
  const priceSales = latest.revenue ? round2(seed.company.marketCap / latest.revenue) : null;
  const peg = pe && fundamentals.profitCagr5y && fundamentals.profitCagr5y > 0
    ? round2(pe / fundamentals.profitCagr5y)
    : null;
  // Momentum proxy: a stock that has re-rated upward (strong recent drift) tends to trade
  // above its own historical average multiple; a laggard tends to trade below it.
  const driftFactor = clamp(1 - seed.price.annualDriftPct / 150, 0.65, 1.35);
  const historicalPe = pe ? round2(pe * driftFactor) : null;

  return {
    companyId,
    date: UPDATED_AT,
    pe,
    forwardPe,
    pb,
    evEbitda,
    priceSales,
    peg,
    earningsYield,
    fcfYield,
    dividendYield,
    historicalPe,
    industryPe: seed.industryPe,
    source: SOURCE,
    updatedAt: UPDATED_AT,
  };
}

function buildGovernanceFlags(companyId: string, seed: CompanySeed): GovernanceFlag[] {
  return seed.governanceFlags.map((f, i) => ({
    id: `${companyId}-flag-${i}`,
    companyId,
    ...f,
  }));
}

let cachedUniverse: StockView[] | null = null;

export function getStockUniverse(): StockView[] {
  if (cachedUniverse) return cachedUniverse;

  cachedUniverse = COMPANY_SEEDS.map((seed) => {
    const companyId = seed.company.id;
    const fundamentals = buildFundamentals(companyId, seed.fundamentals, SOURCE, UPDATED_AT);
    if (FINANCIAL_SECTORS.has(seed.company.sector)) {
      nullNonFinancialFields(fundamentals);
    }
    if (seed.missingFields?.includes("interestCoverage")) {
      fundamentals.history[0].interestCoverage = null;
    }
    if (seed.missingFields?.includes("latestQuarterCashFlow")) {
      fundamentals.history[0].operatingCashFlow = null;
      fundamentals.history[0].freeCashFlow = null;
      fundamentals.history[0].cfoToPat = null;
      fundamentals.history[0].fcfToPat = null;
    }

    const prices = generatePriceSeries({ seed: seed.fundamentals.seed * 7 + 3, ...seed.price });
    const technicals = computeTechnicals(companyId, prices);
    const valuation = buildValuation(companyId, seed, technicals.price, fundamentals);
    const ownership = buildOwnership(companyId, seed);
    const dividends = buildDividends(companyId, seed.dividendsPerShareHistory);
    const governanceFlags = buildGovernanceFlags(companyId, seed);

    const partial: Omit<StockView, "score"> = {
      company: seed.company,
      fundamentals,
      valuation,
      technicals,
      ownership,
      dividends,
      governanceFlags,
      prices,
    };

    const score = computeScore(partial);
    return { ...partial, score };
  });

  return cachedUniverse;
}

export function getStockByTicker(ticker: string): StockView | undefined {
  return getStockUniverse().find((s) => s.company.ticker.toUpperCase() === ticker.toUpperCase());
}
