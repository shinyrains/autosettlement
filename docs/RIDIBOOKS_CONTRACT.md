# RIDIBOOKS_CONTRACT

## 1. Purpose

This document fixes the Ridibooks parser contract before implementation.

Ridibooks is a Formula / Group Parser platform. It must not be implemented as a single-file Simple Extract parser because the final result depends on:

- base CSV
- `file_1` adjustment CSV
- optional event transaction CSV
- optional MG correction input
- normal/app row separation
- event/non-event title suffix rules

This document is contract-only. It does not implement parser logic, tests, UI behavior, workbook export, or mailer behavior.

## 2. Input Files

Ridibooks normally uses two required CSV files.

```text
1. base file
2. file_1
```

Current sample names:

```text
base file: calculate_1.csv
file_1: calculate_1 (1).csv
```

If event settlement data exists, an optional third CSV is used.

```text
event file: calculate_date_tran_1.csv
```

If MG handling is required, an optional correction file/input is used.

```text
MG correction file/input: optional
```

## 3. Confirmed CSV Format

The three Ridibooks sample CSV files have the following confirmed format:

```text
encoding: UTF-8 BOM
delimiter: comma
```

Confirmed sample structures:

```text
calculate_1.csv              -> 59 columns, 4612 data rows
calculate_1 (1).csv          -> 59 columns, 15 data rows
calculate_date_tran_1.csv    -> 27 columns, 762 data rows
```

CSV cell values can contain Excel text wrappers such as:

```text
=T("작품명")
```

The parser must normalize these wrappers to the inner text value before creating `SettlementRow`.

## 4. Base File

The base file contains the main settlement rows.

Sample:

```text
calculate_1.csv
```

Required identity columns:

```text
도서 ID
제목
저자
출판사
시리즈명
```

Required amount columns:

```text
일반 판매액
일반 취소액
앱마켓 정산대상액
앱마켓 수수료
앱마켓 취소액
정산액
```

The base file also contains detailed app-market columns:

```text
iOS 정산대상액
iOS 수수료
iOS 취소액
Android 정산대상액
Android 수수료
Android 취소액
OneStore 정산대상액
OneStore 수수료
OneStore 취소액
```

For the current samples, aggregate app-market columns match the sum of the detailed iOS/Android/OneStore columns with zero mismatches.

## 5. File_1

`file_1` contains adjustment rows that must be compared with the base file.

Sample:

```text
calculate_1 (1).csv
```

Confirmed characteristics:

- Same 59-column header as the base file
- Sample `판매처` value: `원스토어수수료차액`
- All 15 sample rows match the base file by `도서 ID`

`file_1.정산액` is an adjustment value and must not be ignored.

## 6. Base <-> File_1 Matching

The matching key between the base file and `file_1` is confirmed as:

```text
base.도서 ID = file_1.도서 ID
```

Sample audit result:

```text
base 도서 ID unique: 4612
base duplicate 도서 ID: 0
file_1 도서 ID unique: 15
file_1 duplicate 도서 ID: 0
file_1 rows matched in base: 15 / 15
```

Other candidate keys also matched in the current sample, but `도서 ID` is the safest implementation key because it is stable, unique, and directly shared.

## 7. Normal Row Mapping

Base identity mapping:

```text
제목   -> workTitle
저자   -> author
출판사 -> publisher
```

Normal row title:

```text
mailerContentTitle = 작품명
```

## 8. Normal Sales Calculation

Normal sales are calculated by comparing the base file and `file_1`.

```text
normalSalesDiff = base.일반 판매액 - file_1.일반 판매액
normalCancelDiff = base.일반 취소액 - file_1.일반 취소액
```

```text
grossSales = normalSalesDiff + normalCancelDiff
```

Equivalent formula:

```text
grossSales =
(base.일반 판매액 - file_1.일반 판매액)
+
(base.일반 취소액 - file_1.일반 취소액)
```

If the CSV value already contains a negative sign, keep the sign and still apply the subtraction rule. Do not convert signed values to absolute values.

## 9. Normal Settlement Amount

Default normal settlement formula:

```text
settlementAmount = grossSales * 0.7 + file_1.정산액
```

MG rows override this default formula as described below.

## 10. MG Correction Input

MG must not be inferred from the Ridibooks source files.

The current samples contain no reliable MG indicator column or value. Therefore:

```text
file-internal automatic MG detection: forbidden
filename-based automatic MG detection: not recommended
separate MG correction upload/input slot: recommended
```

Recommended MG correction input:

```text
optional MG correction CSV/XLSX upload slot
```

Recommended columns:

```text
도서 ID
MG 여부
```

Acceptable fallback columns:

```text
작품명
MG 여부
```

Matching priority:

```text
1. 도서 ID
2. 작품명 / 제목 as fallback only
```

If no MG correction file/input is provided:

```text
all rows use the default non-MG calculation
```

If an MG correction file/input is provided but a correction row cannot be matched:

```text
emit ParseIssue(mapping_failed)
```

MG settlement formula:

```text
MG input present -> settlementAmount = grossSales * 0.6
MG input absent  -> settlementAmount = grossSales * 0.7 + file_1.정산액
```

## 11. App Sales Calculation

App sales create a separate row.

```text
mailerContentTitle = 작품명(app)
```

App gross sales:

```text
appGrossSales = 앱마켓 정산대상액 - 앱마켓 취소액
```

App settlement amount:

```text
appSettlementAmount =
(앱마켓 정산대상액 - 앱마켓 수수료 - 앱마켓 취소액) * 0.7
```

For base app rows, the aggregate app-market columns are the calculation authority:

```text
앱마켓 정산대상액
앱마켓 수수료
앱마켓 취소액
```

Detailed iOS/Android/OneStore columns may be used as a consistency check because the current samples show zero mismatch between aggregate and detailed sums.

## 12. Event File

The event file contains transaction rows for event-period settlement.

Sample:

```text
calculate_date_tran_1.csv
```

Required event columns:

```text
도서ID
제목
시리즈명
결제일
취소일
구매타입
일반 판매액
일반 정산액
iOS 앱마켓 정산대상액
iOS 앱마켓 정산액
Android 앱마켓 정산대상액
Android 앱마켓 정산액
OneStore 앱마켓 정산대상액
OneStore 앱마켓 정산액
구매상태
```

The event file does not include `저자` or `출판사` in the current sample.

## 13. Event File Matching and Join

The event file matches the base file by:

```text
event.도서ID = base.도서 ID
```

Sample audit result:

```text
event unique 도서ID: 124
event 도서ID matched in base: 124 / 124
base duplicate 도서 ID: 0
event rows missing base join: 0 / 762
joined author missing: 0
joined publisher missing: 0
```

Event row author/publisher values must be joined from the base row by `도서 ID`.

## 14. Event Replacement Unit

The implementation replacement unit is:

```text
도서ID unit
```

Event rows replace base + `file_1` calculated results for matching `도서ID`.

Do not replace an entire work/series unless a future contract explicitly changes this rule.

Reason:

- Event `도서ID` matches base rows exactly.
- `시리즈명` can cover many rows and can produce ambiguous replacement scope.
- Current sample has one event series but many event book IDs.

## 15. Event Period Input

When an event file is uploaded, the user must provide:

```text
eventStartDate
eventEndDate
```

These fields are required because event suffixes directly affect `mailerContentTitle` and therefore the generated settlement/mailer output.

If an event file exists but the event period is missing:

```text
parser stage: blocked issue target
export stage: blocked issue target
```

The system must not silently treat event rows as normal rows when the event period is missing.

Recommended issue representation:

```text
ParseIssue.issueType = "missing_field" or "mapping_failed"
severity = "error"
```

## 16. Event Period Classification

Rows whose `결제일` is inside the event period are event rows.

```text
eventStartDate <= 결제일 <= eventEndDate
```

Rows outside the event period are settled with the same event-file calculation method, but do not receive the event suffix.

Current sample date range:

```text
결제일: 2026-04-01 ~ 2026-04-30
취소일 non-dash count: 0
구매상태: 구매
구매타입: 일반구매, 대여
```

## 17. Event-Period Normal Sales

For event-period normal sales:

```text
mailerContentTitle = 작품명(이벤트)
```

```text
grossSales = sum(일반 판매액)
settlementAmount = sum(일반 정산액)
```

## 18. Event-Period App Sales

For event-period app sales:

```text
mailerContentTitle = 작품명(이벤트)(app)
```

```text
grossSales =
sum(iOS 앱마켓 정산대상액)
+ sum(Android 앱마켓 정산대상액)
+ sum(OneStore 앱마켓 정산대상액)
```

```text
settlementAmount =
sum(iOS 앱마켓 정산액)
+ sum(Android 앱마켓 정산액)
+ sum(OneStore 앱마켓 정산액)
```

## 19. Non-Event Rows From Event File

Rows outside the event period use the same event-file calculation columns but no event suffix.

```text
normal sales -> 작품명
app sales    -> 작품명(app)
```

## 20. Final Output Rows

Ridibooks can create up to four output row types per work/book.

```text
작품명
작품명(app)
작품명(이벤트)
작품명(이벤트)(app)
```

Each output row is converted to `SettlementRow`.

```text
workTitle = original work title
mailerContentTitle = 작품명 / 작품명(app) / 작품명(이벤트) / 작품명(이벤트)(app)
author = 저자
publisher = 출판사
grossSales = calculated gross sales
settlementAmount = calculated settlement amount
sourceFileName = representative source file
sourceRowIndex = representative source row index
issues = related issue ids
```

## 21. Parser Result Contract

Ridibooks parser output must be:

```text
SettlementRow[]
ParseIssue[]
```

The parser must not return UI-specific structures, workbook rows, mailer-rendered email output, or platform-specific source row objects.

## 22. Expected ParseIssue Cases

The parser must be able to represent at least these cases:

- missing base file -> `missing_file`
- missing `file_1` -> `missing_file`
- malformed CSV -> `parse_error`
- missing required column -> `missing_column`
- missing title/author/publisher where required -> `missing_field`
- amount parse failure -> `invalid_value`
- base and `file_1` matching failure -> `mapping_failed`
- event file matching failure -> `mapping_failed`
- event file exists but event period is missing -> `missing_field` or `mapping_failed`
- MG correction row cannot be matched -> `mapping_failed`
- MG value is present but invalid -> `invalid_value`
- duplicate output key after replacement -> `duplicate_row`

No new `ParseIssueType` should be added unless a future contract review proves the existing issue types cannot represent the case.

## 23. Forbidden Behavior

- Do not treat Ridibooks as a single-file Simple Extract parser.
- Do not ignore `file_1.정산액`.
- Do not infer MG from filenames.
- Do not infer MG from current sample row values.
- Do not process an event file without event period input.
- Do not silently classify event rows as normal rows when event dates are missing.
- Do not replace an entire work/series when only `도서ID` replacement is contracted.
- Do not add arbitrary formulas that are not specified in this contract.
- Do not silently convert signed negative values to absolute values.
- Do not merge normal/app/event rows into one row.
- Do not omit `(app)`, `(이벤트)`, or `(이벤트)(app)` suffixes from `mailerContentTitle`.
- Do not implement email display correction, address-book correction, deduction merge, or sending behavior.
- Do not expose platform-specific source CSV columns in `SettlementRow`.

## 24. Implementation Checklist

Before parser implementation:

- Add file group contract for required base + `file_1`.
- Add optional event file group contract.
- Add optional MG correction input contract.
- Add event period input contract.
- Prepare sanitized fixtures for:
  - normal rows
  - app rows
  - MG rows
  - event normal rows
  - event app rows
  - non-event rows from event file
  - missing event period
  - missing file errors
  - base/file_1 matching failure
  - event/base matching failure
  - MG correction matching failure
- Ensure parser and export validation can block output when an event file exists without event dates.

## 25. Current Unresolved Items

The following items remain unresolved and must not be guessed during implementation:

- Exact UI shape for event period input
- Exact upload slot shape for MG correction file/input
- Whether MG correction supports only `도서 ID` or also `작품명`
- Whether unmatched non-SR/legacy publisher naming requires additional normalization

The following items are now resolved by sample audit:

- CSV encoding and delimiter
- base <-> `file_1` matching key: `도서 ID`
- event <-> base matching key: `도서ID` -> `도서 ID`
- event row author/publisher join: base row by `도서 ID`
- event replacement unit: `도서ID`
- base app calculation authority: aggregate app-market columns, with detail columns available for consistency checks
