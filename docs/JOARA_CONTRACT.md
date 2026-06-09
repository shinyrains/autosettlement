# Joara Contract

Status: authority-closed for the current repo slice.

Authority source inspected before closing this document:

- `tmp/platform-samples/joara/정산 상세리스트_2026-5.csv`
- `tmp/platform-samples/joara/작품별 정산리스트_2026-5.csv`
- `docs/CSV_ENCODING_GUARD_CONTRACT.md`
- `docs/SPECIAL_PLATFORM_TRANSFORM_CONTRACT.md`

## 1. Input boundary

Joara is a two-file CSV platform.

Current audited input shape:

```text
file A: 정산 상세리스트
file B: 작품별 정산리스트
encoding: UTF-8 BOM
delimiter: comma
header row: first row
```

Current real-sample headers:

### 1.1 정산 상세리스트

```text
판매일
작품명
작품코드
작가명
권차
구매/환불
판매금액(원)
정산비율
정산금액(원)
정산일
```

### 1.2 작품별 정산리스트

```text
작품명
작품코드
작가명
단가
판매건수
비율
정산금액
정산일
```

## 2. Grouping rule

Joara must not be treated as a one-file simple extract platform.

The parser input unit is one grouped fixture containing:

- one `settlementDetail` file from `정산 상세리스트`
- one `workSettlement` file from `작품별 정산리스트`

Recommended slot names for the current repo slice:

```text
settlementDetail
workSettlement
```

## 3. Transform rule

The current contract-safe output key is:

```text
작품명 + 작품코드 + 작가명
```

Reason:

- `작품코드` exists in both source files and is a stronger identity anchor than title alone.
- `작품명 + 작가명` remains useful review context.

Normalization rule:

- aggregate gross sales from `정산 상세리스트 / 판매금액(원)` by the group key
- aggregate settlement amount from `작품별 정산리스트 / 정산금액` by the group key
- produce one final `SettlementRow` per grouped work key

Output mapping:

```text
workTitle         <- 작품명
mailerContentTitle<- 작품명
author            <- 작가명
publisher         <- undefined (current sample has no publisher column)
grossSales        <- sum(정산 상세리스트 / 판매금액(원))
settlementAmount  <- sum(작품별 정산리스트 / 정산금액)
```

## 4. Explicit non-rules

The current parser must not:

- create one output row per 권차
- use `단가 * 판매건수` as a replacement for authoritative settlement
- sum settlement from `정산 상세리스트 / 정산금액(원)` when `작품별 정산리스트 / 정산금액` exists for the same key
- infer app/non-app split
- decorate titles with 단행본 suffixes unless a future authority document closes that behavior

## 5. Source-of-truth priority

For the current repo slice:

- **gross sales authority**: `정산 상세리스트 / 판매금액(원)`
- **settlement authority**: `작품별 정산리스트 / 정산금액`

`정산 상세리스트 / 정산금액(원)` may be used only as audit context, not as the final settlement source, unless future authority changes this rule.

## 6. Output rule

One valid grouped work key produces one `SettlementRow`.

Current common output rules:

```text
mailerContentTitle = workTitle
sourceFileName     = grouped source trace
sourceRowIndex     = grouped source trace anchor
```

For grouped trace in the current repo slice, the safe minimum is:

- preserve both source file names in parser/orchestrator context
- choose the first contributing `정산 상세리스트` row index as the representative `sourceRowIndex`

## 7. Error contract

Expected blocking/error behavior:

- missing grouped file -> `missing_file`
- broken CSV decode -> `parse_error`
- missing required grouped column -> `missing_column`
- blank required grouped value -> `missing_field`
- invalid money/count value -> `invalid_value`
- row exists in one file but cannot be matched to the other grouped key -> `mapping_failed`

The parser must return `SettlementRow[] + ParseIssue[]` only.

## 8. Real-sample anchor

Audited sample facts:

- `정산 상세리스트_2026-5.csv`: 5 data rows after header
- `작품별 정산리스트_2026-5.csv`: 22 data rows after header
- both files decode as UTF-8 BOM CSV

Representative detail rows:

```text
기사의 일기(Diary of a Knight) / 1863448 / 편곤 / 판매금액(원)=3200 / 정산금액(원)=1920
칼든 자들의 도시 / 1862403 / 장영훈 / 판매금액(원)=3000 / 정산금액(원)=1800
```

Representative work rows:

```text
재벌 매니지먼트 / 1242682 / [필로스] / 정산금액=6420
레이드 커맨더 / 1253807 / [산호초] / 정산금액=540
```

## 9. In-scope completion for this repo slice

In scope:

- two-file authority closure
- grouped key closure
- gross/settlement source-of-truth closure
- fixture planning and future parser/orchestrator boundary definition

Out of scope:

- actual group parser implementation
- title suffix policy for 단행본
- publisher enrichment
- UI upload slot wiring
