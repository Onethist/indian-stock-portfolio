/** Minimal RFC4180-ish CSV parser: quoted fields, escaped "" quotes, CRLF/LF. No external dependency. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  const src = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (inQuotes) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += c;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

export function rowsToObjects(rows: string[][]): { headers: string[]; objects: Record<string, string>[] } {
  if (rows.length === 0) return { headers: [], objects: [] };
  const headers = rows[0].map((h) => h.trim());
  const objects = rows.slice(1).map((row) => {
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => {
      obj[h] = (row[i] ?? "").trim();
    });
    return obj;
  });
  return { headers, objects };
}

export function toNumber(v: string | undefined): number | null {
  if (v === undefined || v.trim() === "") return null;
  const n = Number(v.replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : null;
}

export function toStringOrNull(v: string | undefined): string | null {
  if (v === undefined || v.trim() === "") return null;
  return v.trim();
}

export function toBool(v: string | undefined, defaultValue = false): boolean {
  if (v === undefined || v.trim() === "") return defaultValue;
  return ["true", "1", "yes", "y"].includes(v.trim().toLowerCase());
}

export const SNAPSHOT_CSV_TEMPLATE = `ticker,isin,companyName,exchange,sector,industry,marketCap,marketCapCategory,businessDescription,price,period,periodType,revenue,revenueGrowth,ebitda,ebitdaMargin,pat,patMargin,eps,epsGrowth,roe,roce,roa,debt,equity,debtToEquity,interestCoverage,operatingCashFlow,capex,freeCashFlow,cfoToPat,fcfToPat,netInterestMargin,gnpa,nnpa,provisionCoverageRatio,capitalAdequacyRatio,costToIncome,creditGrowth,salesCagr3y,salesCagr5y,salesCagr10y,profitCagr3y,profitCagr5y,profitCagr10y,epsCagr,pe,forwardPe,pb,evEbitda,priceSales,peg,dividendYield,historicalPe,industryPe,promoterHolding,promoterHoldingChange,promoterPledge,fiiHolding,fiiChange,diiHolding,diiChange,ownershipPeriod,latestDividendPerShare,dma20,dma50,dma100,dma200,rsi14,high52w,low52w,averageVolume,volumeRatio
TCS,INE467B01029,Tata Consultancy Services Ltd,NSE,IT,IT Services,1350000,Large,India's largest IT services company,3850,FY25,annual,245000,7.2,62000,25.3,45000,18.4,124,8.1,45,52,25,2000,90000,0.02,120,48000,8000,40000,95,88,,,,,,,7.5,9.2,8.5,9.8,10.5,9.9,8.1,31,28.5,15.2,20.1,5.5,3.2,1.4,28,29,72.3,0,0,17.8,0.5,9.9,0.3,Q1FY26,58,3800,3750,3700,3600,55,4150,3350,2500000,1.1
HDFCBANK,INE040A01034,HDFC Bank Ltd,NSE,Banks,Private Sector Bank,1250000,Large,India's largest private sector bank,1680,FY25,annual,,,,,,,88,12,17.5,,1.9,,,,,,,,,,4.1,1.3,0.4,75,17.2,40,18,,,,,,,,20.5,19,,,,,1.1,,22,26.2,0,0,0,44.5,0.6,28.3,0.4,Q1FY26,22,,,,,,,,,
`;

export const GOVERNANCE_CSV_TEMPLATE = `ticker,date,flagType,severity,description,source,resolved
TCS,2025-11-15,Example flag (delete this row),medium,Replace with a real disclosure if applicable,Company filing,false
`;
