# Indian Long-Term Fundamental Analysis Master Framework

## Objective

Build a comprehensive stock-analysis engine for long-term Indian equities covering three goals:

1. **Value** — good/improving businesses at attractive prices.
2. **Growth** — durable earnings/cash-flow compounding at attractive returns on capital.
3. **Dividend/shareholder return** — sustainable and growing cash distributions.

Do not treat every ratio as equally predictive. Many measures overlap. Normalize correlated metrics within categories and avoid double counting.

The system must use sector-specific rules, historical trends, normalized earnings for cyclicals, and explicit risk overrides. Never invent missing data.

---

# 1. Business Quality

## Business model
Track:
- Business description
- Revenue streams
- Product mix
- Geography
- Customer concentration
- Supplier concentration
- Recurring vs transactional revenue
- B2B/B2C
- Domestic/export exposure
- Cyclicality
- Capital intensity
- Working-capital intensity
- Regulatory dependence
- Commodity exposure
- FX exposure
- Interest-rate sensitivity

## Competitive advantage / moat
Assess:
- Brand
- Pricing power
- Cost advantage
- Distribution
- Network effects
- Switching costs
- IP
- Scale
- Regulatory barriers
- Data/ecosystem advantages

## Industry
Assess:
- Industry growth
- Market size
- Market share and change
- Competition
- New entrants
- Supplier power
- Customer power
- Substitutes
- Regulation
- Technology disruption
- Consolidation
- Cyclicality

---

# 2. Revenue Quality

Track:
- Revenue
- 1Y/3Y/5Y/10Y revenue CAGR
- Organic growth
- Acquisition growth
- Volume growth
- Price growth
- Market-share growth
- Recurring revenue
- Customer retention
- Segment/geographic growth
- Revenue concentration

Derived diagnostics:
- Revenue CAGR vs receivables CAGR
- Organic vs acquisition growth
- Volume vs price growth

Flag persistent receivables growth materially above revenue growth.

---

# 3. Earnings Growth

Track:
- EBITDA growth
- EBIT growth
- PAT growth
- EPS growth
- Diluted EPS growth
- 3Y/5Y/10Y EPS CAGR
- Quarterly YoY growth
- Growth consistency
- Earnings volatility

Use multi-year normalized growth, not one-year growth alone.

---

# 4. Earnings Quality

Track:
- Net income
- Operating cash flow
- CFO/PAT
- FCF/PAT
- Accrual ratio
- Cash earnings
- Exceptional items
- Other income
- Tax normalization
- Depreciation/amortization
- Stock-based compensation
- Capitalized expenses
- Receivables
- Inventory
- Payables

Diagnostics:
- Cash conversion
- FCF conversion
- Accrual quality
- Exceptional-item dependence

Flag profits heavily dependent on one-off gains, asset sales, tax reversals, investment income, or persistent accounting accruals.

---

# 5. Profitability

Track:
- Gross margin
- EBITDA/OPM
- EBIT margin
- EBITA margin
- PAT margin
- ROA
- ROE
- ROIC
- ROCE
- RONA
- CROIC
- Return on tangible capital

Evaluate:
- Level
- Trend
- Stability
- Sector percentile

---

# 6. DuPont Analysis

Decompose:

**ROE = Net Margin × Asset Turnover × Equity Multiplier**

Track:
- Net margin
- Asset turnover
- Financial leverage

A high ROE caused mainly by leverage receives lower quality treatment than high ROE caused by strong operating economics.

---

# 7. ROIC / ROCE

Track:
- ROIC
- ROCE
- Invested capital
- NOPAT
- Capital employed
- Incremental ROIC
- Incremental ROCE

Key diagnostic:

**Incremental ROIC = Change in NOPAT / Change in invested capital**

Flag high-growth companies whose incremental returns are deteriorating.

---

# 8. Growth + Reinvestment

Track:
- Reinvestment rate
- Retention ratio
- ROIC
- ROE
- Incremental ROIC
- Incremental revenue/capital
- Capex intensity
- Working-capital investment
- Acquisition investment

Use:

**Growth ≈ Reinvestment Rate × Return on Reinvestment**

and, where appropriate:

**Sustainable growth ≈ ROE × Retention Ratio**

These are analytical relationships, not guaranteed forecasts.

---

# 9. Balance Sheet

Track:
- Gross debt
- Net debt
- Debt/equity
- Net debt/equity
- Debt/EBITDA
- Net debt/EBITDA
- Interest coverage
- Fixed-charge coverage
- Cash
- Marketable securities
- Current ratio
- Quick ratio
- Working capital
- Net working capital

Track trends and sector norms.

---

# 10. Debt Quality

Analyze:
- Debt maturity
- Fixed/floating debt
- Average interest rate
- Currency
- Secured/unsecured debt
- Refinancing risk
- Covenants
- Lease liabilities
- Guarantees
- Contingent liabilities

Low reported debt does not automatically mean low financial risk.

---

# 11. Working Capital

Track:
- DSO / receivable days
- DIO / inventory days
- DPO / payable days
- Cash conversion cycle
- Working capital/sales
- Receivables/sales
- Inventory/sales
- Payables/sales

Flag deteriorating working-capital efficiency.

---

# 12. Cash Flow

Track:
- CFO
- Capex
- FCF
- FCFF
- FCFE
- CFO/PAT
- FCF/PAT
- FCF margin
- FCF yield
- Owner earnings
- Maintenance capex
- Growth capex

Separate maintenance capex from growth capex where reasonably estimable.

---

# 13. Owner Earnings

Where appropriate:

**Owner Earnings ≈ Net Income + non-cash charges − maintenance capex − incremental working capital**

Do not assume accounting depreciation equals maintenance capex.

---

# 14. Capital Allocation

Track management use of cash:
- Reinvestment
- Capex
- Acquisitions
- Dividends
- Buybacks
- Debt repayment
- Cash accumulation
- Investments
- Related-party investments

Assess whether retained earnings are reinvested at attractive returns.

---

# 15. Dividends

Track:
- Dividend/share
- Dividend yield
- Dividend CAGR 1Y/3Y/5Y/10Y
- Payout ratio
- FCF payout
- Dividend coverage
- Dividend consistency
- Dividend cuts
- Dividend increases
- Special dividends
- Retention ratio

Never equate high yield with high quality.

---

# 16. Dividend Sustainability

Calculate:

**Payout = Dividends / Net Income**

**Cash payout = Dividends / CFO**

**FCF payout = Dividends / FCF**

Flag:
- Dividend > FCF for persistent periods
- Debt-funded dividends
- Asset-sale-funded dividends
- Rising payout with falling earnings
- Repeated dividend cuts
- Special dividends creating misleading trailing yield

---

# 17. Shareholder Yield

Track:
- Dividend yield
- Net buyback yield
- Net share issuance/dilution
- Debt paydown where relevant
- Total shareholder distribution

A buyback is value-creating only if shares are repurchased at sensible prices and the balance sheet remains appropriate.

---

# 18. Share Count / Dilution

Track:
- Basic shares
- Diluted shares
- Share-count CAGR
- Equity issuance
- ESOP dilution
- Convertibles
- Warrants
- Buybacks
- Net share-count change

Separate EPS growth into:
- Operating/business growth
- Margin improvement
- Buyback effect
- Dilution effect

---

# 19. Per-Share Economics

Track:
- Revenue/share
- EBITDA/share
- EPS
- Book value/share
- FCF/share
- Dividend/share
- Net cash/share

Always compare company-level growth with per-share growth.

---

# 20. Book Value

Track:
- Book value
- Tangible book value
- Book value/share
- Tangible book value/share
- Book-value CAGR
- ROE
- Return on tangible equity

P/B is particularly useful for financial and asset-heavy businesses.

---

# 21. Intangibles

Track:
- Goodwill
- Intangible assets
- Goodwill/assets
- Goodwill/equity
- Acquisition history
- Impairments
- Capitalized R&D
- Capitalized software

Calculate tangible book value where appropriate.

---

# 22. Valuation Multiples

Track:

### Equity
- P/E
- Forward P/E
- PEG
- P/B
- P/S
- P/FCF
- P/OCF
- Dividend yield

### Enterprise
- EV/EBITDA
- EV/EBIT
- EV/Sales
- EV/FCFF
- EV/IC

Never use one multiple universally.

---

# 23. Relative Valuation

Compare:
- Company vs sector
- Company vs peers
- Company vs market
- Current vs own historical valuation
- Current vs peer historical valuation

Calculate:
- 5Y percentile
- 10Y percentile

Example:
Current PE at 85th historical percentile = potentially expensive.

---

# 24. Valuation Drivers

Interpret multiples through their economic drivers.

P/E is influenced by:
- Growth
- Risk
- Payout
- Cost of equity

P/B is influenced by:
- ROE
- Growth
- Payout
- Cost of equity

P/S is influenced by:
- Margin
- Growth
- Payout
- Risk
- Cost of equity

EV multiples depend on:
- Growth
- ROIC
- Reinvestment
- Cost of capital
- Taxes
- Capital intensity

---

# 25. PEG

Track:

**PEG = P/E / expected EPS growth**

Use historical and forward growth where reliable.

Never treat PEG <1 as an automatic buy.

---

# 26. Earnings Yield

**Earnings Yield = EPS / Price ≈ 1 / P/E**

Compare against:
- Risk-free rate
- Bonds
- Other equities
- Opportunity cost

---

# 27. FCF Yield

**FCF Yield = FCF / Market Capitalization**

Compare:
- Current yield
- Historical yield
- Sector yield
- Risk-free rate

Use normalized FCF for cyclical companies.

---

# 28. Enterprise Value

Where appropriate:

**EV = Market Cap + Debt + Preferred Equity + Minority Interest − Cash**

Use EV-based multiples when capital structures differ materially.

---

# 29. DCF

Support:
- FCFF DCF
- FCFE DCF
- DDM
- Two-stage DCF
- Three-stage DCF
- Perpetuity-growth terminal value
- Exit-multiple terminal value

Inputs:
- Revenue growth
- Margins
- Tax
- Reinvestment
- Working capital
- Capex
- WACC
- Cost of equity
- Terminal growth
- Diluted shares

Outputs:
- Intrinsic value/share
- Current price
- Upside/downside
- Margin of safety

Always show bear/base/bull cases and sensitivity tables.

Never use false precision.

---

# 30. Dividend Discount Models

Support:
- Gordon Growth
- Two-stage DDM
- Multi-stage DDM

Use primarily where dividend policy is stable and dividends represent meaningful shareholder cash flow.

---

# 31. Residual Income / Economic Profit

Calculate:

**Residual Income = Net Income − Equity Charge**

**Equity Charge = Cost of Equity × Beginning Book Equity**

Also:

**Economic Profit = NOPAT − WACC × Invested Capital**

Track whether economic profit is positive and increasing.

---

# 32. EVA / MVA

Where appropriate:

**EVA = NOPAT − WACC × Invested Capital**

**MVA = Market Value of Capital − Invested Capital**

Use consistently and mainly as supporting diagnostics.

---

# 33. Quality Factor Family

Track:
- ROE
- ROA
- ROIC
- ROCE
- Gross profitability
- Operating profitability
- Cash-flow quality
- Accrual quality
- Low leverage
- Earnings stability
- Margin stability
- FCF stability

Avoid double counting correlated quality metrics.

---

# 34. Gross Profitability

Track:

**Gross Profit / Total Assets**

and where appropriate:

**Gross Profit / Capital**

Use as an additional quality/profitability diagnostic.

---

# 35. Investment / Asset Growth

Track:
- Asset growth
- Investment growth
- Capex growth
- Acquisition growth
- Working-capital growth
- Total asset CAGR

Then assess whether additional investment earns attractive returns.

High investment is not automatically bad.

---

# 36. Investment Efficiency

Calculate:
- Incremental revenue / incremental invested capital
- Incremental NOPAT / incremental invested capital
- Incremental FCF / incremental capital

Flag high growth accompanied by falling incremental returns.

---

# 37. Value Factor Family

Track:
- Book-to-market
- Earnings yield
- Cash-flow yield
- FCF yield
- Sales yield
- EV/EBIT
- EV/EBITDA
- P/E
- P/B
- P/S
- Dividend yield

Assess cheapness jointly with:
- Quality
- Growth
- Leverage
- Cyclicality
- Normalized earnings

---

# 38. Growth Factor Family

Track:
- Revenue growth
- EPS growth
- EBITDA growth
- EBIT growth
- FCF growth
- Book-value growth
- Dividend growth
- ROIC trend
- Market-share growth
- Organic growth
- Forward growth
- Growth duration

Growth quality > raw growth.

---

# 39. Momentum / Trend Layer

Not pure fundamental analysis, but useful for final entry timing.

Track:
- 3M return
- 6M return
- 12M return
- Relative strength
- Price vs 50 DMA
- Price vs 200 DMA
- 50 DMA vs 200 DMA
- 52-week-high proximity

Keep this separate from fundamental quality.

---

# 40. Low-Volatility / Risk Layer

Track:
- Historical volatility
- Downside volatility
- Beta
- Maximum drawdown
- 52-week drawdown
- Idiosyncratic volatility where feasible
- Earnings volatility
- Margin volatility
- FCF volatility
- Debt volatility

Distinguish temporary price volatility from permanent impairment risk.

---

# 41. Size Factor

Track:
- Market capitalization
- Free-float market capitalization
- Liquidity
- Average daily traded value

Use size for portfolio construction and risk, not as an automatic buy signal.

---

# 42. Quality-at-a-Reasonable-Price Screen

Create a major screen requiring:
- Strong ROIC/ROCE
- Positive FCF
- Low/moderate leverage
- Sustainable growth
- Reasonable valuation
- No major governance red flags

This should be a primary long-term candidate category.

---

# 43. Piotroski-Style Financial Strength

Where historical data permits, implement an F-Score-style diagnostic covering:

### Profitability
- Positive ROA
- Positive CFO
- Improving ROA
- CFO > Net Income

### Leverage/liquidity
- Lower leverage
- Improved current ratio
- No material new share issuance

### Operating efficiency
- Improving gross margin
- Improving asset turnover

Use as a diagnostic, not an automatic buy signal.

---

# 44. Altman-Style Distress

Where appropriate, calculate a suitable Altman Z-score variant.

Different versions apply to different company types.

Never apply one formula indiscriminately.

Use as a financial-distress warning layer.

---

# 45. Beneish-Style Accounting Quality

Where sufficient data exists, calculate an M-score-style diagnostic using variables such as:
- Receivable days
- Gross margin
- Asset quality
- Sales growth
- Depreciation
- SG&A
- Leverage
- Accruals

Use only as a red-flag diagnostic.

Never state that a high score proves fraud.

---

# 46. Accounting Red Flags

Track:
- Receivables > sales growth
- Inventory > sales growth
- CFO < PAT
- Persistent accruals
- Capitalized expenses
- Unusual other income
- Repeated exceptional items
- Depreciation changes
- Unusual tax rates
- Sudden margin changes
- Large related-party transactions
- Complex subsidiaries
- Contingent liabilities

---

# 47. Management Quality

Track:
- Promoter ownership
- Promoter pledge
- Insider buying/selling
- CEO/CFO changes
- Auditor changes
- Auditor qualifications
- Related-party transactions
- Executive compensation
- Compensation vs performance
- Capital-allocation history
- Acquisition history
- Buybacks
- Dividends
- Management guidance accuracy

Qualitatively assess:
- Capital allocation
- Transparency
- Strategic consistency
- Communication

---

# 48. Promoter / Insider Signals

Track:
- Promoter holding
- Change in promoter holding
- Promoter pledge
- Insider buying
- Insider selling
- Open-market purchases
- ESOPs
- Warrants
- Preferential allotments

Interpret contextually.

---

# 49. Institutional Ownership

Track:
- FII holding
- DII holding
- Mutual funds
- Insurance
- Ownership changes

Do not treat institutional ownership as proof of quality.

---

# 50. Contingent Liabilities

Track:
- Guarantees
- Litigation
- Tax disputes
- Regulatory penalties
- Off-balance-sheet commitments
- Subsidiary guarantees
- Letters of comfort

Compare material liabilities with:
- Equity
- EBITDA
- Cash
- Net worth

---

# 51. Related Parties

Track:
- Related-party sales
- Purchases
- Loans
- Guarantees
- Promoter-owned property leases
- Investments in related entities

Flag unusual or rapidly increasing transactions.

---

# 52. Segment Analysis

For diversified companies:
- Segment revenue
- Segment EBIT
- Segment margins
- Segment growth
- Segment capital employed
- Segment ROCE
- Segment valuation where possible

Identify:
- High-growth segments
- High-margin segments
- Low-return segments
- Hidden value
- Conglomerate discount

---

# 53. Geography

Track:
- India revenue %
- International revenue %
- Country concentration
- FX exposure
- Export growth
- FX sensitivity

---

# 54. Cyclicality

Classify:
- Defensive
- Moderately cyclical
- Highly cyclical

Track:
- Revenue cycle
- EBITDA cycle
- Margin cycle
- Capacity utilization
- Commodity prices
- Inventory cycle
- Working capital
- Normalized earnings

Never value a cyclical company using peak earnings alone.

---

# 55. Commodity Sensitivity

Where relevant:
- Raw-material prices
- Selling prices
- Spreads
- Realizations
- Input-cost ratio
- Energy
- Freight
- FX

Use industry-specific economics.

---

# 56. Pricing Power

Track:
- Revenue growth vs volume growth
- Price increases
- Gross margin
- EBITDA margin
- Market share

A company maintaining margins during inflation may have stronger pricing power.

---

# 57. Customer Economics

Where available:
- Customer acquisition cost
- Lifetime value
- Retention
- Churn
- ARPU
- Repeat purchase
- Customer concentration
- Contract duration

---

# 58. Unit Economics

Where relevant:
- Revenue/customer
- Contribution margin
- CAC
- LTV/CAC
- Payback
- Store economics
- Branch economics
- Loan economics
- Premium/customer
- Claims ratio

Use sector-specific metrics.

---

# 59. Sector-Specific Models

## Banks / NBFCs

Track:
- Loan/AUM growth
- Deposit growth
- ROA
- ROE
- NIM
- Spread
- Cost/income
- GNPA
- NNPA
- Gross/net slippage
- Provision coverage
- Restructured loans
- Write-offs
- CET1
- CRAR
- P/B
- P/E

Do not use industrial-company debt/equity rules.

## Insurance

Track:
- Premium growth
- AUM
- Persistency
- Combined ratio
- Loss ratio
- Expense ratio
- Solvency
- Embedded value
- VNB
- VNB margin
- ROEV

## IT Services

Track:
- Revenue
- Constant-currency growth
- Dollar revenue
- EBIT margin
- Utilization
- Attrition
- Deal wins
- Book-to-bill
- Client concentration
- Large-client growth
- Offshore mix
- FCF
- ROIC

## FMCG / Consumer

Track:
- Volume growth
- Price growth
- Revenue
- Gross margin
- EBITDA margin
- Market share
- Distribution
- Brand strength
- Working capital
- ROIC
- FCF
- Dividend payout

## Pharma

Track:
- Revenue
- Product mix
- Gross/EBITDA margin
- R&D/revenue
- Pipeline
- Regulatory observations
- US exposure
- Product concentration
- Patent exposure
- FCF
- ROIC

## Auto

Track:
- Volume
- ASP
- Market share
- Product mix
- Capacity utilization
- EBITDA margin
- Raw-material sensitivity
- EV transition
- Capex
- FCF
- Net debt/cash

## Industrials / Manufacturing

Track:
- Order book
- Order inflow
- Book-to-bill
- Capacity
- Utilization
- Revenue visibility
- Working capital
- Receivable days
- ROCE
- Incremental ROCE
- Capex
- FCF

## Utilities

Track:
- Capacity
- Utilization
- Regulated returns
- Tariffs
- Debt
- Interest coverage
- Capex
- Cash flow
- Dividend coverage

## Real Estate

Track:
- Presales
- Collections
- Inventory
- Unsold inventory
- Net debt
- Project pipeline
- Completion risk
- Rental yield where relevant
- NAV
- P/NAV
- Cash flow

---

# 60. Management Guidance

Track:
- Revenue guidance
- Margin guidance
- Capex guidance
- Volume guidance
- Actual vs guidance

Create a historical guidance-accuracy score.

---

# 61. Earnings Surprise

Where reliable consensus exists:
- Revenue vs consensus
- EPS vs consensus
- EBITDA vs consensus
- Guidance change

Do not use poor-quality estimates.

---

# 62. Macro / Economy

Track where relevant:
- GDP growth
- Inflation
- Interest rates
- RBI policy
- Liquidity
- Credit growth
- Currency
- Commodity prices
- Fiscal policy
- Government capex
- Industry growth

Macro should contextualize, not dominate, company analysis.

---

# 63. Regulatory / Country Risk

Track:
- Licensing
- Regulation
- Government pricing
- Import/export restrictions
- Tariffs
- Environmental rules
- Litigation
- Policy dependence

---

# 64. Scenario Analysis

Every serious candidate should have:

### Bear
What goes wrong?

### Base
What is reasonable?

### Bull
What exceeds expectations?

Model:
- Revenue
- Margins
- EPS
- FCF
- Multiple
- Intrinsic value

Support probability-weighted valuation where justified.

---

# 65. Margin of Safety

Calculate:

**Margin of Safety = (Intrinsic Value − Market Price) / Intrinsic Value**

Require a larger margin where uncertainty is higher.

---

# 66. Value Trap Detection

Flag:
- Low PE
- Falling revenue
- Falling EPS
- Falling ROCE
- Rising debt
- Negative FCF
- Shrinking industry
- Falling market share

Low valuation alone is not Value.

---

# 67. Growth Trap Detection

Flag:
- High revenue growth
- Falling ROIC
- Falling FCF
- Rising dilution
- Rising debt
- Extreme valuation
- Weak cash conversion

---

# 68. Dividend Trap Detection

Flag:
- High yield
- Falling earnings
- Falling FCF
- Payout > FCF
- Rising debt
- Dividend cuts
- Special dividend distortion

---

# 69. Compounder Detection

Preferred:
- High ROIC/ROCE
- High incremental ROIC
- Long runway
- Competitive advantage
- Consistent revenue growth
- Consistent EPS growth
- Strong FCF
- Low/moderate leverage
- Reinvestment opportunity
- Good management
- Reasonable valuation

---

# 70. Factor Exposure Layer

Track major empirical factor families:

### Market
Beta / market exposure

### Size
Market capitalization

### Value
Book-to-market
Earnings yield
Cash-flow yield

### Profitability / Quality
ROE
ROA
ROIC
Gross profitability
Operating profitability
Cash-flow quality

### Investment
Asset growth
Investment growth
Capex growth

### Momentum
3M/6M/12M returns

### Low volatility
Volatility / downside risk

### Dividend
Dividend yield
Payout
Shareholder yield

Do not present factor premia as guaranteed returns.

---

# 71. Factor Dashboard

For each stock:

```text
VALUE       +++
QUALITY     ++++
GROWTH      ++++
DIVIDEND    +++
SIZE        ++
INVESTMENT  +
MOMENTUM    ++
VOLATILITY  LOW
```

Use sector/universe percentiles.

---

# 72. Avoid Double Counting

Do not give full independent weight to highly correlated measures.

Examples:
- ROE / ROIC / ROCE / ROA
- PE / Earnings Yield
- Dividend Yield / Payout / FCF payout
- Revenue CAGR / EPS CAGR / FCF CAGR

Use category-level scoring and correlation controls.

---

# 73. Recommended Master Score

Starting architecture only; backtest before treating weights as predictive.

## Business Quality — 15
- Competitive advantage
- Industry quality
- Revenue quality

## Growth — 15
- Revenue
- EPS
- FCF
- Growth durability

## Profitability — 15
- ROIC/ROCE
- ROE
- Margins
- Incremental returns

## Cash Flow — 15
- CFO
- FCF
- Cash conversion
- FCF yield

## Balance Sheet — 10
- Leverage
- Interest coverage
- Liquidity

## Valuation — 20
- PE
- EV/EBITDA
- FCF yield
- PEG
- DCF
- Relative valuation

## Capital Allocation / Dividend — 5
- Dividend
- Buybacks
- Reinvestment

## Risk / Governance — 5
- Pledge
- Accounting
- Related parties
- Contingencies

Total = 100

Keep technical indicators separate from the fundamental score.

---

# 74. Three Strategy Scores

## VALUE SCORE
Emphasize:
- Earnings yield
- FCF yield
- PE
- EV/EBIT
- P/B where relevant
- Dividend yield
- Asset value
- Margin of safety
- Balance sheet
- Quality

## GROWTH SCORE
Emphasize:
- Revenue CAGR
- EPS CAGR
- FCF CAGR
- ROIC
- Incremental ROIC
- Reinvestment runway
- Market share
- Competitive advantage
- Growth durability
- Valuation

## DIVIDEND SCORE
Emphasize:
- Dividend yield
- Dividend CAGR
- Payout sustainability
- FCF coverage
- Balance sheet
- Earnings stability
- Dividend history
- Shareholder yield
- Buybacks
- Capital allocation

---

# 75. Final Classification

### A+ Compounder
High quality + high returns on capital + durable growth + reasonable valuation

### A Quality Growth
Strong growth + quality + acceptable valuation

### B Value Opportunity
Good business + attractive valuation + manageable risk

### C Dividend Compounder
Strong cash flow + sustainable/growing distributions

### D Watchlist
Good business but valuation/timing unattractive

### E Value Trap Risk
Cheap but deteriorating

### F Avoid
Weak fundamentals, excessive risk, or poor economics

---

# 76. Data Provenance

Every metric must include:
- Source
- Reporting period
- Date fetched
- Reported vs estimated
- TTM/quarterly/annual designation

Never mix annual, quarterly, and TTM data without labeling.

---

# 77. Historical Data

Prefer:
- 10 years annual
- 5 years quarterly

This enables:
- CAGR
- Margin trend
- ROIC trend
- Cycle analysis
- Historical valuation
- Dividend history
- Earnings stability

---

# 78. Normalization

For every major metric support:
- Absolute
- 3Y CAGR
- 5Y CAGR
- 10Y CAGR
- Sector percentile
- Market percentile
- Historical percentile
- Trend

---

# 79. Historical Valuation

Chart:
- PE
- PB
- EV/EBITDA
- FCF yield
- Dividend yield

Show:
- Current
- 5Y median
- 10Y median
- Current percentile

---

# 80. Long-Term Buy Checklist

## Business
- Understandable
- Attractive industry
- Competitive advantage
- No obvious structural disruption

## Growth
- Revenue growth
- EPS growth
- FCF growth
- Runway

## Quality
- High ROIC/ROCE
- Good margins
- Strong incremental returns

## Cash
- Positive CFO
- Positive FCF
- Good conversion

## Balance sheet
- Manageable debt
- Strong coverage
- No major hidden liabilities

## Management
- Good capital allocation
- No major governance red flags

## Valuation
- Reasonable vs history
- Reasonable vs peers
- Intrinsic value supports price
- Appropriate margin of safety

## Dividend
- Sustainable
- Growing where appropriate

## Risk
- No thesis-breaking issue

---

# 81. Final Decision Logic

Never:

**Score 85 = BUY**

Instead:

```text
QUALITY
+
GROWTH
+
CASH FLOW
+
FINANCIAL HEALTH
+
REASONABLE VALUATION
+
NO MAJOR GOVERNANCE RED FLAGS
+
ACCEPTABLE RISK
=
HIGH-PRIORITY LONG-TERM CANDIDATE
```

Then separately determine:

**Is the stock cheap enough?**

and:

**Is now a good time to accumulate?**

---

# 82. Research Foundations

The framework should draw conceptually from established approaches including:

- Fundamental financial-statement analysis
- DCF
- Dividend discount models
- Residual income/economic profit
- DuPont
- Value investing
- Quality/profitability factors
- Book-to-market/value research
- Investment/asset-growth factors
- Momentum
- Low-volatility research
- Piotroski-style financial strength
- Altman-style distress diagnostics
- Beneish-style accounting-quality diagnostics
- Shareholder yield
- Capital allocation

Factor research should be treated as evidence about historical relationships, not guarantees of future returns.

---

# 83. Final Output Per Stock

```text
COMPANY
Sector:
Market Cap:
Price:

OVERALL
Overall Score:
Confidence:
Risk:

VALUE SCORE:
GROWTH SCORE:
DIVIDEND SCORE:

BUSINESS QUALITY:
Growth:
Profitability:
ROIC:
Cash Flow:
Balance Sheet:
Capital Allocation:
Governance:

VALUATION:
PE:
PEG:
PB:
EV/EBITDA:
FCF Yield:
DCF Value:
Margin of Safety:

DIVIDEND:
Yield:
Payout:
FCF Coverage:
Dividend CAGR:
Shareholder Yield:

FACTOR EXPOSURE:
Value:
Quality:
Growth:
Size:
Investment:
Momentum:
Volatility:

RED FLAGS:

THESIS:
Why it qualifies:
Why it may fail:
What could invalidate the thesis:

DECISION:
Strong Candidate / Accumulate / Watch / Avoid

POSITION:
Target allocation:
Suggested first tranche:
Maximum allocation:
```

The system must make every conclusion explainable and auditable.
