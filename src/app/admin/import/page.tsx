"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useImportedData } from "@/lib/store/importedStore";
import { useUniverse } from "@/lib/universe";
import { GOVERNANCE_CSV_TEMPLATE, parseCsv, rowsToObjects, SNAPSHOT_CSV_TEMPLATE } from "@/lib/importedStock/csv";
import { validateGovernanceRows, validateSnapshotRows } from "@/lib/importedStock/validate";
import { CompanySnapshotRow, GovernanceFlagRow, RowValidation } from "@/lib/importedStock/types";
import { ScoreBadge } from "@/components/badges";
import { formatCrore } from "@/lib/format";

function downloadText(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ImportPage() {
  const { snapshots, importedAt, importSnapshots, importGovernanceFlags, removeCompany, clearAll } = useImportedData();
  const universe = useUniverse();
  const importedStocks = universe.filter((s) => s.company.dataSource === "imported");

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-6 sm:px-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Data Import</h1>
        <p className="mt-1 text-sm text-slate-500">
          Bring real Indian stocks into the screener, scorer, and Fundamental Scanner via CSV — no API key required.
          Anything you don&apos;t supply stays blank rather than being invented, which correctly lowers that stock&apos;s confidence rating.
        </p>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">
        <p className="font-medium text-slate-900">Good to know before you import</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Each row is treated as one real, current snapshot — not a fabricated multi-year history like the demo companies. Fundamentals charts will show a single point unless you fill in <code>salesCagr5y</code> / <code>profitCagr5y</code> etc. directly.</li>
          <li>Technical indicators (DMA/RSI/52-week range) are optional columns — leave them blank if you don&apos;t have them; the technical score will simply be lower-weighted rather than guessed.</li>
          <li>Data is stored only in this browser (localStorage) — nothing is uploaded anywhere.</li>
          <li>Imported stocks appear everywhere the demo stocks do — screener, dashboard, portfolio, scanner — tagged &ldquo;Imported&rdquo;.</li>
        </ul>
      </div>

      <SnapshotImportSection
        onImport={(rows, mode) => importSnapshots(rows, mode)}
        existingCount={snapshots.length}
      />

      <GovernanceImportSection
        knownTickers={new Set(snapshots.map((s) => s.ticker))}
        onImport={(rows, mode) => importGovernanceFlags(rows, mode)}
      />

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">Currently imported ({importedStocks.length})</h2>
          {snapshots.length > 0 && (
            <button
              onClick={() => {
                if (confirm("Remove all imported companies and governance flags? This cannot be undone.")) clearAll();
              }}
              className="text-xs font-medium text-red-500 hover:text-red-700"
            >
              Clear all imported data
            </button>
          )}
        </div>
        {importedAt && <p className="mt-1 text-xs text-slate-400">Last imported: {importedAt}</p>}
        <div className="mt-3 divide-y divide-slate-100">
          {importedStocks.map((s) => (
            <div key={s.company.id} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <Link href={`/stock/${s.company.ticker}`} className="text-sm font-semibold text-slate-900 hover:underline">
                  {s.company.companyName} ({s.company.ticker})
                </Link>
                <p className="mt-0.5 text-xs text-slate-500">{s.company.sector} · {formatCrore(s.company.marketCap)} · {s.governanceFlags.length} governance flag(s)</p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <ScoreBadge score={s.score.totalScore} />
                <button onClick={() => removeCompany(s.company.ticker)} className="text-xs font-medium text-slate-400 hover:text-red-600">
                  Remove
                </button>
              </div>
            </div>
          ))}
          {importedStocks.length === 0 && <p className="py-4 text-sm text-slate-400">Nothing imported yet — upload a CSV above to get started.</p>}
        </div>
      </div>
    </div>
  );
}

function SnapshotImportSection({
  onImport,
  existingCount,
}: {
  onImport: (rows: CompanySnapshotRow[], mode: "merge" | "replace") => { added: number; replaced: number };
  existingCount: number;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pasteText, setPasteText] = useState("");
  const [results, setResults] = useState<RowValidation<CompanySnapshotRow>[] | null>(null);
  const [mode, setMode] = useState<"merge" | "replace">("merge");
  const [confirmation, setConfirmation] = useState<string | null>(null);

  function parse(text: string) {
    const { objects } = rowsToObjects(parseCsv(text));
    setResults(validateSnapshotRows(objects));
    setConfirmation(null);
  }

  function handleFile(file: File) {
    file.text().then(parse);
  }

  const validRows = results?.filter((r) => r.valid).map((r) => r.parsed as CompanySnapshotRow) ?? [];

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-slate-900">1. Companies & fundamentals snapshot</h2>
        <button
          onClick={() => downloadText("company-snapshot-template.csv", SNAPSHOT_CSV_TEMPLATE)}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:border-slate-400"
        >
          Download template CSV
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          className="text-sm"
        />
        <span className="text-xs text-slate-400">or paste CSV text below</span>
      </div>

      <textarea
        value={pasteText}
        onChange={(e) => setPasteText(e.target.value)}
        placeholder="ticker,isin,companyName,exchange,sector,..."
        rows={4}
        className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-xs focus:border-slate-500 focus:outline-none"
      />
      <button
        onClick={() => parse(pasteText)}
        disabled={!pasteText.trim()}
        className="mt-2 rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:border-slate-400 disabled:opacity-40"
      >
        Parse pasted CSV
      </button>

      {results && (
        <div className="mt-4">
          <ValidationTable results={results} idColumn="ticker" />

          <div className="mt-3 flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-1.5 text-xs text-slate-600">
              <input type="radio" checked={mode === "merge"} onChange={() => setMode("merge")} />
              Merge with existing ({existingCount} already imported)
            </label>
            <label className="flex items-center gap-1.5 text-xs text-slate-600">
              <input type="radio" checked={mode === "replace"} onChange={() => setMode("replace")} />
              Replace all imported companies
            </label>
          </div>

          <button
            onClick={() => {
              const { added, replaced } = onImport(validRows, mode);
              setConfirmation(`Imported ${added} new and updated ${replaced} existing compan${added + replaced === 1 ? "y" : "ies"}.`);
              setResults(null);
              setPasteText("");
              if (fileInputRef.current) fileInputRef.current.value = "";
            }}
            disabled={validRows.length === 0}
            className="mt-3 rounded-md bg-slate-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Import {validRows.length} valid row{validRows.length === 1 ? "" : "s"}
          </button>
        </div>
      )}
      {confirmation && <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{confirmation}</p>}
    </section>
  );
}

function GovernanceImportSection({
  knownTickers,
  onImport,
}: {
  knownTickers: Set<string>;
  onImport: (rows: GovernanceFlagRow[], mode: "merge" | "replace") => number;
}) {
  const [pasteText, setPasteText] = useState("");
  const [results, setResults] = useState<RowValidation<GovernanceFlagRow>[] | null>(null);
  const [confirmation, setConfirmation] = useState<string | null>(null);

  function parse(text: string) {
    const { objects } = rowsToObjects(parseCsv(text));
    setResults(validateGovernanceRows(objects, knownTickers));
    setConfirmation(null);
  }

  const validRows = results?.filter((r) => r.valid).map((r) => r.parsed as GovernanceFlagRow) ?? [];

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-slate-900">2. Governance flags (optional)</h2>
        <button
          onClick={() => downloadText("governance-flags-template.csv", GOVERNANCE_CSV_TEMPLATE)}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:border-slate-400"
        >
          Download template CSV
        </button>
      </div>
      <p className="mt-2 text-xs text-slate-500">
        Any RED-severity flag here will override that stock&apos;s decision, exactly like the demo data&apos;s governance flags.
      </p>

      <textarea
        value={pasteText}
        onChange={(e) => setPasteText(e.target.value)}
        placeholder="ticker,date,flagType,severity,description,source,resolved"
        rows={3}
        className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-xs focus:border-slate-500 focus:outline-none"
      />
      <button
        onClick={() => parse(pasteText)}
        disabled={!pasteText.trim()}
        className="mt-2 rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:border-slate-400 disabled:opacity-40"
      >
        Parse pasted CSV
      </button>

      {results && (
        <div className="mt-4">
          <ValidationTable results={results} idColumn="ticker" />
          <button
            onClick={() => {
              const count = onImport(validRows, "merge");
              setConfirmation(`Imported ${count} governance flag(s).`);
              setResults(null);
              setPasteText("");
            }}
            disabled={validRows.length === 0}
            className="mt-3 rounded-md bg-slate-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Import {validRows.length} valid row{validRows.length === 1 ? "" : "s"}
          </button>
        </div>
      )}
      {confirmation && <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{confirmation}</p>}
    </section>
  );
}

function ValidationTable<T>({ results, idColumn }: { results: RowValidation<T>[]; idColumn: string }) {
  const validCount = results.filter((r) => r.valid).length;
  return (
    <div>
      <p className="text-xs text-slate-500">
        {validCount} of {results.length} row{results.length === 1 ? "" : "s"} valid.
      </p>
      <div className="mt-2 max-h-72 overflow-y-auto rounded-lg border border-slate-200">
        <table className="w-full text-left text-xs">
          <thead className="sticky top-0 bg-slate-50 text-slate-500">
            <tr>
              <th className="px-3 py-2 font-medium">Row</th>
              <th className="px-3 py-2 font-medium">{idColumn}</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {results.map((r) => (
              <tr key={r.rowIndex} className={r.valid ? "" : "bg-red-50"}>
                <td className="px-3 py-2 text-slate-500">{r.rowIndex}</td>
                <td className="px-3 py-2 font-medium text-slate-800">{r.raw[idColumn] || "—"}</td>
                <td className="px-3 py-2">
                  {r.valid ? (
                    <span className="text-emerald-600">✓ Valid{r.warnings.length > 0 ? " (with warnings)" : ""}</span>
                  ) : (
                    <span className="font-medium text-red-600">✗ Skipped</span>
                  )}
                </td>
                <td className="px-3 py-2 text-slate-600">
                  {[...r.errors, ...r.warnings].map((m, i) => <div key={i}>{m}</div>)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
