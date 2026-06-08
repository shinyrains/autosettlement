import { useMemo, useState } from "react";
import {
  mockIssues,
  mockSettlementRows,
  mockUploads,
} from "../data/mockSettlement";
import { createExportPackages } from "../exporters";
import { BatchHeader } from "./BatchHeader";
import { ExportSection } from "./ExportSection";
import { ReviewSection } from "./ReviewSection";
import { SidebarNav } from "./SidebarNav";
import { StatusSection } from "./StatusSection";
import { UploadSection } from "./UploadSection";
import { WorkflowStrip } from "./WorkflowStrip";

export function AppShell() {
  const [selectedRowId, setSelectedRowId] = useState(mockSettlementRows[1].rowId);
  const selectedRow = mockSettlementRows.find((row) => row.rowId === selectedRowId) ?? mockSettlementRows[0];
  const selectedRowIssues = mockIssues.filter((issue) => selectedRow.issues.includes(issue.issueId));
  const exportPackages = useMemo(() => createExportPackages(mockSettlementRows).packages, []);

  const totals = useMemo(() => {
    const uploadedFiles = mockUploads.reduce((sum, upload) => sum + upload.fileCount, 0);
    const requiredFiles = mockUploads.reduce((sum, upload) => sum + upload.requiredFileCount, 0);
    return {
      uploadedFiles,
      requiredFiles,
      rows: mockSettlementRows.length,
      issues: mockIssues.length,
      readyExports: exportPackages.length,
    };
  }, [exportPackages.length]);

  return (
    <main className="min-h-screen bg-ink-950 text-slate-100">
      <div className="grid min-h-screen grid-cols-[260px_minmax(0,1fr)]">
        <SidebarNav />
        <section className="min-w-0">
          <BatchHeader uploadedFiles={totals.uploadedFiles} requiredFiles={totals.requiredFiles} />
          <div className="mx-auto flex max-w-[1660px] flex-col gap-6 px-8 py-6">
            <WorkflowStrip />
            <UploadSection />
            <StatusSection rows={totals.rows} issues={totals.issues} />
            <ReviewSection
              selectedRow={selectedRow}
              selectedRowIssues={selectedRowIssues}
              selectedRowId={selectedRowId}
              onSelectRow={setSelectedRowId}
            />
            <ExportSection exportPackages={exportPackages} readyExports={totals.readyExports} />
          </div>
        </section>
      </div>
    </main>
  );
}
