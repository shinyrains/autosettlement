import { useMemo, useState } from "react";
import { createExportPackages } from "../exporters";
import {
  getReviewDecisionStatus,
  defaultReviewFilterState,
  getAvailableCompanies,
  getAvailablePlatforms,
  getFilteredReviewRows,
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
  const filteredRows = useMemo(() => getFilteredReviewRows(state.rows, reviewFilters), [state.rows, reviewFilters]);
  const selectedRow = useMemo(
    () => getSelectedReviewRow(filteredRows, state.selectedRowId),
    [filteredRows, state.selectedRowId],
  );
  const selectedRowIssues = selectedRow
    ? state.issues.filter((issue) => selectedRow.issues.includes(issue.issueId))
    : [];
  const selectedRowReviewStatus = getReviewDecisionStatus(state.reviewDecisions, selectedRow?.rowId);
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
              onConfirmRow={(rowId) => setReviewDecisionStatus(rowId, "confirmed")}
              onResetRowConfirmation={(rowId) => setReviewDecisionStatus(rowId, "pending")}
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
