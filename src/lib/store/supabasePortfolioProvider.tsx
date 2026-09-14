"use client";

import React, { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/store/authStore";
import { AllocationSettings, PortfolioHolding, StockCategory, Transaction, WatchlistItem } from "@/lib/types";
import { DEFAULT_ALLOCATION_SETTINGS } from "@/lib/portfolio";
import { PortfolioContext, PortfolioContextValue, ThesisEntry } from "./portfolioContext";

function settingsFromRow(row: Record<string, unknown> | null): AllocationSettings {
  if (!row) return DEFAULT_ALLOCATION_SETTINGS;
  return {
    capital: Number(row.capital),
    growthPct: Number(row.growth_pct),
    valuePct: Number(row.value_pct),
    dividendPct: Number(row.dividend_pct),
    opportunityPct: Number(row.opportunity_pct),
    maxPositions: Number(row.max_positions),
    tranches: Number(row.tranches),
    maxSectorExposurePct: Number(row.max_sector_exposure_pct),
    maxSingleStockPct: {
      large: Number(row.max_single_stock_large),
      mid: Number(row.max_single_stock_mid),
      small: Number(row.max_single_stock_small),
      opportunity: Number(row.max_single_stock_opportunity),
    },
  };
}

function settingsToRow(userId: string, s: AllocationSettings) {
  return {
    user_id: userId,
    capital: s.capital,
    growth_pct: s.growthPct,
    value_pct: s.valuePct,
    dividend_pct: s.dividendPct,
    opportunity_pct: s.opportunityPct,
    max_positions: s.maxPositions,
    tranches: s.tranches,
    max_sector_exposure_pct: s.maxSectorExposurePct,
    max_single_stock_large: s.maxSingleStockPct.large,
    max_single_stock_mid: s.maxSingleStockPct.mid,
    max_single_stock_small: s.maxSingleStockPct.small,
    max_single_stock_opportunity: s.maxSingleStockPct.opportunity,
  };
}

function holdingFromRow(row: Record<string, unknown>): PortfolioHolding {
  return {
    id: row.id as string,
    companyId: row.company_id as string,
    category: row.category as StockCategory,
    shares: Number(row.shares),
    averageBuyPrice: Number(row.average_buy_price),
    investedAmount: Number(row.invested_amount),
    targetAllocation: Number(row.target_allocation),
  };
}

function watchlistFromRow(row: Record<string, unknown>): WatchlistItem {
  return {
    id: row.id as string,
    companyId: row.company_id as string,
    targetPrice: row.target_price === null ? null : Number(row.target_price),
    targetScore: row.target_score === null ? null : Number(row.target_score),
    notes: (row.notes as string) ?? "",
    createdAt: (row.created_at as string)?.slice(0, 10),
  };
}

function transactionFromRow(row: Record<string, unknown>): Transaction {
  return {
    id: row.id as string,
    companyId: row.company_id as string,
    transactionType: row.transaction_type as Transaction["transactionType"],
    date: row.date as string,
    shares: Number(row.shares),
    price: Number(row.price),
    fees: Number(row.fees),
    taxes: Number(row.taxes),
    amount: Number(row.amount),
  };
}

export function SupabasePortfolioProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [settings, setSettings] = useState<AllocationSettings>(DEFAULT_ALLOCATION_SETTINGS);
  const [holdings, setHoldings] = useState<PortfolioHolding[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [thesis, setThesis] = useState<Record<string, ThesisEntry>>({});

  const supabase = useMemo(() => createClient(), []);
  const userId = user?.id ?? null;

  const refetchAll = React.useCallback(async () => {
    if (!userId) {
      setSettings(DEFAULT_ALLOCATION_SETTINGS);
      setHoldings([]);
      setTransactions([]);
      setWatchlist([]);
      setThesis({});
      return;
    }
    const [settingsRes, holdingsRes, txRes, watchlistRes, thesisRes] = await Promise.all([
      supabase.from("allocation_settings").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("portfolio_holdings").select("*").eq("user_id", userId),
      supabase.from("transactions").select("*").eq("user_id", userId).order("date", { ascending: false }),
      supabase.from("watchlist").select("*").eq("user_id", userId),
      supabase.from("thesis_notes").select("*").eq("user_id", userId),
    ]);
    setSettings(settingsFromRow(settingsRes.data));
    setHoldings((holdingsRes.data ?? []).map(holdingFromRow));
    setTransactions((txRes.data ?? []).map(transactionFromRow));
    setWatchlist((watchlistRes.data ?? []).map(watchlistFromRow));
    const thesisMap: Record<string, ThesisEntry> = {};
    for (const row of thesisRes.data ?? []) {
      thesisMap[row.company_id as string] = {
        whyIBought: (row.why_i_bought as string) ?? "",
        whatIExpect: (row.what_i_expect as string) ?? "",
        whatCouldGoWrong: (row.what_could_go_wrong as string) ?? "",
        whatWouldMakeMeSell: (row.what_would_make_me_sell as string) ?? "",
        lastReviewed: (row.last_reviewed as string) ?? "",
      };
    }
    setThesis(thesisMap);
  }, [supabase, userId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refetchAll();
  }, [refetchAll]);

  const value: PortfolioContextValue = {
    settings,
    holdings,
    transactions,
    watchlist,
    thesis,
    mode: "supabase",
    signedIn: Boolean(userId),

    updateSettings: (patch) => {
      if (!userId) return;
      const merged = { ...settings, ...patch };
      setSettings(merged); // optimistic
      supabase.from("allocation_settings").upsert(settingsToRow(userId, merged), { onConflict: "user_id" }).then();
    },

    buyStock: (companyId, category, shares, price, targetAllocation) => {
      if (!userId) return;
      (async () => {
        const amount = shares * price;
        const { data: existing } = await supabase
          .from("portfolio_holdings")
          .select("*")
          .eq("user_id", userId)
          .eq("company_id", companyId)
          .maybeSingle();

        if (existing) {
          const newShares = Number(existing.shares) + shares;
          const newInvested = Number(existing.invested_amount) + amount;
          await supabase
            .from("portfolio_holdings")
            .update({ shares: newShares, invested_amount: newInvested, average_buy_price: newInvested / newShares, target_allocation: targetAllocation, updated_at: new Date().toISOString() })
            .eq("id", existing.id);
        } else {
          await supabase.from("portfolio_holdings").insert({
            user_id: userId,
            company_id: companyId,
            category,
            shares,
            average_buy_price: price,
            invested_amount: amount,
            target_allocation: targetAllocation,
          });
        }
        await supabase.from("transactions").insert({
          user_id: userId,
          company_id: companyId,
          transaction_type: "BUY",
          date: new Date().toISOString().slice(0, 10),
          shares,
          price,
          fees: 0,
          taxes: 0,
          amount,
        });
        await refetchAll();
      })();
    },

    removeHolding: (companyId) => {
      if (!userId) return;
      setHoldings((h) => h.filter((x) => x.companyId !== companyId)); // optimistic
      supabase.from("portfolio_holdings").delete().eq("user_id", userId).eq("company_id", companyId).then();
    },

    addToWatchlist: (companyId, notes = "") => {
      if (!userId || watchlist.some((w) => w.companyId === companyId)) return;
      supabase
        .from("watchlist")
        .insert({ user_id: userId, company_id: companyId, notes })
        .then(() => refetchAll());
    },

    removeFromWatchlist: (companyId) => {
      if (!userId) return;
      setWatchlist((w) => w.filter((x) => x.companyId !== companyId)); // optimistic
      supabase.from("watchlist").delete().eq("user_id", userId).eq("company_id", companyId).then();
    },

    updateWatchlistNotes: (companyId, notes) => {
      if (!userId) return;
      setWatchlist((w) => w.map((x) => (x.companyId === companyId ? { ...x, notes } : x))); // optimistic
      supabase.from("watchlist").update({ notes }).eq("user_id", userId).eq("company_id", companyId).then();
    },

    saveThesis: (companyId, entry) => {
      if (!userId) return;
      const lastReviewed = new Date().toISOString().slice(0, 10);
      setThesis((t) => ({ ...t, [companyId]: { ...entry, lastReviewed } })); // optimistic
      supabase
        .from("thesis_notes")
        .upsert(
          {
            user_id: userId,
            company_id: companyId,
            why_i_bought: entry.whyIBought,
            what_i_expect: entry.whatIExpect,
            what_could_go_wrong: entry.whatCouldGoWrong,
            what_would_make_me_sell: entry.whatWouldMakeMeSell,
            last_reviewed: lastReviewed,
          },
          { onConflict: "user_id,company_id" }
        )
        .then();
    },

    resetDemo: () => {
      if (!userId) return;
      (async () => {
        await Promise.all([
          supabase.from("portfolio_holdings").delete().eq("user_id", userId),
          supabase.from("transactions").delete().eq("user_id", userId),
          supabase.from("watchlist").delete().eq("user_id", userId),
          supabase.from("thesis_notes").delete().eq("user_id", userId),
          supabase.from("allocation_settings").delete().eq("user_id", userId),
        ]);
        await refetchAll();
      })();
    },
  };

  void authLoading;
  return <PortfolioContext.Provider value={value}>{children}</PortfolioContext.Provider>;
}
