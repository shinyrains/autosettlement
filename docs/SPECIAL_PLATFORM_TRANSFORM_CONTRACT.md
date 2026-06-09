# Special Platform Transform Contract

## 1. Purpose

This document summarizes platforms that require special transform rules before they can produce the common `SettlementRow[] + ParseIssue[]` parser result.

This document is a classification and implementation contract. It does not replace platform-specific authority documents.

Ridibooks keeps its own detailed contract in:

```text
docs/RIDIBOOKS_CONTRACT.md
```

Series keeps its own detailed authority documents:

```text
docs/SERIES_CALC_CONTRACT.md
docs/SERIES_COLUMN_MAPPING_CONTRACT.md
docs/SERIES_PARSER_FIXTURE_PLAN.md
docs/SERIES_OPERATING_SPEC.md
```

Munpia keeps its production parser shape authority in:

```text
docs/MUNPIA_GROUP_PARSER_CONTRACT.md
```

Epyrus keeps its current sample-grounded authority in:

```text
docs/EPYRUS_CONTRACT.md
```

Joara keeps its current sample-grounded authority in:

```text
docs/JOARA_CONTRACT.md
```

Panmurim keeps its current sample-grounded authority in:

```text
docs/PANMURIM_CONTRACT.md
```

## 2A. Epyrus

Input rule:

- single CSV file only
- CSV decode must follow `docs/CSV_ENCODING_GUARD_CONTRACT.md`
- current audited sample encoding is CP949/EUC-KR

Current confirmed mapped columns:

```text
제목
저자
출판사
판매금액
정산액
```

Transform rule:

- Epyrus is a Simple Extract Platform, not a Formula Platform.
- One valid source row produces one `SettlementRow`.
- `판매구분` does not create separate app/non-app output rows in the current repo slice.

Forbidden behavior:

- do not derive company from `정산자`
- do not split rows by `판매구분`
- do not recalculate settlement from `수수료`

## 2. Common App Title Rule

All special transform platforms must preserve the common mailer content title rule.

```text
normal row -> 작품명
app row    -> 작품명(app)
```

If an event rule exists, it can extend the title forms.

```text
event normal row -> 작품명(이벤트)
event app row    -> 작품명(이벤트)(app)
```

`workTitle` must remain the original work title used for review and matching. `mailerContentTitle` carries the output content label.

## 3. Joara

Current authority for the repo slice:

```text
docs/JOARA_CONTRACT.md
```

Input files:

```text
작품별 정산리스트
정산 상세리스트 / 단행본
```

Transform rule:

- Combine rows by `작품명 + 작품코드 + 작가명`.
- Sum gross sales from `정산 상세리스트 / 판매금액(원)` by the same key.
- Sum settlement amounts from `작품별 정산리스트 / 정산금액` by the same key.
- Produce final rows as common `SettlementRow`.

Why not Simple Extract:

- Requires multiple-file reconciliation.
- Requires aggregation by grouped work identity.
- Gross-sales authority and settlement authority come from different files.

Authority status for current repo slice:

- grouped key closed as `작품명 + 작품코드 + 작가명`
- gross-sales source closed as `정산 상세리스트 / 판매금액(원)`
- settlement source closed as `작품별 정산리스트 / 정산금액`
- 단행본 title suffix policy remains intentionally unresolved and out of scope

## 4. Bookcube

Input file rule:

```text
Raon: 1 file
SR: 2 files
```

Transform rule:

- Raon uses one file.
- SR uses two files.
- SR files use the same extraction rules.
- Results are normalized to `SettlementRow`.

Why not Simple Extract:

- Company-specific file count differs.
- SR requires multi-file processing even if each file uses the same columns.

Unresolved before implementation:

- Whether SR two files should be concatenated, summed by key, or treated as separate source groups.
- Exact duplicate handling key.

## 5. Kakao Page

Input files:

```text
normal file
MG file optional
```

Transform rule:

- Normal file and MG file use the same column extraction rules.
- MG file is optional.
- Both outputs must normalize into the common `SettlementRow` shape.

Why not Simple Extract:

- Optional MG file can affect grouping, review, or output interpretation.
- MG source must be explicit and must not be guessed.

Unresolved before implementation:

- Whether MG rows replace normal rows or are added as separate rows.
- Exact MG source fields and matching key.
- `Platform` currently does not include `kakao_page`; type expansion must be reviewed before implementation.

## 6. Munpia

Input rule:

- Munpia requires web/app row separation.
- Source sample and authority rules must confirm whether the split is based on source columns or upload slots.

Transform rule:

```text
web settlementAmount = web grossSales * 0.63
```

App gross sales:

```text
app grossSales = ios sales + google sales
```

App settlement amount:

```text
app settlementAmount = ios sales * 0.441 + google sales * 0.567
```

Title output:

```text
web row -> 작품명
app row -> 작품명(app)
```

Additional normalization:

- Author name correction is required for company names such as `aretebooks`.
- Company-name-as-author values must be corrected before final `SettlementRow` output.

Why not Simple Extract:

- Settlement amount is calculated directly.
- Web/app rows must be separated.
- Author name correction is part of the transform.

Unresolved before implementation:

- Whether company split is based on source file values or upload area.

Current safe direction:

- The minimum Munpia group input shape is `settlement` required / `authorCorrection` optional.
- The `authorCorrection` member is an optional upload-slot-based file input, not an in-memory table contract.
- The correction slot should allow adapter-parsed `TabularRow[]` input and preserve source trace.
- Optional correction-slot adapter issues should passthrough into final `ParseIssue[]` without blocking an otherwise-valid settlement path by themselves.
- For MVP, Munpia settlement input is single-sheet only.
- If multiple worksheets are detected and no explicit `sheetName` is provided, the parser path should return a blocking issue and no rows.
- Settlement-slot adapter issues should block before row parsing.
- Multi-sheet auto-pick is prohibited. If a future contract provides `sheetName`, use only that named sheet.
- Missing author correction should skip only the affected row with `mapping_failed`; it should not block the whole Munpia group.
- If the required settlement slot exists but adapted rows are empty, the current contract-safe boundary is empty success (`rows = []`, `issues = []`).
- Group-level blocked states should be expressed with existing issues such as `missing_file`, `missing_column`, and `parse_error`, then interpreted by downstream batch/export validation.

Current implementation summary:

- Munpia isolated single-file parser implemented.
- Munpia isolated group parser implemented.
- Sanitized Munpia fixture coverage exists for happy path, correction priority/fallback, partial-row skip, adapter-issue passthrough, multi-sheet block, duplicate/missing slot block, required-column block, and settlement-adapter block.
- Batch orchestrator wiring is allowed once authority sync is complete.

Munpia may proceed to contract-safe batch/orchestrator wiring, but UI connection and real-use path connection remain blocked until the remaining authority gaps are closed.

## 7. Misterblue

Input rule:

- Use only the `작품별` sheet.
- Ignore row 1 title text and flatten rows 2-5 into hierarchical header keys.

Transform rule:

- Calculate normal gross sales from `종량 / 블루머니 / */매출액` columns.
- Calculate app gross sales from `종량 / A.앱머니 / */매출액` and `종량 / i.앱머니 / */매출액` columns.
- Read total settlement from `합계(정액+종량) / 정산액`.
- Split normal/app settlement amounts proportionally by gross-share when both sides exist.
- Create separate rows for normal/app output.

Title output:

```text
normal row -> 작품명
app row    -> 작품명(app)
```

Why not Simple Extract:

- Requires sheet selection.
- Requires separate normal/app calculations.
- Settlement amount is not a single direct column extraction for all rows.

Authority status for current repo slice:

- `작품별` exact-sheet rule closed from the inspected sample workbook.
- Normal gross/app gross formulas closed from the inspected sample workbook header structure.
- Settlement split rule closed as proportional allocation from the authoritative total settlement column.
- See `docs/MISTERBLUE_CONTRACT.md` for the exact contract.

## 8. Onestore

Input rule:

- One file can contain both Raon and SR rows.

Company split rule:

```text
publisher is arete / b cafe / b-cafe / bcafe / b_cafe -> SR
otherwise -> Raon or unresolved according to final contract
```

Transform rule:

- Split rows by publisher into company-specific results.
- Normalize each row to `SettlementRow`.

Why not Simple Extract:

- One file contains multiple companies.
- Company assignment is part of parser behavior.

Unresolved before implementation:

- Full publisher normalization table.
- Whether unmatched publisher values should be assigned to Raon or reported as `company_split_failed`.
- Exact gross sales and settlement columns.

## 9. Panmurim

Current authority for the repo slice:

```text
docs/PANMURIM_CONTRACT.md
```

Input rule:

- one workbook only in the current repo slice
- `표지` is metadata authority only
- `세부내역` is the only row-data sheet
- row 3 group headers + row 4 base headers must be flattened before parser mapping

Transform rule:

```text
grossSales = 합계 총액 / 판매금액
settlementAmount = grossSales * (표지 / 정산비율)
```

Current audited rate:

```text
70% -> 0.7
```

Current title/output rule:

```text
workTitle = 회차 제목
mailerContentTitle = 회차 제목
```

Why not Simple Extract:

- Requires explicit sheet selection.
- Requires grouped header flattening to disambiguate duplicate `판매금액` columns.
- Settlement amount is calculated from a cover-sheet authority rate.

Authority status for current repo slice:

- `세부내역` exact-sheet rule closed from the inspected sample workbook.
- `표지 / 정산비율` cover-sheet authority closed from the inspected sample workbook.
- `합계 총액 / 판매금액` row money authority closed from the inspected sample workbook.
- current row-title authority closed as `회차 제목`.

## 10. Series / Naver

Input rule:

```text
total files: 6
normal files: 3
app files: 3
format: HTML .xls
actual data table: second table
```

Authority:

```text
시리즈 계산방법.xlsx
```

Current implementation summary:

- Series calculation contract completed.
- Series column mapping contract completed.
- Series row calculation utilities implemented.
- Series single-file parser implemented.
- Series group parser implemented.
- Series aggregation implemented.
- Batch orchestrator wiring implemented.
- HTML `.xls` adapter supports multi-row header flattening.
- Real sample path was audited.
- Operating spec exists.

Why not Simple Extract:

- Requires six-file grouping.
- Requires normal/app slot separation.
- Uses HTML `.xls` second-table parsing.
- Calculates settlement by category and rate according to the authority file.

## 11. Ridibooks Summary

Ridibooks is covered by a separate detailed contract:

```text
docs/RIDIBOOKS_CONTRACT.md
```

Summary only:

- Uses base file + `file_1`.
- Optional event file can override/replace event-period rows.
- MG input changes settlement calculation.
- Can output up to:
  - `작품명`
  - `작품명(app)`
  - `작품명(이벤트)`
  - `작품명(이벤트)(app)`

Do not duplicate Ridibooks formulas here. The detailed authority remains `RIDIBOOKS_CONTRACT.md`.

## 12. Formula Platform List

Current Formula Platform list:

```text
series
munpia
misterblue
ridibooks
```

Additional special transform candidates:

```text
joara
bookcube
kakao_page
onestore
panmurim
```

These candidates may not all require full Formula Platform treatment, but they are not safe to implement as plain one-row Simple Extract until their contracts are confirmed.

## 13. Why These Are Not Simple Extract

The platforms in this document require one or more special transform behaviors:

- Multi-file aggregation
- Web/app row separation
- Company split
- Author-name correction
- Direct settlement calculation
- Event replacement
- MG rule application
- Authority calculation file application
- Sheet selection
- Optional file handling

Therefore implementation must follow this order:

```text
AUDIT
-> CONTRACT
-> FIXTURE
-> CALC or TRANSFORM UTILS
-> PARSER
-> ORCHESTRATOR WIRING
```

Do not skip the contract step for these platforms.

## 14. Forbidden Behavior

- Do not add original sample files to the repository.
- Do not guess formulas from filenames.
- Do not infer MG values without explicit input or authority.
- Do not merge normal/app rows when a platform requires separate output.
- Do not expose platform-specific source columns in `SettlementRow`.
- Do not implement mailer display correction, address-book correction, deduction merge, or email sending.
- Do not duplicate Ridibooks detailed formulas in this summary document.
