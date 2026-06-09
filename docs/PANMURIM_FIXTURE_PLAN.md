# Panmurim Fixture Plan

Status: aligned to `docs/PANMURIM_CONTRACT.md`.

## 1. Source grounding

Fixture expectations must stay grounded in:

- `tmp/platform-samples/panmurim/（주）라온이앤엠_2026년 5월.xlsx`
- `docs/PANMURIM_CONTRACT.md`

## 2. Fixture family

Current minimum fixture family for the repo slice:

### `panmurim_single_workbook_happy_path`
- one audited-style workbook
- `표지` sheet contains `정산비율 = 70%`
- `세부내역` sheet contains row 3 group headers + row 4 base headers + row 5+ data
- parser returns one `SettlementRow` per valid source row

### `panmurim_missing_detail_sheet`
- workbook lacks `세부내역`
- expected result: adapter-level `parse_error`

### `panmurim_missing_cover_rate`
- workbook lacks readable `표지 / 정산비율`
- expected result: adapter-level `parse_error`

### `panmurim_missing_required_field`
- adapted row has blank `회차 제목` or `저자`
- expected result: parser-level `missing_field`

### `panmurim_invalid_total_amount`
- adapted row has non-numeric `합계 총액 / 판매금액`
- expected result: parser-level `invalid_value`

## 3. Expected output contract

For the current repo slice, expected row mapping is:

- `workTitle <- 회차 제목`
- `mailerContentTitle <- 회차 제목`
- `author <- 저자`
- `publisher <- 출판사`
- `grossSales <- 합계 총액 / 판매금액`
- `settlementAmount <- grossSales * 0.7`

Representative expected audited rows:

- `그의 비밀 2권 / grossSales 3200 / settlementAmount 2240`
- `대물로 태어나게 해주세요! 13권 / grossSales 1800 / settlementAmount 1260`
- `비천신마 6-3권 / grossSales 6000 / settlementAmount 4200`

## 4. Adapter assertions

The Panmurim adapter fixture/tests must assert:

- only `세부내역` becomes row data
- row 5 becomes `sourceRowIndex = 5`
- duplicate sales headers are flattened with group prefixes
- the normalized row contains a settlement-rate field sourced from `표지`
- the first audited row keeps:
  - `작품 제목 = 그의 비밀`
  - `회차 제목 = 그의 비밀 2권`
  - `저자 = 시커먼스`
  - `출판사 = 라온E&M`
  - `합계 총액 / 판매금액 = 3200`
  - settlement-rate field = `0.7`

## 5. Forbidden fixture drift

- do not switch the title authority back to `작품 제목` unless the contract changes first
- do not add app/non-app split expectations
- do not derive settlement from `소장` and `대여` subtotal columns when `합계 총액 / 판매금액` is present
- do not add per-series aggregation expectations in the current repo slice

## 6. First implementation target

The first green implementation slice should include:

- `src/fileAdapters/panmurimXlsxAdapter.ts`
- `src/fileAdapters/panmurimXlsxAdapter.test.ts`
- `src/parsers/panmurim.ts`
- targeted orchestrator smoke coverage using the real sample workbook
