# Epyrus Contract

Status: authority-closed for the current repo slice.

Authority source inspected before closing this document:

- `tmp/platform-samples/epyrus/2026년04월정산내역_라온E＆M.csv`
- `docs/CSV_ENCODING_GUARD_CONTRACT.md`
- `src/parsers/simpleExtractMappings.ts`

## 1. Input boundary

Epyrus is a single-file CSV platform.

Current audited input shape:

```text
file kind: csv
encoding: CP949 / EUC-KR
delimiter: comma
header row: first row
```

This platform must enter the parser through the CSV adapter decode guard.

Parser code must never guess or repair encoding.

## 2. Source columns confirmed from the audited sample

Confirmed source columns:

```text
정산자
판매구분
제목
저자
출판사
수량
판매금액
수수료
정산액
```

For the current repo slice, the parser contract uses only:

```text
제목
저자
출판사
판매금액
정산액
```

The remaining columns are currently informational and must not be turned into parser-side heuristics.

## 3. Transform rule

Epyrus is a Simple Extract Platform.

Normalized row mapping:

```text
workTitle         <- 제목
author            <- 저자
publisher         <- 출판사
grossSales        <- 판매금액
settlementAmount  <- 정산액
```

## 4. Explicit non-rules

The current parser must not:

- derive company from `정산자`
- split rows by `판매구분`
- recalculate settlement from `수수료`
- infer alternate title suffixes from `판매구분`
- treat missing decoded Korean headers as zero-valued columns

`판매구분` values such as `앱` or `이북클럽` are preserved only as unused source context in this repo slice. They do not create extra output rows.

## 5. Output rule

One valid source row produces one `SettlementRow`.

The common output rules still apply:

```text
mailerContentTitle = workTitle
sourceFileName     = uploaded file name
sourceRowIndex     = original CSV line index
```

## 6. Error contract

Expected blocking/error behavior:

- broken CSV decode -> `parse_error`
- missing required mapped column -> `missing_column`
- blank required mapped value -> `missing_field`
- invalid money value -> `invalid_value`

The parser must return `SettlementRow[] + ParseIssue[]` only.

## 7. Fixture anchor

The current audited sample demonstrates at least these real rows:

```text
앱 / 그의 비밀 2 / 시커먼스 / 2,720 / 1,904
앱 / 그의 비밀 3 / 시커먼스 / 2,720 / 1,904
이북클럽 / 내 인생 떡상 10 / 호만 / 3,200 / 2,016
```

Fixture and integration tests should stay grounded in this source shape.

## 8. In-scope completion for this repo slice

In scope:

- CSV byte decode through CP949-safe adapter path
- parser mapping grounded in the audited sample
- file/batch orchestrator single-file path verification
- contract/fixture/test-plan sync

Out of scope:

- special app/non-app row splitting
- sales-channel-specific title decoration
- separate handling by `정산자`
- UI special-case upload flow
