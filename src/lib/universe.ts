"use client";

import { StockView } from "@/lib/types";
import { getStockUniverse } from "@/lib/demo";
import { useImportedData } from "@/lib/store/importedStore";

/** Demo universe + any CSV-imported companies, combined into one list every page reads from. */
export function useUniverse(): StockView[] {
  const { stockViews } = useImportedData();
  if (stockViews.length === 0) return getStockUniverse();
  return [...getStockUniverse(), ...stockViews];
}

export function useStockByTicker(ticker: string | undefined): StockView | undefined {
  const universe = useUniverse();
  if (!ticker) return undefined;
  return universe.find((s) => s.company.ticker.toUpperCase() === ticker.toUpperCase());
}
