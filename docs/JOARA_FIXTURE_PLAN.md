# Joara Fixture Plan

Status: aligned to `docs/JOARA_CONTRACT.md`.

## 1. Source grounding

Fixture expectations must stay grounded in:

- `tmp/platform-samples/joara/정산 상세리스트_2026-5.csv`
- `tmp/platform-samples/joara/작품별 정산리스트_2026-5.csv`
- `docs/CSV_ENCODING_GUARD_CONTRACT.md`
- `docs/JOARA_CONTRACT.md`

## 2. Fixture family

### JOARA-GROUP-001 — grouped happy path

Purpose:

- prove UTF-8 BOM CSV decode succeeds for both files
- prove grouped key matching uses `작품명 + 작품코드 + 작가명`
- prove gross sales come from `정산 상세리스트 / 판매금액(원)`
- prove settlement amount comes from `작품별 정산리스트 / 정산금액`
- prove one grouped work key yields one normalized output row

Representative expectations:

- grouped detail rows aggregate to one work-level row when they share the same grouped key
- `mailerContentTitle = 작품명`
- `publisher` remains undefined

### JOARA-GROUP-002 — missing grouped file

Purpose:

- missing `settlementDetail` or missing `workSettlement` returns `missing_file`

### JOARA-GROUP-003 — required column failure

Purpose:

- missing `작품코드`, `작품명`, `작가명`, `판매금액(원)`, or `정산금액` returns `missing_column`

### JOARA-GROUP-004 — blank identity failure

Purpose:

- blank grouped-key fields return `missing_field`

### JOARA-GROUP-005 — invalid numeric failure

Purpose:

- malformed `판매금액(원)` or `정산금액` returns `invalid_value`

### JOARA-GROUP-006 — unmatched cross-file key

Purpose:

- when a grouped key exists in only one file, emit `mapping_failed`

### JOARA-GROUP-007 — forbidden settlement source regression

Purpose:

- parser must not switch final settlement source to `정산 상세리스트 / 정산금액(원)` when `작품별 정산리스트 / 정산금액` exists

## 3. File/orchestrator coverage

Required integration coverage for this repo slice:

- CSV adapter decode smoke for both Joara files
- grouped parser fixture coverage
- batch orchestrator grouped-file path smoke after parser implementation

## 4. Forbidden fixture behavior

- do not add original business CSV files to Git fixtures
- do not create 권차별 output expectations
- do not infer app/non-app row splitting
- do not replace authoritative settlement with `단가 * 판매건수`
- do not use `정산 상세리스트 / 정산금액(원)` as the final settlement source in normal happy-path fixtures
