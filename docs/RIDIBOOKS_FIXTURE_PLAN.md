# RIDIBOOKS_FIXTURE_PLAN

## 1. Purpose

This document fixes the Ridibooks fixture and expected-result plan before parser implementation.

The goal is to make parser tests reproducible without committing original business CSV files.

This document is contract-only. It does not implement parser logic, tests, fixture files, UI behavior, workbook export, or mailer behavior.

## 2. Authority Documents

Primary Ridibooks parser contract:

```text
docs/RIDIBOOKS_CONTRACT.md
```

Special platform classification:

```text
docs/SPECIAL_PLATFORM_TRANSFORM_CONTRACT.md
```

CSV decode guard contract:

```text
docs/CSV_ENCODING_GUARD_CONTRACT.md
```

This fixture plan does not replace those documents. It only defines how sanitized fixtures should be shaped and verified.

## 3. Source Sample Inventory

Local audit samples exist outside the repository under:

```text
tmp/platform-samples/ridibooks/
```

Current sample files:

```text
calculate_1.csv
calculate_1 (1).csv
calculate_date_tran_1.csv
```

These files are original work samples and must not be added to Git.

Confirmed source characteristics:

```text
calculate_1.csv              -> UTF-8 BOM, comma, 59 columns
calculate_1 (1).csv          -> UTF-8 BOM, comma, 59 columns
calculate_date_tran_1.csv    -> UTF-8 BOM, comma, 27 columns
```

## 4. Fixture Strategy

Ridibooks parser tests must use sanitized minimal fixtures.

Allowed fixture form:

```text
small in-memory TabularRow objects
small synthetic CSV strings
small synthetic Uint8Array CSV bytes
```

Forbidden fixture form:

```text
original calculate_1.csv
original calculate_1 (1).csv
original calculate_date_tran_1.csv
full copied source rows from business files
real author email/address-book data
real mailer output files
```

Recommended first implementation path:

```text
sanitized TabularRow fixture
-> Ridibooks calculation/transform utilities
-> Ridibooks group parser
```

CSV adapter integration can be covered separately with tiny synthetic UTF-8 BOM CSV strings or byte arrays.

## 5. Fixture Group Structure

A Ridibooks fixture group should represent one logical upload group.

Draft manifest shape:

```ts
type RidibooksFixtureManifest = {
  fixtureId: string;
  company: "raon" | "sr";
  saleMonth: string;
  files: {
    base: RidibooksFixtureFile;
    file1: RidibooksFixtureFile;
    event?: RidibooksFixtureFile;
    mgCorrection?: RidibooksFixtureFile;
  };
  eventPeriod?: {
    startDate: string;
    endDate: string;
  };
  expected: {
    rows: ExpectedRidibooksSettlementRow[];
    issues: ExpectedRidibooksIssue[];
  };
};
```

Draft fixture file shape:

```ts
type RidibooksFixtureFile = {
  slot: "base" | "file_1" | "event" | "mg_correction";
  sourceFileName: string;
  rows: TabularFileRow[];
};
```

The slot must be explicit. Do not infer `base`, `file_1`, `event`, or `mg_correction` from file names in tests.

## 6. Required Fixture Families

### 6.1 Normal Non-MG Row

Purpose:

```text
base + file_1 comparison creates normal output row
```

Expected output:

```text
mailerContentTitle = 작품명
grossSales = (base normal sales - file_1 normal sales) + (base normal cancel - file_1 normal cancel)
settlementAmount = grossSales * 0.7 + file_1 settlement amount
```

This fixture verifies that signed negative source values are not converted to absolute values.

### 6.2 App Row

Purpose:

```text
base app-market aggregate columns create app output row
```

Expected output:

```text
mailerContentTitle = 작품명(app)
grossSales = app market settlement target amount - app market cancel amount
settlementAmount = (app market settlement target amount - app market fee - app market cancel amount) * 0.7
```

Detailed iOS/Android/OneStore fields may be included as consistency-check inputs, but the aggregate app-market columns remain the base app calculation authority.

### 6.3 MG Row

Purpose:

```text
explicit MG correction input changes normal settlement formula
```

Expected output:

```text
settlementAmount = grossSales * 0.6
```

MG must be driven by the MG correction slot only. Do not infer MG from source file names or source row values.

### 6.4 Event Normal Row

Purpose:

```text
event file row inside event period creates event normal output row
```

Expected output:

```text
mailerContentTitle = 작품명(이벤트)
grossSales = sum(event normal sales)
settlementAmount = sum(event normal settlement amount)
```

Author and publisher must be joined from the base row by book ID.

### 6.5 Event App Row

Purpose:

```text
event file row inside event period creates event app output row
```

Expected output:

```text
mailerContentTitle = 작품명(이벤트)(app)
grossSales = sum(iOS app target + Android app target + OneStore app target)
settlementAmount = sum(iOS app settlement + Android app settlement + OneStore app settlement)
```

### 6.6 Non-Event Row From Event File

Purpose:

```text
event file row outside event period uses event-file calculation method without event suffix
```

Expected output:

```text
normal row -> 작품명
app row    -> 작품명(app)
```

### 6.7 Event Replacement

Purpose:

```text
event file replaces base + file_1 result for matching book ID
```

Replacement unit:

```text
book ID
```

Expected behavior:

```text
matching event book ID exists
-> remove base + file_1 calculated rows for that book ID
-> use event-file calculated rows instead
```

Do not replace an entire series/work unless a future contract changes the replacement unit.

### 6.8 Missing Event Period

Purpose:

```text
event file exists but eventStartDate/eventEndDate is missing
```

Expected result:

```text
rows = []
issues includes error ParseIssue
issueType = missing_field or mapping_failed
status should block export through later validation/facade
```

The parser must not silently process event rows as normal rows when event dates are missing.

### 6.9 Matching Failure

Purpose:

```text
file_1/event/MG correction row cannot be matched to base row
```

Expected issue:

```text
issueType = mapping_failed
severity = error
```

### 6.10 Missing Required File

Purpose:

```text
base file or file_1 is missing
```

Expected issue:

```text
issueType = missing_file
severity = error
```

## 7. Minimal Sanitized Fixture Values

Use tiny numeric values that make formulas obvious.

Example normal base row:

```text
bookId: RIDI-001
title: Sample Work
author: Sample Author
publisher: Sample Publisher
normalSales: 1000
normalCancel: -100
appTargetAmount: 500
appFee: 150
appCancelAmount: -50
```

Example matching `file_1` row:

```text
bookId: RIDI-001
normalSales: 200
normalCancel: -20
settlementAmount: 30
```

Expected normal row:

```text
grossSales = (1000 - 200) + (-100 - -20) = 720
settlementAmount = 720 * 0.7 + 30 = 534
mailerContentTitle = Sample Work
```

Expected app row:

```text
grossSales = 500 - -50 = 550
settlementAmount = (500 - 150 - -50) * 0.7 = 280
mailerContentTitle = Sample Work(app)
```

These values are illustrative fixture values. Parser implementation should derive them from sanitized rows, not hard-code them.

## 8. Expected SettlementRow Fields

Each expected output row must verify at least:

```text
rowId
company
platform = ridibooks
saleMonth
workTitle
mailerContentTitle
author
publisher
grossSales
settlementAmount
sourceFileName
sourceRowIndex
issues
```

`sourceFileName` and `sourceRowIndex` should point to a representative source row.

Do not add platform-specific CSV source columns to `SettlementRow`.

## 9. Expected ParseIssue Cases

Fixture tests should cover:

```text
missing_file
missing_column
missing_field
mapping_failed
invalid_value
parse_error
duplicate_row
```

Do not add a new `ParseIssueType` unless the existing types cannot represent the case.

## 10. CSV Encoding Fixture Coverage

CSV adapter coverage should remain separate from Ridibooks calculation fixtures.

Required CSV encoding fixture coverage:

```text
UTF-8 BOM synthetic CSV bytes
normal UTF-8 synthetic CSV bytes
decode failure bytes -> parse_error
```

CP949/EUC-KR coverage is handled by the shared CSV adapter guard because Epyrus currently represents the known CP949/EUC-KR sample risk.

Ridibooks-specific parser fixtures may start from already decoded `TabularFileRow[]`.

## 11. Source Trace Principle

Internal calculation helpers may keep multiple source references while reconciling base, `file_1`, event, and MG correction rows.

Final `SettlementRow` keeps only:

```text
sourceFileName
sourceRowIndex
```

Do not expose internal source reference arrays in `SettlementRow`.

## 12. Implementation Checklist

Before parser implementation:

- Create sanitized fixture helpers or inline test fixtures.
- Keep original Ridibooks CSV files under `tmp/` only.
- Do not add original CSV files to Git.
- Implement calculation utilities before group parser wiring.
- Verify base + `file_1` matching by book ID.
- Verify event author/publisher join by book ID.
- Verify event replacement by book ID.
- Verify event period missing blocks output.
- Verify MG correction input is explicit.
- Verify normal/app/event rows remain separate by `mailerContentTitle`.

## 13. Out Of Scope

- Parser implementation
- Test implementation
- UI upload slot implementation
- Event period UI
- MG correction upload UI
- Workbook export changes
- Browser download changes
- Mailer display correction
- Address-book correction
- Deduction merge
- Email sending

## 14. Next Step

Recommended next task:

```text
RIDIBOOKS-CALC-CONSTANTS-001
```

Scope:

```text
code constants/types only
no parser
no orchestrator wiring
no UI/export/emailer changes
```
