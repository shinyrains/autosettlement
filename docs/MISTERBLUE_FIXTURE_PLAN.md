# Misterblue Fixture Plan

Status: MVP fixture plan aligned to `docs/MISTERBLUE_CONTRACT.md`.

## 1. Source grounding

Fixture expectations must stay grounded in:

- `tmp/platform-samples/misterblue/작품별정산_2026-04-01_2026-04-30.xlsx`

Observed grounding facts used by the fixture plan:

- use only `작품별`
- ignore row 1 title
- flatten rows 2-5 header hierarchy
- split one source row into normal/app rows when both gross groups are present
- split total settlement proportionally by normal/app gross share

## 2. Minimum fixture families

Create the following families first:

1. `misterblue_valid_normal_app_amounts`
   - one source row with both normal and app gross sales
   - expect 2 settlement rows
2. `misterblue_normal_only`
   - one source row with only blue-money gross sales
   - expect 1 settlement row
3. `misterblue_app_only`
   - one source row with only app-money gross sales
   - expect 1 settlement row
4. `misterblue_summary_row_skipped`
   - one aggregate-like row with blank identity and filled totals
   - expect 0 settlement rows and 0 issues
5. `misterblue_invalid_total_settlement`
   - total settlement amount not parseable
   - expect `invalid_value`

## 3. Sanitized tabular shape

The MVP fixture layer may use already-flattened `TabularRow[]` instead of binary workbook assets.

Representative flattened keys:

- `작품코드`
- `작품명`
- `작가명`
- `종량 / 블루머니 / 권별 대여 / 매출액`
- `종량 / 블루머니 / 권별 소장 / 매출액`
- `종량 / 블루머니 / 전권 대여 / 매출액`
- `종량 / 블루머니 / 전권 소장 / 매출액`
- `종량 / A.앱머니 / 권별 대여 / 매출액`
- `종량 / A.앱머니 / 권별 소장 / 매출액`
- `종량 / A.앱머니 / 전권 대여 / 매출액`
- `종량 / A.앱머니 / 전권 소장 / 매출액`
- `종량 / i.앱머니 / 권별 대여 / 매출액`
- `종량 / i.앱머니 / 권별 소장 / 매출액`
- `종량 / i.앱머니 / 전권 대여 / 매출액`
- `종량 / i.앱머니 / 전권 소장 / 매출액`
- `합계(정액+종량) / 정산액`

## 4. Expected row rules

- normal output keeps `mailerContentTitle = 작품명`
- app output uses `mailerContentTitle = 작품명(app)`
- normal/app settlement amounts must sum back to the source row total settlement amount
- rounding uses one decimal place

## 5. Manifest note

Unlike Munpia group-fixture coverage, Misterblue MVP may start with parser-unit fixtures and adapter tests instead of a binary workbook fixture tree. If later workbook-family coverage is added, this plan should be upgraded rather than replaced.