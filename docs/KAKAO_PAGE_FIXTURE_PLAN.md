# Kakao Page Fixture Plan

Status: aligned to `docs/KAKAO_PAGE_CONTRACT.md`.

## 1. Source grounding

Fixture expectations must stay grounded in:

- `tmp/platform-samples/kakao_page/카카오페이지 일반계약_2026-05_주식회사 에스알이앤엠_CP월정산내역.xlsx`
- `docs/KAKAO_PAGE_CONTRACT.md`

This plan covers only the current repo-slice contract:

- one normal workbook
- one worksheet
- row 1 group-header context
- row 2 authoritative header
- row 3+ data rows
- one output row per valid source row
- no MG workbook support yet
- one browser single-file XLSX upload path using the same audited workbook boundary

## 2. Fixture families

### 2.1 audited normal-workbook happy path

Purpose:

- prove the audited workbook is read as a single-sheet normal-file input
- prove row 2 leaf headers remain the adapter's canonical required-column keys
- prove row 1 is used only as supporting group-header context, not as a blanket prefix for every output header
- prove row 3+ becomes source data
- prove the first audited row normalizes to the contract values
- prove settlement authority comes from `공급가액`
- prove negative numeric source rows are preserved as valid data when present in the workbook

Expected assertions:

- no issues
- adapted row count = 207
- parsed row count = 207
- first row:
  - `workTitle = 둠스데이 [완결]`
  - `author = 산호초`
  - `publisher = Arete`
  - `grossSales = 2340`
  - `settlementAmount = 1499`
  - `sourceRowIndex = 3`

### 2.2 missing required header

Purpose:

- prove the adapter/parser blocks when a contracted required header is absent

Minimum mutation:

- remove one of: `시리즈명`, `작가명`, `발행자명`, `총합계-원화`, `공급가액`

Expected assertions:

- `rows = []`
- one `missing_column` or adapter-level `parse_error` depending on the exact mutation boundary

### 2.3 missing required identity/value field

Purpose:

- prove blank identity/value cells become row-level failures

Minimum mutation:

- blank one of: `시리즈명`, `작가명`, `총합계-원화`, `공급가액`

Expected assertions:

- affected row skipped
- one `missing_field` for title/author blanks, or `invalid_value` for non-numeric money fields

### 2.4 invalid monetary value

Purpose:

- prove non-numeric numeric fields are rejected

Minimum mutation:

- replace `총합계-원화` or `공급가액` with non-numeric text

Expected assertions:

- affected row skipped
- one `invalid_value`

### 2.5 workbook boundary failure

Purpose:

- prove malformed workbook / unreadable worksheet shape returns `parse_error`

Expected assertions:

- `rows = []`
- one `parse_error`

## 3. Integration coverage required in the first implementation slice

The first green Kakao Page implementation slice should prove:

- dedicated XLSX adapter test
- dedicated parser test
- parser registry test
- file orchestrator sample smoke test
- batch orchestrator sample smoke test

## 4. Forbidden fixture drift

Do not add current-fixture expectations for:

- optional MG workbook merge behavior
- MG row replacement vs separate-row semantics
- grouped normal+MG slot UI behavior
- company split rules
- settlement recalculation from rate columns when `공급가액` exists
- filename-based MG guessing
