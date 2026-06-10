import type {
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
export type ReviewSortMode = "source" | "settlement_desc" | "title";

export type ReviewFilterState = {
  company: ReviewCompanyFilter;
  platform: ReviewPlatformFilter;
  issueMode: ReviewIssueFilter;
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

export const defaultReviewFilterState: ReviewFilterState = {
  company: "all",
  platform: "all",
  issueMode: "all",
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

export function getConfirmedReviewRowCount(rows: SettlementRow[], reviewDecisions: ReviewDecision[]): number {
  const rowIds = new Set(rows.map((row) => row.rowId));
  return reviewDecisions.filter((decision) => decision.status === "confirmed" && rowIds.has(decision.rowId)).length;
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
