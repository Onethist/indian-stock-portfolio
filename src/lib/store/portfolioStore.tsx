"use client";

import React, { useEffect, useMemo, useState } from "react";
import { AllocationSettings, PortfolioHolding, Transaction, WatchlistItem } from "@/lib/types";
import { DEFAULT_ALLOCATION_SETTINGS } from "@/lib/portfolio";
import { isSupabaseConfigured } from "@/lib/supabase/isConfigured";
import { PortfolioContext, PortfolioContextValue, ThesisEntry } from "./portfolioContext";
import { SupabasePortfolioProvider } from "./supabasePortfolioProvider";

export type { ThesisEntry } from "./portfolioContext";
export { usePortfolio } from "./portfolioContext";

const STORAGE_KEY = "isp-builder-state-v1";

interface PersistedState {
  settings: AllocationSettings;
  holdings: PortfolioHolding[];
  transactions: Transaction[];
  watchlist: WatchlistItem[];
  thesis: Record<string, ThesisEntry>;
}

const DEFAULT_STATE: PersistedState = {
  settings: DEFAULT_ALLOCATION_SETTINGS,
  holdings: [],
  transactions: [],
  watchlist: [],
  thesis: {},
};

function loadState(): PersistedState {
  if (typeof window === "undefined") return DEFAULT_STATE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw) as PersistedState;
    return { ...DEFAULT_STATE, ...parsed, settings: { ...DEFAULT_ALLOCATION_SETTINGS, ...parsed.settings } };
  } catch {
    return DEFAULT_STATE;
  }
}

/** localStorage-backed provider — used whenever Supabase isn't configured (the zero-config demo path). */
function LocalPortfolioProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<PersistedState>(DEFAULT_STATE);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // Deliberately deferred to an effect (not a lazy useState initializer) so the first
    // client render matches the server-rendered DEFAULT_STATE and avoids a hydration mismatch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState(loadState());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state, hydrated]);

  const value = useMemo<PortfolioContextValue>(() => ({
    ...state,
    mode: "local",
    signedIn: true,
    updateSettings: (patch) => setState((s) => ({ ...s, settings: { ...s.settings, ...patch } })),
    buyStock: (companyId, category, shares, price, targetAllocation) => {
      setState((s) => {
        const existing = s.holdings.find((h) => h.companyId === companyId);
        const amount = shares * price;
        const tx: Transaction = {
          id: `${companyId}-${Date.now()}`,
          companyId,
          transactionType: "BUY",
          date: new Date().toISOString().slice(0, 10),
          shares,
          price,
          fees: 0,
          taxes: 0,
          amount,
        };
        let holdings: PortfolioHolding[];
        if (existing) {
          const newShares = existing.shares + shares;
          const newInvested = existing.investedAmount + amount;
          holdings = s.holdings.map((h) =>
            h.companyId === companyId
              ? { ...h, shares: newShares, investedAmount: newInvested, averageBuyPrice: newInvested / newShares, targetAllocation }
              : h
          );
        } else {
          holdings = [
            ...s.holdings,
            {
              id: `${companyId}-holding`,
              companyId,
              category,
              shares,
              averageBuyPrice: price,
              investedAmount: amount,
              targetAllocation,
            },
          ];
        }
        return { ...s, holdings, transactions: [...s.transactions, tx] };
      });
    },
    removeHolding: (companyId) => {
      setState((s) => ({ ...s, holdings: s.holdings.filter((h) => h.companyId !== companyId) }));
    },
    addToWatchlist: (companyId, notes = "") => {
      setState((s) => {
        if (s.watchlist.some((w) => w.companyId === companyId)) return s;
        const item: WatchlistItem = {
          id: `${companyId}-watch`,
          companyId,
          targetPrice: null,
          targetScore: null,
          notes,
          createdAt: new Date().toISOString().slice(0, 10),
        };
        return { ...s, watchlist: [...s.watchlist, item] };
      });
    },
    removeFromWatchlist: (companyId) => {
      setState((s) => ({ ...s, watchlist: s.watchlist.filter((w) => w.companyId !== companyId) }));
    },
    updateWatchlistNotes: (companyId, notes) => {
      setState((s) => ({ ...s, watchlist: s.watchlist.map((w) => (w.companyId === companyId ? { ...w, notes } : w)) }));
    },
    saveThesis: (companyId, entry) => {
      setState((s) => ({
        ...s,
        thesis: {
          ...s.thesis,
          [companyId]: { ...entry, lastReviewed: new Date().toISOString().slice(0, 10) },
        },
      }));
    },
    resetDemo: () => setState(DEFAULT_STATE),
  }), [state]);

  return <PortfolioContext.Provider value={value}>{children}</PortfolioContext.Provider>;
}

/** Picks localStorage or Supabase persistence — see isSupabaseConfigured(). Consumers (usePortfolio()) never know the difference. */
export function PortfolioProvider({ children }: { children: React.ReactNode }) {
  if (isSupabaseConfigured()) return <SupabasePortfolioProvider>{children}</SupabasePortfolioProvider>;
  return <LocalPortfolioProvider>{children}</LocalPortfolioProvider>;
}
