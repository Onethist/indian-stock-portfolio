import { PricePoint, Technicals } from "@/lib/types";

// Deterministic pseudo-random generator so demo data is stable across reloads/builds.
function mulberry32(seed: number) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface PriceSeriesOptions {
  seed: number;
  days: number; // trading days of history to generate
  endPrice: number; // approx latest close
  annualDriftPct: number; // long run trend, e.g. 18 for a strong grower, -5 for a laggard
  volatilityPct: number; // daily volatility, e.g. 1.5
  baseVolume: number; // average daily volume (shares)
  recentVolumeMultiplier?: number; // bump for volume ratio effects
}

export function generatePriceSeries(opts: PriceSeriesOptions): PricePoint[] {
  const rand = mulberry32(opts.seed);
  const dailyDrift = opts.annualDriftPct / 100 / 252;
  const dailyVol = opts.volatilityPct / 100;

  // Walk backwards from endPrice so the series ends exactly at the intended latest price.
  const closes: number[] = new Array(opts.days);
  closes[opts.days - 1] = opts.endPrice;
  for (let i = opts.days - 2; i >= 0; i--) {
    const shock = (rand() - 0.5) * 2 * dailyVol;
    const stepReturn = dailyDrift + shock;
    closes[i] = closes[i + 1] / (1 + stepReturn);
  }

  const points: PricePoint[] = [];
  const today = new Date();
  for (let i = 0; i < opts.days; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - (opts.days - 1 - i));
    const close = closes[i];
    const prevClose = i > 0 ? closes[i - 1] : close;
    const intradayVol = dailyVol * 0.6;
    const high = close * (1 + Math.abs(rand()) * intradayVol);
    const low = close * (1 - Math.abs(rand()) * intradayVol);
    const open = prevClose * (1 + (rand() - 0.5) * intradayVol);
    const volumeJitter = 0.5 + rand();
    const isRecent = i > opts.days - 15;
    const volume = Math.round(
      opts.baseVolume * volumeJitter * (isRecent ? opts.recentVolumeMultiplier ?? 1 : 1)
    );
    points.push({
      date: date.toISOString().slice(0, 10),
      open: round2(open),
      high: round2(Math.max(open, high, close)),
      low: round2(Math.min(open, low, close)),
      close: round2(close),
      adjustedClose: round2(close),
      volume,
    });
  }
  return points;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function sma(values: number[], period: number, endIndex: number): number | null {
  if (endIndex + 1 < period) return null;
  let sum = 0;
  for (let i = endIndex - period + 1; i <= endIndex; i++) sum += values[i];
  return round2(sum / period);
}

function rsi(closes: number[], period: number, endIndex: number): number | null {
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

export function computeTechnicals(companyId: string, prices: PricePoint[]): Technicals {
  const closes = prices.map((p) => p.close);
  const volumes = prices.map((p) => p.volume);
  const last = prices.length - 1;
  const price = closes[last];

  const dma20 = sma(closes, 20, last);
  const dma50 = sma(closes, 50, last);
  const dma100 = sma(closes, 100, last);
  const dma200 = sma(closes, 200, last);

  const window52w = closes.slice(Math.max(0, closes.length - 252));
  const high52w = round2(Math.max(...window52w));
  const low52w = round2(Math.min(...window52w));

  const avgVolWindow = volumes.slice(Math.max(0, volumes.length - 20));
  const averageVolume = Math.round(avgVolWindow.reduce((a, b) => a + b, 0) / avgVolWindow.length);
  const recentAvg =
    volumes.slice(Math.max(0, volumes.length - 5)).reduce((a, b) => a + b, 0) / 5;

  return {
    companyId,
    date: prices[last].date,
    price,
    dma20,
    dma50,
    dma100,
    dma200,
    priceVs200dma: dma200 ? round2(((price - dma200) / dma200) * 100) : null,
    dma50VsDma200: dma50 && dma200 ? round2(((dma50 - dma200) / dma200) * 100) : null,
    rsi14: rsi(closes, 14, last),
    high52w,
    low52w,
    distanceFrom52wHigh: round2(((price - high52w) / high52w) * 100),
    averageVolume,
    volumeRatio: averageVolume ? round2(recentAvg / averageVolume) : null,
  };
}
