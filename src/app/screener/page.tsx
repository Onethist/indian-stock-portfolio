"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { getStockUniverse } from "@/lib/demo";
import { applyFilters, EMPTY_FILTERS, ScreenerFilters, SCREENER_PRESETS, SortKey, sortStocks } from "@/lib/screener";
import { CategoryBadge, DecisionBadge, RiskBadge, ScoreBadge } from "@/components/badges";
import { formatCrore, formatPct, formatValue } from "@/lib/format";
import { usePortfolio } from "@/lib/store/portfolioStore";
import { StockView } from "@/lib/types";

const COLUMNS: { key: SortKey | "name"; label: string }[] = [
  { key: "name", label: "Stock" },
  { key: "marketCap", label: "Mkt Cap" },
  { key: "salesCagr5y", label: "Sales CAGR" },
  { key: "profitCagr5y", label: "Profit CAGR" },
  { key: "roce", label: "ROCE" },
  { key: "roe", label: "ROE" },
  { key: "pe", label: "PE" },
  { key: "fcfYield", label: "FCF Yield" },
  { key: "dividendYield", label: "Div Yield" },
  { key: "totalScore", label: "Score" },
];

export default function ScreenerPage() {
  const universe = getStockUniverse();
  const { addToWatchlist, watchlist } = usePortfolio();
  const [filters, setFilters] = useState<ScreenerFilters>(EMPTY_FILTERS);
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("totalScore");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const filtered = useMemo(() => applyFilters(universe, filters), [universe, filters]);
  const sorted = useMemo(() => sortStocks(filtered, sortKey, sortDir), [filtered, sortKey, sortDir]);

  function applyPreset(key: string) {
    const preset = SCREENER_PRESETS.find((p) => p.key === key);
    if (!preset) return;
    setFilters({ ...EMPTY_FILTERS, ...preset.filters });
    setActivePreset(key);
  }

  function clearFilters() {
    setFilters(EMPTY_FILTERS);
    setActivePreset(null);
  }

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  function exportCsv() {
    const header = ["Ticker", "Company", "Sector", "MarketCap(Cr)", "SalesCAGR5Y", "ProfitCAGR5Y", "ROCE", "ROE", "D/E", "FCF/PAT", "PE", "PEG", "DivYield", "RSI", "Score", "Risk", "Decision"];
    const rows = sorted.map((s) => {
      const latest = s.fundamentals.history[0];
      return [
        s.company.ticker, s.company.companyName, s.company.sector, s.company.marketCap,
        s.fundamentals.salesCagr5y, s.fundamentals.profitCagr5y, latest.roce, latest.roe, latest.debtToEquity,
        latest.fcfToPat, s.valuation.pe, s.valuation.peg, s.valuation.dividendYield, s.technicals.rsi14,
        s.score.totalScore, s.score.riskStatus, s.score.decision,
      ].join(",");
    });
    const csv = [header.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "screener-results.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  const watchedIds = new Set(watchlist.map((w) => w.companyId));

  return (
    <div className="mx-auto max-w-7xl space-y-5 px-4 py-6 sm:px-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Screener</h1>
        <p className="mt-1 text-sm text-slate-500">{sorted.length} of {universe.length} stocks match your filters.</p>
      </div>

      <input
        type="text"
        placeholder="Search by ticker or company name…"
        value={filters.search}
        onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
        className="w-full max-w-md rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
      />

      <div className="flex flex-wrap gap-2">
        {SCREENER_PRESETS.map((preset) => (
          <button
            key={preset.key}
            onClick={() => applyPreset(preset.key)}
            title={preset.description}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
              activePreset === preset.key
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-300 bg-white text-slate-600 hover:border-slate-400"
            }`}
          >
            {preset.label}
          </button>
        ))}
        {(activePreset || filters.search) && (
          <button onClick={clearFilters} className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-slate-700">
            Clear filters
          </button>
        )}
        <button onClick={exportCsv} className="ml-auto rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:border-slate-400">
          Export CSV
        </button>
      </div>

      {activePreset && (
        <p className="rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-600">
          {SCREENER_PRESETS.find((p) => p.key === activePreset)?.description}
          {activePreset === "deep-value-watch" && (
            <span className="ml-1 font-semibold text-amber-700">— a watchlist, not an automatic Buy signal.</span>
          )}
        </p>
      )}

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[1000px] text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              {COLUMNS.map((col) => (
                <th
                  key={col.key}
                  onClick={() => col.key !== "name" && toggleSort(col.key as SortKey)}
                  className={`px-4 py-3 font-medium ${col.key !== "name" ? "cursor-pointer select-none hover:text-slate-800" : ""}`}
                >
                  {col.label}
                  {sortKey === col.key && (sortDir === "desc" ? " ↓" : " ↑")}
                </th>
              ))}
              <th className="px-4 py-3 font-medium">Risk</th>
              <th className="px-4 py-3 font-medium">Decision</th>
              <th className="px-4 py-3 font-medium">Watch</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sorted.map((s) => (
              <ScreenerRow key={s.company.id} stock={s} watched={watchedIds.has(s.company.id)} onWatch={() => addToWatchlist(s.company.id)} />
            ))}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={13} className="px-4 py-10 text-center text-sm text-slate-400">No stocks match these filters.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ScreenerRow({ stock, watched, onWatch }: { stock: StockView; watched: boolean; onWatch: () => void }) {
  const latest = stock.fundamentals.history[0];
  return (
    <tr className="hover:bg-slate-50">
      <td className="px-4 py-3">
        <Link href={`/stock/${stock.company.ticker}`} className="font-semibold text-slate-900 hover:underline">
          {stock.company.ticker}
        </Link>
        <p className="text-xs text-slate-500">{stock.company.sector}</p>
        <CategoryBadge category={stock.score.category} />
      </td>
      <td className="px-4 py-3 text-slate-700">{formatCrore(stock.company.marketCap)}</td>
      <td className="px-4 py-3 text-slate-700">{formatPct(stock.fundamentals.salesCagr5y)}</td>
      <td className="px-4 py-3 text-slate-700">{formatPct(stock.fundamentals.profitCagr5y)}</td>
      <td className="px-4 py-3 text-slate-700">{formatValue(latest.roce, "%")}</td>
      <td className="px-4 py-3 text-slate-700">{formatValue(latest.roe, "%")}</td>
      <td className="px-4 py-3 text-slate-700">{stock.valuation.pe ? stock.valuation.pe.toFixed(1) : "N/A"}</td>
      <td className="px-4 py-3 text-slate-700">{formatValue(stock.valuation.fcfYield, "%")}</td>
      <td className="px-4 py-3 text-slate-700">{formatValue(stock.valuation.dividendYield, "%")}</td>
      <td className="px-4 py-3"><ScoreBadge score={stock.score.totalScore} /></td>
      <td className="px-4 py-3"><RiskBadge status={stock.score.riskStatus} /></td>
      <td className="px-4 py-3"><DecisionBadge decision={stock.score.decision} /></td>
      <td className="px-4 py-3">
        <button
          onClick={onWatch}
          disabled={watched}
          className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-600 hover:border-slate-400 disabled:cursor-default disabled:opacity-40"
        >
          {watched ? "Added" : "+ Watch"}
        </button>
      </td>
    </tr>
  );
}
