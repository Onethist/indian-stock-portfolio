export function DemoDataBanner() {
  return (
    <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-xs font-medium text-amber-900 sm:px-6">
      DEMO DATA — NOT LIVE MARKET DATA. Fictional companies generated for this build; prices as of 10 Sep 2026 (demo generator).
    </div>
  );
}

export function Disclaimer() {
  return (
    <p className="mx-auto max-w-7xl px-4 pb-8 pt-6 text-center text-xs leading-relaxed text-slate-400 sm:px-6">
      This tool is for educational and decision-support purposes only. Scores and filters are quantitative heuristics,
      not personalized investment advice or guarantees of returns. Users should independently research investments and
      consider their financial circumstances and risk tolerance.
    </p>
  );
}
