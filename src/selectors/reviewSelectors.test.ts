import { describe, expect, it } from "vitest";
import type { BatchParseOrchestratorResult } from "../orchestrators/batchParseOrchestrator";
import type { ParseIssue, SettlementRow } from "../types/settlement";
import {
  getConfirmedReviewRowCount,
  getReviewDecisionStatus,
  defaultReviewFilterState,
  getAvailableCompanies,
  getAvailablePlatforms,
  getBatchSummary,
  getFailedFiles,
  getFilteredReviewRows,
  getIssueSummary,
  getIssuesByFile,
  getPlatformSummary,
  getReviewOverview,
  getRowsByCompany,
  getSelectedReviewRow,
} from "./reviewSelectors";

const reviewDecisions = [
  {
    rowId: "row-sr-kyobo",
    status: "confirmed" as const,
    updatedAt: "2026-06-11T09:15:00.000Z",
  },
  {
    rowId: "missing-row",
    status: "confirmed" as const,
    updatedAt: "2026-06-11T09:16:00.000Z",
  },
];

const rows: SettlementRow[] = [
  {
    rowId: "row-raon-guru",
    company: "raon",
    platform: "guru_company",
    saleMonth: "2026-06",
    workTitle: "검은 별의 서점",
    mailerContentTitle: "검은 별의 서점",
    author: "한도윤",
    grossSales: 18420,
    settlementAmount: 7368,
    sourceFileName: "raon-guru.csv",
    sourceRowIndex: 2,
    issues: [],
  },
  {
    rowId: "row-sr-kyobo",
    company: "sr",
    platform: "kyobo",
    saleMonth: "2026-06",
    workTitle: "푸른 달",
    mailerContentTitle: "푸른 달",
    author: "서하린",
    publisher: "에스알",
    grossSales: 25000,
    settlementAmount: 10000,
    sourceFileName: "sr-kyobo.csv",
    sourceRowIndex: 2,
    issues: [],
  },
  {
    rowId: "row-sr-kyobo-2",
    company: "sr",
    platform: "kyobo",
    saleMonth: "2026-06",
    workTitle: "바람의 기록",
    mailerContentTitle: "바람의 기록",
    author: "김서윤",
    publisher: "에스알",
    grossSales: 33000,
    settlementAmount: 13200,
    sourceFileName: "sr-kyobo.csv",
    sourceRowIndex: 3,
    issues: ["issue-warning"],
  },
];

const issues: ParseIssue[] = [
  {
    issueId: "issue-warning",
    batchId: "batch-review",
    company: "sr",
    platform: "kyobo",
    severity: "warning",
    issueType: "missing_column",
    message: "publisher column was missing in one source row.",
    sourceFileName: "sr-kyobo.csv",
    sourceRowIndex: 3,
    rowId: "row-sr-kyobo-2",
  },
  {
    issueId: "issue-error",
    batchId: "batch-review",
    company: "raon",
    platform: "series",
    severity: "error",
    issueType: "mapping_failed",
    message: "Parser is not implemented.",
    sourceFileName: "series.csv",
  },
];

const result: BatchParseOrchestratorResult = {
  rows,
  issues,
  fileResults: [
    {
      fileName: "raon-guru.csv",
      company: "raon",
      platform: "guru_company",
      fileKind: "csv",
      saleMonth: "2026-06",
      status: "success",
      rowCount: 1,
      issueCount: 0,
    },
    {
      fileName: "sr-kyobo.csv",
      company: "sr",
      platform: "kyobo",
      fileKind: "csv",
      saleMonth: "2026-06",
      status: "failed",
      rowCount: 2,
      issueCount: 1,
    },
    {
      fileName: "series.csv",
      company: "raon",
      platform: "series",
      fileKind: "csv",
      saleMonth: "2026-06",
      status: "failed",
      rowCount: 0,
      issueCount: 1,
    },
  ],
};

describe("review selectors", () => {
  it("summarizes raon and sr rows, amounts, and issues", () => {
    const summary = getBatchSummary(result);

    expect(summary).toEqual({
      totalRows: 3,
      totalIssues: 2,
      totalGrossSales: 76420,
      totalSettlementAmount: 30568,
      byCompany: {
        raon: {
          company: "raon",
          rowCount: 1,
          issueCount: 1,
          grossSales: 18420,
          settlementAmount: 7368,
        },
        sr: {
          company: "sr",
          rowCount: 2,
          issueCount: 1,
          grossSales: 58000,
          settlementAmount: 23200,
        },
      },
    });
  });

  it("summarizes issue severity and type counts", () => {
    expect(getIssueSummary(result)).toEqual({
      bySeverity: {
        warning: 1,
        error: 1,
      },
      byIssueType: {
        missing_column: 1,
        mapping_failed: 1,
      },
    });
  });

  it("summarizes platform rows, amounts, and issues", () => {
    expect(getPlatformSummary(result)).toEqual({
      guru_company: {
        platform: "guru_company",
        rowCount: 1,
        issueCount: 0,
        grossSales: 18420,
        settlementAmount: 7368,
      },
      kyobo: {
        platform: "kyobo",
        rowCount: 2,
        issueCount: 1,
        grossSales: 58000,
        settlementAmount: 23200,
      },
      series: {
        platform: "series",
        rowCount: 0,
        issueCount: 1,
        grossSales: 0,
        settlementAmount: 0,
      },
    });
  });

  it("filters rows by company", () => {
    expect(getRowsByCompany(result, "sr")).toEqual([rows[1], rows[2]]);
  });

  it("filters issues by file name", () => {
    expect(getIssuesByFile(result, "sr-kyobo.csv")).toEqual([issues[0]]);
  });

  it("returns failed files", () => {
    expect(getFailedFiles(result)).toEqual([result.fileResults[1], result.fileResults[2]]);
  });

  it("returns available companies and platforms from rows plus issues", () => {
    expect(getAvailableCompanies(rows, issues)).toEqual(["raon", "sr"]);
    expect(getAvailablePlatforms(rows, issues)).toEqual(["guru_company", "kyobo", "series"]);
  });

  it("filters review rows by company, platform, and issue mode", () => {
    expect(getFilteredReviewRows(rows, { ...defaultReviewFilterState, company: "sr" })).toEqual([rows[1], rows[2]]);
    expect(getFilteredReviewRows(rows, { ...defaultReviewFilterState, platform: "guru_company" })).toEqual([rows[0]]);
    expect(getFilteredReviewRows(rows, { ...defaultReviewFilterState, issueMode: "with_issues" })).toEqual([rows[2]]);
  });

  it("returns selected row fallback and overview counts", () => {
    expect(getSelectedReviewRow(rows, "row-sr-kyobo-2")).toEqual(rows[2]);
    expect(getSelectedReviewRow(rows, "missing-row")).toEqual(rows[0]);
    expect(getReviewDecisionStatus(reviewDecisions, "row-sr-kyobo")).toBe("confirmed");
    expect(getReviewDecisionStatus(reviewDecisions, "row-raon-guru")).toBe("pending");
    expect(getConfirmedReviewRowCount(rows, reviewDecisions)).toBe(1);
    expect(getReviewOverview(rows, issues, reviewDecisions)).toEqual({
      totalRows: 3,
      totalIssues: 2,
      rowsWithIssues: 1,
      companyCount: 2,
      platformCount: 3,
      confirmedRowCount: 1,
    });
  });
});
