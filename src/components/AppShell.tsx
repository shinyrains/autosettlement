import { useMemo } from "react";
import { createExportPackages } from "../exporters";
import { usePersistedAppState } from "../state/appState";
import { BatchHeader } from "./BatchHeader";
import { ExportSection } from "./ExportSection";
import { ReviewSection } from "./ReviewSection";
import { SidebarNav } from "./SidebarNav";
import { StatusSection } from "./StatusSection";
import { UploadSection } from "./UploadSection";
import { WorkflowStrip } from "./WorkflowStrip";

export function AppShell() {
  const { state, setSelectedRowId, resetState } = usePersistedAppState();
  const selectedRow = state.rows.find((row) => row.rowId === state.selectedRowId) ?? state.rows[0];
  const selectedRowIssues = selectedRow
    ? state.issues.filter((issue) => selectedRow.issues.includes(issue.issueId))
    : [];
  const exportPackages = useMemo(() => createExportPackages(state.rows).packages, [state.rows]);

  const totals = useMemo(() => {
    const uploadedFiles = state.uploads.reduce((sum, upload) => sum + upload.fileCount, 0);
    const requiredFiles = state.uploads.reduce((sum, upload) => sum + upload.requiredFileCount, 0);
    return {
      uploadedFiles,
      requiredFiles,
      rows: state.rows.length,
      readyExports: exportPackages.length,
    };
  }, [exportPackages.length, state.rows.length, state.uploads]);

  return (
    <main className="min-h-screen bg-ink-950 text-slate-100">
      <div className="grid min-h-screen grid-cols-[260px_minmax(0,1fr)]">
        <SidebarNav />
        <section className="min-w-0">
          <BatchHeader
            batch={state.batch}
            issueCount={state.issues.length}
            onResetState={resetState}
            readyExports={totals.readyExports}
            requiredFiles={totals.requiredFiles}
            rowsCount={totals.rows}
            uploadedFiles={totals.uploadedFiles}
          />
          <div className="mx-auto flex max-w-[1660px] flex-col gap-6 px-8 py-6">
            <WorkflowStrip />
            <UploadSection uploads={state.uploads} />
            <StatusSection issues={state.issues} rows={totals.rows} />
            {selectedRow ? (
              <ReviewSection
                rows={state.rows}
                selectedRow={selectedRow}
                selectedRowIssues={selectedRowIssues}
                selectedRowId={state.selectedRowId}
                onSelectRow={setSelectedRowId}
              />
            ) : null}
            <ExportSection exportPackages={exportPackages} readyExports={totals.readyExports} />
          </div>
        </section>
      </div>
    </main>
  );
}
