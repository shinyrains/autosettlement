import { useMemo, useState } from "react";
import { createExportPackages } from "../exporters";
import {
  getReviewDecisionStatus,
  defaultReviewFilterState,
  getAvailableCompanies,
  getAvailablePlatforms,
  getFilteredReviewRows,
  getReviewActionQueue,
  getReviewExportReadiness,
  getReviewOverview,
  getSelectedReviewRow,
} from "../selectors";
import { usePersistedAppState } from "../state/appState";
import {
  applyLiveUploadMutation,
  isLiveUploadEnabled,
  type LiveUploadTarget,
} from "../state/uploadMutation";
import type { SettlementRow } from "../types/settlement";
import { BatchHeader } from "./BatchHeader";
import { ExportSection } from "./ExportSection";
import { ReviewSection } from "./ReviewSection";
import { SidebarNav } from "./SidebarNav";
import { StatusSection } from "./StatusSection";
import { UploadSection } from "./UploadSection";
import { WorkflowStrip } from "./WorkflowStrip";

type AppShellProps = {
  uploadMutationDependencies?: Parameters<typeof applyLiveUploadMutation>[3];
  onBackToBatchList?: () => void;
};

export function AppShell({ uploadMutationDependencies, onBackToBatchList }: AppShellProps = {}) {
  const {
    state,
    setSelectedRowId,
    setReviewDecisionStatus,
    setReviewDecisionStatuses,
    updateReviewRow,
    resetState,
    replaceState,
  } = usePersistedAppState();
  const [reviewFilters, setReviewFilters] = useState(defaultReviewFilterState);
  const reviewOverview = useMemo(
    () => getReviewOverview(state.rows, state.issues, state.reviewDecisions),
    [state.rows, state.issues, state.reviewDecisions],
  );
  const availableCompanies = useMemo(() => getAvailableCompanies(state.rows, state.issues), [state.rows, state.issues]);
  const availablePlatforms = useMemo(() => getAvailablePlatforms(state.rows, state.issues), [state.rows, state.issues]);
  const filteredRows = useMemo(
    () => getFilteredReviewRows(state.rows, reviewFilters, state.reviewDecisions),
    [state.rows, reviewFilters, state.reviewDecisions],
  );
  const selectedRow = useMemo(
    () => getSelectedReviewRow(filteredRows, state.selectedRowId),
    [filteredRows, state.selectedRowId],
  );
  const selectedRowIssues = selectedRow
    ? state.issues.filter((issue) => selectedRow.issues.includes(issue.issueId))
    : [];
  const selectedRowReviewStatus = getReviewDecisionStatus(state.reviewDecisions, selectedRow?.rowId);
  const reviewActionQueue = useMemo(
    () => getReviewActionQueue(filteredRows, state.reviewDecisions),
    [filteredRows, state.reviewDecisions],
  );
  const effectiveSelectedRowId = selectedRow?.rowId ?? state.selectedRowId;
  const nextPendingReviewRow = useMemo(
    () => getNextFilteredReviewRow(filteredRows, effectiveSelectedRowId, (row) => (
      getReviewDecisionStatus(state.reviewDecisions, row.rowId) !== "confirmed"
    )),
    [effectiveSelectedRowId, filteredRows, state.reviewDecisions],
  );
  const nextIssueReviewRow = useMemo(
    () => getNextFilteredReviewRow(filteredRows, effectiveSelectedRowId, (row) => row.issues.length > 0),
    [effectiveSelectedRowId, filteredRows],
  );
  const exportResult = useMemo(() => createExportPackages(state.rows), [state.rows]);
  const exportPackages = exportResult.packages;
  const exportReadiness = useMemo(
    () => getReviewExportReadiness(state.rows, state.issues, state.reviewDecisions, exportResult),
    [exportResult, state.rows, state.issues, state.reviewDecisions],
  );

  const totals = useMemo(() => {
    const uploadedFiles = state.uploads.reduce((sum, upload) => sum + upload.fileCount, 0);
    const requiredFiles = state.uploads.reduce((sum, upload) => sum + upload.requiredFileCount, 0);
    return {
      uploadedFiles,
      requiredFiles,
      rows: state.rows.length,
      readyExports: exportReadiness.readyExportCount,
    };
  }, [exportReadiness.readyExportCount, state.rows.length, state.uploads]);

  const handleUploadFiles = async (target: LiveUploadTarget, files: File[]) => {
    const nextState = await applyLiveUploadMutation(state, target, files, uploadMutationDependencies);
    replaceState(nextState);
  };

  return (
    <main className="min-h-screen bg-ink-950 text-slate-100">
      <div className="grid min-h-screen grid-cols-[260px_minmax(0,1fr)]">
        <SidebarNav />
        <section className="min-w-0">
          <BatchHeader
            batch={state.batch}
            issueCount={state.issues.length}
            onResetState={resetState}
            onBackToBatchList={onBackToBatchList}
            readyExports={totals.readyExports}
            readiness={exportReadiness}
            requiredFiles={totals.requiredFiles}
            rowsCount={totals.rows}
            uploadedFiles={totals.uploadedFiles}
          />
          <div className="mx-auto flex max-w-[1660px] flex-col gap-6 px-8 py-6">
            <WorkflowStrip />
            <UploadSection
              uploads={state.uploads}
              onUploadFiles={handleUploadFiles}
              isUploadEnabled={isLiveUploadEnabled}
            />
            <StatusSection
              issues={state.issues}
              rows={totals.rows}
              companyCount={reviewOverview.companyCount}
              rowsWithIssues={reviewOverview.rowsWithIssues}
              onOpenIssueRow={(rowId) => {
                setReviewFilters(defaultReviewFilterState);
                setSelectedRowId(rowId);
              }}
            />
            <ReviewSection
              rows={filteredRows}
              totalRowCount={state.rows.length}
              availableCompanies={availableCompanies}
              availablePlatforms={availablePlatforms}
              filters={reviewFilters}
              onChangeFilters={setReviewFilters}
              selectedRow={selectedRow}
              selectedRowReviewStatus={selectedRowReviewStatus}
              selectedRowIssues={selectedRowIssues}
              selectedRowId={selectedRow?.rowId ?? state.selectedRowId}
              onSelectRow={setSelectedRowId}
              confirmedRowCount={reviewOverview.confirmedRowCount}
              reviewActionQueue={reviewActionQueue}
              onOpenQueuedRow={(rowId) => setSelectedRowId(rowId)}
              onConfirmRow={(rowId) => setReviewDecisionStatus(rowId, "confirmed")}
              onResetRowConfirmation={(rowId) => setReviewDecisionStatus(rowId, "pending")}
              onConfirmRows={(rowIds) => setReviewDecisionStatuses(rowIds, "confirmed")}
              onResetRowsConfirmation={(rowIds) => setReviewDecisionStatuses(rowIds, "pending")}
              hasNextPendingRow={!!nextPendingReviewRow}
              hasNextIssueRow={!!nextIssueReviewRow}
              onSelectNextPendingRow={() => {
                if (nextPendingReviewRow) {
                  setSelectedRowId(nextPendingReviewRow.rowId);
                }
              }}
              onSelectNextIssueRow={() => {
                if (nextIssueReviewRow) {
                  setSelectedRowId(nextIssueReviewRow.rowId);
                }
              }}
              onSaveRowEdits={(rowId, fields) => updateReviewRow(rowId, fields)}
            />
            <ExportSection
              exportPackages={exportPackages}
              exportResult={exportResult}
              readiness={exportReadiness}
              readyExports={totals.readyExports}
            />
          </div>
        </section>
      </div>
    </main>
  );
}

function getNextFilteredReviewRow(
  rows: SettlementRow[],
  selectedRowId: string,
  predicate: (row: SettlementRow) => boolean,
): SettlementRow | undefined {
  if (rows.length === 0) {
    return undefined;
  }

  const selectedIndex = rows.findIndex((row) => row.rowId === selectedRowId);
  const startIndex = selectedIndex >= 0 ? selectedIndex + 1 : 0;

  for (let offset = 0; offset < rows.length; offset += 1) {
    const candidate = rows[(startIndex + offset) % rows.length];
    if (candidate.rowId !== selectedRowId && predicate(candidate)) {
      return candidate;
    }
  }

  return undefined;
}
