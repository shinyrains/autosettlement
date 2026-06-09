# Onestore Fixture Plan

Status: aligned to `docs/ONESTORE_CONTRACT.md`.

## 1. Source grounding

Fixture expectations must stay grounded in:

- `tmp/platform-samples/onestore/정산내역_20260608_163327.xlsx`
- `docs/ONESTORE_CONTRACT.md`

This plan covers only the current repo-slice contract:

- one workbook
- first worksheet only
- row 1 + row 2 merged-header flattening
- row 3+ data rows
- one output row per input row
- publisher-based company split

## 2. Fixture families

### 2.1 happy-path audited workbook

Purpose:

- prove the dedicated adapter flattens the two-row merged header correctly
- prove the parser splits company by `출판사`
- prove one row becomes one `SettlementRow`
- prove the first SR row and the first Raon row normalize to audited values

Expected assertions:

- no issues
- adapted row count = `13209`
- parsed row count = `13209`
- company counts:
  - `sr = 1302`
  - `raon = 11907`
- first SR row:
  - `workTitle = 레이드 커맨더 4권`
  - `author = 산호초`
  - `publisher = Arete`
  - `grossSales = 3200`
  - `settlementAmount = 2016`
  - `company = sr`
- first Raon row:
  - `workTitle = 플레이어 시스템 4권`
  - `author = 현무지기`
  - `publisher = 라온E&M`
  - `grossSales = 3200`
  - `settlementAmount = 2016`
  - `company = raon`

### 2.2 missing required header

Purpose:

- prove the adapter/parser blocks when a contracted required header is absent

Minimum mutation:

- remove one of: `상품명`, `출판사`, `글작가`, `합계`, `정산지급액`

Expected assertions:

- `rows = []`
- one `missing_column` or adapter-level `parse_error` depending on mutation boundary

### 2.3 missing identity value

Purpose:

- prove blank `상품명`, `출판사`, or `글작가` becomes `missing_field`

Expected assertions:

- affected row skipped
- one `missing_field`

### 2.4 invalid money value

Purpose:

- prove non-numeric `합계` or `정산지급액` becomes `invalid_value`

Expected assertions:

- affected row skipped
- one `invalid_value`

### 2.5 company split failure

Purpose:

- prove an unmatched publisher does not silently default to a company

Expected assertions:

- affected row skipped
- one `company_split_failed`

### 2.6 adapter workbook boundary

Purpose:

- prove malformed workbook input returns `parse_error`

Expected assertions:

- `rows = []`
- one `parse_error`

## 3. Integration coverage required in this slice

The current slice should prove Onestore through:

- dedicated XLSX adapter test
- dedicated parser test
- parser registry test
- file orchestrator sample smoke test
- batch orchestrator sample smoke test

## 4. Out of scope for current fixtures

Do not add current-fixture expectations for:

- alternate publisher alias tables beyond the current audited set
- title rewriting from `채널상품명`
- channel-specific display derived from `구매요청POC`
- multi-file grouping
- recalculation from support fee columns
