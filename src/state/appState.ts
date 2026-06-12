import { useEffect, useState } from "react";
import {
  mockBatch,
  mockIssues,
  mockSettlementRows,
  mockUploads,
  type PlatformUploadCard,
} from "../data/mockSettlement";
import type { Batch, BatchPlatformUploadSlot, BatchPlatformUploadSlotKey, ParseIssue, ReviewDecision, ReviewDecisionStatus, SettlementRow } from "../types/settlement";

export const APP_STATE_STORAGE_KEY = "autosettlement.active-batch.v1";
const MUNPIA_GROUPED_SNAPSHOT_STORAGE_KEY = "autosettlement.munpia-grouped-slot-snapshots.v1";
const SERIES_GROUPED_SNAPSHOT_STORAGE_KEY = "autosettlement.series-grouped-slot-snapshots.v1";
const RIDIBOOKS_GROUPED_SNAPSHOT_STORAGE_KEY = "autosettlement.ridibooks-grouped-slot-snapshots.v1";
const APP_STATE_VERSION = 1 as const;

export type AppDraftState = {
  version: typeof APP_STATE_VERSION;
  batch: Batch;
  uploads: PlatformUploadCard[];
  rows: SettlementRow[];
  issues: ParseIssue[];
  selectedRowId: string;
  reviewDecisions: ReviewDecision[];
};

export type UploadPassTarget = {
  uploadId: string;
  slotKey?: BatchPlatformUploadSlotKey;
};

export function createSeedAppState(): AppDraftState {
  const uploads = clone(mockUploads);
  const rows = clone(mockSettlementRows);
  const issues = clone(mockIssues);
  return normalizeAppDraftState({
    version: APP_STATE_VERSION,
    batch: {
      ...clone(mockBatch),
      uploads: clone(uploads),
    },
    uploads,
    rows,
    issues,
    selectedRowId: rows[1]?.rowId ?? rows[0]?.rowId ?? "",
    reviewDecisions: [],
  });
}

export function hasPersistedAppDraftState(storage: Storage | undefined = getBrowserStorage()): boolean {
  if (!storage) {
    return false;
  }

  return storage.getItem(APP_STATE_STORAGE_KEY) !== null;
}

export function loadAppDraftState(storage: Storage | undefined = getBrowserStorage()): AppDraftState {
  if (!storage) {
    return createSeedAppState();
  }

  const raw = storage.getItem(APP_STATE_STORAGE_KEY);
  if (!raw) {
    clearGroupedUploadSnapshotSidecar(storage);
    return createSeedAppState();
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!isAppDraftStateShape(parsed)) {
      clearGroupedUploadSnapshotSidecar(storage);
      return createSeedAppState();
    }
    return normalizeAppDraftState(parsed);
  } catch {
    clearGroupedUploadSnapshotSidecar(storage);
    return createSeedAppState();
  }
}

export function saveAppDraftState(
  state: AppDraftState,
  storage: Storage | undefined = getBrowserStorage(),
): void {
  if (!storage) {
    return;
  }

  storage.setItem(APP_STATE_STORAGE_KEY, JSON.stringify(normalizeAppDraftState(state)));
}

export function clearAppDraftState(storage: Storage | undefined = getBrowserStorage()): void {
  storage?.removeItem(APP_STATE_STORAGE_KEY);
  if (storage) {
    clearGroupedUploadSnapshotSidecar(storage);
  }
}

export function usePersistedAppState(storage: Storage | undefined = getBrowserStorage()) {
  const [state, setState] = useState<AppDraftState>(() => loadAppDraftState(storage));

  useEffect(() => {
    saveAppDraftState(state, storage);
  }, [state, storage]);

  return {
    state,
    setSelectedRowId: (selectedRowId: string) => {
      setState((currentState) => normalizeAppDraftState({
        ...currentState,
        selectedRowId,
      }));
    },
    setReviewDecisionStatus: (rowId: string, status: ReviewDecisionStatus, note?: string) => {
      setState((currentState) => normalizeAppDraftState({
        ...currentState,
        reviewDecisions: upsertReviewDecisionStatus(currentState.reviewDecisions, rowId, status, note),
      }));
    },
    setReviewDecisionStatuses: (rowIds: string[], status: ReviewDecisionStatus) => {
      setState((currentState) => normalizeAppDraftState({
        ...currentState,
        reviewDecisions: upsertReviewDecisionStatuses(currentState.reviewDecisions, rowIds, status),
      }));
    },
    updateReviewRow: (rowId: string, fields: Partial<Pick<SettlementRow, "mailerContentTitle" | "author" | "publisher">>) => {
      setState((currentState) => normalizeAppDraftState({
        ...currentState,
        rows: currentState.rows.map((row) => (
          row.rowId === rowId
            ? {
                ...row,
                ...fields,
              }
            : row
        )),
      }));
    },
    passMissingUpload: (target: UploadPassTarget) => {
      setState((currentState) => normalizeAppDraftState(applyMissingUploadPass(currentState, target)));
    },
    replaceState: (nextState: AppDraftState | ((currentState: AppDraftState) => AppDraftState)) => {
      setState((currentState) => normalizeAppDraftState(
        typeof nextState === "function" ? nextState(currentState) : nextState,
      ));
    },
    resetState: () => {
      if (storage) {
        clearGroupedUploadSnapshotSidecar(storage);
      }
      setState(createSeedAppState());
    },
  };
}

function normalizeAppDraftState(state: AppDraftState): AppDraftState {
  const uploads = clone(state.uploads);
  const rows = clone(state.rows);
  const selectedRowId = rows.some((row) => row.rowId === state.selectedRowId)
    ? state.selectedRowId
    : rows[0]?.rowId ?? "";

  return {
    version: APP_STATE_VERSION,
    batch: {
      ...clone(state.batch),
      uploads: clone(uploads),
    },
    uploads,
    rows,
    issues: clone(state.issues),
    selectedRowId,
    reviewDecisions: normalizeReviewDecisions(state.reviewDecisions ?? [], rows),
  };
}

function applyMissingUploadPass(state: AppDraftState, target: UploadPassTarget): AppDraftState {
  const uploads = state.uploads.map((upload) => (
    upload.uploadId === target.uploadId ? passUpload(upload, target.slotKey) : upload
  ));
  const targetUpload = state.uploads.find((upload) => upload.uploadId === target.uploadId);
  if (!targetUpload) {
    return state;
  }
  const removedIssueIds = new Set(
    state.issues
      .filter((issue) => isMissingUploadIssueForTarget(issue, targetUpload, target))
      .map((issue) => issue.issueId),
  );
  const issues = state.issues.filter((issue) => !removedIssueIds.has(issue.issueId));
  const rows = state.rows.map((row) => ({
    ...row,
    issues: row.issues.filter((issueId) => !removedIssueIds.has(issueId)),
  }));

  return {
    ...state,
    uploads,
    batch: {
      ...state.batch,
      uploads,
      updatedAt: new Date().toISOString(),
    },
    rows,
    issues,
  };
}

function isMissingUploadIssueForTarget(
  issue: ParseIssue,
  upload: PlatformUploadCard,
  target: UploadPassTarget,
): boolean {
  if (issue.issueType !== "missing_file" || issue.company !== upload.company || issue.platform !== upload.platform) {
    return false;
  }
  if (target.slotKey) {
    return issue.slotKey === target.slotKey;
  }
  return issue.uploadId === target.uploadId || issue.slotKey === undefined;
}

function passUpload(upload: PlatformUploadCard, slotKey?: BatchPlatformUploadSlotKey): PlatformUploadCard {
  if (!slotKey) {
    return {
      ...upload,
      status: "passed",
      fileCount: upload.requiredFileCount,
      sourceFileNames: ["업로드 없음 PASS"],
      issueCount: 0,
    };
  }

  const requiredSlotFileCounts = getRequiredSlotFileCounts(upload);
  const slots = upload.slots?.map((slot) => (
    slot.slotKey === slotKey
      ? passUploadSlot(slot, requiredSlotFileCounts.get(slot.slotId) ?? 1)
      : slot
  ));
  if (!slots) {
    return upload;
  }
  const requiredSlots = slots.filter((slot) => slot.required);
  return {
    ...upload,
    slots,
    status: getUploadStatusFromSlots(requiredSlots),
    fileCount: slots.reduce((sum, slot) => sum + slot.fileCount, 0),
    sourceFileNames: slots.flatMap((slot) => slot.sourceFileNames),
    issueCount: slots.reduce((sum, slot) => sum + slot.issueCount, 0),
  };
}

function getUploadStatusFromSlots(requiredSlots: BatchPlatformUploadSlot[]): PlatformUploadCard["status"] {
  if (requiredSlots.some((slot) => slot.status === "error")) {
    return "error";
  }
  if (requiredSlots.some((slot) => slot.status === "warning" || slot.status === "empty")) {
    return "warning";
  }
  if (requiredSlots.some((slot) => slot.status === "passed")) {
    return "passed";
  }
  return "parsed";
}

function passUploadSlot(slot: BatchPlatformUploadSlot, requiredFileCount: number): BatchPlatformUploadSlot {
  return {
    ...slot,
    status: "passed",
    fileCount: requiredFileCount,
    sourceFileNames: ["업로드 없음 PASS"],
    issueCount: 0,
  };
}

function getRequiredSlotFileCounts(upload: PlatformUploadCard): Map<string, number> {
  const requiredSlots = (upload.slots ?? []).filter((slot) => slot.required);
  if (requiredSlots.length === 0) {
    return new Map();
  }

  const baseCount = Math.floor(upload.requiredFileCount / requiredSlots.length);
  const remainder = upload.requiredFileCount % requiredSlots.length;
  return new Map(
    requiredSlots.map((slot, index) => [
      slot.slotId,
      Math.max(baseCount + (index < remainder ? 1 : 0), 1),
    ]),
  );
}

function isAppDraftStateShape(value: unknown): value is AppDraftState {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<AppDraftState>;
  return candidate.version === APP_STATE_VERSION
    && !!candidate.batch && typeof candidate.batch === "object"
    && Array.isArray(candidate.uploads)
    && Array.isArray(candidate.rows)
    && Array.isArray(candidate.issues)
    && typeof candidate.selectedRowId === "string"
    && (candidate.reviewDecisions === undefined || Array.isArray(candidate.reviewDecisions));
}

function normalizeReviewDecisions(reviewDecisions: ReviewDecision[], rows: SettlementRow[]): ReviewDecision[] {
  const rowIds = new Set(rows.map((row) => row.rowId));
  const latestByRowId = new Map<string, ReviewDecision>();

  reviewDecisions.forEach((decision) => {
    if (!rowIds.has(decision.rowId)) {
      return;
    }

    latestByRowId.set(decision.rowId, { ...decision });
  });

  return Array.from(latestByRowId.values());
}

function upsertReviewDecisionStatus(
  reviewDecisions: ReviewDecision[],
  rowId: string,
  status: ReviewDecisionStatus,
  note?: string,
): ReviewDecision[] {
  return upsertReviewDecisionStatuses(reviewDecisions, [rowId], status, note);
}

function upsertReviewDecisionStatuses(
  reviewDecisions: ReviewDecision[],
  rowIds: string[],
  status: ReviewDecisionStatus,
  note?: string,
): ReviewDecision[] {
  const nextUpdatedAt = new Date().toISOString();
  const targetRowIds = Array.from(new Set(rowIds));
  const targetRowIdSet = new Set(targetRowIds);
  const remainingDecisions = reviewDecisions.filter((decision) => !targetRowIdSet.has(decision.rowId));
  const previousByRowId = new Map(reviewDecisions.map((decision) => [decision.rowId, decision]));

  return [
    ...remainingDecisions,
    ...targetRowIds.map((rowId) => {
      const previousNote = previousByRowId.get(rowId)?.note;
      const nextNote = note ?? previousNote;
      return {
        rowId,
        status,
        ...(nextNote ? { note: nextNote } : {}),
        updatedAt: nextUpdatedAt,
      };
    }),
  ];
}

function getBrowserStorage(): Storage | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }

  return window.localStorage;
}

function clearGroupedUploadSnapshotSidecar(storage: Storage): void {
  storage.removeItem(MUNPIA_GROUPED_SNAPSHOT_STORAGE_KEY);
  storage.removeItem(SERIES_GROUPED_SNAPSHOT_STORAGE_KEY);
  storage.removeItem(RIDIBOOKS_GROUPED_SNAPSHOT_STORAGE_KEY);
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
