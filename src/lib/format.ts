export function formatINR(amount: number): string {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);
}

export function formatNumber(n: number, decimals = 1): string {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: decimals }).format(n);
}

export function formatCrore(n: number): string {
  return `₹${formatNumber(n, 0)} Cr`;
}

export function formatPct(n: number | null, decimals = 1): string {
  if (n === null) return "N/A";
  return `${n > 0 ? "+" : ""}${formatNumber(n, decimals)}%`;
}

export function formatValue(n: number | null, suffix = "", decimals = 1): string {
  if (n === null || n === undefined) return "N/A";
  return `${formatNumber(n, decimals)}${suffix}`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}
