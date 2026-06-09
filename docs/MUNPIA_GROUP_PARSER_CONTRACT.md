# MUNPIA_GROUP_PARSER_CONTRACT

## 1. Purpose

This document fixes the Munpia production parser input shape before implementation wiring.

It does not replace:

- `docs/MUNPIA_CONTRACT.md`
- `docs/MUNPIA_FIXTURE_PLAN.md`
- `docs/AUTOSETTLEMENT_PARSER_CONTRACT_TEST_PLAN.md`
- `docs/SPECIAL_PLATFORM_TRANSFORM_CONTRACT.md`

This document focuses only on how already-adapted input groups are assembled into Munpia `ParserResult`.

No parser wiring, UI behavior, export behavior, mailer behavior, or real-use path connection is implemented here.

## 2. Scope Boundary

This contract defines the Munpia production parser shape, not the local reusable unit shape.

Current safe distinction:

- A Munpia single-file parser may continue to exist as an internal reusable unit.
- The Munpia production parser contract is a group parser shape.
- The production group parser may call the internal single-file unit after group-level validation is complete.

## 3. Input Shape

Draft production shape:

```ts
type MunpiaGroupParserContext = {
  batchId: string;
  company: Company;
  platform: "munpia";
  saleMonth: string;
  sourceFileNames: string[];
  sheetName?: string;
};

type MunpiaGroupFileInput = {
  sourceFileName: string;
  slot: "settlement" | "authorCorrection";
  rows: TabularRow[];
  issues: ParseIssue[];
};
```

Notes:

- `sheetName` is not an active MVP input yet.
- It exists here only to define the future explicit multi-sheet contract boundary.
- Adapter output is already-decoded `TabularRow[]`.
- The group parser does not read raw XLSX or CSV bytes directly.

## 4. Slot Policy

Required slot:

```text
settlement
```

Optional slot:

```text
authorCorrection
```

Slot rules:

- `settlement` must appear exactly once.
- `authorCorrection` may appear zero or one time.
- Unknown slot values must produce a blocking issue.
- Duplicate `settlement` slots must produce a blocking issue.
- Duplicate `authorCorrection` slots must produce a blocking issue.
- Missing required `settlement` slot must produce `missing_file`.
- Slot meaning must be explicit. Filename inference is forbidden.

## 5. Settlement File Policy

For MVP, Munpia accepts only single-sheet settlement workbooks.

Allowed now:

- one settlement workbook
- one worksheet
- standard Munpia header row contract

Not allowed now:

- auto-picking one worksheet from many
- silently merging many worksheets
- inferring the target sheet by heuristic

Multi-sheet rule:

```text
single worksheet -> supported
multiple worksheets + no explicit sheetName -> blocking issue, no rows
multiple worksheets + explicit sheetName -> use only the named worksheet
```

If multiple worksheets are detected and no explicit `sheetName` is provided, the group parser must return a blocking issue and no rows.

If a future contract provides explicit `sheetName`, the group parser must use only that named worksheet.

## 6. Header and Row Policy

The Munpia settlement path must preserve the already-fixed row-level rules:

- header names are trimmed before matching
- `번호 = Total` row is excluded
- zero web rows are not created
- zero app rows are not created
- original `정산` column is validation-only, not the source of truth

These rules belong to the Munpia authority contract and internal parsing unit, but the production group parser must not weaken them.

## 7. Author Correction Policy

Author correction is required when the source `작가` value is a known company/account label such as:

```text
AreteBooks
aretebooks
아레떼북스
```

Author correction contract:

- `authorCorrection` is an optional upload-slot-based file input.
- Direct in-memory correction table input is out of MVP scope.
- Allowed file-kind candidates are `csv` and `xlsx`.
- Adapter output for this slot must preserve `sourceFileName` and `sourceRowIndex`.

Minimum correction columns:

```text
작품코드
작품
작가명
```

Matching priority:

```text
1. 작품코드
2. 작품명
```

Missing correction policy:

```text
correction required + no matching correction row
-> mapping_failed on the affected row
-> do not create that row's web output
-> do not create that row's app output
-> continue processing the rest of the group
```

Whole-group blocking for missing author correction is forbidden.

## 8. Blocking and Issue Policy

The group parser returns only:

```text
SettlementRow[]
ParseIssue[]
```

Do not add a new `blocked` issue type.

Group-level blocked states must be expressed with existing issue types such as:

- `missing_file`
- `missing_column`
- `missing_field`
- `invalid_value`
- `mapping_failed`
- `parse_error`

Downstream batch/export validation may interpret those issues as a blocked state.

Typical blocking cases:

- missing `settlement` slot
- duplicate required slot
- unknown slot
- settlement workbook cannot be parsed
- multi-sheet settlement workbook with no explicit `sheetName`
- required settlement columns missing at the blocking boundary

Typical non-blocking case:

- author correction missing for only some affected rows

## 9. Output Contract

The group parser must return normalized Munpia output only:

```text
SettlementRow[]
ParseIssue[]
```

Title rule:

```text
web row -> 작품명
app row -> 작품명(app)
```

Additional output rules:

- `workTitle` keeps the suffix-free review title.
- `mailerContentTitle` carries the output label.
- web/app rows remain separate.
- source trace must remain available through representative `sourceFileName` and `sourceRowIndex` mapping.

## 10. Forbidden Behavior

- Do not guess author names from other free-text fields.
- Do not build hidden correction tables internally.
- Do not infer `authorCorrection` from filenames.
- Do not infer slots from filenames.
- Do not auto-pick worksheets in multi-sheet workbooks.
- Do not silently merge worksheets.
- Do not collapse web/app output into one row.
- Do not add a new `blocked` issue type.
- Do not proceed to registry wiring, batch/orchestrator wiring, UI connection, export path connection, or real-use path connection before this contract is accepted.

## 11. Pre-Wiring Boundary

Allowed before wiring:

- contract document patching
- constants
- internal group parser types
- row calculation utilities
- row-to-`SettlementRow` mapping utilities
- sanitized unit tests
- isolated group parser implementation units

Blocked until contract acceptance and follow-up authority sync:

- registry wiring into production flow
- batch/orchestrator wiring
- UI upload connection
- export/live path connection

## 12. Relationship to Existing Munpia Docs

This document does not replace the Munpia formula authority.

Use the following split:

- `MUNPIA_CONTRACT.md` = formula, row rules, correction boundary, platform authority
- `MUNPIA_GROUP_PARSER_CONTRACT.md` = production group input shape and blocking policy
- `AUTOSETTLEMENT_PARSER_CONTRACT_TEST_PLAN.md` = fixture/test expectations
- `SPECIAL_PLATFORM_TRANSFORM_CONTRACT.md` = cross-platform summary boundary
