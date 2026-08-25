# Derived cost build-up — Spon's Civil Engineering rates

Turns the raw Spon's rate extract (a published all-in rate per item) into a **cost built up
from Labour + Plant + Material**, so every item shows what it actually costs rather than what
the book charges for it.

## Running it

```bash
python3 derive_costs.py  Spons_Civil_Engineering_Rates.xlsx  ./work
python3 build_workbook.py ./work  Spons_Civil_Engineering_Derived_Costs.xlsx
```

Stage 1 derives the costs and writes intermediate JSON; stage 2 renders the formatted workbook.
Requires `openpyxl`.

## What the source actually contains

The 5,808-row extract is not 5,808 rates. It breaks down as:

| Rows  | What they are                                                        | Where they go            |
|-------|----------------------------------------------------------------------|--------------------------|
| 1,232 | Section / sub-heading captions                                        | dropped (hierarchy kept as columns) |
| 187   | Explanatory notes                                                     | dropped                  |
| 543   | Labour-gang and plant hourly build-ups (cost *inputs*, not items)     | `Resource Rates` sheet   |
| 53    | CESMM Class A: General Items — preliminaries                          | `Preliminaries (Excluded)` |
| 3,793 | Genuinely priceable items                                             | `Derived Rates` sheet    |

Separating the 543 resource rows matters: they carry £/hr figures in the same columns as the
rates, so anything summing the column double-counts them.

## How each cost is derived

| Basis | Items | Method |
|---|---:|---|
| Stated build-up | 2,891 | Labour/plant/material published and reconciling to the rate. Used as-is. |
| All-in specialist rate | 601 | Classes B, C, D, M, P, T plus testing/professional-services sections. Spon's publishes these as sub-contract packages with no build-up, so the rate is carried whole in `Sub-contract £` rather than invented into a split. |
| Apportioned | 222 | No build-up published. Rate split on the median L/P/M shares of comparable build-ups — sub-heading level where 3+ exist, else section (5+), else class (10+). |
| Stated components + specialist balance | 52 | Published plant/labour kept; the undifferentiated balance of a specialist rate goes to `Sub-contract £`. |
| Material recovered as residual | 27 | Material column missing from the scan but present in the rate. Recovered as rate − labour − plant, cross-checked against identical operations that do carry a material figure. |

Confidence is stated per row, and `DERIVED COST £` is a live formula (`=ROUND(SUM(I:L),2)`) so
editing any component recalculates the cost.

## Reconciliation

Derived costs sum to within **£0.53 across £65m** of the published rates — the residual is
source rounding (one item is 2p out in the book itself). The derivation reallocates cost
between resource categories; it does not create or destroy any.

## Known limits

- The source is an OCR extraction and some figures are mis-read. 2 rows are an order of
  magnitude out of line with their class (flagged `Probable source error`), 6 sit far from
  comparable items, and 8 are very large unit rates worth checking. Scanning error may remain
  elsewhere.
- Apportioned splits are statistical, not quoted. The total is right; the shares are estimates.
- Rates are **net cost** — Spon's adds oncosts and profit separately, so nothing here carries
  overhead, profit or preliminaries.
- The control total on the Method sheet sums rates in mixed units (£/m, £/nr, £/m³). It exists
  to prove nothing was lost in the derivation, and is not a project cost.
