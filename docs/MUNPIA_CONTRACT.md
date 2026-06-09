# Munpia Calculation Contract

## 1. Purpose

Munpia is a Formula Platform, not a Simple Extract Platform.

Munpia uses one XLSX source file and splits each source row into web/app settlement rows when the relevant sales amount exists.

Output is still normalized to:

```text
SettlementRow[] + ParseIssue[]
```

AutoSettlement must calculate the result rows from the agreed formula. It must not rely on the original settlement column as the final authority.

For the Munpia production group parser input shape and blocking policy, see:

```text
docs/MUNPIA_GROUP_PARSER_CONTRACT.md
```

For the sanitized fixture families and expected-result planning that follow this contract, see:

```text
docs/MUNPIA_FIXTURE_PLAN.md
```

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

- If exactly one worksheet is present, use that worksheet for the MVP.
- If multiple worksheets are detected, follow the blocking and future `sheetName` policy in `docs/MUNPIA_GROUP_PARSER_CONTRACT.md`.
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
- Optional `authorCorrection` adapter issues are preserved in final `ParseIssue[]` but do not block otherwise-valid settlement parsing by themselves.

Recommended correction input fields:

```text
작품코드
작품
작가명
```

Correction input form:

```text
authorCorrection = optional upload slot file input
adapter result     = TabularRow[]
matching priority  = 작품코드 -> 작품
```

Known company/account author labels:

```text
AreteBooks
aretebooks
아레떼북스
```

This list may be expanded only by contract update or audited sample evidence.

## 9A. Author Correction Input Boundary

The author correction source is an external correction input, not an inferred parser-side recovery step.

Contract boundary:

- Munpia parser must not guess the real author from other free-text source fields.
- Munpia parser must not create its own correction table internally.
- Author correction is defined as an optional upload-slot-based file input.
- The slot name is `authorCorrection`.
- Direct in-memory correction table input is out of MVP scope.
- Adapter output for the `authorCorrection` slot must be passed to the group parser as `TabularRow[]`.
- The correction file must remain explicit in the parser contract and must preserve source trace such as `sourceFileName` and `sourceRowIndex`.
- Allowed file-kind candidates for the correction slot are `csv` and `xlsx`.

Allowed pre-wiring work:

```text
contract document patching
constants
row calculation utils
row -> SettlementRow mapping utils
sanitized unit tests
```

Still blocked in this repo slice:

```text
registry wiring into production flow
UI connection
real-use path connection
```

Current status after contract closure and authority sync:

```text
isolated Munpia group parser implementation: done
sanitized fixture coverage for group parser boundary: done
batch orchestrator wiring: allowed
UI / real-use path connection: still out of scope here
```

## 9A. UI Connection Scope (authority freeze)

When Munpia is eventually connected to the batch upload UI, the allowed MVP UI shape is only:

```text
platform card = company + munpia
required slot = settlement
optional slot = authorCorrection
accepted file kinds = settlement:xlsx, authorCorrection:csv|xlsx
parse trigger = existing batch parse action
```

UI rules for that future connection:

- The UI must treat Munpia as a slot-based grouped upload, not as a free-form single file bucket.
- `settlement` is the only required slot.
- `authorCorrection` is optional and must remain a separate upload slot.
- The UI must not provide inline text correction entry, ad-hoc table editing, or hidden correction storage.
- The UI must not guess `sheetName`, auto-pick a later worksheet, or hide the multi-sheet blocking result.
- If `authorCorrection` is absent, the UI must still allow parse execution.
- If `authorCorrection` adapter issues occur, the UI must surface them without treating valid settlement rows as blocked.
- If `settlement` adapter issues occur, the UI must surface the group as blocked.

Still-blocking integration gaps before real UI wiring:

- Current authority layer still does not define any user-provided `sheetName` input path for future multi-sheet support.
- Real persistence/update semantics for per-slot file replacement/removal are still not frozen beyond the current mock/UI slice.
- Base browser-draft persistence boundary is now frozen in `docs/AUTOSETTLEMENT_UPLOAD_PERSISTENCE_CONTRACT.md`, but slot-specific replacement/removal semantics are still unresolved for Munpia.

Current authority-safe UI state shape for the mock/product boundary:

```ts
BatchPlatformUpload.slots?: Array<{
  slotKey: "settlement" | "authorCorrection";
  required: boolean;
  acceptedFileKinds: Array<"csv" | "xlsx">;
  status: "empty" | "uploaded" | "parsed" | "warning" | "error";
  fileCount: number;
  sourceFileNames: string[];
  issueCount: number;
}>
```

## 9B. Parser Shape Decision

Current safety decision:

- Munpia may use a single source settlement file.
- If author correction is required, the safer target contract is a group parser shape rather than a permanently single-file-only contract.
- The preferred future input shape is:

```text
settlement: required
authorCorrection: optional
```

- This does not authorize immediate group parser wiring.
- It only records that future parser shape decisions must account for optional correction input.
- A single-file parser may continue to exist as an internal unit, but it is not enough to define the final production input contract by itself.
- Missing author correction does not block the whole Munpia group.
- If a row requires author correction and no matching correction row exists, that affected source row is skipped with `mapping_failed`, and both its web/app outputs are not created.

## 9C. Multi-Sheet Policy

Current MVP scope:

- Munpia settlement files are accepted only when a single worksheet is present, unless an explicit `sheetName` input is provided by a future contract.

If a future Munpia workbook contains multiple relevant sheets:

- Do not auto-pick a sheet by heuristic.
- Do not merge multiple sheets silently.
- If multiple worksheets are detected and no explicit `sheetName` is provided, the parser/group path must return a blocking issue and no rows.
- If an explicit `sheetName` is provided by a future contract, use only that named worksheet.

Temporary rule before contract update:

```text
one worksheet -> supported
multiple worksheets + no sheetName -> blocking issue, no rows
multiple worksheets + explicit sheetName -> use only the named sheet
```

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
- Settlement slot adapter issues must block before row parsing and be passed through as existing issues such as `parse_error`.
- Multi-sheet settlement workbook without explicit `sheetName` must produce `parse_error` and no rows in MVP.
- If the required settlement slot exists but adapted settlement rows are empty, current contract-safe behavior is `rows = []` and `issues = []`.
- Group-level blocked states must be expressed by existing issues such as `missing_file`, `missing_column`, or `parse_error`, not by adding a new `blocked` issue type.

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

Still-open items after Munpia contract closure:

- Whether and where future UI/orchestrator input can provide explicit `sheetName` for multi-sheet settlement workbooks.
- Whether a future authority revision should treat empty adapted settlement rows as a blocking issue instead of the current empty-success boundary.

## 13. Out Of Scope Until Contract Closure

- Registry wiring into real-use batch flow
- UI upload or correction-entry behavior
- Export path changes
- Emailer changes
- Real production path connection

Munpia implementation may now proceed through contract-safe batch orchestrator wiring, but the real production path remains out of scope until the remaining authority decisions are closed.
