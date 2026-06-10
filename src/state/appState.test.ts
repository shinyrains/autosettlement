import { describe, expect, it } from "vitest";
import {
  APP_STATE_STORAGE_KEY,
  clearAppDraftState,
  createSeedAppState,
  loadAppDraftState,
  saveAppDraftState,
} from "./appState";

const MUNPIA_GROUPED_SNAPSHOT_STORAGE_KEY = "autosettlement.munpia-grouped-slot-snapshots.v1";
const SERIES_GROUPED_SNAPSHOT_STORAGE_KEY = "autosettlement.series-grouped-slot-snapshots.v1";
const RIDIBOOKS_GROUPED_SNAPSHOT_STORAGE_KEY = "autosettlement.ridibooks-grouped-slot-snapshots.v1";

describe("appState persistence", () => {
  it("round-trips a modified draft through localStorage", () => {
    const state = createSeedAppState();
    state.selectedRowId = "row-005";
    state.uploads[0].status = "uploaded";
    state.batch.status = "uploaded";

    saveAppDraftState(state, window.localStorage);

    const reloaded = loadAppDraftState(window.localStorage);
    expect(reloaded.selectedRowId).toBe("row-005");
    expect(reloaded.uploads[0].status).toBe("uploaded");
    expect(reloaded.batch.uploads[0].status).toBe("uploaded");
  });

  it("falls back to the seed draft when storage contains invalid JSON", () => {
    window.localStorage.setItem(APP_STATE_STORAGE_KEY, "not-json");
    window.localStorage.setItem(MUNPIA_GROUPED_SNAPSHOT_STORAGE_KEY, JSON.stringify({ stale: true }));
    window.localStorage.setItem(SERIES_GROUPED_SNAPSHOT_STORAGE_KEY, JSON.stringify({ stale: true }));
    window.localStorage.setItem(RIDIBOOKS_GROUPED_SNAPSHOT_STORAGE_KEY, JSON.stringify({ stale: true }));

    const reloaded = loadAppDraftState(window.localStorage);
    const seed = createSeedAppState();

    expect(reloaded.selectedRowId).toBe(seed.selectedRowId);
    expect(reloaded.batch.batchId).toBe(seed.batch.batchId);
    expect(window.localStorage.getItem(MUNPIA_GROUPED_SNAPSHOT_STORAGE_KEY)).toBeNull();
    expect(window.localStorage.getItem(SERIES_GROUPED_SNAPSHOT_STORAGE_KEY)).toBeNull();
    expect(window.localStorage.getItem(RIDIBOOKS_GROUPED_SNAPSHOT_STORAGE_KEY)).toBeNull();
  });

  it("falls back to the first available row when the stored selected row is missing", () => {
    const state = createSeedAppState();
    state.selectedRowId = "missing-row";

    saveAppDraftState(state, window.localStorage);

    const reloaded = loadAppDraftState(window.localStorage);
    expect(reloaded.selectedRowId).toBe(reloaded.rows[0]?.rowId ?? "");
  });

  it("clears the persisted draft and grouped upload sidecar", () => {
    saveAppDraftState(createSeedAppState(), window.localStorage);
    window.localStorage.setItem(MUNPIA_GROUPED_SNAPSHOT_STORAGE_KEY, JSON.stringify({ stale: true }));
    window.localStorage.setItem(SERIES_GROUPED_SNAPSHOT_STORAGE_KEY, JSON.stringify({ stale: true }));
    window.localStorage.setItem(RIDIBOOKS_GROUPED_SNAPSHOT_STORAGE_KEY, JSON.stringify({ stale: true }));

    clearAppDraftState(window.localStorage);

    expect(window.localStorage.getItem(APP_STATE_STORAGE_KEY)).toBeNull();
    expect(window.localStorage.getItem(MUNPIA_GROUPED_SNAPSHOT_STORAGE_KEY)).toBeNull();
    expect(window.localStorage.getItem(SERIES_GROUPED_SNAPSHOT_STORAGE_KEY)).toBeNull();
    expect(window.localStorage.getItem(RIDIBOOKS_GROUPED_SNAPSHOT_STORAGE_KEY)).toBeNull();
  });
});
