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

Input files:

```text
작품별 정산리스트
정산 상세리스트 / 단행본
```

Transform rule:

- Combine rows by `작품명 + 작가명`.
- Sum gross sales by the same key.
- Sum settlement amounts by the same key.
- Produce final rows as common `SettlementRow`.

Why not Simple Extract:

- Requires multiple-file reconciliation.
- Requires aggregation by work and author.

Unresolved before implementation:

- Exact source column names for gross sales and settlement amount.
- Whether 단행본 rows need a separate title suffix or only merge into the same key.

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

- Exact source columns for web gross sales, iOS sales, Google sales, title, author, publisher.
- Exact author correction map.
- Whether the production parser contract should stay single-file or move to a group parser shape with optional correction input.
- Whether multi-sheet workbooks require an explicit `sheetName` policy instead of first-sheet-only handling.
- Whether company split is based on source file values or upload area.

Current safe direction:

- The minimum Munpia group input shape is `settlement` required / `authorCorrection` optional.
- The `authorCorrection` member is an optional upload-slot-based file input, not an in-memory table contract.
- The correction slot should allow adapter-parsed `TabularRow[]` input and preserve source trace.
- For MVP, Munpia settlement input is single-sheet only.
- If multiple worksheets are detected and no explicit `sheetName` is provided, the parser path should return a blocking issue and no rows.
- Multi-sheet auto-pick is prohibited. If a future contract provides `sheetName`, use only that named sheet.
- Missing author correction should skip only the affected row with `mapping_failed`; it should not block the whole Munpia group.
- Group-level blocked states should be expressed with existing issues such as `missing_file`, `missing_column`, and `parse_error`, then interpreted by downstream batch/export validation.

Do not proceed to batch/orchestrator wiring, UI connection, or real-use path connection until these contract gaps are closed.

## 7. Misterblue

Input rule:

- Use only the `작품별` sheet.

Transform rule:

- Calculate normal gross sales and normal settlement amount.
- Calculate app gross sales and app settlement amount.
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

Unresolved before implementation:

- Exact sheet name matching rule.
- Exact normal gross sales formula.
- Exact normal settlement amount formula.
- Exact app gross sales formula.
- Exact app settlement amount formula.

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

Transform rule:

```text
grossSales = 판매금액
settlementAmount = 판매금액 * 0.7
```

Why not Simple Extract:

- Settlement amount is calculated from `판매금액`.
- It is not only a direct settlement column extraction.

Unresolved before implementation:

- Exact source columns for title, author, publisher, and `판매금액`.
- Rounding policy for `판매금액 * 0.7`.

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
