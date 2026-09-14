import {
  Confidence,
  Decision,
  RiskStatus,
  ScoreBreakdown,
  Sector,
  StockCategory,
  StockView,
} from "@/lib/types";

type Inputs = Omit<StockView, "score">;

const FINANCIAL_SECTORS: Sector[] = ["Banks", "NBFC", "Insurance"];

function isFinancial(sector: Sector): boolean {
  return FINANCIAL_SECTORS.includes(sector);
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

/** Scales a value linearly between (loValue -> 0) and (hiValue -> max), clamped to [0, max]. */
function scale(value: number | null, loValue: number, hiValue: number, max: number): { score: number; missing: boolean } {
  if (value === null || Number.isNaN(value)) return { score: 0, missing: true };
  const t = (value - loValue) / (hiValue - loValue);
  return { score: clamp(t, 0, 1) * max, missing: false };
}

function avgScore(parts: { score: number; missing: boolean }[], max: number): { score: number; missingCount: number } {
  const present = parts.filter((p) => !p.missing);
  const missingCount = parts.length - present.length;
  if (present.length === 0) return { score: 0, missingCount: parts.length };
  const avg = present.reduce((s, p) => s + p.score, 0) / present.length;
  return { score: (avg / max) * max, missingCount };
}

// ---------------------------------------------------------------------------
// Growth — 12 pts (section 19)
// ---------------------------------------------------------------------------
function scoreGrowth(inp: Inputs, missing: string[]): number {
  const f = inp.fundamentals;
  const parts = [
    scale(f.salesCagr5y, 0, 25, 12),
    scale(f.profitCagr5y, 0, 28, 12),
    scale(f.epsCagr, 0, 28, 12),
    scale(f.latestYoySalesGrowth, -5, 25, 12),
    scale(f.latestYoyProfitGrowth, -10, 30, 12),
  ];
  if (f.salesCagr5y === null) missing.push("Sales CAGR 5Y");
  if (f.profitCagr5y === null) missing.push("Profit CAGR 5Y");
  if (f.epsCagr === null) missing.push("EPS CAGR");
  const { score } = avgScore(parts, 12);
  return score;
}

// ---------------------------------------------------------------------------
// Profitability — 12 pts
// ---------------------------------------------------------------------------
function scoreProfitability(inp: Inputs, missing: string[]): number {
  const latest = inp.fundamentals.history[0];
  const financial = isFinancial(inp.company.sector);
  if (financial) {
    const parts = [
      scale(latest.roe, 5, 22, 12),
      scale(latest.roa, 0.5, 2.5, 12),
      scale(latest.netInterestMargin, 2, 7, 12),
    ];
    if (latest.roe === null) missing.push("ROE");
    if (latest.roa === null) missing.push("ROA");
    return avgScore(parts, 12).score;
  }
  const parts = [
    scale(latest.roe, 8, 25, 12),
    scale(latest.roce, 10, 28, 12),
    scale(latest.ebitdaMargin, 5, 35, 12),
  ];
  if (latest.roe === null) missing.push("ROE");
  if (latest.roce === null) missing.push("ROCE");
  if (latest.ebitdaMargin === null) missing.push("OPM");
  return avgScore(parts, 12).score;
}

// ---------------------------------------------------------------------------
// Balance sheet — 10 pts (section 12: do not penalize D/E for banks/NBFCs)
// ---------------------------------------------------------------------------
function scoreBalanceSheet(inp: Inputs, missing: string[]): number {
  const latest = inp.fundamentals.history[0];
  const financial = isFinancial(inp.company.sector);
  if (financial) {
    const parts = [
      scale(latest.capitalAdequacyRatio, 11, 18, 10),
      scale(latest.gnpa !== null ? -latest.gnpa : null, -5, -0.5, 10),
      scale(latest.provisionCoverageRatio, 40, 85, 10),
    ];
    if (latest.capitalAdequacyRatio === null) missing.push("Capital adequacy ratio");
    if (latest.gnpa === null) missing.push("GNPA");
    return avgScore(parts, 10).score;
  }
  const parts = [
    scale(latest.debtToEquity !== null ? -latest.debtToEquity : null, -1.2, -0.1, 10),
    scale(latest.interestCoverage, 2, 15, 10),
  ];
  if (latest.debtToEquity === null) missing.push("Debt/Equity");
  if (latest.interestCoverage === null) missing.push("Interest coverage");
  return avgScore(parts, 10).score;
}

// ---------------------------------------------------------------------------
// Cash flow — 10 pts
// ---------------------------------------------------------------------------
function scoreCashFlow(inp: Inputs, missing: string[]): number {
  const latest = inp.fundamentals.history[0];
  const financial = isFinancial(inp.company.sector);
  if (financial) {
    const parts = [
      scale(latest.costToIncome !== null ? -latest.costToIncome : null, -60, -35, 10),
      scale(latest.creditGrowth, 5, 22, 10),
    ];
    return avgScore(parts, 10).score;
  }
  const parts = [
    scale(latest.cfoToPat, 30, 100, 10),
    scale(latest.fcfToPat, 20, 90, 10),
  ];
  if (latest.cfoToPat === null) missing.push("CFO/PAT");
  if (latest.fcfToPat === null) missing.push("FCF/PAT");
  return avgScore(parts, 10).score;
}

// ---------------------------------------------------------------------------
// Ownership / governance — 6 pts
// ---------------------------------------------------------------------------
function scoreGovernance(inp: Inputs, missing: string[]): number {
  const o = inp.ownership;
  let score = 6;
  if (o.promoterPledge === null) {
    missing.push("Promoter pledge");
  } else if (o.promoterPledge > 20) {
    score -= 4;
  } else if (o.promoterPledge > 5) {
    score -= 2;
  }
  if (o.promoterHoldingChange !== null && o.promoterHoldingChange < -1) score -= 1;
  if (o.fiiChange !== null && o.fiiChange < -1 && o.diiChange !== null && o.diiChange < -1) score -= 1;
  for (const flag of inp.governanceFlags) {
    if (flag.resolved) continue;
    if (flag.severity === "high") score -= 3;
    else if (flag.severity === "medium") score -= 1.5;
    else score -= 0.5;
  }
  return clamp(score, 0, 6);
}

// ---------------------------------------------------------------------------
// Business quality / industry — 5 pts (proxy: margin stability + sector defensiveness)
// ---------------------------------------------------------------------------
const DEFENSIVE_SECTORS: Sector[] = ["FMCG", "Pharma", "IT", "Insurance"];
const CYCLICAL_SECTORS: Sector[] = ["Metals", "Real Estate", "Energy"];

function scoreBusinessQuality(inp: Inputs): number {
  const history = inp.fundamentals.history;
  const margins = history.map((h) => h.ebitdaMargin).filter((m): m is number => m !== null);
  let stabilityScore = 2.5;
  if (margins.length >= 3) {
    const mean = margins.reduce((a, b) => a + b, 0) / margins.length;
    const variance = margins.reduce((a, b) => a + (b - mean) ** 2, 0) / margins.length;
    const stdDev = Math.sqrt(variance);
    stabilityScore = clamp(2.5 - stdDev / 8, 0, 2.5);
  }
  let sectorScore = 1.5;
  if (DEFENSIVE_SECTORS.includes(inp.company.sector)) sectorScore = 2.5;
  else if (CYCLICAL_SECTORS.includes(inp.company.sector)) sectorScore = 0.8;
  return clamp(stabilityScore + sectorScore, 0, 5);
}

// ---------------------------------------------------------------------------
// Valuation — 25 pts (section 17)
// ---------------------------------------------------------------------------
function scoreValuation(inp: Inputs, missing: string[]): number {
  const v = inp.valuation;
  const parts: { score: number; missing: boolean }[] = [];

  if (v.pe !== null && v.industryPe) {
    parts.push(scale(v.industryPe - v.pe, -20, 20, 25));
  } else {
    missing.push("PE vs industry PE");
  }
  if (v.pe !== null && v.historicalPe) {
    parts.push(scale(v.historicalPe - v.pe, -15, 15, 25));
  }
  if (v.peg !== null) {
    parts.push(scale(-v.peg, -3, -0.4, 25));
  } else {
    missing.push("PEG");
  }
  if (v.fcfYield !== null) {
    parts.push(scale(v.fcfYield, 0, 5, 25));
  } else {
    missing.push("FCF yield");
  }
  if (v.earningsYield !== null) {
    parts.push(scale(v.earningsYield, 1.5, 7, 25));
  }
  return avgScore(parts, 25).score;
}

// ---------------------------------------------------------------------------
// Technical — 10 pts (section 18)
// ---------------------------------------------------------------------------
function scoreTechnical(inp: Inputs, missing: string[]): number {
  const t = inp.technicals;
  const parts: { score: number; missing: boolean }[] = [];
  if (t.priceVs200dma !== null) parts.push(scale(t.priceVs200dma, -10, 15, 10));
  else missing.push("Price vs 200 DMA");
  if (t.dma50VsDma200 !== null) parts.push(scale(t.dma50VsDma200, -5, 8, 10));
  if (t.rsi14 !== null) {
    // Prefer RSI 40-65; penalize <30 (weak) and >75 (chasing).
    let rsiScore: number;
    if (t.rsi14 >= 40 && t.rsi14 <= 65) rsiScore = 10;
    else if (t.rsi14 > 65 && t.rsi14 <= 75) rsiScore = 10 - ((t.rsi14 - 65) / 10) * 6;
    else if (t.rsi14 > 75) rsiScore = 2;
    else rsiScore = clamp((t.rsi14 / 40) * 7, 0, 7);
    parts.push({ score: rsiScore, missing: false });
  } else {
    missing.push("RSI 14");
  }
  if (t.distanceFrom52wHigh !== null) parts.push(scale(t.distanceFrom52wHigh, -35, -2, 10));
  return avgScore(parts, 10).score;
}

// ---------------------------------------------------------------------------
// Dividend — 10 pts
// ---------------------------------------------------------------------------
function scoreDividend(inp: Inputs, missing: string[]): { score: number; cagr: number | null; consistency: number } {
  const dps = inp.dividends.map((d) => d.dividendPerShare);
  if (dps.length === 0) {
    return { score: 0, cagr: null, consistency: 0 };
  }
  const latestDps = dps[0];
  const oldestDps = dps[dps.length - 1];
  const years = dps.length - 1;
  const cagr = years > 0 && oldestDps > 0 ? (Math.pow(latestDps / oldestDps, 1 / years) - 1) * 100 : null;
  let consistentYears = 0;
  for (let i = 0; i < dps.length - 1; i++) {
    if (dps[i] >= dps[i + 1]) consistentYears++;
  }
  const consistency = dps.length > 1 ? (consistentYears / (dps.length - 1)) * 100 : 100;

  const latest = inp.fundamentals.history[0];
  const payout = latest.eps && latest.eps > 0 ? (latestDps / latest.eps) * 100 : null;

  const parts = [
    scale(inp.valuation.dividendYield, 0.3, 3.5, 10),
    scale(cagr, 0, 15, 10),
    scale(consistency, 40, 100, 10),
    payout !== null ? scale(-Math.abs(payout - 40), -45, -5, 10) : { score: 0, missing: true },
  ];
  if (payout === null) missing.push("Payout ratio");
  return { score: avgScore(parts, 10).score, cagr, consistency };
}

// ---------------------------------------------------------------------------
// Risk (section 22)
// ---------------------------------------------------------------------------
function assessRisk(inp: Inputs): { status: RiskStatus; reasons: string[] } {
  const reasons: string[] = [];
  let status: RiskStatus = "GREEN";

  const bump = (level: RiskStatus) => {
    const order: RiskStatus[] = ["GREEN", "AMBER", "RED"];
    if (order.indexOf(level) > order.indexOf(status)) status = level;
  };

  for (const flag of inp.governanceFlags) {
    if (flag.resolved) continue;
    reasons.push(`${flag.flagType}: ${flag.description}`);
    if (flag.severity === "high") bump("RED");
    else if (flag.severity === "medium") bump("AMBER");
  }

  const o = inp.ownership;
  if (o.promoterPledge !== null && o.promoterPledge > 20) {
    bump("RED");
    reasons.push(`Promoter pledge is elevated at ${o.promoterPledge}% of holding.`);
  } else if (o.promoterPledge !== null && o.promoterPledge > 5) {
    bump("AMBER");
    reasons.push(`Promoter pledge of ${o.promoterPledge}% warrants monitoring.`);
  }
  if (o.promoterHoldingChange !== null && o.promoterHoldingChange <= -2) {
    bump("AMBER");
    reasons.push(`Promoter holding fell ${Math.abs(o.promoterHoldingChange)}pp recently.`);
  }

  const latest = inp.fundamentals.history[0];
  const prior = inp.fundamentals.history[2] ?? inp.fundamentals.history[inp.fundamentals.history.length - 1];
  if (!isFinancial(inp.company.sector)) {
    if (latest.fcfToPat !== null && latest.fcfToPat < 0) {
      bump("RED");
      reasons.push("Free cash flow is negative despite reported profits.");
    }
    if (
      latest.debtToEquity !== null &&
      prior.debtToEquity !== null &&
      prior.debtToEquity > 0 &&
      latest.debtToEquity > prior.debtToEquity * 1.25
    ) {
      bump("AMBER");
      reasons.push("Debt has risen materially faster than the historical trend.");
    }
  } else {
    if (latest.gnpa !== null && prior.gnpa !== null && latest.gnpa > prior.gnpa * 1.3) {
      bump("AMBER");
      reasons.push("Asset quality (GNPA) has deteriorated versus recent history.");
    }
  }

  if (inp.fundamentals.latestYoyProfitGrowth !== null && inp.fundamentals.latestYoyProfitGrowth < -15) {
    bump("AMBER");
    reasons.push(`Latest profit declined ${Math.abs(inp.fundamentals.latestYoyProfitGrowth)}% YoY.`);
  }

  if (reasons.length === 0) reasons.push("No red or amber flags detected in available data.");
  return { status, reasons };
}

// ---------------------------------------------------------------------------
// Category classification (sections 13-16)
// ---------------------------------------------------------------------------
function classifyCategory(inp: Inputs, growthScore: number, valuationScore: number, dividendScore: number): StockCategory {
  const f = inp.fundamentals;
  const latest = inp.fundamentals.history[0];

  if (inp.company.marketCapCategory === "Small" && (
    (f.profitCagr5y !== null && f.profitCagr5y < 0 && f.epsCagr !== null && f.epsCagr > 15) ||
    inp.governanceFlags.length > 0
  )) {
    return "Opportunity";
  }

  const isGrowth =
    (f.salesCagr5y ?? 0) >= 15 ||
    (f.profitCagr5y ?? 0) >= 15;
  const isQualityForGrowth = (latest.roce ?? latest.roe ?? 0) >= 15 && (latest.fcfToPat ?? 50) >= 30;
  if (isGrowth && isQualityForGrowth) return "Growth";

  const cheapVsHistory = inp.valuation.pe !== null && inp.valuation.historicalPe !== null && inp.valuation.pe < inp.valuation.historicalPe;
  const cheapVsIndustry = inp.valuation.pe !== null && inp.valuation.industryPe !== null && inp.valuation.pe < inp.valuation.industryPe * 0.85;
  const decentQuality = (latest.roce ?? latest.roe ?? 0) >= 12;
  if ((cheapVsHistory || cheapVsIndustry) && decentQuality) return "Value";

  if (inp.valuation.dividendYield >= 1.5 && (f.profitCagr5y ?? 0) >= 8 && (latest.roce ?? latest.roe ?? 0) >= 12) {
    return "Dividend";
  }

  if (inp.company.marketCapCategory === "Small") return "Opportunity";

  return growthScore >= valuationScore && growthScore >= dividendScore
    ? "Growth"
    : valuationScore >= dividendScore
    ? "Value"
    : "Dividend";
}

// ---------------------------------------------------------------------------
// Confidence engine (section 49)
// ---------------------------------------------------------------------------
function computeConfidence(missing: string[], totalTracked: number): Confidence {
  const available = totalTracked - missing.length;
  const pct = (available / totalTracked) * 100;
  if (pct > 90) return "HIGH";
  if (pct >= 70) return "MEDIUM";
  return "LOW";
}

// ---------------------------------------------------------------------------
// Decision engine (sections 21, 48)
// ---------------------------------------------------------------------------
function decide(
  totalScore: number,
  fundamentalScore: number,
  valuationScore: number,
  riskStatus: RiskStatus,
  latestYoyProfitGrowth: number | null
): Decision {
  if (riskStatus === "RED") {
    return totalScore >= 60 ? "REVIEW" : "AVOID / LOW PRIORITY";
  }

  const strongBusiness = fundamentalScore >= 45; // out of 55
  const expensive = valuationScore < 10; // out of 25
  if (strongBusiness && expensive) return "WATCH / WAIT FOR BETTER PRICE";

  if (riskStatus === "AMBER" && latestYoyProfitGrowth !== null && latestYoyProfitGrowth < -10) {
    return "REVIEW";
  }

  if (totalScore >= 80) return "STRONG BUY / HIGH PRIORITY";
  if (totalScore >= 70) return "ACCUMULATE";
  if (totalScore >= 60) return "WATCH";
  return "AVOID / LOW PRIORITY";
}

// ---------------------------------------------------------------------------
// Reasons for / against (section 23 assessment)
// ---------------------------------------------------------------------------
function buildReasons(inp: Inputs): { reasonsFor: string[]; reasonsAgainst: string[] } {
  const f = inp.fundamentals;
  const latest = f.history[0];
  const reasonsFor: string[] = [];
  const reasonsAgainst: string[] = [];

  if (f.profitCagr5y !== null && f.profitCagr5y >= 12) reasonsFor.push(`Strong 5Y profit CAGR of ${f.profitCagr5y}%`);
  if ((latest.roce ?? 0) >= 18) reasonsFor.push(`ROCE of ${latest.roce}% indicates efficient capital use`);
  if (latest.debtToEquity !== null && latest.debtToEquity <= 0.3 && !isFinancial(inp.company.sector)) {
    reasonsFor.push("Low leverage with a conservative balance sheet");
  }
  if (latest.fcfToPat !== null && latest.fcfToPat >= 70) reasonsFor.push("Strong free cash flow conversion from reported profit");
  if (inp.valuation.pe !== null && inp.valuation.historicalPe !== null && inp.valuation.pe < inp.valuation.historicalPe) {
    reasonsFor.push("Trading below its own historical average valuation");
  }
  if (inp.valuation.dividendYield >= 1.5) reasonsFor.push(`Dividend yield of ${inp.valuation.dividendYield}% with a paying track record`);

  if (inp.valuation.pe !== null && inp.valuation.industryPe !== null && inp.valuation.pe > inp.valuation.industryPe * 1.15) {
    reasonsAgainst.push("Valuation is above the industry average");
  }
  if (latest.debtToEquity !== null && latest.debtToEquity > 0.7 && !isFinancial(inp.company.sector)) {
    reasonsAgainst.push(`Debt/Equity of ${latest.debtToEquity} is on the higher side`);
  }
  if (f.latestYoyProfitGrowth !== null && f.latestYoyProfitGrowth < 0) {
    reasonsAgainst.push(`Latest profit declined ${Math.abs(f.latestYoyProfitGrowth)}% YoY`);
  }
  if (inp.technicals.rsi14 !== null && inp.technicals.rsi14 > 75) {
    reasonsAgainst.push("RSI above 75 — stock may be extended in the short term");
  }
  if (inp.ownership.promoterPledge !== null && inp.ownership.promoterPledge > 5) {
    reasonsAgainst.push(`Promoter pledge of ${inp.ownership.promoterPledge}% is a governance watch item`);
  }

  if (reasonsFor.length === 0) reasonsFor.push("Meets baseline screening criteria on available data");
  if (reasonsAgainst.length === 0) reasonsAgainst.push("No material concerns identified in available data");

  return { reasonsFor, reasonsAgainst };
}

export function computeScore(inp: Inputs): ScoreBreakdown {
  const missing: string[] = [];

  const growthScore = scoreGrowth(inp, missing);
  const profitabilityScore = scoreProfitability(inp, missing);
  const balanceSheetScore = scoreBalanceSheet(inp, missing);
  const cashFlowScore = scoreCashFlow(inp, missing);
  const governanceScore = scoreGovernance(inp, missing);
  const businessQualityScore = scoreBusinessQuality(inp);

  const fundamentalScore = growthScore + profitabilityScore + balanceSheetScore + cashFlowScore + governanceScore + businessQualityScore;

  const valuationScore = scoreValuation(inp, missing);
  const technicalScore = scoreTechnical(inp, missing);
  const { score: dividendScore } = scoreDividend(inp, missing);

  const totalScore = Math.round(fundamentalScore + valuationScore + technicalScore + dividendScore);

  const { status: riskStatus, reasons: riskReasons } = assessRisk(inp);
  const category = classifyCategory(inp, growthScore, valuationScore, dividendScore);
  const confidence = computeConfidence(missing, 16);
  const decision = decide(totalScore, fundamentalScore, valuationScore, riskStatus, inp.fundamentals.latestYoyProfitGrowth);
  const { reasonsFor, reasonsAgainst } = buildReasons(inp);

  return {
    companyId: inp.company.id,
    date: inp.valuation.date,
    growthScore: round1(growthScore),
    profitabilityScore: round1(profitabilityScore),
    balanceSheetScore: round1(balanceSheetScore),
    cashFlowScore: round1(cashFlowScore),
    governanceScore: round1(governanceScore),
    businessQualityScore: round1(businessQualityScore),
    fundamentalScore: round1(fundamentalScore),
    valuationScore: round1(valuationScore),
    technicalScore: round1(technicalScore),
    dividendScore: round1(dividendScore),
    totalScore,
    confidence,
    missingMetrics: Array.from(new Set(missing)),
    category,
    decision,
    riskStatus,
    riskReasons,
    reasonsFor,
    reasonsAgainst,
  };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
