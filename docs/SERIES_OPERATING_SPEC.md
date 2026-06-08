# Series Operating Spec

## 1. Purpose

This document is the operating single source of truth for the `series` platform in AutoSettlement.

It describes the current implementation status, runtime input rules, verified paths, known limits, and the next operational checks before UI upload and export download are connected.

This document does not replace the calculation, column, or fixture authorities.

Authority documents:

- `docs/SERIES_CALC_CONTRACT.md`: calculation authority
- `docs/SERIES_COLUMN_MAPPING_CONTRACT.md`: source column and category mapping authority
- `docs/SERIES_PARSER_FIXTURE_PLAN.md`: fixture and expected-result planning authority

## 2. Completed Implementation Scope

The following Series pipeline pieces are implemented and verified:

- HTML `.xls` adapter can read the second HTML table.
- HTML `.xls` adapter can flatten multi-row `rowspan` and `colspan` headers into 71 column keys.
- Flattened header keys use `Parent / Child` format for grouped columns.
- Flattened header keys match the current Series column mapping constants.
- Series row calculation utilities calculate category amounts, `grossSales`, and `settlementAmount`.
- Series single-file parser converts one file worth of `TabularRow[]` into `SettlementRow[] + ParseIssue[]`.
- Series group parser validates 6-file input groups.
- Series group parser keeps `general` and `app` output separate by slot.
- Series group aggregation combines rows by `company + platform + saleMonth + workTitle + author + publisher + mailerContentTitle`.
- `batchParseOrchestrator` routes only `platform === "series"` through the group parser path.
- Non-Series platforms keep the existing single-file parser path.
- Export pipeline can consume resulting `SettlementRow[]`.

## 3. Series Input Operating Rules

One settlement batch may contain one Series group per `company + platform + saleMonth`.

Required file structure:

- Total Series files per group: `6`
- General sales files: `3`
- App sales files: `3`
- File kind: `html_xls`
- Platform: `series`

Slot rules:

- `slot = "general"` is the only basis for general sales files.
- `slot = "app"` is the only basis for app sales files.
- Do not infer slot from file name.
- Do not infer slot from file content.
- Do not infer slot from internal columns.

Output split:

- General rows keep `mailerContentTitle = workTitle`.
- App rows use `mailerContentTitle = workTitle + "(app)"`.
- `workTitle` never receives the `(app)` suffix.

## 4. Verified Paths

Verified by sanitized fixture tests:

- `batchParseOrchestrator`
- dependency-injected adapter result
- `parseSeriesFileGroup`
- row calculation
- aggregation
- final `SettlementRow[]`

Verified by real HTML `.xls` audit using the currently available sample:

- Source sample: `tmp/series-audit/contentsSelling_2026-06-08.xls`
- The source file is not committed.
- The sample was repeated into 3 general slots and 3 app slots for path validation.
- Adapter returned 71-column rows.
- Missing Series mapping columns: `0`
- Batch path produced no issues.
- File results were all successful.
- Final output contained 10 aggregated `SettlementRow` objects.
- General/app rows were separated by `mailerContentTitle`.
- Representative `sourceFileName` and `sourceRowIndex` were preserved.

## 5. Current Constraints

The current real-file audit uses one actual sample repeated across all 6 slots.

Still not verified:

- Six distinct real Series files in one batch.
- Real-world differences between the 3 general files.
- Real-world differences between the 3 app files.
- Real operational row counts across all six source files.
- Full category coverage across all non-zero source columns.
- Export package generation from six distinct real Series files.
- UI upload slot behavior.
- Browser download behavior.

Repository policy:

- Do not commit original `.xls` or `.xlsx` business files.
- Keep real source files in ignored local paths such as `tmp/series-audit/`.
- Use sanitized fixtures for committed tests.

Source tracking policy:

- Internal calculation may use multiple source references.
- MVP `SettlementRow` exposes only representative `sourceFileName` and `sourceRowIndex`.
- Detailed `sourceRefs` are not exposed in `SettlementRow`.

Total row policy:

- HTML `.xls` adapter keeps total rows.
- Series parser is responsible for excluding total rows.

## 6. Operational Verification Checklist

Before Series is considered production-ready for operators, verify the following with six distinct real files:

- Confirm exactly 3 files are assigned to `general`.
- Confirm exactly 3 files are assigned to `app`.
- Confirm all six files parse through `html_xls` adapter with no adapter issues.
- Confirm every parsed row has 71 source columns.
- Confirm Series mapping constants have no missing columns.
- Confirm total rows are excluded by the Series parser.
- Confirm final row count matches expected unique aggregation keys for general and app.
- Confirm `grossSales` matches expected category sums.
- Confirm `settlementAmount` matches expected rate-applied sums.
- Confirm general and app results stay separate.
- Confirm app rows use `(app)` only in `mailerContentTitle`.
- Confirm representative source file and row index are deterministic.
- Confirm `createExportPackages(rows)` returns company-level review and mailer packages.

## 7. Error Handling Expectations

Expected blocking cases:

- Missing general file.
- Missing app file.
- More or fewer than 6 files in one Series group.
- Missing or invalid `slot`.
- Missing second HTML table.
- Empty HTML data table.
- Empty flattened header key.
- Missing required Series mapping column.
- Missing identity field such as work title or author.
- Invalid numeric value in a calculation column.

Issue type policy:

- Use existing `ParseIssueType` values.
- Do not add a new issue type unless a separate contract update explicitly approves it.
- If a new issue type appears necessary, stop and report first.

## 8. Next Work Candidates

Recommended next work order:

1. `SERIES-REAL-6FILE-SMOKE-AUDIT-001`
2. `SERIES-UI-UPLOAD-SLOTS-001`
3. `EXPORT-UI-DOWNLOAD-BRIDGE-001`
4. `SERIES-ERROR-PANEL-INTEGRATION-001`

`SERIES-REAL-6FILE-SMOKE-AUDIT-001` should remain report-only unless sanitized committed fixtures are explicitly approved.

## 9. Non-Goals

The Series operating path does not implement:

- Email sending.
- Mailer display correction.
- Author email grouping.
- Deduction merging.
- File-name based slot detection.
- Column-based general/app detection.
- Arbitrary fee recalculation outside the Series calculation contract.
- Original business file commits.
