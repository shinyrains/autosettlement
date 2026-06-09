# RIDIBOOKS_GROUP_PARSER_CONTRACT

## 1. Purpose

This document fixes the Ridibooks group parser assembly contract before implementation.

It does not replace:

- `docs/RIDIBOOKS_CONTRACT.md`
- `docs/RIDIBOOKS_FIXTURE_PLAN.md`
- `docs/CSV_ENCODING_GUARD_CONTRACT.md`

This document focuses only on how already-decoded file rows and existing Ridibooks calculation utilities are assembled into `ParserResult`.

No parser code, test code, UI behavior, export behavior, or mailer behavior is implemented here.

## 2. Parser Responsibility

The Ridibooks group parser is responsible for:

- validating required file slots
- validating required columns before calculation
- validating required identity values before calculation
- joining `base` and `file1` rows by book ID
- joining `event` rows to `base` identity rows by book ID
- applying explicit MG correction input when provided
- blocking event processing when event dates are missing
- applying event override by book ID
- mapping calculated outputs to `SettlementRow[]`
- returning `ParseIssue[]`

The group parser must not:

- read CSV bytes
- decode CSV text
- infer file slots from filenames
- infer MG from source rows or filenames
- call workbook export code
- call browser download code
- implement mailer display correction
- implement address-book correction
- implement deduction merge
- send email

## 3. Input Shape

The group parser receives already-adapted rows.

Draft function shape:

```ts
type RidibooksGroupParserContext = {
  batchId: string;
  company: Company;
  platform: "ridibooks";
  saleMonth: string;
  sourceFileNames: string[];
  eventPeriod?: {
    startDate: string;
    endDate: string;
  };
};

type RidibooksGroupFileInput = {
  sourceFileName: string;
  slot: "base" | "file1" | "event" | "mgCorrection";
  rows: TabularRow[];
  issues: ParseIssue[];
};
```

The existing generic `PlatformFileGroupParserContext` does not carry `eventPeriod`. The implementation should either add a narrow Ridibooks-specific context type or extend the orchestration boundary deliberately in a later wiring task.

## 4. Slot Policy

Required slots:

```text
base
file1
```

Optional slots:

```text
event
mgCorrection
```

Slot rules:

- `base` must appear exactly once.
- `file1` must appear exactly once.
- `event` may appear zero or one time.
- `mgCorrection` may appear zero or one time.
- Unknown slot values produce `mapping_failed`.
- Duplicate slots produce `mapping_failed`.
- Missing `base` or `file1` produces `missing_file`.
- Slots must be explicit. Filename inference is forbidden.

## 5. Blocking Policy

The parser should return no rows when a group-level blocked condition is present.

Blocked conditions:

- missing `base` file
- missing `file1` file
- duplicate required slot
- unknown slot
- missing required columns in any provided slot
- `event` file exists but `eventPeriod` is missing
- `eventPeriod.startDate` or `eventPeriod.endDate` is blank
- adapter-level `parse_error` exists for a required slot

When blocked:

```ts
{
  rows: [],
  issues: ParseIssue[]
}
```

Do not silently continue calculation if event rows exist without event dates. Event suffixes affect `mailerContentTitle`, so this must block.

## 6. Adapter Issues

Each file input can already contain adapter issues.

Issue handling:

- Always include adapter issues in the final `issues`.
- If a required slot has any `parse_error`, block the group and return no rows.
- If an optional slot has `parse_error`, do not use that optional slot.
- Optional slot `parse_error` should still be returned as an issue.

This keeps file decoding responsibility in the adapter while preventing calculation from using malformed required input.

## 7. Required Column Validation

Column validation must run before calculation.

Required column groups are defined by `RIDIBOOKS_REQUIRED_COLUMNS`.

Missing required columns produce:

```text
ParseIssue.issueType = missing_column
severity = error
```

Column validation is parser-level, not calculation-util-level. Calculation utilities may treat blank or invalid numeric values as zero for row math, but they must receive rows whose required columns are present.

## 8. Identity Field Validation

Required identity fields must be checked before calculation.

Base row required identity values:

```text
도서 ID
제목
저자
출판사
```

File1 row required identity values:

```text
도서 ID
제목
```

Event row required identity values:

```text
도서ID
제목
```

Missing required identity values produce:

```text
ParseIssue.issueType = missing_field
severity = error
```

Rows with missing identity values must not create `SettlementRow`.

## 9. Matching Policy

Base row key:

```text
base["도서 ID"]
```

File1 row key:

```text
file1["도서 ID"]
```

Event row key:

```text
event["도서ID"]
```

MG correction primary key:

```text
mgCorrection["도서 ID"]
```

MG title fallback:

```text
mgCorrection["작품명"]
```

Matching rules:

- Base rows drive the normal/app calculation set.
- File1 rows are looked up by book ID.
- Event rows are joined to base identity rows by book ID.
- MG correction rows are matched explicitly by book ID first, then by title fallback only when the MG book ID cell is blank.
- Do not match event rows by title, work, or series.
- Do not match MG rows by fuzzy text.

## 10. File1 Row Mismatch Policy

`file1` file presence is required.

Individual `file1` row matching policy:

- A base row without a matching `file1` row may still be calculated using zero file1 adjustment.
- This case should produce a `mapping_failed` issue with severity `warning`.
- A `file1` row that does not match any base row should produce a `mapping_failed` issue with severity `warning`.
- These row-level mismatches do not block the whole group.

Reason:

- Current sample has only 15 `file1` rows for 4612 base rows.
- Existing row calculation utility already supports missing `file1` row as zero adjustment.
- Blocking all unmatched base rows would incorrectly stop normal processing.

## 11. Event Period Policy

If an `event` slot exists, `eventPeriod` is required.

Required fields:

```text
eventPeriod.startDate
eventPeriod.endDate
```

Missing event period issue:

```text
ParseIssue.issueType = missing_field
severity = error
```

This is a blocked group condition.

Event period classification:

```text
startDate <= 결제일 <= endDate
```

Date comparison assumes normalized `YYYY-MM-DD` values. If later samples show another date format, add a contract patch before changing parser behavior.

## 12. Event Join And Override Policy

Event rows must join to base rows by book ID.

If an event row cannot join to a base row:

```text
ParseIssue.issueType = mapping_failed
severity = error
```

Unjoined event rows must not create `SettlementRow` because author and publisher come from the base row.

Event override unit:

```text
book ID
```

When event calculation exists for a book ID:

- remove the base/file1 calculated normal/app outputs for that book ID
- use event calculated outputs for that book ID

Do not replace an entire work or series.

## 13. MG Correction Policy

MG correction is optional.

If no MG correction slot is provided:

```text
all rows use non-MG calculation
```

If MG correction is provided:

- apply only explicit correction rows
- do not infer MG from filenames
- do not infer MG from source row values
- unmatched correction produces `mapping_failed`
- invalid MG flag produces `invalid_value`

MG correction issues are row-level issues and do not block the whole group unless a future contract says otherwise.

## 14. Calculation Assembly Order

Recommended assembly order:

```text
1. validate slots
2. merge adapter issues
3. block if required adapter parse_error exists
4. validate required columns
5. validate identity fields
6. index base rows by 도서 ID
7. index file1 rows by 도서 ID
8. calculate base/file1 normal + app outputs
9. apply optional MG correction
10. calculate optional event outputs with eventPeriod
11. join event identity from base rows
12. apply event override by book ID
13. map calculated outputs to SettlementRow
14. return ParserResult
```

## 15. SettlementRow Mapping

Each calculated output maps through `mapRidibooksCalculatedOutputToSettlement`.

Required output rules:

- `platform = "ridibooks"`
- `workTitle = original title`
- `mailerContentTitle` uses suffix policy:
  - normal: `작품명`
  - app: `작품명(app)`
  - event: `작품명(이벤트)`
  - eventApp: `작품명(이벤트)(app)`
- `author` comes from base row
- `publisher` comes from base row
- `grossSales` comes from calculation output
- `settlementAmount` comes from calculation output
- `sourceFileName/sourceRowIndex` use representative source ref
- internal `sourceRefs` must not be exposed on `SettlementRow`

## 16. Duplicate Output Policy

After event override and SettlementRow mapping, duplicate logical output keys should be detected.

Logical key:

```text
company + platform + saleMonth + workTitle + author + publisher + mailerContentTitle
```

Duplicate output key produces:

```text
ParseIssue.issueType = duplicate_row
severity = error
```

Duplicate output issues should block export through downstream validation/facade. The group parser may still return rows with issues attached only after a future design confirms the exact row issue linking behavior.

## 17. Out Of Scope

- Batch orchestrator wiring
- Registry wiring
- File picker behavior
- Event period UI
- MG correction upload UI
- CSV adapter changes
- Excel workbook export changes
- Browser download changes
- Mailer display correction
- Address-book correction
- Deduction merge
- Email sending

## 18. Implementation Checklist

Before `RIDIBOOKS-GROUP-PARSER-001` implementation:

- Add tests for missing `base`.
- Add tests for missing `file1`.
- Add tests for duplicate slot.
- Add tests for event file without event period.
- Add tests for missing required column before calculation.
- Add tests for missing identity field before calculation.
- Add tests for unmatched base/file1 row warning behavior.
- Add tests for event row base join failure.
- Add tests for MG correction unmatched row.
- Add tests for event override by book ID.
- Add tests for final `SettlementRow` suffixes.

