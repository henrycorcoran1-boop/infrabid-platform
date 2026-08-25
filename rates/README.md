# Irish derived cost build-up — Spon's Civil Engineering rates

Turns the raw Spon's rate extract (a published all-in UK rate per item) into a **cost built up
from Labour + Plant + Material**, then converts that build-up to an **Irish cost in euro** by
factoring each resource category separately.

Outputs:

- `Spons_Irish_Derived_Costs.xlsx` — the working deliverable. Cost columns are live
  formulas, so editing a factor on the `Irish Basis` sheet re-costs all 3,793 items.
- `Spons_Irish_Derived_Costs.csv` — the same figures already evaluated, for ingestion.
  openpyxl writes formulas without cached results, so a program reading the .xlsx sees
  blanks in the cost columns until a spreadsheet app opens and recalculates it; the CSV
  avoids that. It is a snapshot at the default factors — regenerate it if you change them.

## Running it

```bash
python3 derive_costs.py  Spons_Civil_Engineering_Rates.xlsx  ./work
python3 build_workbook.py ./work  Spons_Irish_Derived_Costs.xlsx
```

Stage 1 derives the cost build-ups and writes intermediate JSON; stage 2 renders the workbook.
Requires `openpyxl`.

## What the source actually contains

The 5,808-row extract is not 5,808 rates:

| Rows  | What they are                                                    | Where they go              |
|-------|------------------------------------------------------------------|----------------------------|
| 1,232 | Section / sub-heading captions                                   | dropped (hierarchy kept as columns) |
| 187   | Explanatory notes                                                | dropped                    |
| 543   | Labour-gang and plant hourly build-ups (cost *inputs*, not items)| `Resource Rates` sheet     |
| 53    | CESMM Class A: General Items — preliminaries                     | `Preliminaries (Excluded)` |
| 3,793 | Genuinely priceable items                                        | `Derived Rates` sheet      |

Separating the 543 resource rows matters: they carry £/hr figures in the same columns as the
rates, so anything summing the column double-counts them.

## Step 1 — how each UK cost is derived

| Basis | Items | Method |
|---|---:|---|
| Stated build-up | 2,891 | Labour/plant/material published and reconciling to the rate. Used as-is. |
| All-in specialist rate | 601 | Classes B, C, D, M, P, T plus testing/professional-services sections. Spon's publishes these as sub-contract packages with no build-up, so the rate is carried whole in `Sub-contract £` rather than invented into a split. |
| Apportioned | 222 | No build-up published. Rate split on the median L/P/M shares of comparable build-ups — sub-heading level where 3+ exist, else section (5+), else class (10+). |
| Stated components + specialist balance | 52 | Published plant/labour kept; the undifferentiated balance of a specialist rate goes to `Sub-contract £`. |
| Material recovered as residual | 27 | Material column missing from the scan but present in the rate. Recovered as rate − labour − plant, cross-checked against identical operations that do carry a material figure. |

Derived UK costs sum to within **£0.53 across £65m** of the published rates — the residual is
source rounding. The derivation reallocates cost between resource categories; it does not
create or destroy any.

## Step 2 — the Irish conversion

Each resource category is factored separately, then converted to euro. All inputs live on the
**`Irish Basis`** sheet and drive every rate by live formula, so changing one cell re-costs all
3,793 items.

| Input | Default | Evidence |
|---|---:|---|
| GBP → EUR | 1.1694 | Spot, August 2026 (2026 YTD average 1.1562) — **strong** |
| Labour factor | 1.3415 | Irish SEO rates (1 Aug 2026) vs UK CIJC rates (20 Jul 2026), compared grade-for-grade in euro — **strong** |
| Plant factor | 1.00 | **Assumption.** No published Ireland-vs-UK differential found |
| Material factor | 1.00 | **Assumption.** No Ireland-vs-UK price-*level* series exists (Eurostat dropped the UK after Brexit) |
| Sub-contract factor | 1.1195 | Blended from the three above on a 35/30/35 labour/plant/material mix |

Labour derivation:

| Irish grade (SEO) | IE €/hr | UK equivalent (CIJC) | UK £/hr | UK €/hr | Ratio |
|---|---:|---|---:|---:|---:|
| Craftsperson | 23.74 | Craft rate | 16.40 | 19.18 | 1.2377 |
| Category A (skilled operative) | 23.03 | Skill Rate 3 | 14.07 | 16.45 | 1.4000 |
| Category B (general operative) | 21.37 | General operative | 13.18 | 15.41 | 1.3868 |
| **Blended** | | | | | **1.3415** |

Net effect on a typical built-up item: **£1 of UK cost → €1.255**. Of that, 1.1694 is currency
and ~7.3% is a real, labour-driven cost premium. That is consistent with Arcadis'
*International Construction Costs 2025*, which ranks Dublin 9th globally against Bristol 8th
and London 2nd — Irish cost close to a major UK regional city, below London.

## Known limits

- **The Irish figures are factored UK build-ups, not Irish quoted rates.** The labour factor is
  well grounded; plant and material are parity assumptions. Test them against Irish supplier and
  hire-desk quotes before relying on the euro column for a tender.
- The source is an OCR extraction and some figures are mis-read. 2 rows are an order of
  magnitude out of line with their class (flagged `Probable source error`), 6 sit far from
  comparable items, and 8 are very large unit rates worth checking. See the `Review Queue`
  sheet. Scanning error may remain elsewhere.
- Apportioned splits are statistical, not quoted. The total is right; the shares are estimates.
- Rates are **net cost** — Spon's adds oncosts and profit separately, so nothing here carries
  overhead, profit, preliminaries or VAT.
- The control total on the Method sheet sums rates in mixed units (£/m, €/nr, €/m³). It exists
  to prove nothing was lost in the derivation, and is not a project cost.

## Sources

- Sectoral Employment Order (Construction Sector), Ireland — rates effective 1 August 2026
- CIJC Working Rule Agreement, UK — rates effective 20 July 2026
- GBP/EUR exchange rate, August 2026
- CSO Ireland Wholesale Price Index (building and construction materials); UK building materials index
- Arcadis, *International Construction Costs 2025*
- SCSI *Tender Price Index*, February 2026
