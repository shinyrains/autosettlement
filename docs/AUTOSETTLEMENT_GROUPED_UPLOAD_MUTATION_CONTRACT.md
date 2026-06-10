# AutoSettlement Grouped Upload Mutation Contract

Status: authority-frozen for grouped upload cards before real browser wiring.

## 1. Purpose

This document freezes the future browser-draft mutation boundary for grouped or slot-based upload cards.

Current goal is intentionally narrow:
- close the mutation semantics before UI wiring
- prevent single-file live-upload rules from being copied onto grouped cards
- define what may update slot metadata vs what may replace platform rows/issues
- keep raw uploaded file bytes out of persistence

This document does **not** authorize immediate implementation.
It freezes the authority boundary first.

## 2. Current grouped-card scope

This authority applies to the following grouped upload cards:

1. `raon / munpia / upload-raon-munpia`
   - shape: slot-based grouped card
   - required slot: `settlement`
   - optional slot: `authorCorrection`
   - parse authority: `docs/MUNPIA_GROUP_PARSER_CONTRACT.md`
   - formula/row authority: `docs/MUNPIA_CONTRACT.md`

2. `raon / series / upload-raon-series`
3. `sr / series / upload-sr-series`
   - shape: 2-slot grouped card
   - UI slot keys: `seriesGeneral`, `seriesApp`
   - parser/orchestrator slot mapping: `seriesGeneral -> general`, `seriesApp -> app`
   - required slot: `seriesGeneral`
   - required slot: `seriesApp`
   - parse authority: `docs/SERIES_OPERATING_SPEC.md`
   - fixture/expected-result authority: `docs/SERIES_PARSER_FIXTURE_PLAN.md`

4. `raon / ridibooks / upload-raon-ridibooks`
   - shape: 4-slot grouped card
   - UI / parser slot keys: `base`, `file1`, `event`, `mgCorrection`
   - required slots: `base`, `file1`
   - optional slots: `event`, `mgCorrection`
   - parse authority: `docs/RIDIBOOKS_GROUP_PARSER_CONTRACT.md`
   - formula/row authority: `docs/RIDIBOOKS_CONTRACT.md`

5. `raon / joara / upload-raon-joara`
   - shape: 2-slot grouped card
   - UI / parser slot keys: `settlementDetail`, `workSettlement`
   - required slots: `settlementDetail`, `workSettlement`
   - parse authority: `docs/JOARA_CONTRACT.md`
   - current browser live path: both required CSV slots are wired in the current repo slice

All single-file live cards continue to use:
- `docs/AUTOSETTLEMENT_UPLOAD_MUTATION_CONTRACT.md`

## 3. Shared grouped-card rules

### 3.1 Parser/orchestrator reuse

Grouped live mutation must not create a parallel parser path.
It must reuse the existing stack:
- `runBatchParseOrchestrator(...)`
- grouped parser contracts already frozen per platform
- existing adapter and parser registries

### 3.2 Persistence boundary

Grouped upload mutation still must not persist raw file bytes.
Only derived browser-draft state may persist:
- aggregate upload metadata
- slot metadata
- normalized `SettlementRow[]`
- `ParseIssue[]`
- `selectedRowId`

Raw `File`, `Blob`, `ArrayBuffer`, and `Uint8Array` values are runtime-only.

### 3.3 Platform replace boundary

Grouped cards use a **platform-level committed slice**.

Committed slice key:
- `(company, platform)`

A new grouped parse may replace only:
- rows for that `(company, platform)` key
- issues for that `(company, platform)` key
- the aggregate upload card metadata for that platform
- slot metadata for that platform card

Unrelated platform slices must remain untouched.

### 3.4 Staged slot metadata vs committed parsed slice

Grouped cards distinguish:

1. **staged slot metadata update**
   - file count
   - selected filenames
   - slot status
   - slot issue count
   - slot last-uploaded timestamp

2. **committed parsed slice replacement**
   - normalized rows/issues for `(company, platform)`
   - aggregate parsed row count
   - aggregate issue count
   - aggregate status

Rule:
- partial slot uploads may update staged slot metadata
- partial slot uploads must **not** destructively replace the previously committed parsed slice
- committed parsed slice replacement happens only when that platform's parse-trigger gate is satisfied

### 3.5 Failure safety rule

If browser file reading fails, adapter parsing throws, or orchestrator parsing throws:
- unrelated platform slices survive
- previously committed parsed slice survives unless a full trigger gate was satisfied and a new committed parse result was produced
- affected slot metadata still records selected filenames/timestamp
- failure must surface through existing `ParseIssueType` values such as `parse_error`, `missing_file`, `missing_column`, `mapping_failed`, `invalid_value`
- no new grouped-upload-only issue type may be added

## 4. Munpia grouped mutation authority

### 4.1 Slot contract

Munpia grouped upload card is frozen as:

- `settlement`
  - required
  - exact count: `1`
  - accepted file kind: `xlsx`
- `authorCorrection`
  - optional
  - count: `0..1`
  - accepted file kinds: `csv | xlsx`

Filename inference is forbidden.
Slot meaning must be explicit.

### 4.2 Parse trigger gate

Munpia may attempt committed parse replacement only when:
- the `settlement` slot is present exactly once
- there is no duplicate slot violation

`authorCorrection` is optional and does not gate parse execution by itself.

### 4.3 Slot replacement semantics

When the user uploads a new `settlement` file:
- replace only the staged `settlement` slot snapshot
- keep the current `authorCorrection` slot snapshot if it exists
- run the grouped Munpia parse against the newest full slot snapshot
- if parse returns a contract-valid result, replace the committed Munpia `(company, platform)` slice

When the user uploads a new `authorCorrection` file:
- replace only the staged `authorCorrection` slot snapshot
- keep the current `settlement` slot snapshot
- if a valid `settlement` snapshot exists, rerun the grouped Munpia parse against the newest full slot snapshot
- if no valid `settlement` snapshot exists, update only staged slot metadata and do not replace rows/issues

### 4.4 Slot removal semantics

If future UI allows removing the `authorCorrection` slot file:
- remove only the staged `authorCorrection` snapshot
- rerun Munpia from the current `settlement` snapshot only
- rows that require correction but no longer match a correction row must follow the existing contract:
  - emit `mapping_failed`
  - skip the affected row's web/app outputs only
  - do not block the whole group

If future UI allows removing the `settlement` slot file:
- clear the staged `settlement` snapshot
- aggregate upload status becomes incomplete/error according to remaining issues
- previously committed parsed Munpia slice must remain until a separate explicit destructive-clear action is contracted

Destructive clear of the committed Munpia parsed slice is **not** authorized by ordinary slot removal in this contract.

### 4.5 Aggregate metadata semantics

Munpia aggregate upload metadata is derived from slot state:
- `fileCount` = total files present across both slots
- `sourceFileNames` = ordered concatenation of current slot filenames
- `parsedRowCount` = current committed Munpia row count
- `issueCount` = current committed Munpia issue count plus slot-surface issues that belong to the newest committed attempt
- `status`

Status boundary:
- missing required `settlement` slot -> aggregate is incomplete/error, no committed replace
- valid parse with only row-level correction misses -> aggregate may be `warning`
- valid parse with zero issues and rows > 0 -> `parsed`

## 5. Series grouped mutation authority

### 5.1 Slot contract

Series grouped upload card is frozen as:

- UI slot `seriesGeneral`
  - parser/orchestrator slot: `general`
  - required
  - exact count: `3`
  - accepted file kind: `html_xls`
  - expected browser extension set: `.xls`
- UI slot `seriesApp`
  - parser/orchestrator slot: `app`
  - required
  - exact count: `3`
  - accepted file kind: `html_xls`
  - expected browser extension set: `.xls`

General/app meaning must come only from the explicit slot mapping.
Filename inference and content inference are forbidden.

### 5.2 Parse trigger gate

Series may attempt committed parse replacement only when:
- `seriesGeneral` contains exactly 3 files
- `seriesApp` contains exactly 3 files
- total grouped candidate count is exactly 6

Before this completeness gate is satisfied:
- staged slot metadata may update
- aggregate upload metadata may update
- previously committed Series parsed slice must not be destructively replaced

### 5.3 Slot replacement semantics

When the user uploads files into `seriesGeneral`:
- replace only the staged `seriesGeneral` snapshot
- keep the current `seriesApp` snapshot
- if the full 3+3 gate is now satisfied, run the Series grouped parse against the newest full slot snapshot
- if the gate is not satisfied, do not replace committed rows/issues

When the user uploads files into `seriesApp`:
- symmetric rule to `seriesGeneral`

### 5.4 Committed parse replacement semantics

Once the 3+3 gate is satisfied, Series uses platform-level committed replacement:
- remove old rows for `(company, platform)` = `(raon|sr, series)`
- remove old issues for that key
- insert the newest parser result rows for that key
- insert the newest parser result issues for that key
- update aggregate and slot metadata to the newest committed attempt

### 5.5 Partial-file failure semantics after completeness gate

Current authority-safe rule is **not all-or-nothing after the completeness gate**.

Once a 3+3 candidate exists:
- group-completeness violations still block replacement
- otherwise the committed result follows the current parser contract
- parser/file issues may coexist with successful rows
- successful rows and returned issues may be committed together

This keeps grouped mutation aligned with the current Series parser boundary instead of inventing a stricter live-only rule.

### 5.6 Slot removal semantics

If future UI allows removing files from one Series slot:
- update only the staged slot snapshot first
- if the 3+3 gate becomes unsatisfied, do not destructively delete the previously committed Series parsed slice
- aggregate card becomes incomplete/warning/error according to remaining staged state
- committed slice remains until a future explicit destructive-clear contract is approved

### 5.7 Aggregate metadata semantics

Series aggregate upload metadata is derived from slot state plus the current committed parse result:
- `fileCount` = `seriesGeneral.fileCount + seriesApp.fileCount`
- `sourceFileNames` = staged slot filenames in deterministic slot order
- `parsedRowCount` = current committed Series row count
- `issueCount` = current committed Series issue count
- `status`

Status boundary:
- gate not yet satisfied -> aggregate is incomplete/uploaded/warning, but no committed replace
- gate satisfied + parser returns rows/issues -> aggregate reflects the committed result

## 6. Data-model authority additions for grouped cards

Grouped-card-safe slot file kinds are now:

```ts
type GroupedUploadAcceptedFileKind = "csv" | "xlsx" | "html_xls";
```

Expected UI slot keys:

```ts
"settlement" | "authorCorrection" | "seriesGeneral" | "seriesApp" | "base" | "file1" | "event" | "mgCorrection" | "settlementDetail" | "workSettlement"
```

Series parser/orchestrator input slot keys remain:

```ts
"general" | "app"
```

## 7. Out of scope

Still not authorized here:
- grouped-card drag-and-drop UX
- background parsing jobs
- server persistence
- upload progress transport semantics
- destructive clear/reset semantics for committed grouped slices beyond ordinary slot replacement/removal
- future explicit `sheetName` input UX for Munpia multi-sheet support

## 8. Verification target for future implementation

A future grouped-card implementation is only considered closed when all of the following succeed:
- grouped slot UI tests for Munpia, Series, Ridibooks, and Joara rendering
- mutation helper tests for staged-slot vs committed-slice behavior
- tests that prove partial slot uploads do not destructively replace committed rows/issues
- Munpia tests for settlement replacement, correction replacement, and correction removal recompute behavior
- Series tests for 3+3 gate behavior and committed replacement after completeness
- full `npm run check`
