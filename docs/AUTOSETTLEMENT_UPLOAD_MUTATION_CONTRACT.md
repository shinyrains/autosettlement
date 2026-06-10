# AutoSettlement Upload Mutation Contract

Status: authority-closed for the current browser live-upload slice.

## 1. Purpose

This document freezes the first real browser upload mutation path that is allowed to modify the persisted active batch draft.

Current goal is intentionally narrow:
- validate a real file-selection path end-to-end
- reuse the already-closed parser/orchestrator contracts
- mutate the local persisted draft without introducing multi-slot complexity yet

## 2. Current live-upload scope

The following upload cards are live-wired in the current slice:

1. `sr / misterblue / upload-sr-misterblue`
   - shape: single file
   - required count: `1`
   - accepted extension set: `.xlsx`
   - contracted real sample path: `tmp/platform-samples/misterblue/작품별정산_2026-04-01_2026-04-30.xlsx`

2. `raon / panmurim / upload-raon-panmurim`
   - shape: single file
   - required count: `1`
   - accepted extension set: `.xlsx`
   - contracted real sample path: `tmp/platform-samples/panmurim/（주）라온이앤엠_2026년 5월.xlsx`

3. `raon / bookcube / upload-raon-bookcube`
   - shape: single file
   - required count: `1`
   - accepted extension set: `.xlsx`
   - contracted real sample path: `tmp/platform-samples/bookcube/북큐브 상세매출 2026-5~2026-5 (1).xlsx`

4. `raon / epyrus / upload-raon-epyrus`
   - shape: single file
   - required count: `1`
   - accepted extension set: `.csv`
   - contracted real sample path: `tmp/platform-samples/epyrus/2026년04월정산내역_라온E＆M.csv`

All other upload cards remain non-live in this slice.
They may render current status, but they do not mutate persisted draft state through a browser file selection yet.

## 3. Entry event

The mutation starts from the upload card file input.

Contracted browser behavior:
1. user selects exactly one file on the live-wired card
2. browser reads the file with `File.arrayBuffer()`
3. runtime converts it to `Uint8Array`
4. runtime calls `runBatchParseOrchestrator(...)`
5. parse result replaces the old row/issue slice for the same `(company, platform)` pair
6. updated draft is written back to localStorage through the existing persisted app state hook

## 4. Parser/orchestrator reuse

The live-upload slice must not create a parallel parser path.
It must reuse the existing orchestrator stack:
- `runBatchParseOrchestrator(...)`
- `runFileParseOrchestrator(...)`
- platform adapter registry
- parser registry

Current contracted platform lanes under this live path:
- Misterblue XLSX adapter + parser
- Panmurim XLSX adapter + parser
- Bookcube XLSX adapter + parser
- Epyrus CSV adapter + parser

## 5. Draft mutation boundary

A successful upload may mutate only the following active-draft fields:
- `batch.updatedAt`
- `batch.uploads`
- top-level `uploads`
- top-level `rows`
- top-level `issues`
- `selectedRowId` only when previous selection is no longer present

The mutation must preserve unrelated platform slices.
In other words, rows/issues from other `(company, platform)` pairs must remain untouched.

## 6. Replacement semantics

For the live-wired upload card, a new successful parse performs replacement, not append-only merge.

Replacement key:
- `(company, platform)` of the upload card

Required behavior:
- remove old rows for that key
- remove old issues for that key
- insert new parsed rows for that key
- insert new issues for that key
- update upload metadata for that card only

## 7. Upload metadata semantics

After successful parse, the target upload card must update:
- `fileCount = 1`
- `sourceFileNames = [selected filename]`
- `parsedRowCount = parsed row count for that upload key`
- `issueCount = parsed issue count for that upload key`
- `lastUploadedAt = current timestamp`
- `status`

Status contract:
- any error-severity issue -> `error`
- warning-only issues -> `warning`
- zero issues and row count > 0 -> `parsed`
- zero issues and zero rows -> `uploaded`

## 8. Failure semantics

The current slice must fail safely.
If file extension is unsupported, file reading fails, or parsing throws:
- existing unrelated draft data must survive
- target upload card becomes `error`
- target upload metadata still records selected filename and timestamp
- a `parse_error` issue is created for the same `(company, platform)` key
- parsed row count becomes `0`

## 9. File-content persistence boundary

This live-upload slice still does **not** persist raw file bytes.
Only derived draft state is persisted:
- upload metadata
- normalized rows
- parse issues
- selected review row

Raw `File`, `Blob`, `ArrayBuffer`, and `Uint8Array` values are runtime-only.

## 10. Out of scope

Not included in the current live-upload closure:
- real browser implementation of grouped-card mutation (see `docs/AUTOSETTLEMENT_GROUPED_UPLOAD_MUTATION_CONTRACT.md`)
- multi-file upload cards beyond the grouped authority frozen there
- drag-and-drop UX
- background parsing jobs
- server persistence
- upload progress transport semantics
- cross-session recovery of raw file bytes
- live upload action wiring for platforms beyond Misterblue + Panmurim + Bookcube + Epyrus single-file cards

## 11. Verification target

This slice is only considered closed when all of the following succeed:
- unit tests for upload mutation helper coverage
- component/UI test for current live upload card rendering
- browser-like app tests that select the real Misterblue, Panmurim, Bookcube, and Epyrus samples and verify persisted draft mutation
- full `npm run check`
