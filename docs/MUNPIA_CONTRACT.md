# Munpia Calculation Contract

## 1. Purpose

Munpia is a Formula Platform, not a Simple Extract Platform.

Munpia uses one XLSX source file and splits each source row into web/app settlement rows when the relevant sales amount exists.

Output is still normalized to:

```text
SettlementRow[] + ParseIssue[]
```

AutoSettlement must calculate the result rows from the agreed formula. It must not rely on the original settlement column as the final authority.

## 2. Sample File

Audit sample:

```text
tmp/platform-samples/munpia/아레떼북스.xlsx
```

The original sample file must not be added to the repository.

## 3. File Structure

Confirmed sample structure:

```text
file kind: xlsx
sheet count: 1
sheet name: 아레떼북스
used range: A1:W73
header row: row 1
total row: row 2
data rows: 71
used columns: A:P
empty trailing columns: Q:W
```

Parser requirements:

- Use the first worksheet for the MVP.
- Use row 1 as the header row.
- Exclude row 2 where `번호 = Total`.
- Ignore empty trailing columns.
- Preserve `sourceFileName` and `sourceRowIndex`.

## 4. Required Columns

Required columns:

```text
작가
작품
총매출
IOS매출
Google매출
```

Header handling:

- Header cells must be trimmed before matching.
- The app iOS column is fixed as `IOS매출`.
- Do not silently accept a different case such as `ios매출` until a separate alias policy is approved.

Optional validation column:

```text
정산
```

The `정산` column is not the calculation source of truth. It is a validation/reference column only.

## 5. Calculation Rules

For each source data row, generate up to two output rows.

Web row:

```text
mailerContentTitle = 작품명
grossSales = 총매출
settlementAmount = 총매출 * 0.63
```

App row:

```text
mailerContentTitle = 작품명(app)
grossSales = IOS매출 + Google매출
settlementAmount = IOS매출 * 0.441 + Google매출 * 0.567
```

Common mapping:

```text
platform = munpia
workTitle = 작품
author = 작가 after correction
publisher = optional / undefined
saleMonth = parser context
company = parser context
sourceFileName = source file
sourceRowIndex = source row
```

## 6. Zero Row Policy

Do not generate zero-sales rows.

```text
if web grossSales = 0
  do not create web row

if app grossSales = 0
  do not create app row
```

Sample audit result:

```text
web rows with non-zero grossSales: 52
app rows with non-zero grossSales: 53
expected SettlementRow candidates: 105
```

## 7. Original Settlement Column Policy

The original `정산` column is for validation only.

AutoSettlement calculation is based on the formulas in this contract:

```text
web settlementAmount = 총매출 * 0.63
app settlementAmount = IOS매출 * 0.441 + Google매출 * 0.567
```

Sample audit result:

```text
data row calculated settlement matched the original 정산 value after rounding
formula mismatch count: 0
```

If future samples disagree with the original `정산` column, do not silently change the formula. Report the mismatch and update the contract only after review.

## 8. Rounding Policy

Current sample values match the original `정산` column when calculated settlement values are rounded to the nearest integer.

Implementation must explicitly test the rounding policy before parser completion.

Until the parser implementation test fixes the exact helper behavior, the contract-level rule is:

```text
round calculated settlementAmount to nearest integer
```

Do not introduce platform-specific floor/ceil/truncation without another audit.

## 9. Author Correction

The sample contains rows where the `작가` value is a company/account label rather than the real author.

Confirmed pattern:

```text
작가 = AreteBooks
계정 = srenm
affected rows in sample: 9
```

The source file does not contain another reliable column that restores the real author name.

Correction policy:

- Author correction input is required for rows where `작가` is a known company/account label.
- Prefer matching by `작품코드`.
- Matching by `작품` is allowed only as a fallback when `작품코드` is unavailable.
- Automatic author guessing is forbidden.
- Fuzzy text matching is forbidden.
- If a correction is required but no correction row matches, emit `mapping_failed`.

Recommended correction input fields:

```text
작품코드
작품
작가명
```

Known company/account author labels:

```text
AreteBooks
aretebooks
아레떼북스
```

This list may be expanded only by contract update or audited sample evidence.

## 10. ParseIssue Cases

Expected issue types:

```text
missing_column
missing_field
invalid_value
mapping_failed
parse_error
```

Expected cases:

- Required column is missing: `missing_column`.
- Required title or author field is blank: `missing_field`.
- Numeric column cannot be parsed: `invalid_value`.
- Required author correction cannot be matched: `mapping_failed`.
- Source XLSX cannot be read by the file adapter: `parse_error`.

## 11. Implementation Checklist

Before parser implementation is accepted:

- Confirm the XLSX adapter preserves header names after trimming.
- Add Munpia constants for required columns and rates.
- Exclude the `Total` row.
- Exclude zero web/app rows.
- Calculate web and app rows from formulas, not from the original `정산` column.
- Add rounding tests.
- Add author correction input contract/types.
- Add tests for missing author correction.
- Add tests for `IOS매출` exact header handling.
- Add tests for source trace preservation.

## 12. Remaining Open Items

Open implementation decisions:

- Final author correction input location and type.
- Whether missing author correction should block the whole Munpia group or only skip affected rows.
- Whether future files from other CP sheets require selecting a sheet by name instead of first worksheet.

These items must be resolved before wiring Munpia into the batch orchestrator.
