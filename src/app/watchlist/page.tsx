"use client";

import Link from "next/link";
import { useUniverse } from "@/lib/universe";
import { usePortfolio } from "@/lib/store/portfolioStore";
import { DecisionBadge, RiskBadge, ScoreBadge } from "@/components/badges";
import { formatDate, formatValue } from "@/lib/format";

export default function WatchlistPage() {
  const universe = useUniverse();
  const { watchlist, removeFromWatchlist, updateWatchlistNotes } = usePortfolio();

  const rows = watchlist
    .map((w) => ({ item: w, stock: universe.find((s) => s.company.id === w.companyId) }))
    .filter((r) => r.stock);

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Watchlist</h1>
        <p className="mt-1 text-sm text-slate-500">
          {rows.length} stock{rows.length === 1 ? "" : "s"} tracked. Add more from the{" "}
          <Link href="/screener" className="underline">screener</Link>.
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[1000px] text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              {["Stock", "Price", "PE", "Score", "Risk", "Decision", "Notes", "Last update", ""].map((h) => (
                <th key={h} className="px-4 py-3 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map(({ item, stock }) => stock && (
              <tr key={item.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <Link href={`/stock/${stock.company.ticker}`} className="font-semibold text-slate-900 hover:underline">{stock.company.ticker}</Link>
                  <p className="text-xs text-slate-500">{stock.company.companyName}</p>
                </td>
                <td className="px-4 py-3 text-slate-700">₹{stock.technicals.price.toFixed(2)}</td>
                <td className="px-4 py-3 text-slate-700">{formatValue(stock.valuation.pe)}</td>
                <td className="px-4 py-3"><ScoreBadge score={stock.score.totalScore} /></td>
                <td className="px-4 py-3"><RiskBadge status={stock.score.riskStatus} /></td>
                <td className="px-4 py-3"><DecisionBadge decision={stock.score.decision} /></td>
                <td className="px-4 py-3">
                  <input
                    defaultValue={item.notes}
                    onBlur={(e) => updateWatchlistNotes(stock.company.id, e.target.value)}
                    placeholder="Add a note…"
                    className="w-40 rounded-md border border-slate-200 px-2 py-1 text-xs focus:border-slate-400 focus:outline-none"
                  />
                </td>
                <td className="px-4 py-3 text-xs text-slate-400">{formatDate(item.createdAt)}</td>
                <td className="px-4 py-3">
                  <button onClick={() => removeFromWatchlist(stock.company.id)} className="text-xs font-medium text-slate-400 hover:text-red-600">Remove</button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={9} className="px-4 py-10 text-center text-sm text-slate-400">Your watchlist is empty.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
