"use client";

import Link from "next/link";
import { getStockUniverse } from "@/lib/demo";
import { usePortfolio } from "@/lib/store/portfolioStore";
import { CATEGORY_PCT_KEY, categoryBudget, computeAllocationWarnings, computePortfolioSummary, buildSipPlan } from "@/lib/portfolio";
import { formatINR, formatPct } from "@/lib/format";
import { DecisionBadge, RiskBadge, ScoreBadge } from "@/components/badges";
import { StockCategory } from "@/lib/types";

const CATEGORIES: StockCategory[] = ["Growth", "Value", "Dividend", "Opportunity"];

export default function DashboardPage() {
  const universe = getStockUniverse();
  const { settings, holdings, watchlist } = usePortfolio();

  const summary = computePortfolioSummary(holdings, universe);
  const warnings = computeAllocationWarnings(holdings, universe, settings);
  const cash = settings.capital - summary.investedAmount;

  const topCandidates = [...universe]
    .filter((s) => s.score.decision === "STRONG BUY / HIGH PRIORITY" || s.score.decision === "ACCUMULATE")
    .sort((a, b) => b.score.totalScore - a.score.totalScore)
    .slice(0, 5);

  const accumulationOpportunities = [...universe]
    .filter((s) => s.score.decision === "ACCUMULATE")
    .sort((a, b) => b.score.totalScore - a.score.totalScore)
    .slice(0, 4);

  const riskAlerts = [...universe]
    .filter((s) => s.score.riskStatus === "RED")
    .slice(0, 4);

  const watchlistStocks = watchlist
    .map((w) => ({ item: w, stock: universe.find((s) => s.company.id === w.companyId) }))
    .filter((w) => w.stock);

  const upcomingSip = holdings
    .map((h) => {
      const stock = universe.find((s) => s.company.id === h.companyId);
      if (!stock) return null;
      const plan = buildSipPlan(h, settings);
      return { stock, plan };
    })
    .filter((x): x is { stock: (typeof universe)[number]; plan: ReturnType<typeof buildSipPlan> } => !!x && x.plan.remainingAmount > 0)
    .sort((a, b) => b.plan.nextTrancheAmount - a.plan.nextTrancheAmount)
    .slice(0, 5);

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-6 sm:px-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">
          QUALITY → GROWTH → CASH FLOW → VALUATION → RISK → TECHNICAL ENTRY → POSITION SIZE
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Portfolio value" value={formatINR(summary.currentValue)} sub={`Invested ${formatINR(summary.investedAmount)}`} />
        <StatCard label="Cash remaining" value={formatINR(Math.max(cash, 0))} sub={`of ${formatINR(settings.capital)} capital`} />
        <StatCard
          label="Unrealized P/L"
          value={formatINR(summary.pl)}
          sub={formatPct(summary.plPct)}
          tone={summary.pl >= 0 ? "positive" : "negative"}
        />
        <StatCard label="Positions" value={String(holdings.length)} sub={`Target max ${settings.maxPositions}`} />
      </div>

      {warnings.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-900">Risk alerts on allocation</p>
          <ul className="mt-2 space-y-1 text-sm text-amber-800">
            {warnings.map((w, i) => <li key={i}>• {w.message}</li>)}
          </ul>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="lg:col-span-2 space-y-6">
          <Panel title="Top candidates" action={<Link href="/screener" className="text-xs font-medium text-slate-500 hover:text-slate-900">View screener →</Link>}>
            <div className="divide-y divide-slate-100">
              {topCandidates.map((s) => (
                <DashboardStockRow key={s.company.id} stock={s} />
              ))}
              {topCandidates.length === 0 && <EmptyRow text="No high-priority candidates in the current universe." />}
            </div>
          </Panel>

          <Panel title="Accumulation opportunities">
            <div className="divide-y divide-slate-100">
              {accumulationOpportunities.map((s) => (
                <DashboardStockRow key={s.company.id} stock={s} />
              ))}
              {accumulationOpportunities.length === 0 && <EmptyRow text="Nothing in the ACCUMULATE band right now." />}
            </div>
          </Panel>

          <Panel title="Risk alerts">
            <div className="divide-y divide-slate-100">
              {riskAlerts.map((s) => (
                <div key={s.company.id} className="flex items-center justify-between gap-3 py-3">
                  <div>
                    <Link href={`/stock/${s.company.ticker}`} className="text-sm font-semibold text-slate-900 hover:underline">
                      {s.company.companyName}
                    </Link>
                    <p className="mt-0.5 text-xs text-slate-500">{s.score.riskReasons[0]}</p>
                  </div>
                  <RiskBadge status={s.score.riskStatus} />
                </div>
              ))}
              {riskAlerts.length === 0 && <EmptyRow text="No RED risk flags in the current universe." />}
            </div>
          </Panel>
        </section>

        <section className="space-y-6">
          <Panel title="Allocation" action={<Link href="/portfolio" className="text-xs font-medium text-slate-500 hover:text-slate-900">Edit →</Link>}>
            <div className="space-y-3 py-2">
              {CATEGORIES.map((cat) => {
                const budget = categoryBudget(settings, cat);
                const invested = summary.byCategory[cat].invested;
                const pct = budget > 0 ? Math.min((invested / budget) * 100, 100) : 0;
                return (
                  <div key={cat}>
                    <div className="flex items-center justify-between text-xs text-slate-600">
                      <span className="font-medium">{cat} · {settings[CATEGORY_PCT_KEY[cat]]}%</span>
                      <span>{formatINR(invested)} / {formatINR(budget)}</span>
                    </div>
                    <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                      <div className={`h-full ${categoryColor(cat)}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </Panel>

          <Panel title="Upcoming SIP" action={<Link href="/portfolio" className="text-xs font-medium text-slate-500 hover:text-slate-900">Portfolio →</Link>}>
            <div className="divide-y divide-slate-100">
              {upcomingSip.map(({ stock, plan }) => (
                <div key={stock.company.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{stock.company.ticker}</p>
                    <p className="text-xs text-slate-500">Remaining {formatINR(plan.remainingAmount)}</p>
                  </div>
                  <p className="text-sm font-semibold text-slate-900">{formatINR(plan.nextTrancheAmount)}</p>
                </div>
              ))}
              {upcomingSip.length === 0 && <EmptyRow text="No holdings with remaining SIP allocation yet." />}
            </div>
          </Panel>

          <Panel title="Watchlist" action={<Link href="/watchlist" className="text-xs font-medium text-slate-500 hover:text-slate-900">View all →</Link>}>
            <div className="divide-y divide-slate-100">
              {watchlistStocks.slice(0, 5).map(({ stock }) => stock && (
                <div key={stock.company.id} className="flex items-center justify-between py-3">
                  <Link href={`/stock/${stock.company.ticker}`} className="text-sm font-medium text-slate-900 hover:underline">
                    {stock.company.ticker}
                  </Link>
                  <ScoreBadge score={stock.score.totalScore} />
                </div>
              ))}
              {watchlistStocks.length === 0 && <EmptyRow text="Your watchlist is empty." />}
            </div>
          </Panel>
        </section>
      </div>
    </div>
  );
}

function categoryColor(cat: StockCategory): string {
  switch (cat) {
    case "Growth": return "bg-blue-500";
    case "Value": return "bg-purple-500";
    case "Dividend": return "bg-teal-500";
    case "Opportunity": return "bg-orange-500";
  }
}

function StatCard({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: "positive" | "negative" }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`mt-1 text-lg font-semibold ${tone === "positive" ? "text-emerald-600" : tone === "negative" ? "text-red-600" : "text-slate-900"}`}>
        {value}
      </p>
      {sub && <p className="mt-0.5 text-xs text-slate-500">{sub}</p>}
    </div>
  );
}

function Panel({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        {action}
      </div>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function EmptyRow({ text }: { text: string }) {
  return <p className="py-4 text-sm text-slate-400">{text}</p>;
}

function DashboardStockRow({ stock }: { stock: ReturnType<typeof getStockUniverse>[number] }) {
  return (
    <div className="flex items-center justify-between gap-3 py-3">
      <div className="min-w-0">
        <Link href={`/stock/${stock.company.ticker}`} className="text-sm font-semibold text-slate-900 hover:underline">
          {stock.company.companyName}
        </Link>
        <p className="mt-0.5 truncate text-xs text-slate-500">{stock.company.sector} · {stock.score.category}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <ScoreBadge score={stock.score.totalScore} />
        <DecisionBadge decision={stock.score.decision} />
      </div>
    </div>
  );
}
