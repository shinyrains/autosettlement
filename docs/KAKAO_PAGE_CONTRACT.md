# Kakao Page Contract

Status: authority-grounded for the current pre-implementation repo slice.

Authority sources inspected before writing this document:

- `tmp/platform-samples/kakao_page/카카오페이지 일반계약_2026-05_주식회사 에스알이앤엠_CP월정산내역.xlsx`
- `docs/SPECIAL_PLATFORM_TRANSFORM_CONTRACT.md`

## 1. Scope

This contract defines the minimum authority-safe parser boundary for the current Kakao Page repo slice.

The current slice is intentionally narrow:

- one normal workbook only
- one worksheet only
- one output row per source row
- no MG workbook support yet
- no grouped normal+MG merge semantics yet

This document does **not** authorize future MG merge logic, multi-workbook behavior, or browser upload wiring.

## 2. Current audited workbook shape

Audited sample workbook:

```text
tmp/platform-samples/kakao_page/카카오페이지 일반계약_2026-05_주식회사 에스알이앤엠_CP월정산내역.xlsx
```

Confirmed workbook structure:

- workbook has exactly 1 worksheet in the audited sample
- worksheet name: `정산리포트_카카오페이지_2026-05`
- worksheet max row / max col observed in the audited sample: `209 / 47`

Current contract-safe interpretation:

- row 1 is a group-header row
- row 2 is the authoritative base-header row
- row 3+ is data
- parser/adapter must preserve `sourceFileName` and `sourceRowIndex`

## 3. Current sample boundary

The current audited workbook proves only the following boundary:

- `특별/일반` values observed: `일반` only
- `계약유형` values observed: `카카오페이지 일반계약` only
- no MG-labelled row/file evidence exists in the audited sample

Therefore the current repo slice is frozen as:

- normal workbook parsing only
- MG workbook handling deferred
- `kakao_page` platform type expansion remains a later implementation step, not an authority blocker for this document itself

## 4. Current authoritative source columns

The current audited row contract is:

- `workTitle <- 시리즈명`
- `mailerContentTitle <- 시리즈명`
- `author <- 작가명`
- `publisher <- 발행자명`
- `grossSales <- 총합계-원화`
- `settlementAmount <- 공급가액`

Additional audited context columns that may remain available to tests/adapter assertions but must not replace the primary mapping without a contract update:

- `총합계-순매출`
- `ANDROID 정산율(%)`
- `WEB 정산율(%)`
- `IOS 정산율(%)`
- `EVENT 정산율(%)`
- `특별/일반`
- `계약유형`

## 5. Settlement authority

Current audited first-row arithmetic shows:

- `총합계-원화 = 2340`
- `총합계-순매출 = 2141`
- per-channel rate values = `70.00%`
- `공급가액 = 1499`

Current contract-safe rule:

- use `공급가액` as the authoritative `settlementAmount`
- do **not** recalculate `settlementAmount` from `총합계-순매출 * 정산율` when `공급가액` is present
- do **not** infer MG semantics from rate columns or workbook naming

## 6. Required workbook/header rule

The current adapter/parser boundary requires these columns at minimum:

- `시리즈명`
- `작가명`
- `발행자명`
- `총합계-원화`
- `공급가액`

Current adapter contract:

- flatten row 1 group labels plus row 2 base headers into stable column names where needed
- parse row 3+ as source rows
- if the workbook or worksheet shape is unreadable, return `parse_error`
- if a required column is missing, return `missing_column`

## 7. Row-level validation rule

For the current repo slice:

- blank `시리즈명` or blank `작가명` becomes `missing_field`
- non-numeric `총합계-원화` or `공급가액` becomes `invalid_value`
- valid rows produce exactly one `SettlementRow`
- current slice does not authorize cross-row merge, MG overlay, or grouped replacement behavior

## 8. Representative audited row

The first audited source row currently normalizes as:

- `workTitle = 둠스데이 [완결]`
- `mailerContentTitle = 둠스데이 [완결]`
- `author = 산호초`
- `publisher = Arete`
- `grossSales = 2340`
- `settlementAmount = 1499`
- `sourceRowIndex = 3`

## 9. Out of scope

Still unresolved and therefore forbidden in the current slice:

- optional MG workbook ingestion
- MG rows replacing normal rows vs emitting separate rows
- MG matching key design
- multi-company split behavior
- grouped upload/live-upload behavior
- deriving `settlementAmount` from rate math when `공급가액` exists
- inferring parser mode from filename only
