"use client";

import { createContext, useContext } from "react";
import { AllocationSettings, PortfolioHolding, StockCategory, Transaction, WatchlistItem } from "@/lib/types";

export interface ThesisEntry {
  whyIBought: string;
  whatIExpect: string;
  whatCouldGoWrong: string;
  whatWouldMakeMeSell: string;
  lastReviewed: string;
}

export interface PortfolioContextValue {
  settings: AllocationSettings;
  holdings: PortfolioHolding[];
  transactions: Transaction[];
  watchlist: WatchlistItem[];
  thesis: Record<string, ThesisEntry>;
  /** Which backend is actually persisting this data right now. */
  mode: "local" | "supabase";
  /** Always true in "local" mode. In "supabase" mode, false means writes are no-ops until sign-in. */
  signedIn: boolean;
  updateSettings: (patch: Partial<AllocationSettings>) => void;
  buyStock: (companyId: string, category: StockCategory, shares: number, price: number, targetAllocation: number) => void;
  removeHolding: (companyId: string) => void;
  addToWatchlist: (companyId: string, notes?: string) => void;
  removeFromWatchlist: (companyId: string) => void;
  updateWatchlistNotes: (companyId: string, notes: string) => void;
  saveThesis: (companyId: string, entry: Omit<ThesisEntry, "lastReviewed">) => void;
  resetDemo: () => void;
}

export const PortfolioContext = createContext<PortfolioContextValue | null>(null);

export function usePortfolio(): PortfolioContextValue {
  const ctx = useContext(PortfolioContext);
  if (!ctx) throw new Error("usePortfolio must be used within PortfolioProvider");
  return ctx;
}
