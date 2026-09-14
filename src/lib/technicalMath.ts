/** Shared technical-indicator math — used by both the demo price generator and the real
 *  NSE bhavcopy ingestion pipeline, so both compute DMA/RSI identically. */

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function sma(values: number[], period: number, endIndex: number): number | null {
  if (endIndex + 1 < period) return null;
  let sum = 0;
  for (let i = endIndex - period + 1; i <= endIndex; i++) sum += values[i];
  return round2(sum / period);
}

export function rsi(closes: number[], period: number, endIndex: number): number | null {
  if (endIndex + 1 < period + 1) return null;
  let gains = 0;
  let losses = 0;
  for (let i = endIndex - period + 1; i <= endIndex; i++) {
    const change = closes[i] - closes[i - 1];
    if (change >= 0) gains += change;
    else losses += -change;
  }
  const avgGain = gains / period;
  const avgLoss = losses / period;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return round2(100 - 100 / (1 + rs));
}
