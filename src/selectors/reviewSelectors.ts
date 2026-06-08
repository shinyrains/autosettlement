import type {
  Company,
  ParseIssueSeverity,
  ParseIssueType,
  Platform,
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

  return summaries[company];
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

  return summaries[platform];
}
