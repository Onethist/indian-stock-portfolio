"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useStockByTicker } from "@/lib/universe";
import { StockDetailClient } from "@/components/stock/StockDetailClient";

export default function StockDetailPage() {
  const params = useParams<{ ticker: string }>();
  const stock = useStockByTicker(params.ticker);

  if (!stock) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <p className="text-lg font-semibold text-slate-900">No stock found for &ldquo;{params.ticker}&rdquo;.</p>
        <p className="mt-2 text-sm text-slate-500">
          It isn&apos;t in the demo universe or your imported data. <Link href="/admin/import" className="underline">Import it via CSV</Link>{" "}
          or go back to the <Link href="/screener" className="underline">screener</Link>.
        </p>
      </div>
    );
  }

  return <StockDetailClient stock={stock} />;
}
