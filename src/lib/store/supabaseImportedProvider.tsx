"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { StockView } from "@/lib/types";
import { stockViewFromSupabaseRow } from "@/lib/importedStock/fromSupabaseRow";
import { insertGovernanceFlagsToSupabase, upsertSnapshotToSupabase } from "@/lib/importedStock/writeToSupabase";
import { callRefreshPricesApi } from "@/lib/importedStock/refreshPrices";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/store/authStore";
import { ImportedContext, ImportedContextValue } from "./importedContext";

const NESTED_SELECT = "*, fundamentals_periods(*), fundamentals_summary(*), valuation(*), ownership(*), dividends(*), governance_flags(*), technicals(*)";

export function SupabaseImportedProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const supabase = useMemo(() => createClient(), []);
  const [stockViews, setStockViews] = useState<StockView[]>([]);
  const [importedAt, setImportedAt] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    // Public read — no auth required, matches "market data is shared globally" (section 38).
    const { data, error } = await supabase.from("companies").select(NESTED_SELECT).order("updated_at", { ascending: false });
    if (error || !data) {
      setStockViews([]);
      return;
    }
    setStockViews(data.map(stockViewFromSupabaseRow));
    setImportedAt(data[0]?.updated_at ? String(data[0].updated_at).slice(0, 10) : null);
  }, [supabase]);

  useEffect(() => {
    // Initial load of shared, publicly-readable company data — see LocalPortfolioProvider for why this
    // pattern (fetch-in-effect rather than a lazy initializer) is deliberate.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refetch();
  }, [refetch]);

  const value: ImportedContextValue = {
    importedAt,
    stockViews,
    mode: "supabase",
    signedIn: Boolean(user),

    importSnapshots: async (rows, mode) => {
      if (!user) return { added: 0, replaced: 0 };
      const existingTickers = new Set(stockViews.map((s) => s.company.ticker));
      let added = 0;
      let replaced = 0;
      for (const row of rows) {
        if (existingTickers.has(row.ticker)) replaced++;
        else added++;
        await upsertSnapshotToSupabase(supabase, row, user.id);
      }
      if (mode === "replace") {
        const keep = new Set(rows.map((r) => r.ticker));
        const toRemove = stockViews.filter((s) => !keep.has(s.company.ticker));
        for (const s of toRemove) {
          await supabase.from("companies").delete().eq("ticker", s.company.ticker);
        }
      }
      await refetch();
      return { added, replaced };
    },

    importGovernanceFlags: async (rows) => {
      if (!user) return 0;
      await insertGovernanceFlagsToSupabase(supabase, rows);
      await refetch();
      return rows.length;
    },

    removeCompany: (ticker) => {
      if (!user) return;
      setStockViews((s) => s.filter((x) => x.company.ticker !== ticker)); // optimistic
      supabase
        .from("companies")
        .delete()
        .eq("ticker", ticker)
        .then(() => refetch());
    },

    clearAll: () => {
      if (!user) return;
      (async () => {
        // RLS scopes this delete to companies this user created — other users' imports are untouched.
        await supabase.from("companies").delete().eq("created_by", user.id);
        await refetch();
      })();
    },

    refreshPrices: async () => {
      if (!user) return { updated: 0, tradingDaysFetched: 0, latestTradingDate: null, warnings: ["Sign in to refresh prices."] };
      const tickers = stockViews.map((s) => s.company.ticker);
      if (tickers.length === 0) return { updated: 0, tradingDaysFetched: 0, latestTradingDate: null, warnings: ["Nothing imported to refresh."] };

      const result = await callRefreshPricesApi(tickers);
      const now = new Date().toISOString();
      let updated = 0;
      for (const [ticker, u] of Object.entries(result.updates)) {
        if (!u) continue;
        updated++;
        await supabase.from("technicals").upsert(
          {
            company_id: `imported-${ticker.toLowerCase()}`,
            date: now.slice(0, 10),
            price: u.price,
            dma20: u.dma20,
            dma50: u.dma50,
            rsi14: u.rsi14,
            average_volume: u.averageVolume,
            volume_ratio: u.volumeRatio,
          },
          { onConflict: "company_id" }
        );
      }
      await refetch();
      return { updated, tradingDaysFetched: result.tradingDaysFetched, latestTradingDate: result.latestTradingDate, warnings: result.warnings };
    },
  };

  return <ImportedContext.Provider value={value}>{children}</ImportedContext.Provider>;
}
