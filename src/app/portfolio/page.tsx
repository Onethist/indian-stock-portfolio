"use client";

import { useState } from "react";
import Link from "next/link";
import { useUniverse } from "@/lib/universe";
import { usePortfolio } from "@/lib/store/portfolioStore";
import {
  CATEGORY_PCT_KEY,
  categoryBudget,
  computeAllocationWarnings,
  computePortfolioSummary,
  buildSipPlan,
} from "@/lib/portfolio";
import { formatINR, formatPct } from "@/lib/format";
import { CategoryBadge, DecisionBadge, RiskBadge, ScoreBadge } from "@/components/badges";
import { AllocationSettings, StockCategory } from "@/lib/types";

const CATEGORIES: StockCategory[] = ["Growth", "Value", "Dividend", "Opportunity"];

export default function PortfolioPage() {
  const universe = useUniverse();
  const { settings, holdings, updateSettings, removeHolding } = usePortfolio();
  const summary = computePortfolioSummary(holdings, universe);
  const warnings = computeAllocationWarnings(holdings, universe, settings);
  const totalInvested = summary.investedAmount || 1;

  const [editing, setEditing] = useState(false);

  function exportCsv() {
    const header = ["Ticker", "Company", "Category", "Shares", "AvgPrice", "Invested", "CurrentPrice", "CurrentValue", "P/L", "P/L%", "TargetAllocation"];
    const rows = holdings.map((h) => {
      const stock = universe.find((s) => s.company.id === h.companyId);
      const price = stock?.technicals.price ?? h.averageBuyPrice;
      const current = h.shares * price;
      const pl = current - h.investedAmount;
      return [
        stock?.company.ticker, stock?.company.companyName, h.category, h.shares.toFixed(2), h.averageBuyPrice.toFixed(2),
        h.investedAmount.toFixed(0), price.toFixed(2), current.toFixed(0), pl.toFixed(0), ((pl / h.investedAmount) * 100).toFixed(1),
        h.targetAllocation.toFixed(0),
      ].join(",");
    });
    const csv = [header.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "portfolio.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Portfolio</h1>
          <p className="mt-1 text-sm text-slate-500">Capital {formatINR(settings.capital)} · Horizon 5+ years · {settings.tranches} tranches</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setEditing((e) => !e)} className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:border-slate-400">
            {editing ? "Done editing" : "Edit allocation"}
          </button>
          <button onClick={exportCsv} className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:border-slate-400">
            Export CSV
          </button>
        </div>
      </div>

      {editing && <AllocationEditor settings={settings} onChange={updateSettings} />}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Invested" value={formatINR(summary.investedAmount)} />
        <StatCard label="Current value" value={formatINR(summary.currentValue)} />
        <StatCard label="P/L" value={formatINR(summary.pl)} tone={summary.pl >= 0 ? "positive" : "negative"} />
        <StatCard label="P/L %" value={formatPct(summary.plPct)} tone={summary.pl >= 0 ? "positive" : "negative"} />
      </div>

      {warnings.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-900">Allocation warnings</p>
          <ul className="mt-2 space-y-1 text-sm text-amber-800">
            {warnings.map((w, i) => <li key={i}>• {w.message}</li>)}
          </ul>
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">Category allocation</h2>
        <div className="mt-4 space-y-4">
          {CATEGORIES.map((cat) => {
            const budget = categoryBudget(settings, cat);
            const invested = summary.byCategory[cat].invested;
            const pct = budget > 0 ? Math.min((invested / budget) * 100, 100) : 0;
            return (
              <div key={cat}>
                <div className="flex items-center justify-between text-sm text-slate-600">
                  <span className="font-medium">{cat} — target {settings[CATEGORY_PCT_KEY[cat]]}%</span>
                  <span>{formatINR(invested)} / {formatINR(budget)}</span>
                </div>
                <div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full bg-slate-800" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[1100px] text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              {["Stock", "Category", "Shares", "Avg price", "Invested", "Current", "P/L", "Target alloc.", "Current alloc.", "Score", "Risk", "Decision", ""].map((h) => (
                <th key={h} className="px-4 py-3 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {holdings.map((h) => {
              const stock = universe.find((s) => s.company.id === h.companyId);
              if (!stock) return null;
              const price = stock.technicals.price;
              const current = h.shares * price;
              const pl = current - h.investedAmount;
              const plPct = (pl / h.investedAmount) * 100;
              const currentAllocPct = (h.investedAmount / totalInvested) * 100;
              return (
                <tr key={h.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link href={`/stock/${stock.company.ticker}`} className="font-semibold text-slate-900 hover:underline">{stock.company.ticker}</Link>
                    <p className="text-xs text-slate-500">{stock.company.sector}</p>
                  </td>
                  <td className="px-4 py-3"><CategoryBadge category={h.category} /></td>
                  <td className="px-4 py-3 text-slate-700">{h.shares.toFixed(2)}</td>
                  <td className="px-4 py-3 text-slate-700">₹{h.averageBuyPrice.toFixed(2)}</td>
                  <td className="px-4 py-3 text-slate-700">{formatINR(h.investedAmount)}</td>
                  <td className="px-4 py-3 text-slate-700">{formatINR(current)}</td>
                  <td className={`px-4 py-3 font-medium ${pl >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                    {formatINR(pl)} <span className="text-xs">({formatPct(plPct)})</span>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{formatINR(h.targetAllocation)}</td>
                  <td className="px-4 py-3 text-slate-700">{currentAllocPct.toFixed(1)}%</td>
                  <td className="px-4 py-3"><ScoreBadge score={stock.score.totalScore} /></td>
                  <td className="px-4 py-3"><RiskBadge status={stock.score.riskStatus} /></td>
                  <td className="px-4 py-3"><DecisionBadge decision={stock.score.decision} /></td>
                  <td className="px-4 py-3">
                    <button onClick={() => removeHolding(h.companyId)} className="text-xs font-medium text-slate-400 hover:text-red-600">Remove</button>
                  </td>
                </tr>
              );
            })}
            {holdings.length === 0 && (
              <tr><td colSpan={13} className="px-4 py-10 text-center text-sm text-slate-400">
                No holdings yet. Go to the <Link href="/screener" className="underline">screener</Link>, open a stock, and use the Portfolio tab to add your first tranche.
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      <SipPlannerSection />
    </div>
  );
}

function SipPlannerSection() {
  const universe = useUniverse();
  const { holdings, settings } = usePortfolio();
  const rows = holdings
    .map((h) => ({ stock: universe.find((s) => s.company.id === h.companyId), holding: h, plan: buildSipPlan(h, settings) }))
    .filter((r) => r.stock);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-slate-900">SIP / Buy planner</h2>
      <p className="mt-1 text-xs text-slate-500">Staged buying — never the full target amount at once.</p>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[800px] text-left text-sm">
          <thead className="text-xs uppercase tracking-wide text-slate-500">
            <tr>
              {["Stock", "Target", "Invested", "Remaining", "Next tranche", "Tranches", "Decision"].map((h) => (
                <th key={h} className="px-3 py-2 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map(({ stock, plan }) => stock && (
              <tr key={stock.company.id}>
                <td className="px-3 py-2 font-medium text-slate-900">{stock.company.ticker}</td>
                <td className="px-3 py-2 text-slate-700">{formatINR(plan.targetAmount)}</td>
                <td className="px-3 py-2 text-slate-700">{formatINR(plan.investedAmount)}</td>
                <td className="px-3 py-2 text-slate-700">{formatINR(plan.remainingAmount)}</td>
                <td className="px-3 py-2 font-semibold text-slate-900">{formatINR(plan.nextTrancheAmount)}</td>
                <td className="px-3 py-2 text-slate-700">{plan.tranchesCompleted}/{plan.tranchesPlanned}</td>
                <td className="px-3 py-2"><DecisionBadge decision={stock.score.decision} /></td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={7} className="px-3 py-6 text-center text-sm text-slate-400">No active positions.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AllocationEditor({ settings, onChange }: { settings: AllocationSettings; onChange: (patch: Partial<AllocationSettings>) => void }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-slate-900">Allocation settings</h2>
      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Field label="Capital (₹)" value={settings.capital} onChange={(v) => onChange({ capital: v })} />
        <Field label="Growth %" value={settings.growthPct} onChange={(v) => onChange({ growthPct: v })} />
        <Field label="Value %" value={settings.valuePct} onChange={(v) => onChange({ valuePct: v })} />
        <Field label="Dividend %" value={settings.dividendPct} onChange={(v) => onChange({ dividendPct: v })} />
        <Field label="Opportunity %" value={settings.opportunityPct} onChange={(v) => onChange({ opportunityPct: v })} />
        <Field label="Max positions" value={settings.maxPositions} onChange={(v) => onChange({ maxPositions: v })} />
        <Field label="Tranches" value={settings.tranches} onChange={(v) => onChange({ tranches: v })} />
        <Field label="Max sector %" value={settings.maxSectorExposurePct} onChange={(v) => onChange({ maxSectorExposurePct: v })} />
      </div>
      {settings.growthPct + settings.valuePct + settings.dividendPct + settings.opportunityPct !== 100 && (
        <p className="mt-3 text-xs font-medium text-amber-600">
          Category percentages total {settings.growthPct + settings.valuePct + settings.dividendPct + settings.opportunityPct}%, not 100%.
        </p>
      )}
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <label className="text-xs text-slate-500">{label}</label>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
      />
    </div>
  );
}

function StatCard({ label, value, tone }: { label: string; value: string; tone?: "positive" | "negative" }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`mt-1 text-lg font-semibold ${tone === "positive" ? "text-emerald-600" : tone === "negative" ? "text-red-600" : "text-slate-900"}`}>{value}</p>
    </div>
  );
}
