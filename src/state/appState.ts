import { useEffect, useState } from "react";
import {
  mockBatch,
  mockIssues,
  mockSettlementRows,
  mockUploads,
  type PlatformUploadCard,
} from "../data/mockSettlement";
import type { Batch, ParseIssue, ReviewDecision, ReviewDecisionStatus, SettlementRow } from "../types/settlement";

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
    setReviewDecisionStatus: (rowId: string, status: ReviewDecisionStatus) => {
      setState((currentState) => normalizeAppDraftState({
        ...currentState,
        reviewDecisions: upsertReviewDecisionStatus(currentState.reviewDecisions, rowId, status),
      }));
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
): ReviewDecision[] {
  const nextUpdatedAt = new Date().toISOString();
  const remainingDecisions = reviewDecisions.filter((decision) => decision.rowId !== rowId);

  return [
    ...remainingDecisions,
    {
      rowId,
      status,
      updatedAt: nextUpdatedAt,
    },
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
