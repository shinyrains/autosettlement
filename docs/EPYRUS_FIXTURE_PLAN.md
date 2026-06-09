# Epyrus Fixture Plan

Status: aligned to `docs/EPYRUS_CONTRACT.md`.

## 1. Source grounding

Fixture expectations must stay grounded in:

- `tmp/platform-samples/epyrus/2026년04월정산내역_라온E＆M.csv`
- `docs/CSV_ENCODING_GUARD_CONTRACT.md`
- `docs/EPYRUS_CONTRACT.md`

## 2. Fixture family

### EPYRUS-SAMPLE-001 — real-sample decode and mapping smoke

Purpose:

- prove CP949/EUC-KR CSV decode reaches correct Korean headers
- prove `제목 / 저자 / 출판사 / 판매금액 / 정산액` mapping is stable
- prove one-row-in -> one-row-out behavior on the current sample

Representative expected rows:

```text
row 2 -> 그의 비밀 2 / 시커먼스 / 라온E＆M / 2720 / 1904
row 5 -> 내 인생 떡상 10 / 호만 / 라온E＆M / 3200 / 2016
```

### EPYRUS-CONTRACT-001 — required column failure

Purpose:

- missing mapped column returns `missing_column`

### EPYRUS-CONTRACT-002 — blank required value failure

Purpose:

- blank title or author returns `missing_field`

### EPYRUS-CONTRACT-003 — invalid money failure

Purpose:

- malformed `판매금액` or `정산액` returns `invalid_value`

### EPYRUS-ENCODING-001 — broken decode block

Purpose:

- broken byte decode returns `parse_error`
- parser must not run on unsafe decode output

## 3. File/orchestrator coverage

Required integration coverage for this repo slice:

- CSV adapter real-sample decode smoke
- file parse orchestrator end-to-end sample smoke
- batch parse orchestrator single-file Epyrus path smoke

## 4. Forbidden fixture behavior

- do not add original business CSV files to Git fixtures
- do not rewrite the parser to depend on `판매구분`
- do not add synthetic app split expectations
- do not derive settlement from `수수료`
