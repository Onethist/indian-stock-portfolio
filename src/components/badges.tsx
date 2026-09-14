import { Confidence, Decision, RiskStatus, StockCategory } from "@/lib/types";

function Pill({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}>
      {children}
    </span>
  );
}

export function RiskBadge({ status }: { status: RiskStatus }) {
  const styles: Record<RiskStatus, string> = {
    GREEN: "bg-emerald-100 text-emerald-800 border border-emerald-200",
    AMBER: "bg-amber-100 text-amber-800 border border-amber-200",
    RED: "bg-red-100 text-red-800 border border-red-200",
  };
  return <Pill className={styles[status]}>{status}</Pill>;
}

export function ConfidenceBadge({ level }: { level: Confidence }) {
  const styles: Record<Confidence, string> = {
    HIGH: "bg-slate-100 text-slate-700 border border-slate-200",
    MEDIUM: "bg-slate-100 text-slate-600 border border-slate-200",
    LOW: "bg-slate-100 text-slate-500 border border-slate-200",
  };
  return <Pill className={styles[level]}>{level} confidence</Pill>;
}

export function DecisionBadge({ decision }: { decision: Decision }) {
  const styles: Record<Decision, string> = {
    "STRONG BUY / HIGH PRIORITY": "bg-emerald-600 text-white",
    "ACCUMULATE": "bg-emerald-100 text-emerald-800 border border-emerald-200",
    "WATCH": "bg-amber-100 text-amber-800 border border-amber-200",
    "WATCH / WAIT FOR BETTER PRICE": "bg-amber-100 text-amber-800 border border-amber-200",
    "REVIEW": "bg-orange-100 text-orange-800 border border-orange-200",
    "AVOID / LOW PRIORITY": "bg-red-100 text-red-800 border border-red-200",
  };
  return <Pill className={`${styles[decision]} font-semibold`}>{decision}</Pill>;
}

export function CategoryBadge({ category }: { category: StockCategory }) {
  const styles: Record<StockCategory, string> = {
    Growth: "bg-blue-100 text-blue-800 border border-blue-200",
    Value: "bg-purple-100 text-purple-800 border border-purple-200",
    Dividend: "bg-teal-100 text-teal-800 border border-teal-200",
    Opportunity: "bg-orange-100 text-orange-800 border border-orange-200",
  };
  return <Pill className={styles[category]}>{category}</Pill>;
}

export function ScoreBadge({ score }: { score: number }) {
  let className = "bg-red-100 text-red-800 border border-red-200";
  if (score >= 80) className = "bg-emerald-600 text-white";
  else if (score >= 70) className = "bg-emerald-100 text-emerald-800 border border-emerald-200";
  else if (score >= 60) className = "bg-amber-100 text-amber-800 border border-amber-200";
  return <Pill className={`${className} font-semibold`}>{score}/100</Pill>;
}
