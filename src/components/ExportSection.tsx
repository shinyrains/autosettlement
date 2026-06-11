import { CheckCircle2, Download, FileSpreadsheet } from "lucide-react";
import { companyLabels, mockSettlementRows } from "../data/mockSettlement";
import {
  createExportPackages,
  downloadExportPackage,
  type ExportBuildResult,
  type ExportPackage,
} from "../exporters";
import type { ReviewExportReadiness } from "../selectors";
import type { Company } from "../types/settlement";
import { artifactLabels } from "./uiShellConfig";

type ExportSectionProps = {
  readiness?: ReviewExportReadiness;
  readyExports?: number;
  exportPackages?: ExportPackage[];
  exportResult?: ExportBuildResult;
  onDownloadPackage?: (exportPackage: ExportPackage) => void;
};

export function ExportSection({
  readiness,
  readyExports,
  exportPackages,
  exportResult,
  onDownloadPackage = downloadExportPackage,
}: ExportSectionProps) {
  const packages =
    exportPackages ?? exportResult?.packages ?? createExportPackages(mockSettlementRows).packages;
  const effectiveReadiness = readiness ?? {
    batchStatus: "ready_for_export",
    exportStatus: exportResult?.status ?? "ready",
    confirmedRowCount: packages.reduce((sum, item) => sum + item.rowCount, 0),
    pendingReviewCount: 0,
    unresolvedIssueCount: 0,
    readyExportCount: readyExports ?? packages.length,
    blockers: (exportResult?.status ?? "ready") === "blocked" ? ["export_validation"] : [],
  };
  const isBlocked = effectiveReadiness.exportStatus === "blocked";
  const blockerMessages = getBlockerMessages(effectiveReadiness);
  const readyExportCountValue = readyExports ?? effectiveReadiness.readyExportCount;

  return (
    <section id="step-4" className="rounded-md border border-line bg-ink-850">
      <div className="flex items-center justify-between border-b border-line px-5 py-4">
        <div className="flex items-center gap-3">
          <FileSpreadsheet className="h-5 w-5 text-mint" />
          <div>
            <h2 className="text-lg font-semibold tracking-normal">회사별 출력</h2>
            <p className="mt-1 text-sm text-slate-400">검수가 끝난 뒤 회사별 2종 출력, 배치 전체 4개 파일을 다운로드합니다.</p>
          </div>
        </div>
        <span className="rounded-md border border-line px-3 py-1 font-mono text-sm text-mint">
          {readyExportCountValue}/4 준비
        </span>
      </div>
      {isBlocked ? (
        <div className="m-5 rounded-md border border-amber/40 bg-amber/10 px-4 py-3 text-sm text-amber">
          <p className="font-semibold text-amber">출력 대기 상태입니다.</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {blockerMessages.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-5 p-5">
          <CompanyExportGroup
            company="raon"
            exportPackages={packages}
            onDownloadPackage={onDownloadPackage}
          />
          <CompanyExportGroup
            company="sr"
            exportPackages={packages}
            onDownloadPackage={onDownloadPackage}
          />
        </div>
      )}
      <p className="border-t border-line px-5 py-3 text-sm text-slate-500">
        createExportPackages 결과를 브라우저 다운로드로 연결합니다. 메일러 표시 보정, 주소록 보정, 차감 병합, 발송은 기존 메일러 책임입니다.
      </p>
    </section>
  );
}

function CompanyExportGroup({
  company,
  exportPackages,
  onDownloadPackage,
}: {
  company: Company;
  exportPackages: ExportPackage[];
  onDownloadPackage: (exportPackage: ExportPackage) => void;
}) {
  const artifacts = exportPackages.filter((artifact) => artifact.company === company);

  return (
    <article className="rounded-md border border-line bg-ink-800 p-4">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-base font-semibold">{companyLabels[company]} 출력 카드</h3>
        <span className="text-xs text-slate-400">2종</span>
      </div>
      <div className="space-y-3">
        {artifacts.map((artifact) => (
          <ExportRow
            key={`${artifact.company}-${artifact.artifactType}`}
            artifact={artifact}
            onDownloadPackage={onDownloadPackage}
          />
        ))}
      </div>
    </article>
  );
}

function ExportRow({
  artifact,
  onDownloadPackage,
}: {
  artifact: ExportPackage;
  onDownloadPackage: (exportPackage: ExportPackage) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-md border border-line bg-ink-950 px-4 py-3">
      <div>
        <p className="font-medium text-white">{artifact.fileName}</p>
        <p className="mt-1 text-xs text-slate-500">
          {artifactLabels[artifact.artifactType]} · {artifact.rowCount}행
        </p>
      </div>
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-2 text-sm font-semibold text-mint">
          <CheckCircle2 className="h-4 w-4" />
          준비 완료
        </span>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-md border border-mint/40 px-3 py-1.5 text-sm font-semibold text-mint transition hover:bg-mint/10"
          onClick={() => onDownloadPackage(artifact)}
        >
          <Download className="h-4 w-4" />
          다운로드
        </button>
      </div>
    </div>
  );
}

function getBlockerMessages(readiness: ReviewExportReadiness): string[] {
  return readiness.blockers.map((blocker) => {
    switch (blocker) {
      case "missing_rows":
        return "정규화된 정산 행이 아직 없어 출력 생성으로 진행할 수 없습니다.";
      case "unresolved_issues":
        return `오류/누락/매칭 실패 ${readiness.unresolvedIssueCount}건을 먼저 확인해야 합니다.`;
      case "review_incomplete":
        return `검수 확정이 ${readiness.pendingReviewCount}행 남아 있어 출력 준비 상태로 전환되지 않았습니다.`;
      case "export_validation":
        return "출력용 필수 값 검증이 끝나지 않아 엑셀 다운로드를 생성할 수 없습니다.";
      default:
        return "출력 준비를 막는 조건을 먼저 해결해야 합니다.";
    }
  });
}
