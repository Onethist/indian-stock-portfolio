import { RiskStatus } from "@/lib/types";
import { MasterScoreBreakdown, StrategyScores } from "./strategyScores";
import { TrapAssessment } from "./traps";

export type ScannerClassification =
  | "A+ Compounder"
  | "A Quality Growth"
  | "B Value Opportunity"
  | "C Dividend Compounder"
  | "D Watchlist"
  | "E Value Trap Risk"
  | "F Avoid";

export interface ClassificationResult {
  classification: ScannerClassification;
  description: string;
}

const DESCRIPTIONS: Record<ScannerClassification, string> = {
  "A+ Compounder": "High quality + high returns on capital + durable growth + reasonable valuation.",
  "A Quality Growth": "Strong growth + quality + acceptable valuation.",
  "B Value Opportunity": "Good business + attractive valuation + manageable risk.",
  "C Dividend Compounder": "Strong cash flow + sustainable/growing distributions.",
  "D Watchlist": "Good business but valuation or timing is unattractive right now.",
  "E Value Trap Risk": "Cheap but deteriorating — the discount may not be a bargain.",
  "F Avoid": "Weak fundamentals, excessive risk, or poor economics.",
};

/** Section 75: final classification — a synthesis, never a single-metric verdict. */
export function classify(
  master: MasterScoreBreakdown,
  strategy: StrategyScores,
  riskStatus: RiskStatus,
  traps: TrapAssessment
): ClassificationResult {
  let classification: ScannerClassification;

  if (traps.valueTrap) {
    classification = "E Value Trap Risk";
  } else if (riskStatus === "RED") {
    classification = "F Avoid";
  } else if (master.total >= 78 && strategy.growthScore >= 65 && master.valuation >= 11) {
    classification = "A+ Compounder";
  } else if (master.total >= 68 && strategy.growthScore >= 60) {
    classification = "A Quality Growth";
  } else if (master.total >= 60 && strategy.valueScore >= 60) {
    classification = "B Value Opportunity";
  } else if (master.total >= 55 && strategy.dividendScore >= 60) {
    classification = "C Dividend Compounder";
  } else if (master.total >= 50) {
    classification = "D Watchlist";
  } else {
    classification = "F Avoid";
  }

  return { classification, description: DESCRIPTIONS[classification] };
}
