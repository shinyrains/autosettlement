import { platformLabels } from "../data/mockSettlement";
import { createExportPackages } from "../exporters";
import { getReviewExportReadiness, getReviewExportStage } from "../selectors";
import type { AppDraftState } from "../state/appState";
import type { BatchPlatformUploadStatus, Company, ParseIssueSeverity, ReviewDecisionStatus } from "../types/settlement";

export type BatchSummaryStatus = "uploading" | "review_needed" | "export_validation" | "ready_for_export" | "completed";

export const statusLabels: Record<BatchSummaryStatus, string> = {
  uploading: "업로드 중",
  review_needed: "검수 필요",
  export_validation: "출력 검증 필요",
  ready_for_export: "출력 가능",
  completed: "완료",
};

export const statusClasses: Record<BatchSummaryStatus, string> = {
  uploading: "border-sky-400/30 bg-sky-500/10 text-sky-200",
  review_needed: "border-amber/40 bg-amber/10 text-amber",
  export_validation: "border-violet-400/30 bg-violet-500/10 text-violet-200",
  ready_for_export: "border-emerald-400/30 bg-emerald-500/10 text-emerald-200",
  completed: "border-violet-400/30 bg-violet-500/10 text-violet-200",
};

export const issueSeverityPriority: Record<ParseIssueSeverity, number> = {
  error: 0,
  warning: 1,
  info: 2,
};

const reviewDecisionStatusLabels: Record<ReviewDecisionStatus, string> = {
  pending: "미확정",
  held: "보류",
  confirmed: "확정",
};

export type LatestUploadChange = {
  uploadedAt: string;
  companyLabel: string;
  platformLabel: string;
  slotLabel?: string;
  fileName?: string;
};

export type UploadStatusCounts = Record<"complete" | "warning" | "error" | "empty", number>;

export type CompanyProgressSummary = {
  company: Company;
  rowCount: number;
  issueCount: number;
  confirmedRowCount: number;
};

export type CompanyOutputReadinessSummary = {
  company: Company;
  reviewStatusLabel: string;
  mailerStatusLabel: string;
};

export type IssueSeverityCounts = Record<ParseIssueSeverity, number>;

export function getUploadStatusCounts(draftState: AppDraftState): UploadStatusCounts {
  return draftState.uploads
    .flatMap((upload) => [upload.status, ...(upload.slots ?? []).map((slot) => slot.status)])
    .reduce<UploadStatusCounts>(
      (counts, status) => {
        counts[getUploadStatusBucket(status)] += 1;
        return counts;
      },
      { complete: 0, warning: 0, error: 0, empty: 0 },
    );
}

export function getUploadStatusBucket(status: BatchPlatformUploadStatus): keyof UploadStatusCounts {
  if (status === "parsed" || status === "uploaded") {
    return "complete";
  }
  if (status === "warning") {
    return "warning";
  }
  if (status === "error") {
    return "error";
  }
  return "empty";
}

export function formatUploadStatusCounts(counts: UploadStatusCounts): string {
  return `업로드 상태: 완료 ${counts.complete}개 · 경고 ${counts.warning}개 · 오류 ${counts.error}개 · 대기 ${counts.empty}개`;
}

export function getCompanyProgressSummaries(draftState: AppDraftState): CompanyProgressSummary[] {
  const confirmedRowIds = new Set(
    draftState.reviewDecisions
      .filter((decision) => decision.status === "confirmed")
      .map((decision) => decision.rowId),
  );

  return (["raon", "sr"] as const).map((company) => {
    const companyRows = draftState.rows.filter((row) => row.company === company);
    return {
      company,
      rowCount: companyRows.length,
      issueCount: draftState.issues.filter((issue) => issue.company === company).length,
      confirmedRowCount: companyRows.filter((row) => confirmedRowIds.has(row.rowId)).length,
    };
  });
}

export function formatCompanyProgressSummary(summary: CompanyProgressSummary): string {
  return `${platformCompanyLabel(summary.company)}: 정산 ${summary.rowCount}행 · 이슈 ${summary.issueCount}건 · 검수 확정 ${summary.confirmedRowCount}행`;
}

export function getCompanyOutputReadinessSummaries(
  exportResult: ReturnType<typeof createExportPackages>,
  readiness: ReturnType<typeof getReviewExportReadiness>,
): CompanyOutputReadinessSummary[] {
  const readyPackagesByCompany = new Map(
    readiness.exportStatus === "ready"
      ? exportResult.packages.map((item) => [`${item.company}:${item.artifactType}`, item] as const)
      : [],
  );

  return (["raon", "sr"] as const).map((company) => ({
    company,
    reviewStatusLabel: readyPackagesByCompany.has(`${company}:review_excel`) ? "준비" : "대기",
    mailerStatusLabel: readyPackagesByCompany.has(`${company}:mailer_excel`) ? "준비" : "대기",
  }));
}

export function formatCompanyOutputReadinessSummary(summary: CompanyOutputReadinessSummary): string {
  return `${platformCompanyLabel(summary.company)}: 정산_통합검수용 ${summary.reviewStatusLabel} · 메일러_발송용 ${summary.mailerStatusLabel}`;
}

export function formatBatchHistoryTimestamp(timestamp?: string): string {
  if (!timestamp) {
    return "기록 없음";
  }

  const [datePart, timePart = ""] = timestamp.split("T");
  const timeWithoutSeconds = timePart.slice(0, 5);
  return timeWithoutSeconds ? `${datePart} ${timeWithoutSeconds}` : datePart;
}

export function getIssueSeverityCounts(draftState: AppDraftState): IssueSeverityCounts {
  return draftState.issues.reduce<IssueSeverityCounts>((counts, issue) => {
    counts[issue.severity] += 1;
    return counts;
  }, { error: 0, warning: 0, info: 0 });
}

export function formatIssueSeverityCounts(counts: IssueSeverityCounts): string {
  return `차단 이슈 우선순위: 오류 ${counts.error}건 · 경고 ${counts.warning}건 · 정보 ${counts.info}건`;
}

export function getNextReviewCandidateLabel(draftState: AppDraftState): string | undefined {
  const reviewedRowIds = new Set(
    draftState.reviewDecisions
      .filter((decision) => decision.status === "confirmed")
      .map((decision) => decision.rowId),
  );
  const nextRow = draftState.rows.find((row) => !reviewedRowIds.has(row.rowId));
  if (!nextRow) {
    return undefined;
  }
  return [
    nextRow.mailerContentTitle,
    platformLabels[nextRow.platform],
    nextRow.sourceRowIndex != null ? `원본 ${nextRow.sourceRowIndex}행` : undefined,
  ].filter((part): part is string => Boolean(part)).join(" · ");
}

export function formatLatestChangeSummary(latestUploadTimestamp?: string, latestReviewTimestamp?: string): string {
  return `최근 변경 요약: 업로드 ${formatBatchHistoryTimestamp(latestUploadTimestamp)} · 검수 ${formatBatchHistoryTimestamp(latestReviewTimestamp)}`;
}

export function getLatestReviewDecisionSummary(draftState: AppDraftState): string {
  const latestDecision = getLatestReviewDecision(draftState);

  if (!latestDecision) {
    return "기록 없음";
  }

  return `${reviewDecisionStatusLabels[latestDecision.status]} · ${formatBatchHistoryTimestamp(latestDecision.updatedAt)}`;
}

export function getLatestReviewDecisionDetail(draftState: AppDraftState): string {
  const latestDecision = getLatestReviewDecision(draftState);
  if (!latestDecision) {
    return "기록 없음";
  }
  const row = draftState.rows.find((item) => item.rowId === latestDecision.rowId);
  return [
    row?.workTitle ?? latestDecision.rowId,
    reviewDecisionStatusLabels[latestDecision.status],
    latestDecision.note,
  ]
    .filter((part): part is string => Boolean(part))
    .join(" · ");
}

export function getLatestReviewDecision(draftState: AppDraftState): AppDraftState["reviewDecisions"][number] | undefined {
  return draftState.reviewDecisions
    .slice()
    .sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt))[0];
}

export function getLastItem<T>(items: T[]): T | undefined {
  return items.length > 0 ? items[items.length - 1] : undefined;
}

export function getLatestUploadChange(draftState: AppDraftState): LatestUploadChange | undefined {
  const changes: LatestUploadChange[] = draftState.uploads.flatMap((upload) => {
    const uploadChange: LatestUploadChange[] = upload.lastUploadedAt
      ? [{
          uploadedAt: upload.lastUploadedAt,
          companyLabel: upload.sharedCompanies?.length ? "공유" : platformCompanyLabel(upload.company),
          platformLabel: upload.platformLabel,
          fileName: getLastItem(upload.sourceFileNames),
        }]
      : [];

    const slotChanges: LatestUploadChange[] = (upload.slots ?? []).flatMap((slot) => (
      slot.lastUploadedAt
        ? [{
            uploadedAt: slot.lastUploadedAt,
            companyLabel: upload.sharedCompanies?.length ? "공유" : platformCompanyLabel(upload.company),
            platformLabel: upload.platformLabel,
            slotLabel: slot.label,
            fileName: getLastItem(slot.sourceFileNames),
          }]
        : []
    ));

    return [...uploadChange, ...slotChanges];
  });

  return changes.sort((left, right) => {
    const timeDifference = Date.parse(right.uploadedAt) - Date.parse(left.uploadedAt);
    if (timeDifference !== 0) {
      return timeDifference;
    }
    return Number(Boolean(right.slotLabel)) - Number(Boolean(left.slotLabel));
  })[0];
}

export function platformCompanyLabel(company: AppDraftState["uploads"][number]["company"]): string {
  return company === "raon" ? "라온이앤엠" : "에스알이앤엠";
}

export function formatLatestUploadChange(change?: LatestUploadChange): string {
  if (!change) {
    return "기록 없음";
  }
  return [change.companyLabel, change.platformLabel, change.slotLabel, change.fileName]
    .filter((part): part is string => Boolean(part))
    .join(" · ");
}

export function getLatestUploadTimestamp(draftState: AppDraftState): string | undefined {
  return draftState.uploads
    .flatMap((upload) => [upload.lastUploadedAt, ...(upload.slots ?? []).map((slot) => slot.lastUploadedAt)])
    .filter((timestamp): timestamp is string => Boolean(timestamp))
    .sort((left, right) => Date.parse(right) - Date.parse(left))[0];
}

export function getRequiredSlotFileCounts(upload: AppDraftState["uploads"][number]): Map<string, number> {
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

export function getMissingRequiredUploadCount(draftState: AppDraftState): number {
  return draftState.uploads.reduce((sum, upload) => {
    if (upload.slots?.length) {
      const requiredSlotFileCounts = getRequiredSlotFileCounts(upload);
      return sum + upload.slots
        .filter((slot) => slot.required)
        .reduce((slotSum, slot) => slotSum + Math.max((requiredSlotFileCounts.get(slot.slotId) ?? 1) - slot.fileCount, 0), 0);
    }
    return sum + Math.max(upload.requiredFileCount - upload.fileCount, 0);
  }, 0);
}

export function getMissingRequiredUploadDetails(draftState: AppDraftState): string[] {
  return draftState.uploads.flatMap((upload) => {
    if (upload.slots?.length) {
      const requiredSlotFileCounts = getRequiredSlotFileCounts(upload);
      return upload.slots
        .filter((slot) => slot.required)
        .map((slot) => ({ slot, missing: Math.max((requiredSlotFileCounts.get(slot.slotId) ?? 1) - slot.fileCount, 0) }))
        .filter(({ missing }) => missing > 0)
        .map(({ slot, missing }) => `필수 슬롯 누락: ${platformCompanyLabel(upload.company)} · ${upload.platformLabel} · ${slot.label} 중 ${missing}개`);
    }

    const missing = Math.max(upload.requiredFileCount - upload.fileCount, 0);
    return missing > 0
      ? [`필수 업로드 누락: ${platformCompanyLabel(upload.company)} · ${upload.platformLabel} ${missing}개`]
      : [];
  });
}

export function getNextBatchAction({
  missingRequiredFiles,
  readiness,
}: {
  missingRequiredFiles: number;
  readiness: ReturnType<typeof getReviewExportReadiness>;
}): string {
  if (missingRequiredFiles > 0) {
    return `필수 파일 ${missingRequiredFiles}개 추가 업로드 필요`;
  }
  if (readiness.unresolvedIssueCount > 0) {
    return `이슈 ${readiness.unresolvedIssueCount}건 확인 필요`;
  }
  if (readiness.pendingReviewCount > 0) {
    return `검수 미확정 ${readiness.pendingReviewCount}건 처리 필요`;
  }
  if (getReviewExportStage(readiness) === "export_validation") {
    return "출력 검증 blocker 확인 필요";
  }
  return "회사별 출력 파일 다운로드 가능";
}

export function getBatchCtaHint({
  missingRequiredFiles,
  readiness,
}: {
  missingRequiredFiles: number;
  readiness: ReturnType<typeof getReviewExportReadiness>;
}): string {
  if (missingRequiredFiles > 0) {
    return `CTA 안내: 업로드 단계로 이동해 필수 파일 ${missingRequiredFiles}개 처리`;
  }
  if (readiness.unresolvedIssueCount > 0) {
    return `CTA 안내: 이슈 패널에서 미해결 이슈 ${readiness.unresolvedIssueCount}건 확인`;
  }
  if (readiness.pendingReviewCount > 0) {
    return `CTA 안내: 검수 단계에서 미확정 ${readiness.pendingReviewCount}건 처리`;
  }
  if (getReviewExportStage(readiness) === "export_validation") {
    return "CTA 안내: 출력 단계에서 검증 blocker 확인";
  }
  return "CTA 안내: 출력 단계에서 회사별 파일 다운로드";
}

export function getBatchBlockerSummary(readiness: ReturnType<typeof getReviewExportReadiness>): string {
  return `주요 blocker: 이슈 ${readiness.unresolvedIssueCount}건 / 검수 미확정 ${readiness.pendingReviewCount}건`;
}

export function getPrimaryIssueLabel(issue: AppDraftState["issues"][number]): string {
  const sourceParts = [
    platformLabels[issue.platform],
    issue.sourceRowIndex != null ? `원본 ${issue.sourceRowIndex}행` : undefined,
  ].filter((part): part is string => Boolean(part));

  return sourceParts.length > 0
    ? `${issue.message} · ${sourceParts.join(" · ")}`
    : issue.message;
}

export function getBatchBlockerDetails({
  missingRequiredFiles,
  draftState,
  readiness,
}: {
  missingRequiredFiles: number;
  draftState: AppDraftState;
  readiness: ReturnType<typeof getReviewExportReadiness>;
}): string[] {
  const details: string[] = [];
  if (missingRequiredFiles > 0) {
    details.push(`업로드 누락: 필수 파일 ${missingRequiredFiles}개`);
    details.push(...getMissingRequiredUploadDetails(draftState));
  }
  const primaryIssue = draftState.issues
    .slice()
    .sort((left, right) => issueSeverityPriority[left.severity] - issueSeverityPriority[right.severity])[0];

  if (primaryIssue) {
    details.push(`최우선 이슈: ${getPrimaryIssueLabel(primaryIssue)}`);
  }
  if (readiness.pendingReviewCount > 0) {
    details.push(`검수 대기: ${readiness.pendingReviewCount}/${draftState.rows.length}행`);
  }
  if (details.length === 0) {
    details.push("현재 운영 blocker 없음");
  }
  return details;
}

export function getBatchSummaryStatus({
  uploadedFiles,
  requiredFiles,
  exportStage,
}: {
  uploadedFiles: number;
  requiredFiles: number;
  exportStage: "reviewing" | "export_validation" | "ready_for_export";
}): BatchSummaryStatus {
  if (uploadedFiles < requiredFiles) {
    return "uploading";
  }
  if (exportStage === "ready_for_export") {
    return "ready_for_export";
  }
  if (exportStage === "export_validation") {
    return "export_validation";
  }
  return "review_needed";
}
