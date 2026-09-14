"use client";

import { useState } from "react";
import Link from "next/link";
import { StockView } from "@/lib/types";
import { CategoryBadge, ConfidenceBadge, DecisionBadge, RiskBadge, ScoreBadge } from "@/components/badges";
import { formatCrore, formatDate, formatINR, formatPct, formatValue } from "@/lib/format";
import { SimpleLineChart } from "@/components/charts/SimpleLineChart";
import { usePortfolio } from "@/lib/store/portfolioStore";
import { buildSipPlan, suggestTargetAllocation } from "@/lib/portfolio";
import { useUniverse } from "@/lib/universe";
import { scanStock } from "@/lib/scanner";

const TABS = ["Overview", "Fundamentals", "Cash Flow", "Valuation", "Dividend", "Technical", "Risk", "Scanner", "Portfolio", "Thesis"] as const;
type Tab = (typeof TABS)[number];

export function StockDetailClient({ stock }: { stock: StockView }) {
  const [tab, setTab] = useState<Tab>("Overview");
  const { addToWatchlist, watchlist } = usePortfolio();
  const watched = watchlist.some((w) => w.companyId === stock.company.id);
  const prevClose = stock.prices[stock.prices.length - 2]?.close ?? stock.technicals.price;
  const change = stock.technicals.price - prevClose;
  const changePct = (change / prevClose) * 100;

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6">
      <Link href="/screener" className="text-xs font-medium text-slate-400 hover:text-slate-700">← Back to screener</Link>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold text-slate-900">{stock.company.companyName}</h1>
              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-500">{stock.company.exchange}</span>
            </div>
            <p className="mt-0.5 text-sm text-slate-500">{stock.company.ticker} · {stock.company.sector} · {stock.company.industry}</p>
            <div className="mt-3 flex flex-wrap items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900">₹{stock.technicals.price.toFixed(2)}</span>
              <span className={`text-sm font-medium ${change >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                {change >= 0 ? "+" : ""}{change.toFixed(2)} ({formatPct(changePct)})
              </span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex flex-wrap justify-end gap-2">
              <ScoreBadge score={stock.score.totalScore} />
              <CategoryBadge category={stock.score.category} />
              <RiskBadge status={stock.score.riskStatus} />
              <ConfidenceBadge level={stock.score.confidence} />
              {stock.company.dataSource === "imported" && (
                <span className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-0.5 text-xs font-medium text-sky-700">Imported</span>
              )}
            </div>
            <DecisionBadge decision={stock.score.decision} />
            <button
              onClick={() => addToWatchlist(stock.company.id)}
              disabled={watched}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:border-slate-400 disabled:opacity-40"
            >
              {watched ? "In watchlist" : "+ Add to watchlist"}
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 sm:grid-cols-4">
          <ScoreStat label="Fundamental" value={stock.score.fundamentalScore} max={55} />
          <ScoreStat label="Valuation" value={stock.score.valuationScore} max={25} />
          <ScoreStat label="Technical" value={stock.score.technicalScore} max={10} />
          <ScoreStat label="Dividend" value={stock.score.dividendScore} max={10} />
        </div>
      </div>

      <div className="flex flex-wrap gap-1 border-b border-slate-200">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-t-md px-3 py-2 text-sm font-medium transition-colors ${
              tab === t ? "border-b-2 border-slate-900 text-slate-900" : "text-slate-400 hover:text-slate-700"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div>
        {tab === "Overview" && <OverviewTab stock={stock} />}
        {tab === "Fundamentals" && <FundamentalsTab stock={stock} />}
        {tab === "Cash Flow" && <CashFlowTab stock={stock} />}
        {tab === "Valuation" && <ValuationTab stock={stock} />}
        {tab === "Dividend" && <DividendTab stock={stock} />}
        {tab === "Technical" && <TechnicalTab stock={stock} />}
        {tab === "Risk" && <RiskTab stock={stock} />}
        {tab === "Scanner" && <ScannerTab stock={stock} />}
        {tab === "Portfolio" && <PortfolioTab stock={stock} />}
        {tab === "Thesis" && <ThesisTab stock={stock} />}
      </div>
    </div>
  );
}

function Card({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      {title && <h3 className="mb-3 text-sm font-semibold text-slate-900">{title}</h3>}
      {children}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-slate-400">{label}</p>
      <p className="text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function ScoreStat({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = (value / max) * 100;
  return (
    <div>
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>{label}</span>
        <span className="font-medium text-slate-700">{value}/{max}</span>
      </div>
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div className="h-full bg-slate-800" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function OverviewTab({ stock }: { stock: StockView }) {
  const latest = stock.fundamentals.history[0];
  const chartPoints = stock.prices.filter((_, i) => i % 15 === 0).map((p) => ({ label: p.date.slice(5), value: p.close }));
  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <div className="space-y-5 lg:col-span-2">
        <Card title="Business">
          <p className="text-sm leading-relaxed text-slate-600">{stock.company.businessDescription}</p>
        </Card>
        <Card title="Price">
          <SimpleLineChart points={chartPoints} color="#0f172a" />
        </Card>
        <Card title="Assessment">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">Why it qualifies</p>
              <ul className="mt-2 space-y-1.5 text-sm text-slate-600">
                {stock.score.reasonsFor.map((r, i) => <li key={i}>• {r}</li>)}
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">Why it might fail</p>
              <ul className="mt-2 space-y-1.5 text-sm text-slate-600">
                {stock.score.reasonsAgainst.map((r, i) => <li key={i}>• {r}</li>)}
              </ul>
            </div>
          </div>
          {stock.score.missingMetrics.length > 0 && (
            <p className="mt-4 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
              Missing for full confidence: {stock.score.missingMetrics.join(", ")}
            </p>
          )}
        </Card>
      </div>
      <div className="space-y-5">
        <Card title="Key stats">
          <div className="grid grid-cols-2 gap-4">
            <Stat label="Market cap" value={formatCrore(stock.company.marketCap)} />
            <Stat label="PE" value={stock.valuation.pe ? stock.valuation.pe.toFixed(1) : "N/A"} />
            <Stat label="ROCE" value={formatValue(latest.roce, "%")} />
            <Stat label="ROE" value={formatValue(latest.roe, "%")} />
            <Stat label="Sales CAGR 5Y" value={formatPct(stock.fundamentals.salesCagr5y)} />
            <Stat label="Profit CAGR 5Y" value={formatPct(stock.fundamentals.profitCagr5y)} />
            <Stat label="Div yield" value={formatValue(stock.valuation.dividendYield, "%")} />
            <Stat label="D/E" value={formatValue(latest.debtToEquity)} />
          </div>
        </Card>
      </div>
    </div>
  );
}

function historyForChart(stock: StockView, field: keyof StockView["fundamentals"]["history"][number]) {
  return [...stock.fundamentals.history]
    .reverse()
    .map((h) => ({ label: h.period, value: h[field] as number | null }));
}

function FundamentalsTab({ stock }: { stock: StockView }) {
  const financial = ["Banks", "NBFC", "Insurance"].includes(stock.company.sector);
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Card title="Revenue (₹ Cr)"><SimpleLineChart points={historyForChart(stock, "revenue")} color="#2563eb" /></Card>
      {!financial && <Card title="EBITDA (₹ Cr)"><SimpleLineChart points={historyForChart(stock, "ebitda")} color="#0891b2" /></Card>}
      <Card title="PAT (₹ Cr)"><SimpleLineChart points={historyForChart(stock, "pat")} color="#7c3aed" /></Card>
      <Card title="EPS (₹)"><SimpleLineChart points={historyForChart(stock, "eps")} color="#059669" /></Card>
      {!financial && <Card title="ROCE (%)"><SimpleLineChart points={historyForChart(stock, "roce")} color="#d97706" /></Card>}
      <Card title="ROE (%)"><SimpleLineChart points={historyForChart(stock, "roe")} color="#dc2626" /></Card>
      {!financial && <Card title="Debt (₹ Cr)"><SimpleLineChart points={historyForChart(stock, "debt")} color="#64748b" /></Card>}
      {financial && <Card title="GNPA (%)"><SimpleLineChart points={historyForChart(stock, "gnpa")} color="#dc2626" /></Card>}
    </div>
  );
}

function CashFlowTab({ stock }: { stock: StockView }) {
  const latest = stock.fundamentals.history[0];
  if (["Banks", "NBFC", "Insurance"].includes(stock.company.sector)) {
    return <Card><p className="text-sm text-slate-500">Traditional CFO/FCF metrics are not applicable for financial-sector companies. See Fundamentals for asset-quality and margin trends instead.</p></Card>;
  }
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        <Stat label="CFO" value={latest.operatingCashFlow !== null ? `₹${latest.operatingCashFlow.toFixed(0)} Cr` : "N/A"} />
        <Stat label="Capex" value={latest.capex !== null ? `₹${latest.capex.toFixed(0)} Cr` : "N/A"} />
        <Stat label="FCF" value={latest.freeCashFlow !== null ? `₹${latest.freeCashFlow.toFixed(0)} Cr` : "N/A"} />
        <Stat label="CFO/PAT" value={formatValue(latest.cfoToPat, "%")} />
        <Stat label="FCF/PAT" value={formatValue(latest.fcfToPat, "%")} />
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Operating cash flow (₹ Cr)"><SimpleLineChart points={historyForChart(stock, "operatingCashFlow")} color="#0891b2" /></Card>
        <Card title="Free cash flow (₹ Cr)"><SimpleLineChart points={historyForChart(stock, "freeCashFlow")} color="#059669" /></Card>
        <Card title="CFO / PAT (%)"><SimpleLineChart points={historyForChart(stock, "cfoToPat")} color="#7c3aed" /></Card>
        <Card title="FCF / PAT (%)"><SimpleLineChart points={historyForChart(stock, "fcfToPat")} color="#d97706" /></Card>
      </div>
    </div>
  );
}

function ValuationTab({ stock }: { stock: StockView }) {
  const v = stock.valuation;
  return (
    <div className="space-y-5">
      <Card title="Valuation snapshot">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat label="PE" value={v.pe ? v.pe.toFixed(1) : "N/A"} />
          <Stat label="Forward PE" value={v.forwardPe ? v.forwardPe.toFixed(1) : "N/A"} />
          <Stat label="Historical PE (5Y avg)" value={v.historicalPe ? v.historicalPe.toFixed(1) : "N/A"} />
          <Stat label="Industry PE" value={v.industryPe ? v.industryPe.toFixed(1) : "N/A"} />
          <Stat label="PEG" value={v.peg ? v.peg.toFixed(2) : "N/A"} />
          <Stat label="PB" value={v.pb !== null ? v.pb.toFixed(2) : "N/A"} />
          <Stat label="EV/EBITDA" value={v.evEbitda ? v.evEbitda.toFixed(1) : "N/A"} />
          <Stat label="Price/Sales" value={v.priceSales ? v.priceSales.toFixed(2) : "N/A"} />
          <Stat label="FCF yield" value={formatValue(v.fcfYield, "%")} />
          <Stat label="Earnings yield" value={formatValue(v.earningsYield, "%")} />
          <Stat label="Dividend yield" value={formatValue(v.dividendYield, "%")} />
        </div>
      </Card>
      <Card title="How this compares">
        <ul className="space-y-1.5 text-sm text-slate-600">
          <li>• PE is {v.pe !== null && v.historicalPe !== null ? (v.pe < v.historicalPe ? "below" : "above") : "N/A vs"} its own 5-year historical average ({v.historicalPe ?? "N/A"}).</li>
          <li>• PE is {v.pe !== null && v.industryPe !== null ? (v.pe < v.industryPe ? "below" : "above") : "N/A vs"} the industry average ({v.industryPe ?? "N/A"}).</li>
          <li>• Growth preset check: PE &lt; 35 and PEG &lt; 2 → {v.pe !== null && v.pe < 35 && v.peg !== null && v.peg < 2 ? "Pass" : "Fail"}.</li>
          <li>• Value preset check: PE &lt; 20 → {v.pe !== null && v.pe < 20 ? "Pass" : "Fail"}.</li>
        </ul>
      </Card>
    </div>
  );
}

function DividendTab({ stock }: { stock: StockView }) {
  if (stock.dividends.length === 0) {
    return <Card><p className="text-sm text-slate-500">This company has not paid a dividend in the demo history.</p></Card>;
  }
  const points = [...stock.dividends].reverse().map((d) => ({ label: d.exDate.slice(0, 4), value: d.dividendPerShare }));
  const latest = stock.fundamentals.history[0];
  const payout = latest.eps && latest.eps > 0 ? (stock.dividends[0].dividendPerShare / latest.eps) * 100 : null;
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Card title="Dividend per share (₹)"><SimpleLineChart points={points} color="#0d9488" /></Card>
      <Card title="Summary">
        <div className="grid grid-cols-2 gap-4">
          <Stat label="Yield" value={formatValue(stock.valuation.dividendYield, "%")} />
          <Stat label="Payout ratio" value={payout !== null ? `${payout.toFixed(0)}%` : "N/A"} />
          <Stat label="Latest DPS" value={`₹${stock.dividends[0].dividendPerShare}`} />
          <Stat label="Years paying" value={String(stock.dividends.length)} />
        </div>
      </Card>
    </div>
  );
}

function TechnicalTab({ stock }: { stock: StockView }) {
  const t = stock.technicals;
  const chartPoints = stock.prices.filter((_, i) => i % 10 === 0).map((p) => ({ label: p.date.slice(5), value: p.close }));
  const condition = t.priceVs200dma !== null && t.priceVs200dma > 0 && t.dma50VsDma200 !== null && t.dma50VsDma200 > 0 && t.rsi14 !== null && t.rsi14 >= 40 && t.rsi14 <= 65;
  return (
    <div className="space-y-5">
      <Card title="Price vs moving averages"><SimpleLineChart points={chartPoints} color="#0f172a" /></Card>
      <Card title="Indicators">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat label="20 DMA" value={formatValue(t.dma20)} />
          <Stat label="50 DMA" value={formatValue(t.dma50)} />
          <Stat label="100 DMA" value={formatValue(t.dma100)} />
          <Stat label="200 DMA" value={formatValue(t.dma200)} />
          <Stat label="Price vs 200 DMA" value={formatPct(t.priceVs200dma)} />
          <Stat label="50 vs 200 DMA" value={formatPct(t.dma50VsDma200)} />
          <Stat label="RSI (14)" value={formatValue(t.rsi14)} />
          <Stat label="52W range" value={t.low52w !== null && t.high52w !== null ? `₹${t.low52w} – ₹${t.high52w}` : "N/A"} />
          <Stat label="Dist. from 52W high" value={formatPct(t.distanceFrom52wHigh)} />
          <Stat label="Volume ratio" value={formatValue(t.volumeRatio, "x")} />
        </div>
      </Card>
      <div className={`rounded-lg border px-4 py-3 text-sm ${condition ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-slate-200 bg-slate-50 text-slate-600"}`}>
        {condition
          ? "Technical entry conditions are favorable: price above 200 DMA, 50 DMA above 200 DMA, RSI in the 40–65 accumulation zone."
          : "Technical entry conditions are not fully aligned right now. Technical analysis is for entry timing only and never overrides fundamentals or governance flags."}
        {t.rsi14 !== null && t.rsi14 > 75 && <p className="mt-1 font-medium">RSI above 75 — avoid chasing.</p>}
      </div>
    </div>
  );
}

function RiskTab({ stock }: { stock: StockView }) {
  return (
    <div className="space-y-5">
      <Card title={`Risk status: ${stock.score.riskStatus}`}>
        <div className="mb-3"><RiskBadge status={stock.score.riskStatus} /></div>
        <ul className="space-y-1.5 text-sm text-slate-600">
          {stock.score.riskReasons.map((r, i) => <li key={i}>• {r}</li>)}
        </ul>
      </Card>
      {stock.governanceFlags.length > 0 && (
        <Card title="Governance flags">
          <div className="space-y-3">
            {stock.governanceFlags.map((f) => (
              <div key={f.id} className="rounded-lg border border-slate-200 p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-900">{f.flagType}</p>
                  <span className={`text-xs font-medium uppercase ${f.severity === "high" ? "text-red-600" : f.severity === "medium" ? "text-amber-600" : "text-slate-500"}`}>
                    {f.severity}
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-600">{f.description}</p>
                <p className="mt-1 text-xs text-slate-400">{formatDate(f.date)} · {f.source}</p>
              </div>
            ))}
          </div>
        </Card>
      )}
      <Card title="Ownership">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat label="Promoter holding" value={formatValue(stock.ownership.promoterHolding, "%")} />
          <Stat label="Promoter change" value={formatPct(stock.ownership.promoterHoldingChange)} />
          <Stat label="Promoter pledge" value={formatValue(stock.ownership.promoterPledge, "%")} />
          <Stat label="FII holding" value={formatValue(stock.ownership.fiiHolding, "%")} />
          <Stat label="DII holding" value={formatValue(stock.ownership.diiHolding, "%")} />
        </div>
      </Card>
    </div>
  );
}

const FACTOR_LABELS: { key: "value" | "quality" | "growth" | "dividend" | "size" | "investment" | "momentum"; label: string }[] = [
  { key: "value", label: "Value" },
  { key: "quality", label: "Quality" },
  { key: "growth", label: "Growth" },
  { key: "dividend", label: "Dividend" },
  { key: "size", label: "Size" },
  { key: "investment", label: "Investment" },
  { key: "momentum", label: "Momentum" },
];

function ScannerTab({ stock }: { stock: StockView }) {
  const universe = useUniverse();
  const scan = scanStock(stock, universe);
  const { master, strategy, factors, dcf, traps, classification } = scan;

  return (
    <div className="space-y-5">
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Fundamental Scanner classification</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">{classification.classification}</p>
            <p className="mt-1 text-sm text-slate-500">{classification.description}</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Master score</p>
            <p className="text-2xl font-bold text-slate-900">{master.total}/100</p>
          </div>
        </div>
        <p className="mt-3 text-xs text-slate-400">
          Based on the Indian Long-Term Fundamental Analysis Master Framework — a starting heuristic architecture, not a predictive or backtested model.
        </p>
      </Card>

      <div className="grid grid-cols-3 gap-4">
        <ScoreDial label="Value score" value={strategy.valueScore} />
        <ScoreDial label="Growth score" value={strategy.growthScore} />
        <ScoreDial label="Dividend score" value={strategy.dividendScore} />
      </div>

      <Card title="Master score breakdown (section 73)">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat label="Business quality" value={`${master.businessQuality}/15`} />
          <Stat label="Growth" value={`${master.growth}/15`} />
          <Stat label="Profitability" value={`${master.profitability}/15`} />
          <Stat label="Cash flow" value={`${master.cashFlow}/15`} />
          <Stat label="Balance sheet" value={`${master.balanceSheet}/10`} />
          <Stat label="Valuation" value={`${master.valuation}/20`} />
          <Stat label="Capital allocation / dividend" value={`${master.capitalAllocationDividend}/5`} />
          <Stat label="Risk / governance" value={`${master.riskGovernance}/5`} />
        </div>
      </Card>

      <Card title="Factor exposure (percentile within this universe)">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {FACTOR_LABELS.map(({ key, label }) => (
            <div key={key} className="rounded-lg border border-slate-100 px-3 py-2 text-center">
              <p className="text-xs text-slate-400">{label}</p>
              <p className="text-lg font-semibold text-slate-900">{factors[key]}</p>
            </div>
          ))}
          <div className="rounded-lg border border-slate-100 px-3 py-2 text-center">
            <p className="text-xs text-slate-400">Volatility</p>
            <p className="text-lg font-semibold text-slate-900">{factors.volatility}</p>
          </div>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          12M price return {formatPct(factors.momentum12m)} · Annualized volatility {formatValue(factors.annualizedVolatility, "%")}
        </p>
      </Card>

      <Card title="Simple two-stage DCF (illustrative, section 29 & 64)">
        {dcf ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs uppercase tracking-wide text-slate-400">
                  <tr>
                    <th className="py-1 pr-4 font-medium">Scenario</th>
                    <th className="py-1 pr-4 font-medium">Growth</th>
                    <th className="py-1 pr-4 font-medium">Discount rate</th>
                    <th className="py-1 pr-4 font-medium">Intrinsic value/share</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr><td className="py-1.5 pr-4 text-slate-600">Bear</td><td className="py-1.5 pr-4">{formatPct(dcf.bear.growthAssumption)}</td><td className="py-1.5 pr-4">{dcf.bear.discountRate}%</td><td className="py-1.5 pr-4 font-medium">₹{dcf.bear.intrinsicValue}</td></tr>
                  <tr><td className="py-1.5 pr-4 font-semibold text-slate-900">Base</td><td className="py-1.5 pr-4">{formatPct(dcf.base.growthAssumption)}</td><td className="py-1.5 pr-4">{dcf.base.discountRate}%</td><td className="py-1.5 pr-4 font-semibold">₹{dcf.base.intrinsicValue}</td></tr>
                  <tr><td className="py-1.5 pr-4 text-slate-600">Bull</td><td className="py-1.5 pr-4">{formatPct(dcf.bull.growthAssumption)}</td><td className="py-1.5 pr-4">{dcf.bull.discountRate}%</td><td className="py-1.5 pr-4 font-medium">₹{dcf.bull.intrinsicValue}</td></tr>
                </tbody>
              </table>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-4">
              <div>
                <p className="text-xs text-slate-400">Current price</p>
                <p className="text-sm font-semibold text-slate-900">₹{stock.technicals.price.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Margin of safety (base case)</p>
                <p className={`text-sm font-semibold ${dcf.marginOfSafety >= 0 ? "text-emerald-600" : "text-red-600"}`}>{formatPct(dcf.marginOfSafety)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">5Y explicit + {dcf.terminalGrowth}% terminal growth</p>
              </div>
            </div>
            <p className="mt-3 text-xs text-slate-400">
              Illustrative only: assumes 5 years of the growth rate shown, a {dcf.terminalGrowth}% terminal growth rate, and a discount rate widened for higher risk status. Not a price target.
            </p>
            {Math.abs(dcf.marginOfSafety) > 150 && (
              <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                This gap is extreme because current free cash flow yield is very low relative to price — a plain FCF-based DCF is a poor fit for
                a low-FCF-yield or cyclical business like this (section 54). Weigh P/B, normalized earnings, or asset value more heavily here
                instead of this DCF output.
              </p>
            )}
          </>
        ) : (
          <p className="text-sm text-slate-500">Insufficient free cash flow data to run a DCF for this company — never invented.</p>
        )}
      </Card>

      <Card title="Trap detection (sections 66-68)">
        <div className="mb-3 flex flex-wrap gap-2">
          <TrapBadge label="Value trap" active={traps.valueTrap} />
          <TrapBadge label="Growth trap" active={traps.growthTrap} />
          <TrapBadge label="Dividend trap" active={traps.dividendTrap} />
        </div>
        <ul className="space-y-1.5 text-sm text-slate-600">
          {traps.reasons.map((r, i) => <li key={i}>• {r}</li>)}
        </ul>
      </Card>
    </div>
  );
}

function ScoreDial({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 text-center shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div className="h-full bg-slate-800" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function TrapBadge({ label, active }: { label: string; active: boolean }) {
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${active ? "bg-red-100 text-red-800 border border-red-200" : "bg-slate-100 text-slate-500 border border-slate-200"}`}>
      {label}: {active ? "Flagged" : "Clear"}
    </span>
  );
}

function PortfolioTab({ stock }: { stock: StockView }) {
  const { holdings, settings, buyStock } = usePortfolio();
  const universe = useUniverse();
  const holding = holdings.find((h) => h.companyId === stock.company.id);
  const peers = universe.filter((s) => s.score.category === stock.score.category);
  const suggested = Math.round(suggestTargetAllocation(stock, peers, settings));
  const [amount, setAmount] = useState(String(Math.min(2000, suggested || 2000)));

  const plan = holding ? buildSipPlan(holding, settings) : null;

  function handleBuy() {
    const rupees = Number(amount);
    if (!rupees || rupees <= 0) return;
    const shares = +(rupees / stock.technicals.price).toFixed(4);
    buyStock(stock.company.id, stock.score.category, shares, stock.technicals.price, holding?.targetAllocation ?? suggested);
  }

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Card title="Suggested position sizing">
        <div className="grid grid-cols-2 gap-4">
          <Stat label="Category budget target" value={formatINR(suggested)} />
          <Stat label="Suggested tranches" value={String(settings.tranches)} />
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Based on score, risk status, category budget, and the max position size for a {stock.company.marketCapCategory.toLowerCase()}-cap {stock.score.category.toLowerCase()} stock.
        </p>
        <div className="mt-4 flex items-end gap-2">
          <div className="flex-1">
            <label className="text-xs text-slate-500">Buy amount (₹)</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            />
          </div>
          <button onClick={handleBuy} className="rounded-md bg-slate-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-slate-800">
            Add to portfolio
          </button>
        </div>
      </Card>
      <Card title="Current holding">
        {holding && plan ? (
          <div className="grid grid-cols-2 gap-4">
            <Stat label="Shares" value={holding.shares.toFixed(2)} />
            <Stat label="Avg buy price" value={`₹${holding.averageBuyPrice.toFixed(2)}`} />
            <Stat label="Invested" value={formatINR(holding.investedAmount)} />
            <Stat label="Current value" value={formatINR(holding.shares * stock.technicals.price)} />
            <Stat label="Target" value={formatINR(plan.targetAmount)} />
            <Stat label="Remaining" value={formatINR(plan.remainingAmount)} />
            <Stat label="Next tranche" value={formatINR(plan.nextTrancheAmount)} />
            <Stat label="Tranches done" value={`${plan.tranchesCompleted} / ${plan.tranchesPlanned}`} />
          </div>
        ) : (
          <p className="text-sm text-slate-500">No position yet. Use the form to plan your first tranche.</p>
        )}
      </Card>
    </div>
  );
}

function ThesisTab({ stock }: { stock: StockView }) {
  const { thesis, saveThesis } = usePortfolio();
  const existing = thesis[stock.company.id];
  const [whyIBought, setWhyIBought] = useState(existing?.whyIBought ?? "");
  const [whatIExpect, setWhatIExpect] = useState(existing?.whatIExpect ?? "");
  const [whatCouldGoWrong, setWhatCouldGoWrong] = useState(existing?.whatCouldGoWrong ?? "");
  const [whatWouldMakeMeSell, setWhatWouldMakeMeSell] = useState(existing?.whatWouldMakeMeSell ?? "");

  return (
    <Card title="Investment thesis journal">
      <div className="grid gap-4 sm:grid-cols-2">
        <ThesisField label="Why I bought" value={whyIBought} onChange={setWhyIBought} />
        <ThesisField label="What I expect" value={whatIExpect} onChange={setWhatIExpect} />
        <ThesisField label="What could go wrong" value={whatCouldGoWrong} onChange={setWhatCouldGoWrong} />
        <ThesisField label="What would make me sell" value={whatWouldMakeMeSell} onChange={setWhatWouldMakeMeSell} />
      </div>
      <div className="mt-4 flex items-center gap-3">
        <button
          onClick={() => saveThesis(stock.company.id, { whyIBought, whatIExpect, whatCouldGoWrong, whatWouldMakeMeSell })}
          className="rounded-md bg-slate-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-slate-800"
        >
          Save thesis
        </button>
        {existing && <p className="text-xs text-slate-400">Last reviewed: {formatDate(existing.lastReviewed)}</p>}
      </div>
    </Card>
  );
}

function ThesisField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-xs font-medium text-slate-500">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:border-slate-500 focus:outline-none"
      />
    </div>
  );
}
