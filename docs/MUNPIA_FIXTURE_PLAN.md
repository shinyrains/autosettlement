# MUNPIA_FIXTURE_PLAN

## 1. Purpose

This document fixes the Munpia fixture and expected-result plan before production group parser implementation.

The goal is to make Munpia parser tests reproducible without committing original business workbook files.

This document is contract-only. It does not implement parser logic, tests, fixture files, UI behavior, workbook export, mailer behavior, or batch/orchestrator wiring.

## 2. Authority Documents

Munpia formula and row-level authority:

```text
docs/MUNPIA_CONTRACT.md
```

Munpia production group parser shape authority:

```text
docs/MUNPIA_GROUP_PARSER_CONTRACT.md
```

Cross-platform transform boundary:

```text
docs/SPECIAL_PLATFORM_TRANSFORM_CONTRACT.md
```

Parser contract and expected-result authority:

```text
docs/AUTOSETTLEMENT_PARSER_CONTRACT_TEST_PLAN.md
```

This fixture plan does not replace those documents. It only defines how sanitized Munpia fixtures should be shaped and verified.

## 3. Source Sample Boundary

Local audit sample exists outside the repository under:

```text
tmp/platform-samples/munpia/
```

Current audited sample:

```text
아레떼북스.xlsx
```

This file is an original work sample and must not be added to Git.

Confirmed sample boundary used by fixture planning:

```text
file kind: xlsx
sheet count: 1
header row: row 1
Total row excluded
required columns include 작가 / 작품 / 총매출 / IOS매출 / Google매출
```

## 4. Fixture Strategy

Munpia parser tests should use sanitized minimal fixtures.

Allowed fixture form:

```text
small in-memory TabularRow objects
small synthetic xlsx adapter outputs
small synthetic correction-table rows
isolated group-input arrays with explicit slot values
```

Forbidden fixture form:

```text
original 아레떼북스.xlsx
full copied rows from business workbooks
real author contact or email data
real mailer output files
```

Recommended first implementation path:

```text
sanitized TabularRow fixture
-> Munpia single-file parser unit
-> Munpia group parser wrapper
```

Adapter integration can be covered separately with tiny synthetic XLSX inputs or adapter-result stubs.

## 5. Fixture Group Structure

A Munpia fixture group represents one logical production upload group.

Recommended manifest policy:

- one fixture directory = one parser execution unit
- `fixtureId` must match the directory name exactly
- `platform` is always `munpia`
- `files` must be listed in deterministic order
- `expected` paths must be relative to the fixture directory
- slot meaning must be explicit; never inferred from file names

Draft manifest shape:

```ts
type MunpiaFixtureManifest = {
  fixtureId: string;
  description: string;
  batchId: string;
  company: "raon" | "sr";
  platform: "munpia";
  saleMonth: string;
  sheetName?: string;
  files: MunpiaFixtureFile[];
  expected: {
    settlementRows: "expected/settlementRows.json";
    parseIssues: "expected/parseIssues.json";
  };
  notes?: string[];
};

type MunpiaFixtureFile = {
  fileId: string;
  fileName: string;
  fileKind: "xlsx" | "json_rows" | "json_table";
  slot: "settlement" | "authorCorrection";
  path: string;
  worksheetCount?: number;
  rowCount?: number;
  headerRowIndex?: 1;
  dataStartRowIndex?: 2;
  excludesTotalRow?: true;
  description?: string;
};
```

Field intent:

- `fileId`: stable local identifier used by tests and fixture review
- `fileName`: representative original-style source name shown in parser context
- `fileKind = "json_rows"`: sanitized `TabularRow[]` artifact for parser-focused tests
- `fileKind = "json_table"`: small table-like sanitized input artifact for adapter-result stubs
- `fileKind = "xlsx"`: reserved for tiny synthetic workbook fixtures only
- `path`: relative path to the input artifact under `input/`
- `worksheetCount`: required when the fixture is validating single-sheet vs multi-sheet behavior
- `rowCount`: optional review aid for deterministic fixture auditing; count input artifact rows only, and state clearly whether excluded `Total` rows are still physically present in the input artifact
- `headerRowIndex = 1`: documents the audited Munpia header contract
- `dataStartRowIndex = 2`: documents first physical data row after header
- `excludesTotalRow = true`: fixture expectation never includes `번호 = Total`

Manifest example:

```json
{
  "fixtureId": "munpia_group_valid_single_sheet",
  "description": "single-sheet settlement file with one normal web row and one normal app row",
  "batchId": "fixture-munpia-001",
  "company": "raon",
  "platform": "munpia",
  "saleMonth": "2025-05",
  "files": [
    {
      "fileId": "settlement-main",
      "fileName": "munpia_settlement_sample.xlsx",
      "fileKind": "json_rows",
      "slot": "settlement",
      "path": "input/settlement.rows.json",
      "worksheetCount": 1,
      "rowCount": 3,
      "headerRowIndex": 1,
      "dataStartRowIndex": 2,
      "excludesTotalRow": true
    }
  ],
  "expected": {
    "settlementRows": "expected/settlementRows.json",
    "parseIssues": "expected/parseIssues.json"
  }
}
```

Slot meaning must be explicit. Do not infer `settlement` or `authorCorrection` from filenames in tests.

## 6. Required Fixture Families

### 6.1 Single-Sheet Settlement Only

Purpose:

```text
one settlement slot with one worksheet produces normal Munpia output
```

Expected:

- group passes blocking validation
- row-level formulas are delegated to Munpia settlement logic
- output rows are normalized as `SettlementRow[]`
- no group-level issues are emitted

Representative fixture id:

```text
munpia_group_valid_single_sheet
```

### 6.2 Optional Author Correction Slot Present

Purpose:

```text
authorCorrection slot is optional but, when present, it can repair company-label author rows
```

Expected:

- `authorCorrection` slot is consumed only when explicitly provided
- corrected rows use `작품코드` first, `작품명` second
- corrected row produces normal web/app output if sales are non-zero

Representative fixture id:

```text
munpia_group_author_correction_by_work_code
```

### 6.3 Missing Author Correction Is Non-Blocking

Purpose:

```text
row-level correction miss should skip only the affected row
```

Expected:

```text
correction required row -> mapping_failed
that row's web/app output -> not created
other rows in same group -> continue
whole group -> not blocked
```

Representative fixture id:

```text
munpia_group_missing_author_correction_skips_affected_row
```

### 6.4 Work Title Fallback Match

Purpose:

```text
when correction work code is unavailable, work title fallback can still resolve author correction
```

Expected:

- blank correction `작품코드` may still match by `작품`
- fallback is used only after `작품코드` lookup fails or is unavailable
- no fuzzy matching is allowed

Representative fixture id:

```text
munpia_group_author_correction_by_work_title_fallback
```

### 6.5 Multi-Sheet Block

Purpose:

```text
multi-sheet settlement workbook without explicit sheetName must block the group
```

Expected:

```text
multiple worksheets + no explicit sheetName
-> blocking issue
-> no rows
```

Representative fixture id:

```text
munpia_group_multisheet_without_sheet_name_blocks
```

### 6.6 Future Explicit sheetName Path

Purpose:

```text
reserve a future fixture family for explicit sheetName contract once the input source is implemented
```

Expected for future activation only:

```text
multiple worksheets + explicit sheetName
-> use only named sheet
```

Status:

```text
document-only reservation
not active for MVP implementation yet
```

Representative fixture id:

```text
munpia_group_multisheet_with_explicit_sheet_name
```

### 6.7 Missing Settlement Slot Blocks

Purpose:

```text
required settlement slot missing must block the whole group
```

Expected:

- `missing_file`
- no rows

Representative fixture id:

```text
munpia_group_missing_settlement_slot
```

### 6.8 Duplicate Slot Blocks

Purpose:

```text
duplicate settlement or duplicate authorCorrection slot must block the group
```

Expected:

- blocking issue using existing issue types
- no rows

Representative fixture ids:

```text
munpia_group_duplicate_settlement_slot
munpia_group_duplicate_author_correction_slot
```

### 6.9 Unknown Slot Blocks

Purpose:

```text
unknown slot values are not recoverable by filename guessing
```

Expected:

- blocking issue using existing issue types
- no rows

Representative fixture id:

```text
munpia_group_unknown_slot_blocks
```

### 6.10 Settlement Required Columns Missing

Purpose:

```text
required settlement columns missing should block at the settlement path boundary
```

Expected:

- `missing_column`
- no rows

Representative fixture id:

```text
munpia_group_missing_required_column_blocks
```

## 7. Expected SettlementRow Rules

Expected `SettlementRow[]` in normal Munpia fixtures must follow:

- `rowId` = deterministic normalized row identifier required by `SettlementRow`
- `company` = manifest company
- `platform` = `munpia`
- `saleMonth` = manifest saleMonth
- `workTitle` = suffix-free work title
- `mailerContentTitle` = `작품명` or `작품명(app)`
- `author` = source author or corrected author according to contract
- `grossSales` = Munpia formula authority result
- `settlementAmount` = Munpia formula authority result
- `sourceFileName` = representative settlement source file
- `sourceRowIndex` = representative settlement source row
- `issues` = linked issue ids when row-level issue linking is needed; happy-path rows use `[]`

## 8. Expected ParseIssue Rules

Expected `ParseIssue[]` in Munpia fixtures must use existing issue types only.

Allowed issue forms for fixture expectations:

- `missing_file`
- `missing_column`
- `missing_field`
- `invalid_value`
- `mapping_failed`
- `parse_error`

Do not introduce a new `blocked` issue type in fixture expectations.

Fixture expectation split:

- group-level blocked cases -> existing issue + no rows
- row-level correction miss -> `mapping_failed` + partial rows may still exist from other source rows

## 9. Fixture Directory and File Naming Spec

Recommended directory structure:

```text
fixtures/parser-contract/munpia/
├─ munpia_group_valid_single_sheet/
│  ├─ manifest.json
│  ├─ input/
│  │  └─ settlement.rows.json
│  └─ expected/
│     ├─ settlementRows.json
│     └─ parseIssues.json
├─ munpia_group_author_correction_by_work_code/
├─ munpia_group_missing_author_correction_skips_affected_row/
├─ munpia_group_author_correction_by_work_title_fallback/
├─ munpia_group_multisheet_without_sheet_name_blocks/
├─ munpia_group_missing_settlement_slot/
├─ munpia_group_duplicate_settlement_slot/
├─ munpia_group_duplicate_author_correction_slot/
├─ munpia_group_unknown_slot_blocks/
└─ munpia_group_missing_required_column_blocks/
```

Each fixture group should keep:

- `manifest.json`
- `input/`
- `expected/settlementRows.json`
- `expected/parseIssues.json`
- optional tiny synthetic workbook files only when adapter behavior must be exercised

Directory naming rules:

- root directory is fixed as `fixtures/parser-contract/munpia/`
- fixture directory name must equal `manifest.fixtureId`
- use lowercase snake-like ids with Munpia prefix
- positive cases start with `munpia_group_`
- blocked cases end with `_blocks`
- partial-row skip cases end with `_skips_affected_row`
- reserved future-only cases may remain documented without a real directory until activated

Input file naming rules:

- settlement rows JSON: `settlement.rows.json`
- author correction rows JSON: `authorCorrection.rows.json`
- settlement table stub JSON: `settlement.table.json`
- synthetic workbook file: `settlement.synthetic.xlsx`
- multi-sheet synthetic workbook file: `settlement.multisheet.synthetic.xlsx`

Expected artifact naming rules:

- expected rows file is always `expected/settlementRows.json`
- expected issues file is always `expected/parseIssues.json`
- do not create per-fixture ad hoc expected file names

Recommended `manifest.json` / `input/` / `expected/` split:

- `manifest.json` = parser execution context and file inventory
- `input/` = sanitized parser-ready rows or tiny synthetic adapter inputs
- `expected/settlementRows.json` = final normalized `SettlementRow[]`
- `expected/parseIssues.json` = final normalized `ParseIssue[]`

This split keeps fixture review deterministic and prevents test logic from depending on hidden filename conventions.

## 10. Group Parser Test Matrix

The following matrix translates fixture families into concrete test intentions.

| fixtureId | parser focus | expected rows | expected issues | status |
| --- | --- | ---: | ---: | --- |
| `munpia_group_valid_single_sheet` | happy path, single worksheet, explicit settlement slot | >0 | 0 | active |
| `munpia_group_author_correction_by_work_code` | optional correction slot, `작품코드` priority | >0 | 0 | active |
| `munpia_group_missing_author_correction_skips_affected_row` | row-level correction miss skips only affected row | partial | 1+ | active |
| `munpia_group_author_correction_by_work_title_fallback` | `작품` fallback after missing/unmatched `작품코드` | >0 | 0 | active |
| `munpia_group_multisheet_without_sheet_name_blocks` | multi-sheet workbook without explicit `sheetName` | 0 | 1+ | active |
| `munpia_group_multisheet_with_explicit_sheet_name` | future explicit sheet selection path | TBD | TBD | reserved |
| `munpia_group_missing_settlement_slot` | required settlement slot missing | 0 | 1+ | active |
| `munpia_group_duplicate_settlement_slot` | duplicate settlement slot | 0 | 1+ | active |
| `munpia_group_duplicate_author_correction_slot` | duplicate optional correction slot | 0 | 1+ | active |
| `munpia_group_unknown_slot_blocks` | unknown slot value with no filename inference | 0 | 1+ | active |
| `munpia_group_missing_required_column_blocks` | required settlement column missing | 0 | 1+ | active |

Recommended Vitest test names:

- `parses munpia group from a single-sheet settlement fixture`
- `applies author correction by 작품코드 when correction slot is present`
- `falls back to 작품 matching only after 작품코드 lookup is unavailable or misses`
- `skips only the affected row when author correction is required but unresolved`
- `blocks when settlement workbook contains multiple worksheets without explicit sheetName`
- `blocks when settlement slot is missing`
- `blocks when settlement slot is duplicated`
- `blocks when authorCorrection slot is duplicated`
- `blocks when an unknown Munpia slot is supplied`
- `blocks when required settlement columns are missing`

Minimal assertion direction per test:

- success cases: exact `SettlementRow[]` + empty `ParseIssue[]`
- partial-row case: reduced `SettlementRow[]` + row-level `mapping_failed`
- blocked cases: empty `SettlementRow[]` + existing issue types only
- reserved future sheetName case: document only, no active automated test until input contract is enabled

## 11. Forbidden Behavior

- Do not commit original Munpia business workbooks.
- Do not guess slots from filenames in fixtures.
- Do not guess author corrections from free text.
- Do not activate fuzzy matching in fixture expectations.
- Do not treat missing author correction as a whole-group block.
- Do not auto-pick worksheets in multi-sheet fixtures.
- Do not add a `blocked` issue type to expected issues.
- Do not mix fixture planning with parser wiring, registry wiring, or orchestrator wiring.

## 12. Recommended Implementation Order

```text
1. sanitized settlement-row fixtures for single-file unit
2. sanitized correction-row fixtures
3. group manifest fixtures with explicit slots
4. blocked-case expected issues
5. future reserved explicit-sheetName fixture family
```

## 13. Relationship to Existing Docs

Use the following split:

- `MUNPIA_CONTRACT.md` = formula and row-level authority
- `MUNPIA_GROUP_PARSER_CONTRACT.md` = production group input shape and blocking policy
- `MUNPIA_FIXTURE_PLAN.md` = sanitized fixture families and expected-result planning
- `AUTOSETTLEMENT_PARSER_CONTRACT_TEST_PLAN.md` = cross-platform parser test expectations
