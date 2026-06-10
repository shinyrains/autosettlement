# AutoSettlement Mixed-Company Upload Mutation Contract

Status: authority-frozen for future mixed-company browser upload cards before real UI wiring.

## 1. Purpose

This document freezes the future browser-draft mutation boundary for upload cards where one selected source file may produce committed parsed slices for more than one company.

Current goal is intentionally narrow:
- prevent the current single-file live-upload rule from being misapplied to mixed-company cards
- preserve parser/orchestrator truth where `SettlementRow.company` is decided row-by-row inside the parser lane
- define what one browser selection event may replace in persisted draft state
- keep raw uploaded file bytes out of persistence

This document does **not** authorize immediate implementation.
It closes the authority boundary first.

## 2. Current mixed-company scope

This authority currently applies only to:

1. shared Onestore workbook upload
   - source workbook authority: `docs/ONESTORE_CONTRACT.md`
   - platform key: `onestore`
   - current audited sample path: `tmp/platform-samples/onestore/정산내역_20260608_163327.xlsx`
   - output company slices from one workbook: `sr` and `raon`
   - parser/orchestrator truth: publisher-based company split inside the parser result

All ordinary single-company cards continue to use:
- `docs/AUTOSETTLEMENT_UPLOAD_MUTATION_CONTRACT.md`

All grouped/slot-based cards continue to use:
- `docs/AUTOSETTLEMENT_GROUPED_UPLOAD_MUTATION_CONTRACT.md`

## 3. Shared mixed-company rules

### 3.1 Parser/orchestrator reuse

Mixed-company live mutation must not create a parallel parser path.
It must reuse the existing stack:
- `runBatchParseOrchestrator(...)`
- `runFileParseOrchestrator(...)`
- existing adapter registry
- existing parser registry
- existing parser-owned company split logic

### 3.2 Persistence boundary

Mixed-company upload mutation still must not persist raw file bytes.
Only derived browser-draft state may persist:
- aggregate upload metadata
- normalized `SettlementRow[]`
- `ParseIssue[]`
- `selectedRowId`

Raw `File`, `Blob`, `ArrayBuffer`, and `Uint8Array` values are runtime-only.

### 3.3 Replacement boundary

Mixed-company cards use a **multi-slice committed replacement**.

Committed replacement keys for the current Onestore scope:
- `(sr, onestore)`
- `(raon, onestore)`

A new committed parse may replace only:
- rows for those contracted keys
- issues for those contracted keys
- the aggregate upload metadata surface for the shared mixed-company card

Unrelated platform slices must remain untouched.

### 3.4 Parser-owned company truth

The browser upload card must not guess company ownership from:
- filename
- card position
- manual split button
- pre-parse client heuristics

Current authority-safe rule:
- company truth comes only from parser-normalized `SettlementRow.company`
- issue ownership comes only from parser-normalized `ParseIssue.company`
- browser mutation consumes that parser output as-is

### 3.5 Failure safety rule

If browser file reading fails, adapter parsing throws, or orchestrator parsing throws:
- unrelated platform slices survive
- previously committed mixed-company slices survive unless a new committed parse result is successfully produced
- the aggregate mixed-company upload card still records selected filename/timestamp
- failure must surface through existing `ParseIssueType` values such as `parse_error`, `missing_column`, `missing_field`, `company_split_failed`, `invalid_value`
- no new mixed-company-only issue type may be added

## 4. Onestore mixed-company mutation authority

### 4.1 Card contract

Future Onestore live upload is frozen as:
- one shared upload card
- one selected file event
- exact file count: `1`
- accepted file kind: `xlsx`
- expected browser extension set: `.xlsx`
- source workbook is shared across both companies

Filename inference is forbidden.
The card meaning must come from explicit contracted platform identity: `onestore`.

### 4.2 Parse trigger gate

Onestore may attempt committed replacement only when:
- exactly one candidate workbook is selected
- the file extension is contract-valid for the card
- browser file reading succeeds
- orchestrator execution returns a contract-valid result object

There is no extra manual company-confirmation gate in the current authority.

### 4.3 Committed replacement semantics

Once the gate is satisfied, Onestore uses one shared parse result to replace both contracted company slices together:
- remove old rows for `(sr, onestore)`
- remove old rows for `(raon, onestore)`
- remove old issues for `(sr, onestore)`
- remove old issues for `(raon, onestore)`
- insert the newest parser result rows for those keys
- insert the newest parser result issues for those keys
- update the shared aggregate upload metadata to the newest committed attempt

Current rule:
- replacement is one committed event for the contracted Onestore pair
- do not commit only one company by separately re-running or separately reading the same workbook in the browser mutation layer

### 4.4 Aggregate upload metadata semantics

The future Onestore shared upload card owns one aggregate metadata surface.

Aggregate metadata contract:
- `fileCount = 1`
- `sourceFileNames = [selected filename]`
- `parsedRowCount = total committed rows across both Onestore company slices`
- `issueCount = total committed issues across both Onestore company slices`
- `lastUploadedAt = current timestamp`
- `status`

Status boundary:
- any error-severity issue in the committed Onestore pair -> `error`
- warning-only issues across the committed pair -> `warning`
- zero issues and committed row count > 0 -> `parsed`
- zero issues and committed row count = 0 -> `uploaded`

### 4.5 Company-level visibility without company-level upload cards

The future UI may still display company-level status views for Onestore, but those views must be derived from the shared committed result rather than separate file-selection cards.

Allowed future display pattern:
- one shared Onestore upload card
- downstream read-only status breakout for `sr` and `raon`

Forbidden pattern in the current authority:
- two separate browser file inputs that pretend to upload the same audited workbook once for `sr` and once for `raon`

### 4.6 Partial-company issue semantics

Current authority-safe rule is **commit the shared result as returned by the parser**, not an all-or-nothing company-perfect policy.

If a contract-valid Onestore parse returns:
- successful rows for one or both companies, and/or
- issues for one or both companies,

then the browser mutation may commit the returned rows and issues together for the contracted pair.

This keeps mixed-company mutation aligned with the current parser boundary instead of inventing a stricter browser-only rule.

### 4.7 Failure-before-commit semantics

If the shared Onestore attempt fails before a contract-valid parse result exists:
- previously committed `(sr, onestore)` rows survive
- previously committed `(raon, onestore)` rows survive
- previously committed Onestore issues survive unless explicitly replaced by a successful committed attempt
- aggregate card becomes `error`
- selected filename and timestamp may still update

### 4.8 Reset / removal semantics

If future UI allows removing the shared Onestore selected file before a new committed parse succeeds:
- clear only the staged runtime selection
- do not destructively delete previously committed `(sr, onestore)` or `(raon, onestore)` slices

If future UI later introduces an explicit destructive clear action:
- that action needs a separate authority update
- it is **not** authorized by this document

## 5. Data-model authority additions for mixed-company cards

Current authority-safe direction:
- do not force Onestore into plain `BatchPlatformUpload { company: Company }`
- use either a separate mixed-company parent card shape or an authority-approved equivalent metadata layer
- keep committed review/export rows in the existing `SettlementRow.company` model

Minimum future mixed-company card needs:
- one upload-card identity for the shared source file
- one contracted platform identity
- one aggregate metadata surface
- one explicit list of committed replacement targets

This document intentionally does **not** freeze a final TypeScript shape yet.
It freezes the mutation semantics first.

## 6. Out of scope

Still not authorized here:
- real browser implementation
- drag-and-drop UX
- background parsing jobs
- server persistence
- upload progress transport semantics
- manual company override UI
- publisher alias expansion beyond the current Onestore authority
- destructive clear/reset semantics beyond ordinary failed attempts or staged runtime discard

## 7. Verification target for future implementation

A future mixed-company-card implementation is only considered closed when all of the following succeed:
- upload mutation helper tests for shared-card -> two-company committed replacement
- tests that prove unrelated platform slices survive Onestore replacement
- tests that prove failed attempts preserve previously committed Onestore slices
- UI/component tests for one shared Onestore upload card rendering
- browser-like app tests that select the real Onestore sample and verify both `(sr, onestore)` and `(raon, onestore)` committed slices
- full `npm run check`
