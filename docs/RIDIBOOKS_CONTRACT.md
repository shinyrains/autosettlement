# Ridibooks Contract

## 1. Purpose

This document fixes the Ridibooks parser contract before implementation.

Ridibooks is not a Simple Extract platform. It is a Formula / Group Parser platform because the final `SettlementRow[]` depends on multiple CSV files, adjustment rows, optional event-period rows, MG handling, and normal/app output separation.

This document is a contract document only. It does not implement parser logic, tests, UI behavior, Excel export, or mailer behavior.

## 2. Input Files

Ridibooks normally uses two files.

```text
1. base file
2. file_1
```

Current sample names:

```text
base file: calculate_1.csv
file_1: calculate_1 (1).csv
```

If event settlement data exists, a third file can be used.

```text
event file: calculate_date_tran_1.csv
```

## 3. File Roles

### 3.1 Base File

The base file contains the main settlement rows.

Sample:

```text
calculate_1.csv
```

Confirmed sample characteristics:

- UTF-8 BOM CSV
- comma delimiter
- 59 columns
- row-level source trace is possible

### 3.2 File_1

`file_1` contains adjustment rows that must be compared with the base file.

Sample:

```text
calculate_1 (1).csv
```

Confirmed sample characteristics:

- UTF-8 BOM CSV
- comma delimiter
- same 59-column header as the base file
- sample `판매처` value: `원스토어수수료차액`
- rows can be matched to the base file by book identity

### 3.3 Event File

The event file contains transaction rows for event-period settlement.

Sample:

```text
calculate_date_tran_1.csv
```

Confirmed sample characteristics:

- UTF-8 BOM CSV
- comma delimiter
- 27 columns
- event-period classification requires explicit event start/end dates

## 4. Base Column Mapping

The base identity fields are:

```text
제목   -> workTitle
저자   -> author
출판사 -> publisher
```

The parser must normalize Excel text wrapper values such as:

```text
=T("작품명")
```

to the inner text value before creating `SettlementRow`.

## 5. Normal Sales Calculation

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

If the CSV value already contains a negative sign, keep the sign and still apply the subtraction rule above. Do not silently convert negative values to positive values.

## 6. Normal Settlement Amount

Default normal settlement formula:

```text
settlementAmount = grossSales * 0.7 + file_1.정산액
```

`file_1.정산액` is an adjustment value and must not be ignored.

## 7. MG Handling

Ridibooks uses a different settlement formula for works/authors that are MG (minimum guarantee) targets.

```text
MG settlementAmount = grossSales * 0.6
```

Therefore the Ridibooks correction/input step must support an `MG` input column or equivalent explicit user-provided correction value.

```text
MG input present -> settlementAmount = grossSales * 0.6
MG input absent  -> settlementAmount = grossSales * 0.7 + file_1.정산액
```

MG must not be inferred from the current sample files unless a future authority document defines a reliable source column or file.

## 8. App Sales Calculation

App sales must create a separate row with `(app)` in `mailerContentTitle`.

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

If a CSV value already contains a negative sign, keep the sign and still apply the subtraction rule above.

The base file also contains app-market detail columns for iOS, Android, and OneStore. The initial contract uses the aggregate app-market columns unless a future audit proves that the detailed columns are required for reconciliation.

## 9. Event File Priority

If an event file is uploaded, event rows take priority for matching works.

```text
event file contains matching work
-> remove the existing base + file_1 calculated result for that matching scope
-> replace it with event-file calculated result
```

The exact replacement key must be fixed before implementation. Candidate keys:

- book ID
- title
- series title
- title + series title
- title + author + publisher, if those fields can be joined from the base file

Do not implement an arbitrary replacement key without a contract update.

## 10. Event File Columns

The event file extraction columns are:

```text
제목
결제일
구매타입
일반 판매액
일반 정산액
iOS 앱마켓 정산대상액
iOS 앱마켓 정산액
Android 앱마켓 정산대상액
Android 앱마켓 정산액
OneStore 앱마켓 정산대상액
OneStore 앱마켓 정산액
```

The sample event file also includes:

```text
도서ID
시리즈명
취소일
주문번호
구매상태
CP 관리 ID
```

These fields can be used for matching, filtering, and source trace if required by the final implementation plan.

## 11. Event Period Input

When an event file is uploaded, the user must be able to provide:

```text
eventStartDate
eventEndDate
```

Rows whose `결제일` is inside the event period are event rows.

Rows outside the event period are still settled by the same event-file calculation method, but do not receive the event suffix.

## 12. Event-Period Normal Sales

For event-period normal sales:

```text
mailerContentTitle = 작품명(이벤트)
```

```text
grossSales = sum(일반 판매액)
settlementAmount = sum(일반 정산액)
```

## 13. Event-Period App Sales

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

## 14. Non-Event Rows In Event File

Rows outside the event period are settled with the same event-file column rules, but without the event suffix.

```text
normal sales -> 작품명
app sales    -> 작품명(app)
```

## 15. Final Output Rows

Ridibooks can create up to four output row types per work.

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

## 16. Parser Result Contract

Ridibooks parser output must be:

```text
SettlementRow[]
ParseIssue[]
```

The parser must not return UI-specific structures, workbook rows, mailer-rendered email output, or platform-specific source row objects.

## 17. Expected ParseIssue Cases

The parser must be able to represent at least these cases:

- missing base file -> `missing_file`
- missing `file_1` -> `missing_file`
- malformed CSV or unreadable table -> `parse_error`
- missing required column -> `missing_column`
- missing title/author/publisher where required -> `missing_field`
- amount parse failure -> `invalid_value`
- base and `file_1` matching failure -> `mapping_failed`
- event file matching failure -> `mapping_failed`
- duplicate output key after replacement -> `duplicate_row`
- missing event period when event file exists -> `missing_field` or `mapping_failed`
- MG value is present but invalid -> `invalid_value`

No new `ParseIssueType` should be added unless a future contract review proves the existing issue types cannot represent the case.

## 18. Forbidden Behavior

- Do not treat Ridibooks as a single-file Simple Extract parser.
- Do not ignore `file_1.정산액`.
- Do not infer MG from filenames or current sample row values.
- Do not add arbitrary formulas that are not specified in this contract.
- Do not silently convert signed negative values to absolute values.
- Do not merge normal/app/event rows into one row.
- Do not omit `(app)`, `(이벤트)`, or `(이벤트)(app)` suffixes from `mailerContentTitle`.
- Do not implement email display correction, address-book correction, deduction merge, or sending behavior.
- Do not expose platform-specific source CSV columns in `SettlementRow`.

## 19. Implementation Checklist

Before parser implementation:

- Confirm the matching key between base file and `file_1`.
- Confirm the event replacement key.
- Confirm whether event file rows should replace by book ID, title, series title, or another key.
- Confirm how author/publisher are joined for event rows because the event file sample does not include `저자` or `출판사`.
- Confirm the UI/input source for MG flags.
- Confirm whether aggregate app-market columns are sufficient for base app rows.
- Prepare sanitized fixture data for:
  - normal rows
  - app rows
  - MG rows
  - event normal rows
  - event app rows
  - event-period outside rows
  - missing file errors
  - matching failures

## 20. Current Unresolved Items

The following items remain unresolved and must not be guessed during implementation:

- base <-> `file_1` matching key
- event replacement key
- source of MG input
- event row author/publisher join source
- whether event rows replace all base rows for a work or only matching book IDs
- whether aggregate app-market columns or iOS/Android/OneStore detail columns are authoritative for base app rows
