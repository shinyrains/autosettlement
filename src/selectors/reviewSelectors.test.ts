import { describe, expect, it } from "vitest";
import type { ExportBuildResult } from "../exporters";
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
  getReviewActionQueue,
  getReviewExportReadiness,
  getReviewExportStage,
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

const readyExportResult: ExportBuildResult = {
  packages: [
    { company: "raon", artifactType: "review_excel", fileName: "raon-review.xlsx", rowCount: 1, workbookBuffer: new ArrayBuffer(0) },
    { company: "raon", artifactType: "mailer_excel", fileName: "raon-mailer.xlsx", rowCount: 1, workbookBuffer: new ArrayBuffer(0) },
    { company: "sr", artifactType: "review_excel", fileName: "sr-review.xlsx", rowCount: 2, workbookBuffer: new ArrayBuffer(0) },
    { company: "sr", artifactType: "mailer_excel", fileName: "sr-mailer.xlsx", rowCount: 2, workbookBuffer: new ArrayBuffer(0) },
  ],
  issues: [],
  status: "ready",
};

const blockedExportResult: ExportBuildResult = {
  packages: [],
  issues: [issues[0]],
  status: "blocked",
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

  it("filters review rows by company, platform, issue mode, and search query", () => {
    expect(getFilteredReviewRows(rows, { ...defaultReviewFilterState, company: "sr" })).toEqual([rows[1], rows[2]]);
    expect(getFilteredReviewRows(rows, { ...defaultReviewFilterState, platform: "guru_company" })).toEqual([rows[0]]);
    expect(getFilteredReviewRows(rows, { ...defaultReviewFilterState, issueMode: "with_issues" })).toEqual([rows[2]]);
    expect(getFilteredReviewRows(rows, { ...defaultReviewFilterState, reviewStatus: "confirmed" }, reviewDecisions)).toEqual([rows[1]]);
    expect(getFilteredReviewRows(rows, { ...defaultReviewFilterState, reviewStatus: "pending" }, reviewDecisions)).toEqual([rows[0], rows[2]]);
    expect(getFilteredReviewRows(rows, { ...defaultReviewFilterState, searchQuery: "바람" })).toEqual([rows[2]]);
    expect(getFilteredReviewRows(rows, { ...defaultReviewFilterState, searchQuery: "에스알" })).toEqual([rows[1], rows[2]]);
  });

  it("sorts review rows by settlement amount and title when requested", () => {
    expect(getFilteredReviewRows(rows, { ...defaultReviewFilterState, sortMode: "settlement_desc" })).toEqual([rows[2], rows[1], rows[0]]);
    expect(getFilteredReviewRows(rows, { ...defaultReviewFilterState, sortMode: "title" })).toEqual([rows[0], rows[2], rows[1]]);
  });

  it("builds a filtered review action queue for held reason groups, issue, high-value, and remaining pending rows", () => {
    const queueDecisions = [
      ...reviewDecisions,
      { rowId: "row-raon-guru", status: "held" as const, note: "출판사 확인", updatedAt: "2026-06-11T09:17:00.000Z" },
      { rowId: "row-sr-kyobo-2", status: "held" as const, note: "출판사 확인", updatedAt: "2026-06-11T09:18:00.000Z" },
    ];

    expect(getReviewActionQueue(rows, queueDecisions)).toEqual({
      held: {
        count: 2,
        nextRow: rows[0],
        rowIds: ["row-raon-guru", "row-sr-kyobo-2"],
        notePreview: "출판사 확인",
      },
      holdReasonGroups: [
        {
          note: "출판사 확인",
          count: 2,
          nextRow: rows[0],
          rowIds: ["row-raon-guru", "row-sr-kyobo-2"],
        },
      ],
      pendingIssue: {
        count: 1,
        nextRow: rows[2],
        rowIds: ["row-sr-kyobo-2"],
      },
      highValuePending: {
        count: 2,
        nextRow: rows[2],
        rowIds: ["row-sr-kyobo-2", "row-raon-guru"],
      },
      pending: {
        count: 2,
        nextRow: rows[0],
        rowIds: ["row-raon-guru", "row-sr-kyobo-2"],
      },
    });

    expect(getReviewActionQueue(rows.slice(0, 2), queueDecisions)).toEqual({
      held: {
        count: 1,
        nextRow: rows[0],
        rowIds: ["row-raon-guru"],
        notePreview: "출판사 확인",
      },
      holdReasonGroups: [
        {
          note: "출판사 확인",
          count: 1,
          nextRow: rows[0],
          rowIds: ["row-raon-guru"],
        },
      ],
      pendingIssue: {
        count: 0,
        nextRow: undefined,
        rowIds: [],
      },
      highValuePending: {
        count: 1,
        nextRow: rows[0],
        rowIds: ["row-raon-guru"],
      },
      pending: {
        count: 1,
        nextRow: rows[0],
        rowIds: ["row-raon-guru"],
      },
    });
  });

  it("returns selected row fallback, overview counts, and legacy decision helpers", () => {
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

  it("counts confirmed review rows by row occurrences when duplicate rowIds are present", () => {
    const duplicatedRows = [rows[0], rows[1], { ...rows[1] }];

    expect(getConfirmedReviewRowCount(duplicatedRows, reviewDecisions)).toBe(2);
    expect(getReviewExportReadiness(duplicatedRows, [], reviewDecisions, readyExportResult)).toEqual(expect.objectContaining({
      confirmedRowCount: 2,
      pendingReviewCount: 1,
      blockers: ["review_incomplete"],
    }));
  });

  it("derives review-to-export readiness from issues, confirmations, and exporter validation", () => {
    expect(getReviewExportReadiness(rows, issues, reviewDecisions, readyExportResult)).toEqual({
      batchStatus: "reviewing",
      exportStatus: "blocked",
      confirmedRowCount: 1,
      pendingReviewCount: 2,
      unresolvedIssueCount: 2,
      readyExportCount: 0,
      blockers: ["unresolved_issues", "review_incomplete"],
    });

    expect(getReviewExportReadiness(rows, [], reviewDecisions, readyExportResult)).toEqual({
      batchStatus: "reviewing",
      exportStatus: "blocked",
      confirmedRowCount: 1,
      pendingReviewCount: 2,
      unresolvedIssueCount: 0,
      readyExportCount: 0,
      blockers: ["review_incomplete"],
    });

    expect(getReviewExportReadiness(rows, [], [
      { rowId: "row-raon-guru", status: "confirmed", updatedAt: "2026-06-11T09:17:00.000Z" },
      { rowId: "row-sr-kyobo", status: "confirmed", updatedAt: "2026-06-11T09:18:00.000Z" },
      { rowId: "row-sr-kyobo-2", status: "confirmed", updatedAt: "2026-06-11T09:19:00.000Z" },
    ], blockedExportResult)).toEqual({
      batchStatus: "reviewing",
      exportStatus: "blocked",
      confirmedRowCount: 3,
      pendingReviewCount: 0,
      unresolvedIssueCount: 0,
      readyExportCount: 0,
      blockers: ["export_validation"],
    });
    expect(getReviewExportStage(getReviewExportReadiness(rows, [], [
      { rowId: "row-raon-guru", status: "confirmed", updatedAt: "2026-06-11T09:17:00.000Z" },
      { rowId: "row-sr-kyobo", status: "confirmed", updatedAt: "2026-06-11T09:18:00.000Z" },
      { rowId: "row-sr-kyobo-2", status: "confirmed", updatedAt: "2026-06-11T09:19:00.000Z" },
    ], blockedExportResult))).toBe("export_validation");

    expect(getReviewExportReadiness(rows, [], [
      { rowId: "row-raon-guru", status: "confirmed", updatedAt: "2026-06-11T09:17:00.000Z" },
      { rowId: "row-sr-kyobo", status: "confirmed", updatedAt: "2026-06-11T09:18:00.000Z" },
      { rowId: "row-sr-kyobo-2", status: "confirmed", updatedAt: "2026-06-11T09:19:00.000Z" },
    ], readyExportResult)).toEqual({
      batchStatus: "ready_for_export",
      exportStatus: "ready",
      confirmedRowCount: 3,
      pendingReviewCount: 0,
      unresolvedIssueCount: 0,
      readyExportCount: 4,
      blockers: [],
    });
  });
});
