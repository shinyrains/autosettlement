import type {
  BatchStatus,
  Company,
  ParseIssue,
  ParseIssueSeverity,
  ParseIssueType,
  Platform,
  ReviewDecision,
  ReviewDecisionStatus,
  SettlementRow,
} from "../types/settlement";
import type {
  BatchParseFileResult,
  BatchParseOrchestratorResult,
} from "../orchestrators/batchParseOrchestrator";
import type { ExportBuildResult } from "../exporters";

export type CompanySummary = {
  company: Company;
  rowCount: number;
  issueCount: number;
  grossSales: number;
  settlementAmount: number;
};

export type PlatformSummary = {
  platform: Platform;
  rowCount: number;
  issueCount: number;
  grossSales: number;
  settlementAmount: number;
};

export type BatchSummary = {
  totalRows: number;
  totalIssues: number;
  totalGrossSales: number;
  totalSettlementAmount: number;
  byCompany: Partial<Record<Company, CompanySummary>>;
};

export type IssueSummary = {
  bySeverity: Partial<Record<ParseIssueSeverity, number>>;
  byIssueType: Partial<Record<ParseIssueType, number>>;
};

export type ReviewCompanyFilter = Company | "all";
export type ReviewPlatformFilter = Platform | "all";
export type ReviewIssueFilter = "all" | "with_issues";
export type ReviewStatusFilter = "all" | "pending" | "held" | "confirmed";
export type ReviewSortMode = "source" | "settlement_desc" | "title";

export type ReviewFilterState = {
  company: ReviewCompanyFilter;
  platform: ReviewPlatformFilter;
  issueMode: ReviewIssueFilter;
  reviewStatus: ReviewStatusFilter;
  searchQuery: string;
  sortMode: ReviewSortMode;
};

export type ReviewOverview = {
  totalRows: number;
  totalIssues: number;
  rowsWithIssues: number;
  companyCount: number;
  platformCount: number;
  confirmedRowCount: number;
};

export type ReviewActionQueueItem = {
  count: number;
  nextRow?: SettlementRow;
  rowIds: string[];
  notePreview?: string;
};

export type ReviewHoldReasonGroup = {
  note: string;
  count: number;
  nextRow?: SettlementRow;
  rowIds: string[];
  representativeSourceLabel?: string;
};

export type ReviewActionQueue = {
  held: ReviewActionQueueItem;
  holdReasonGroups: ReviewHoldReasonGroup[];
  activePending: ReviewActionQueueItem;
  confirmed: ReviewActionQueueItem;
  pendingIssue: ReviewActionQueueItem;
  highValuePending: ReviewActionQueueItem;
  pending: ReviewActionQueueItem;
};

export type ReviewExportBlocker = "missing_rows" | "unresolved_issues" | "review_incomplete" | "export_validation";

export type ReviewExportStage = "reviewing" | "export_validation" | "ready_for_export";

export type ReviewExportReadiness = {
  batchStatus: Extract<BatchStatus, "reviewing" | "ready_for_export">;
  exportStatus: "blocked" | "ready";
  confirmedRowCount: number;
  pendingReviewCount: number;
  unresolvedIssueCount: number;
  readyExportCount: number;
  blockers: ReviewExportBlocker[];
};

export const defaultReviewFilterState: ReviewFilterState = {
  company: "all",
  platform: "all",
  issueMode: "all",
  reviewStatus: "all",
  searchQuery: "",
  sortMode: "source",
};

const companyOrder: Company[] = ["raon", "sr"];

export function getBatchSummary(result: BatchParseOrchestratorResult): BatchSummary {
  const summary: BatchSummary = {
    totalRows: result.rows.length,
    totalIssues: result.issues.length,
    totalGrossSales: 0,
    totalSettlementAmount: 0,
    byCompany: {},
  };

  result.rows.forEach((row) => {
    summary.totalGrossSales += row.grossSales;
    summary.totalSettlementAmount += row.settlementAmount;

    const companySummary = getOrCreateCompanySummary(summary.byCompany, row.company);
    companySummary.rowCount += 1;
    companySummary.grossSales += row.grossSales;
    companySummary.settlementAmount += row.settlementAmount;
  });

  result.issues.forEach((issue) => {
    getOrCreateCompanySummary(summary.byCompany, issue.company).issueCount += 1;
  });

  return summary;
}

export function getIssueSummary(result: BatchParseOrchestratorResult): IssueSummary {
  return result.issues.reduce<IssueSummary>(
    (summary, issue) => {
      summary.bySeverity[issue.severity] = (summary.bySeverity[issue.severity] ?? 0) + 1;
      summary.byIssueType[issue.issueType] = (summary.byIssueType[issue.issueType] ?? 0) + 1;
      return summary;
    },
    {
      bySeverity: {},
      byIssueType: {},
    },
  );
}

export function getPlatformSummary(
  result: BatchParseOrchestratorResult,
): Partial<Record<Platform, PlatformSummary>> {
  const summary: Partial<Record<Platform, PlatformSummary>> = {};

  result.rows.forEach((row) => {
    const platformSummary = getOrCreatePlatformSummary(summary, row.platform);
    platformSummary.rowCount += 1;
    platformSummary.grossSales += row.grossSales;
    platformSummary.settlementAmount += row.settlementAmount;
  });

  result.issues.forEach((issue) => {
    getOrCreatePlatformSummary(summary, issue.platform).issueCount += 1;
  });

  return summary;
}

export function getRowsByCompany(result: BatchParseOrchestratorResult, company: Company) {
  return result.rows.filter((row) => row.company === company);
}

export function getIssuesByFile(result: BatchParseOrchestratorResult, fileName: string) {
  return result.issues.filter((issue) => issue.sourceFileName === fileName);
}

export function getFailedFiles(result: BatchParseOrchestratorResult): BatchParseFileResult[] {
  return result.fileResults.filter((fileResult) => fileResult.status === "failed");
}

export function getAvailableCompanies(rows: SettlementRow[], issues: ParseIssue[] = []): Company[] {
  const companySet = new Set<Company>();
  rows.forEach((row) => companySet.add(row.company));
  issues.forEach((issue) => companySet.add(issue.company));
  return companyOrder.filter((company) => companySet.has(company));
}

export function getAvailablePlatforms(rows: SettlementRow[], issues: ParseIssue[] = []): Platform[] {
  const orderedPlatforms: Platform[] = [];
  const seen = new Set<Platform>();

  for (const platform of [...rows.map((row) => row.platform), ...issues.map((issue) => issue.platform)]) {
    if (seen.has(platform)) {
      continue;
    }
    seen.add(platform);
    orderedPlatforms.push(platform);
  }

  return orderedPlatforms;
}

export function getFilteredReviewRows(
  rows: SettlementRow[],
  filters: ReviewFilterState,
  reviewDecisions: ReviewDecision[] = [],
): SettlementRow[] {
  const normalizedQuery = filters.searchQuery.trim().toLocaleLowerCase("ko-KR");

  const filteredRows = rows.filter((row) => {
    if (filters.company !== "all" && row.company !== filters.company) {
      return false;
    }
    if (filters.platform !== "all" && row.platform !== filters.platform) {
      return false;
    }
    if (filters.issueMode === "with_issues" && row.issues.length === 0) {
      return false;
    }
    if (filters.reviewStatus !== "all" && getReviewDecisionStatus(reviewDecisions, row.rowId) !== filters.reviewStatus) {
      return false;
    }
    if (normalizedQuery.length > 0) {
      const haystack = [row.workTitle, row.mailerContentTitle, row.author, row.publisher ?? ""]
        .join(" ")
        .toLocaleLowerCase("ko-KR");
      if (!haystack.includes(normalizedQuery)) {
        return false;
      }
    }
    return true;
  });

  return sortReviewRows(filteredRows, filters.sortMode);
}

export function getSelectedReviewRow(rows: SettlementRow[], selectedRowId: string): SettlementRow | undefined {
  return rows.find((row) => row.rowId === selectedRowId) ?? rows[0];
}

export function getReviewDecisionStatus(
  reviewDecisions: ReviewDecision[],
  rowId: string | undefined,
): ReviewDecisionStatus {
  if (!rowId) {
    return "pending";
  }

  return reviewDecisions.find((decision) => decision.rowId === rowId)?.status ?? "pending";
}

export function getReviewActionQueue(rows: SettlementRow[], reviewDecisions: ReviewDecision[] = []): ReviewActionQueue {
  const reviewDecisionByRowId = new Map(reviewDecisions.map((decision) => [decision.rowId, decision]));
  const pendingRows = rows.filter((row) => getReviewDecisionStatus(reviewDecisions, row.rowId) !== "confirmed");
  const activePendingRows = rows.filter((row) => getReviewDecisionStatus(reviewDecisions, row.rowId) === "pending");
  const confirmedRows = rows.filter((row) => getReviewDecisionStatus(reviewDecisions, row.rowId) === "confirmed");
  const heldRows = rows.filter((row) => getReviewDecisionStatus(reviewDecisions, row.rowId) === "held");
  const holdReasonGroups = getHoldReasonGroups(heldRows, reviewDecisionByRowId);
  const pendingIssueRows = pendingRows.filter((row) => row.issues.length > 0);
  const highValuePendingRows = [...pendingRows].sort((left, right) => {
    if (right.settlementAmount !== left.settlementAmount) {
      return right.settlementAmount - left.settlementAmount;
    }
    return left.rowId.localeCompare(right.rowId, "ko-KR");
  });

  return {
    held: {
      count: heldRows.length,
      nextRow: heldRows[0],
      rowIds: heldRows.map((row) => row.rowId),
      notePreview: heldRows[0] ? reviewDecisionByRowId.get(heldRows[0].rowId)?.note : undefined,
    },
    holdReasonGroups,
    activePending: {
      count: activePendingRows.length,
      nextRow: activePendingRows[0],
      rowIds: activePendingRows.map((row) => row.rowId),
    },
    confirmed: {
      count: confirmedRows.length,
      nextRow: confirmedRows[0],
      rowIds: confirmedRows.map((row) => row.rowId),
    },
    pendingIssue: {
      count: pendingIssueRows.length,
      nextRow: pendingIssueRows[0],
      rowIds: pendingIssueRows.map((row) => row.rowId),
    },
    highValuePending: {
      count: highValuePendingRows.length,
      nextRow: highValuePendingRows[0],
      rowIds: highValuePendingRows.map((row) => row.rowId),
    },
    pending: {
      count: pendingRows.length,
      nextRow: pendingRows[0],
      rowIds: pendingRows.map((row) => row.rowId),
    },
  };
}

export function getConfirmedReviewRowCount(rows: SettlementRow[], reviewDecisions: ReviewDecision[]): number {
  const confirmedRowIds = new Set(
    reviewDecisions
      .filter((decision) => decision.status === "confirmed")
      .map((decision) => decision.rowId),
  );

  return rows.filter((row) => confirmedRowIds.has(row.rowId)).length;
}

export function getReviewOverview(rows: SettlementRow[], issues: ParseIssue[], reviewDecisions: ReviewDecision[] = []): ReviewOverview {
  return {
    totalRows: rows.length,
    totalIssues: issues.length,
    rowsWithIssues: rows.filter((row) => row.issues.length > 0).length,
    companyCount: getAvailableCompanies(rows, issues).length,
    platformCount: getAvailablePlatforms(rows, issues).length,
    confirmedRowCount: getConfirmedReviewRowCount(rows, reviewDecisions),
  };
}

export function getReviewExportReadiness(
  rows: SettlementRow[],
  issues: ParseIssue[],
  reviewDecisions: ReviewDecision[],
  exportResult: ExportBuildResult,
): ReviewExportReadiness {
  const confirmedRowCount = getConfirmedReviewRowCount(rows, reviewDecisions);
  const pendingReviewCount = Math.max(rows.length - confirmedRowCount, 0);
  const unresolvedIssueCount = issues.length;
  const blockers: ReviewExportBlocker[] = [];

  if (rows.length === 0) {
    blockers.push("missing_rows");
  }
  if (unresolvedIssueCount > 0) {
    blockers.push("unresolved_issues");
  }
  if (rows.length > 0 && pendingReviewCount > 0) {
    blockers.push("review_incomplete");
  }
  if (exportResult.status === "blocked") {
    blockers.push("export_validation");
  }

  const exportStatus = blockers.length === 0 ? "ready" : "blocked";

  return {
    batchStatus: exportStatus === "ready" ? "ready_for_export" : "reviewing",
    exportStatus,
    confirmedRowCount,
    pendingReviewCount,
    unresolvedIssueCount,
    readyExportCount: exportStatus === "ready" ? exportResult.packages.length : 0,
    blockers,
  };
}

export function getReviewExportStage(readiness: ReviewExportReadiness): ReviewExportStage {
  if (
    readiness.blockers.includes("export_validation")
    && !readiness.blockers.some((blocker) => blocker === "missing_rows" || blocker === "unresolved_issues" || blocker === "review_incomplete")
  ) {
    return "export_validation";
  }

  return readiness.batchStatus === "ready_for_export" ? "ready_for_export" : "reviewing";
}

function getHoldReasonGroups(
  heldRows: SettlementRow[],
  reviewDecisionByRowId: Map<string, ReviewDecision>,
): ReviewHoldReasonGroup[] {
  const groupsByNote = new Map<string, SettlementRow[]>();

  heldRows.forEach((row) => {
    const note = reviewDecisionByRowId.get(row.rowId)?.note?.trim() || "사유 없음";
    const groupRows = groupsByNote.get(note) ?? [];
    groupRows.push(row);
    groupsByNote.set(note, groupRows);
  });

  return Array.from(groupsByNote.entries())
    .map(([note, groupRows]) => ({
      note,
      count: groupRows.length,
      nextRow: groupRows[0],
      rowIds: groupRows.map((row) => row.rowId),
      representativeSourceLabel: formatRepresentativeSourceLabel(groupRows[0]),
    }))
    .sort((left, right) => {
      if (right.count !== left.count) {
        return right.count - left.count;
      }
      return left.note.localeCompare(right.note, "ko-KR");
    });
}

function formatRepresentativeSourceLabel(row: SettlementRow | undefined): string | undefined {
  if (!row?.sourceFileName) {
    return undefined;
  }

  return row.sourceRowIndex != null
    ? `${row.sourceFileName} · 원본 ${row.sourceRowIndex}행`
    : row.sourceFileName;
}

function sortReviewRows(rows: SettlementRow[], sortMode: ReviewSortMode): SettlementRow[] {
  const sortedRows = [...rows];

  switch (sortMode) {
    case "settlement_desc":
      sortedRows.sort((left, right) => {
        if (right.settlementAmount !== left.settlementAmount) {
          return right.settlementAmount - left.settlementAmount;
        }
        return left.rowId.localeCompare(right.rowId, "ko-KR");
      });
      break;
    case "title":
      sortedRows.sort((left, right) => {
        const titleOrder = left.mailerContentTitle.localeCompare(right.mailerContentTitle, "ko-KR");
        if (titleOrder !== 0) {
          return titleOrder;
        }
        return left.rowId.localeCompare(right.rowId, "ko-KR");
      });
      break;
    case "source":
    default:
      break;
  }

  return sortedRows;
}

function getOrCreateCompanySummary(
  summaries: Partial<Record<Company, CompanySummary>>,
  company: Company,
): CompanySummary {
  summaries[company] ??= {
    company,
    rowCount: 0,
    issueCount: 0,
    grossSales: 0,
    settlementAmount: 0,
  };

  return summaries[company]!;
}

function getOrCreatePlatformSummary(
  summaries: Partial<Record<Platform, PlatformSummary>>,
  platform: Platform,
): PlatformSummary {
  summaries[platform] ??= {
    platform,
    rowCount: 0,
    issueCount: 0,
    grossSales: 0,
    settlementAmount: 0,
  };

  return summaries[platform]!;
}
