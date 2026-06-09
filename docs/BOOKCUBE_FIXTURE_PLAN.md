# Bookcube Fixture Plan

Status: aligned to `docs/BOOKCUBE_CONTRACT.md`.

## 1. Source grounding

Fixture expectations must stay grounded in:

- `tmp/platform-samples/bookcube/북큐브 상세매출 2026-5~2026-5 (1).xlsx`
- `docs/BOOKCUBE_CONTRACT.md`

This plan covers only the current repo-slice contract:

- one workbook
- one worksheet
- row 1 summary skip
- row 2 authoritative header
- row 3+ data rows
- one output row per input row

## 2. Fixture families

### 2.1 happy-path audited workbook

Purpose:

- prove the dedicated adapter skips row 1 summary
- prove row 2 is used as the header
- prove row 3+ becomes 5 adapted rows
- prove first row normalizes to the audited values
- prove settlement sum stays `10,500`

Expected assertions:

- no issues
- adapted row count = 5
- parsed row count = 5
- first row:
  - `workTitle = 짝사랑을 끝냈더니 소꿉친구들이 나에게 집착한다 1`
  - `author = 봄날의복길이`
  - `publisher = B cafe`
  - `grossSales = 3000`
  - `settlementAmount = 2100`
  - `sourceRowIndex = 3`

### 2.2 missing required header

Purpose:

- prove the adapter/parser blocks when a contracted required header is absent

Minimum mutation:

- remove one of: `제목`, `저자`, `판매액`, `정산액`

Expected assertions:

- `rows = []`
- one `missing_column` or adapter-level `parse_error` depending on the exact mutation boundary

### 2.3 missing identity value

Purpose:

- prove blank `제목` or `저자` becomes `missing_field`

Expected assertions:

- affected row skipped
- one `missing_field`

### 2.4 invalid money value

Purpose:

- prove non-numeric `판매액` or `정산액` becomes `invalid_value`

Expected assertions:

- affected row skipped
- one `invalid_value`

### 2.5 adapter workbook boundary

Purpose:

- prove non-workbook / malformed workbook input returns `parse_error`

Expected assertions:

- `rows = []`
- one `parse_error`

## 3. Integration coverage required in this slice

The current slice should prove Bookcube through:

- dedicated XLSX adapter test
- dedicated parser test
- parser registry test
- file orchestrator sample smoke test
- batch orchestrator sample smoke test

## 4. Out of scope for current fixtures

Do not add current-fixture expectations for:

- SR two-file grouped behavior
- duplicate merge across files
- company split
- alternate worksheet selection
- settlement recalculation from `수수료` or `정산대상금액`
