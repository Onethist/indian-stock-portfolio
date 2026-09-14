import { StockView } from "@/lib/types";
import { computeFactorDashboard, FactorDashboard } from "./factors";
import { computeMasterScore, computeStrategyScores, MasterScoreBreakdown, StrategyScores } from "./strategyScores";
import { computeDcf, DcfResult } from "./dcf";
import { assessTraps, TrapAssessment } from "./traps";
import { classify, ClassificationResult } from "./classify";

export interface FundamentalScanResult {
  master: MasterScoreBreakdown;
  strategy: StrategyScores;
  factors: FactorDashboard;
  dcf: DcfResult | null;
  traps: TrapAssessment;
  classification: ClassificationResult;
}

export function scanStock(stock: StockView, universe: StockView[]): FundamentalScanResult {
  const master = computeMasterScore(stock);
  const strategy = computeStrategyScores(stock, universe);
  const factors = computeFactorDashboard(stock, universe);
  const dcf = computeDcf(stock);
  const traps = assessTraps(stock);
  const classification = classify(master, strategy, stock.score.riskStatus, traps);

  return { master, strategy, factors, dcf, traps, classification };
}

export type { FactorDashboard } from "./factors";
export type { MasterScoreBreakdown, StrategyScores } from "./strategyScores";
export type { DcfResult, DcfScenario } from "./dcf";
export type { TrapAssessment } from "./traps";
export type { ClassificationResult, ScannerClassification } from "./classify";
