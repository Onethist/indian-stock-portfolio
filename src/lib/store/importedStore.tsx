"use client";

import React, { useEffect, useMemo, useState } from "react";
import { StockView } from "@/lib/types";
import { CompanySnapshotRow, GovernanceFlagRow } from "@/lib/importedStock/types";
import { buildStockViewFromSnapshot } from "@/lib/importedStock/build";
import { isSupabaseConfigured } from "@/lib/supabase/isConfigured";
import { ImportedContext, ImportedContextValue } from "./importedContext";
import { SupabaseImportedProvider } from "./supabaseImportedProvider";

export { useImportedData } from "./importedContext";

const STORAGE_KEY = "isp-builder-imported-v1";

interface ImportedState {
  snapshots: CompanySnapshotRow[];
  governanceFlags: GovernanceFlagRow[];
  importedAt: string | null;
}

const DEFAULT_STATE: ImportedState = { snapshots: [], governanceFlags: [], importedAt: null };

function loadState(): ImportedState {
  if (typeof window === "undefined") return DEFAULT_STATE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    return { ...DEFAULT_STATE, ...(JSON.parse(raw) as ImportedState) };
  } catch {
    return DEFAULT_STATE;
  }
}

/** localStorage-backed provider — used whenever Supabase isn't configured (the zero-config demo path). */
function LocalImportedProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ImportedState>(DEFAULT_STATE);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState(loadState());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state, hydrated]);

  const stockViews = useMemo<StockView[]>(() => {
    if (!state.importedAt) return [];
    return state.snapshots.map((row) => buildStockViewFromSnapshot(row, state.governanceFlags, state.importedAt as string));
  }, [state.snapshots, state.governanceFlags, state.importedAt]);

  const value = useMemo<ImportedContextValue>(() => ({
    importedAt: state.importedAt,
    stockViews,
    mode: "local",
    signedIn: true,
    importSnapshots: async (rows, mode) => {
      const now = new Date().toISOString().slice(0, 10);
      let added = 0;
      let replaced = 0;
      setState((s) => {
        const existingByTicker = new Map(s.snapshots.map((r) => [r.ticker, r]));
        if (mode === "replace") {
          rows.forEach(() => added++);
          return { ...s, snapshots: rows, importedAt: now };
        }
        for (const row of rows) {
          if (existingByTicker.has(row.ticker)) replaced++;
          else added++;
          existingByTicker.set(row.ticker, row);
        }
        return { ...s, snapshots: Array.from(existingByTicker.values()), importedAt: now };
      });
      return { added, replaced };
    },
    importGovernanceFlags: async (rows, mode) => {
      const now = new Date().toISOString().slice(0, 10);
      setState((s) => ({
        ...s,
        governanceFlags: mode === "replace" ? rows : [...s.governanceFlags, ...rows],
        importedAt: s.importedAt ?? now,
      }));
      return rows.length;
    },
    removeCompany: (ticker) => {
      setState((s) => ({
        ...s,
        snapshots: s.snapshots.filter((r) => r.ticker !== ticker),
        governanceFlags: s.governanceFlags.filter((f) => f.ticker !== ticker),
      }));
    },
    clearAll: () => setState(DEFAULT_STATE),
  }), [state, stockViews]);

  return <ImportedContext.Provider value={value}>{children}</ImportedContext.Provider>;
}

/** Picks localStorage or Supabase persistence — see isSupabaseConfigured(). Consumers (useImportedData()) never know the difference. */
export function ImportedDataProvider({ children }: { children: React.ReactNode }) {
  if (isSupabaseConfigured()) return <SupabaseImportedProvider>{children}</SupabaseImportedProvider>;
  return <LocalImportedProvider>{children}</LocalImportedProvider>;
}
