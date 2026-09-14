"use client";

import { createContext, useContext } from "react";
import { StockView } from "@/lib/types";
import { CompanySnapshotRow, GovernanceFlagRow } from "@/lib/importedStock/types";

export interface ImportedContextValue {
  importedAt: string | null;
  stockViews: StockView[];
  mode: "local" | "supabase";
  signedIn: boolean;
  importSnapshots: (rows: CompanySnapshotRow[], mode: "merge" | "replace") => Promise<{ added: number; replaced: number }>;
  importGovernanceFlags: (rows: GovernanceFlagRow[], mode: "merge" | "replace") => Promise<number>;
  removeCompany: (ticker: string) => void;
  clearAll: () => void;
}

export const ImportedContext = createContext<ImportedContextValue | null>(null);

export function useImportedData(): ImportedContextValue {
  const ctx = useContext(ImportedContext);
  if (!ctx) throw new Error("useImportedData must be used within ImportedDataProvider");
  return ctx;
}
