import { Fundamentals, FundamentalsPeriod } from "@/lib/types";

function mulberry32(seed: number) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/** Linear ramp: i=0 returns `latest`, i=years-1 returns `latest - spread`. */
function ramp(latest: number, spread: number, i: number, years: number): number {
  if (years <= 1) return latest;
  return latest - spread * (i / (years - 1));
}

export interface BankMetricsSeed {
  latestNim: number;
  latestGnpa: number;
  latestNnpa: number;
  latestProvisionCoverageRatio: number;
  latestCapitalAdequacyRatio: number;
  latestCostToIncome: number;
  latestCreditGrowth: number;
  gnpaSpread: number; // positive = GNPA was higher `years` ago (improving asset quality)
}

export interface FundamentalsSeed {
  seed: number;
  years: number;
  latestRevenue: number; // crore
  latestEbitdaMargin: number; // %
  ebitdaMarginSpread: number; // margin `years` ago = latest - spread
  latestEps: number; // rupees
  latestRoe: number;
  roeSpread: number;
  latestRoce: number;
  roceSpread: number;
  latestRoa: number;
  roaSpread: number;
  latestEquity: number; // crore
  equityGrowthPct: number; // annual retained-earnings growth used to back-project equity
  latestDebtToEquity: number;
  deSpread: number; // D/E `years` ago = latest + spread
  latestInterestCoverage: number;
  icSpread: number;
  latestCfoToPat: number; // %
  cfoToPatSpread: number;
  latestFcfToPat: number; // %
  fcfToPatSpread: number;
  salesCagr: number; // % — used both to back-project revenue and as the reported 5Y figure
  profitCagr: number;
  epsCagr: number;
  bank?: BankMetricsSeed;
}

export function buildFundamentals(companyId: string, seed: FundamentalsSeed, source: string, updatedAt: string): Fundamentals {
  const rand = mulberry32(seed.seed);
  const years = seed.years;
  const history: FundamentalsPeriod[] = [];

  // Build newest -> oldest, i = years ago (0 = latest).
  const revenues: number[] = [];
  const pats: number[] = [];
  const epsArr: number[] = [];
  for (let i = 0; i < years; i++) {
    const noise = 1 + (rand() - 0.5) * 0.03;
    revenues.push((seed.latestRevenue / Math.pow(1 + seed.salesCagr / 100, i)) * noise);
    const margin = ramp(seed.latestEbitdaMargin, seed.ebitdaMarginSpread, i, years);
    const patMarginProxy = margin * 0.55; // rough PAT-from-EBITDA proxy for a plausible curve
    pats.push((revenues[i] * patMarginProxy) / 100);
    epsArr.push((seed.latestEps / Math.pow(1 + seed.epsCagr / 100, i)) * (1 + (rand() - 0.5) * 0.02));
  }
  // Re-anchor PAT series to hit the requested profitCagr exactly, keeping the shape from margin ramp.
  const impliedProfitCagr = (Math.pow(pats[0] / pats[years - 1], 1 / (years - 1)) - 1) * 100;
  void impliedProfitCagr;
  for (let i = 0; i < years; i++) {
    pats[i] = (seed.latestRevenue * seed.latestEbitdaMargin * 0.55) / 100 / Math.pow(1 + seed.profitCagr / 100, i) * (1 + (rand() - 0.5) * 0.02);
  }

  for (let i = 0; i < years; i++) {
    const revenue = revenues[i];
    const pat = pats[i];
    const ebitdaMargin = ramp(seed.latestEbitdaMargin, seed.ebitdaMarginSpread, i, years);
    const ebitda = (revenue * ebitdaMargin) / 100;
    const eps = epsArr[i];
    const roe = ramp(seed.latestRoe, seed.roeSpread, i, years);
    const roce = ramp(seed.latestRoce, seed.roceSpread, i, years);
    const roa = ramp(seed.latestRoa, seed.roaSpread, i, years);
    const equity = seed.latestEquity / Math.pow(1 + seed.equityGrowthPct / 100, i);
    const debtToEquity = Math.max(0, ramp(seed.latestDebtToEquity, -seed.deSpread, i, years));
    const debt = debtToEquity * equity;
    const interestCoverage = Math.max(0.1, ramp(seed.latestInterestCoverage, seed.icSpread, i, years));
    const cfoToPat = ramp(seed.latestCfoToPat, seed.cfoToPatSpread, i, years);
    const fcfToPat = ramp(seed.latestFcfToPat, seed.fcfToPatSpread, i, years);
    const operatingCashFlow = (pat * cfoToPat) / 100;
    const freeCashFlow = (pat * fcfToPat) / 100;
    const capex = operatingCashFlow - freeCashFlow;

    const prevRevenue = i + 1 < years ? revenues[i + 1] : null;
    const prevEps = i + 1 < years ? epsArr[i + 1] : null;
    const prevPat = i + 1 < years ? pats[i + 1] : null;

    let bankFields: Partial<FundamentalsPeriod> = {
      netInterestMargin: null,
      gnpa: null,
      nnpa: null,
      provisionCoverageRatio: null,
      capitalAdequacyRatio: null,
      costToIncome: null,
      creditGrowth: null,
    };
    if (seed.bank) {
      const b = seed.bank;
      bankFields = {
        netInterestMargin: round1(b.latestNim + (rand() - 0.5) * 0.1),
        gnpa: round1(Math.max(0.3, ramp(b.latestGnpa, -b.gnpaSpread, i, years))),
        nnpa: round1(Math.max(0.1, ramp(b.latestNnpa, -b.gnpaSpread * 0.4, i, years))),
        provisionCoverageRatio: round1(ramp(b.latestProvisionCoverageRatio, -3, i, years)),
        capitalAdequacyRatio: round1(ramp(b.latestCapitalAdequacyRatio, -1, i, years)),
        costToIncome: round1(ramp(b.latestCostToIncome, 2, i, years)),
        creditGrowth: round1(b.latestCreditGrowth + (rand() - 0.5) * 2),
      };
    }

    history.push({
      period: `FY${26 - i + (26 - i < 10 ? 0 : 0)}`.replace("FY", "FY") /* placeholder, fixed below */,
      periodType: "annual",
      revenue: round1(revenue),
      revenueGrowth: prevRevenue ? round1(((revenue - prevRevenue) / prevRevenue) * 100) : null,
      ebitda: round1(ebitda),
      ebitdaMargin: round1(ebitdaMargin),
      pat: round1(pat),
      patMargin: round1((pat / revenue) * 100),
      eps: round1(eps),
      epsGrowth: prevEps ? round1(((eps - prevEps) / prevEps) * 100) : null,
      roe: round1(roe),
      roce: round1(roce),
      roa: round1(roa),
      debt: round1(debt),
      equity: round1(equity),
      debtToEquity: round1(debtToEquity),
      interestCoverage: round1(interestCoverage),
      operatingCashFlow: round1(operatingCashFlow),
      capex: round1(capex),
      freeCashFlow: round1(freeCashFlow),
      cfoToPat: round1(cfoToPat),
      fcfToPat: round1(fcfToPat),
      ...bankFields,
    } as FundamentalsPeriod);
    void prevPat;
  }

  // Fix period labels: latest = FY26, going back. i=0 -> FY26, i=1 -> FY25, ...
  history.forEach((h, i) => {
    h.period = `FY${26 - i}`;
  });

  const latestYoySalesGrowth = history[0].revenueGrowth;
  const latestYoyProfitGrowth = history[0].epsGrowth !== null
    ? round1(((pats[0] - pats[1]) / pats[1]) * 100)
    : null;

  return {
    companyId,
    history,
    salesCagr3y: round1(seed.salesCagr * 1.05),
    salesCagr5y: round1(seed.salesCagr),
    salesCagr10y: years >= 7 ? round1(seed.salesCagr * 0.92) : null,
    profitCagr3y: round1(seed.profitCagr * 1.08),
    profitCagr5y: round1(seed.profitCagr),
    profitCagr10y: years >= 7 ? round1(seed.profitCagr * 0.9) : null,
    epsCagr: round1(seed.epsCagr),
    latestYoySalesGrowth,
    latestYoyProfitGrowth,
    source,
    updatedAt,
  };
}
