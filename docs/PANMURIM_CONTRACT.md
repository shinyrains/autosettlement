# Panmurim Contract

Status: authority-closed for the current repo slice.

Authority sources inspected before closing this document:

- `tmp/platform-samples/panmurim/（주）라온이앤엠_2026년 5월.xlsx`
- `docs/SPECIAL_PLATFORM_TRANSFORM_CONTRACT.md`

## 1. Scope

This contract defines the minimum production-safe parser boundary for the current Panmurim repo slice.

The current slice is:

- one workbook only
- one data sheet only
- one output row per source volume row
- direct settlement calculation from an authoritative settlement-rate cell on the cover sheet

This document does **not** authorize future multi-company, multi-workbook, or UI wiring behavior.

## 2. Current audited workbook shape

Audited sample workbook:

```text
tmp/platform-samples/panmurim/（주）라온이앤엠_2026년 5월.xlsx
```

Confirmed workbook structure:

- sheet 1: `표지`
- sheet 2: `세부내역`

Current contract-safe interpretation:

- `표지` is metadata authority, not row data
- `세부내역` is the only row-data sheet for the current repo slice

## 3. Cover-sheet authority

Current audited cover-sheet cells establish these authoritative values:

- settlement month: `2026년 5월`
- payment date: `2026년 6월 30일`
- settlement rate label: `정산비율`
- settlement rate value: `70%`

Current parser boundary:

- `정산비율` on `표지` is the authoritative settlement-rate source
- the current slice must normalize that value to a decimal rate of `0.7`
- row parsing must not guess or hard-code a different rate when the cover sheet exists

## 4. Detail-sheet input rule

Current data sheet:

```text
세부내역
```

Current audited row structure:

- row 1: summary/header context
- row 2: blank spacer
- row 3: group labels
- row 4: base header row
- row 5+: source data rows

Current adapter contract:

- choose only the `세부내역` sheet
- ignore `표지` as row data
- use row 3 + row 4 together to resolve duplicate sales header names safely
- parse row 5+ as source rows
- preserve `sourceFileName` and `sourceRowIndex`

## 5. Current authoritative source columns

Current row-identity authority:

- `작품 제목`
- `회차 제목`
- `저자`
- `출판사`
- `시리즈 코드`
- `각 권 코드`

Current money authority:

- `합계 총액 / 판매금액`

Current output mapping for the repo slice:

- `workTitle <- 회차 제목`
- `mailerContentTitle <- 회차 제목`
- `author <- 저자`
- `publisher <- 출판사`
- `grossSales <- 합계 총액 / 판매금액`
- `settlementAmount <- grossSales * settlementRate`

Why `회차 제목` is used:

- the current workbook rows represent per-volume/per-episode settlement rows
- `작품 제목` alone would collapse distinct source rows into the same output title in review/export
- the current repo slice therefore preserves the more specific `회차 제목` as the review/output title authority

## 6. Settlement calculation rule

Current contract-safe formula:

```text
grossSales = 합계 총액 / 판매금액
settlementAmount = grossSales * 0.7
```

Current rounding rule:

- multiply using numeric decimal arithmetic
- keep the resulting numeric value exactly as produced by the current JavaScript number calculation for the audited rate `0.7`
- do not apply extra floor/ceil/round-to-int logic in the current repo slice

Current audited examples:

- `3200 -> 2240`
- `1800 -> 1260`
- `6000 -> 4200`
- `1000 -> 700`

## 7. One-row output rule

For the current repo slice:

- one valid Panmurim source row produces one `SettlementRow`
- no grouped aggregation is required
- no multi-file reconciliation is required
- no web/app row split is required

## 8. Required columns for the current slice

The minimum current required columns are:

- `회차 제목`
- `저자`
- `출판사`
- `합계 총액 / 판매금액`

The adapter must also provide a normalized settlement-rate field sourced from `표지 / 정산비율`.

## 9. Forbidden behavior

- do not read the first workbook sheet by default and silently treat `표지` as data
- do not guess the settlement rate from the filename
- do not hard-code `0.7` when the cover sheet is readable
- do not use `작품 제목` to replace `회차 제목` in the current repo slice
- do not split rows into web/app outputs
- do not derive settlement from `소장 / 판매금액` plus `대여 / 판매금액` when `합계 총액 / 판매금액` already exists as the row authority
- do not subtract `포인트 사용` again from `합계 총액 / 판매금액`
- do not treat `정액제` or `유료대여권` as separate output rows in the current repo slice
- do not infer company from `CP` or `출판사`

## 10. Out of scope for the current repo slice

- company-specific Panmurim variants beyond the audited sample workbook
- future workbooks whose cover sheet omits `정산비율`
- alternate rate tables by category or title
- grouped aggregation by `시리즈 코드`
- title-normalization policy between `작품 제목` and `회차 제목`
- UI slot/wizard wiring
- live upload persistence flow

## 11. Fixture expectations

The first Panmurim fixture family must prove:

- the adapter selects `세부내역`
- the adapter injects normalized settlement rate from `표지`
- the parser uses `회차 제목` for `workTitle` and `mailerContentTitle`
- the parser maps `출판사`
- the parser calculates `settlementAmount = 합계 총액 / 판매금액 * 0.7`
- empty/invalid required values surface `missing_field` or `invalid_value`

See:

```text
docs/PANMURIM_FIXTURE_PLAN.md
```