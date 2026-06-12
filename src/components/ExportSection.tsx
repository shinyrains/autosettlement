import { CheckCircle2, Download, FileSpreadsheet } from "lucide-react";
import { companyLabels, mockSettlementRows } from "../data/mockSettlement";
import {
  createExportPackages,
  downloadExportPackage,
  type ExportBuildResult,
  type ExportPackage,
} from "../exporters";
import { getExportFileName } from "../exporters/exportFileNames";
import type { ReviewExportReadiness } from "../selectors";
import type { Company, ExportArtifactType } from "../types/settlement";
import { artifactLabels } from "./uiShellConfig";

type ExportSectionProps = {
  readiness?: ReviewExportReadiness;
  readyExports?: number;
  exportPackages?: ExportPackage[];
  exportResult?: ExportBuildResult;
  onDownloadPackage?: (exportPackage: ExportPackage) => void;
};

const plannedExportArtifacts: Array<{ company: Company; artifactType: ExportArtifactType }> = [
  { company: "raon", artifactType: "review_excel" },
  { company: "raon", artifactType: "mailer_excel" },
  { company: "sr", artifactType: "review_excel" },
  { company: "sr", artifactType: "mailer_excel" },
];

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
  const readinessSummaryLabel = isBlocked ? "대기 중" : "준비 완료";

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
      <div className="m-5 rounded-md border border-line bg-ink-800 px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-400">출력 준비 상태</p>
        <p className={isBlocked ? "mt-1 text-sm font-semibold text-amber" : "mt-1 text-sm font-semibold text-mint"}>
          {readinessSummaryLabel} · 확정 {effectiveReadiness.confirmedRowCount}행 · 대기 {effectiveReadiness.pendingReviewCount}행 · 이슈 {effectiveReadiness.unresolvedIssueCount}건 · 출력 {readyExportCountValue}종
        </p>
      </div>
      {isBlocked ? (
        <div className="m-5 space-y-4">
          <div className="rounded-md border border-amber/40 bg-amber/10 px-4 py-3 text-sm text-amber">
            <p className="font-semibold text-amber">출력 대기 상태입니다.</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {blockerMessages.map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
          </div>
          <PlannedExportList />
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
        출력 파일은 회사별 정산 검수용과 메일러 발송용으로 나뉩니다. 메일러 표시 보정, 주소록 보정, 차감 병합, 실제 발송은 후속 메일러 단계에서 처리합니다.
      </p>
    </section>
  );
}

function PlannedExportList() {
  return (
    <div className="rounded-md border border-line bg-ink-800 px-4 py-3">
      <p className="text-sm font-semibold text-slate-200">출력 예정 파일</p>
      <p className="mt-1 text-xs text-slate-500">
        현재 출력 조건이 충족되지 않아 다운로드 버튼은 숨겨져 있습니다. 검수/이슈 조건이 해제되면 아래 회사별 4개 파일이 생성됩니다.
      </p>
      <div className="mt-3 grid gap-2 md:grid-cols-2">
        {plannedExportArtifacts.map((artifact) => (
          <div
            key={`${artifact.company}-${artifact.artifactType}`}
            className="rounded-md border border-line bg-ink-950 px-3 py-2"
          >
            <p className="text-sm font-medium text-white">{getExportFileName(artifact.company, artifact.artifactType)}</p>
            <p className="mt-1 text-xs text-slate-500">
              {companyLabels[artifact.company]} · {artifactLabels[artifact.artifactType]}
            </p>
            <p className="mt-1 text-xs font-semibold text-amber">출력 조건 충족 후 다운로드 가능</p>
          </div>
        ))}
      </div>
    </div>
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
