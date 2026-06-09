# AutoSettlement Upload Persistence Contract

Status: authority-closed for the current browser-runtime slice.

## 1. Current scope

This document freezes the minimum safe persistence/state contract for the current MVP UI shell.

In scope now:

- one active batch draft in the browser runtime
- local browser persistence for batch-shell state
- persistence of upload metadata, normalized rows, parse issues, and selected review row
- safe hydration on page reload
- safe reset back to the seed mock batch
- authority-approved single-file live browser upload mutation path (`docs/AUTOSETTLEMENT_UPLOAD_MUTATION_CONTRACT.md`)
- future grouped/slot-based mutation authority (`docs/AUTOSETTLEMENT_GROUPED_UPLOAD_MUTATION_CONTRACT.md`)

Out of scope now:

- raw uploaded `File` / `Blob` persistence
- IndexedDB or filesystem persistence
- multi-batch list persistence
- server sync / remote save
- resumable binary upload queue
- cross-device state sync

## 2. Persistence medium

Current authority-approved persistence medium:

```text
browser localStorage only
```

Current storage contract:

- one storage key for the active draft shell state
- JSON serialization only
- no binary file contents in storage
- corrupted or incompatible payloads must fall back to the seed draft safely

## 3. Draft boundary

Current persisted draft must include only authority-approved UI/runtime data:

```ts
{
  version: 1,
  batch: Batch,
  uploads: BatchPlatformUpload[],
  rows: SettlementRow[],
  issues: ParseIssue[],
  selectedRowId: string,
}
```

Current rules:

- `batch.uploads` and top-level `uploads` must stay aligned to the same upload snapshot
- `selectedRowId` is part of the persisted draft because review-panel focus must survive reload
- if the selected row no longer exists after hydration, the UI must fall back to the first available row
- if there are no rows, the UI must allow an empty selection without crashing

## 4. File persistence boundary

Current negative rule:

- the browser draft must not attempt to persist raw uploaded file bytes
- the browser draft must not store `File`, `Blob`, `ArrayBuffer`, or workbook buffers in localStorage
- only file metadata already normalized into the approved state shape may persist:
  - `sourceFileNames`
  - file counts
  - status
  - issue counts
  - parsed row counts
  - last-uploaded timestamps

Reason:

- localStorage is too small and structurally unsafe for raw settlement workbooks/CSVs
- binary persistence policy is still unresolved for the current repo slice

## 5. Hydration and fallback rules

On app bootstrap:

- try to load the persisted JSON draft
- if parsing fails, ignore the broken payload and use the seed draft
- if the payload version is unsupported, ignore it and use the seed draft
- if mandatory top-level fields are missing, ignore it and use the seed draft

Current mandatory top-level fields:

```text
version
batch
uploads
rows
issues
selectedRowId
```

## 6. Reset semantics

Current authority-approved reset behavior:

```text
reset action -> replace current persisted draft with the seed mock batch snapshot
```

Reset must:

- overwrite the local persisted draft
- restore seed batch/upload/row/issue state
- restore the seed selected review row
- not require a page reload

## 7. Allowed implementation work in this slice

Allowed now:

- state module for seed draft creation
- load/save helpers for localStorage
- hydration guardrails and fallback behavior
- React hook/provider wiring for the current shell
- selected-row persistence through the review panel
- reset action wiring
- tests for round-trip persistence and hydration fallback
- authority-approved live upload mutation for the currently contracted single-file cards declared in `docs/AUTOSETTLEMENT_UPLOAD_MUTATION_CONTRACT.md`

Blocked now:

- live upload action wiring beyond the currently contracted single-file cards
- raw file cache / binary persistence
- multi-batch dashboard persistence
- server API sync layer
- optimistic remote mutation queue

## 8. Forbidden behavior

- do not persist raw uploaded file bytes in localStorage
- do not silently crash on malformed stored JSON
- do not assume stored drafts are always current-version compatible
- do not couple hydration success to the presence of a selected row only
- do not let UI components read mutable mock arrays directly once the persisted draft layer exists

## 9. Current implementation target

Current safe production-shape target for this repo slice:

```text
seed mock draft
-> persisted browser draft loader
-> AppShell state hook
-> presentational sections receive state via props
-> selected row and upload metadata survive reload
-> authority-approved live upload cards mutate the persisted draft through the browser file-input path
```

## 10. Remaining open items

Still intentionally unresolved:

- final persistence policy for real uploaded binary files
- whether future multi-batch drafts live in one list key or per-batch keys
- whether `updatedAt` is UI-derived or server-authoritative in later slices
- whether future slot-level file replacement/removal needs dedicated event history
