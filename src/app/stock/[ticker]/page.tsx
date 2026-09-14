import { notFound } from "next/navigation";
import { getStockByTicker, getStockUniverse } from "@/lib/demo";
import { StockDetailClient } from "@/components/stock/StockDetailClient";

export function generateStaticParams() {
  return getStockUniverse().map((s) => ({ ticker: s.company.ticker }));
}

export default async function StockDetailPage({ params }: PageProps<"/stock/[ticker]">) {
  const { ticker } = await params;
  const stock = getStockByTicker(ticker);
  if (!stock) notFound();
  return <StockDetailClient stock={stock} />;
}
