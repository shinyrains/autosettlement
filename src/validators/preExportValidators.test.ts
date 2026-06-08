import { describe, expect, it } from "vitest";
import type { BatchParseOrchestratorResult } from "../orchestrators/batchParseOrchestrator";
import type { SettlementRow } from "../types/settlement";
import {
  validateBatchParseResult,
  validateSettlementRow,
  validateSettlementRows,
} from "./preExportValidators";

const validRow: SettlementRow = {
  rowId: "row-valid",
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
};

describe("pre-export validators", () => {
  it("returns no issue for a valid SettlementRow", () => {
    expect(validateSettlementRow(validRow)).toEqual([]);
  });

  it("returns missing_field issues for required text fields", () => {
    const row = {
      ...validRow,
      workTitle: " ",
      mailerContentTitle: "",
      author: "",
      saleMonth: "",
    };

    const issues = validateSettlementRow(row);

    expect(issues).toEqual([
      expect.objectContaining({ issueType: "missing_field", message: expect.stringContaining("workTitle") }),
      expect.objectContaining({ issueType: "missing_field", message: expect.stringContaining("mailerContentTitle") }),
      expect.objectContaining({ issueType: "missing_field", message: expect.stringContaining("author") }),
      expect.objectContaining({ issueType: "missing_field", message: expect.stringContaining("saleMonth") }),
    ]);
  });

  it("returns invalid_value issues for invalid company and platform", () => {
    const row = {
      ...validRow,
      company: "unknown-company",
      platform: "",
    } as unknown as SettlementRow;

    const issues = validateSettlementRow(row);

    expect(issues).toEqual([
      expect.objectContaining({ issueType: "invalid_value", message: expect.stringContaining("company") }),
      expect.objectContaining({ issueType: "invalid_value", message: expect.stringContaining("platform") }),
    ]);
  });

  it("returns invalid_value issues for NaN and negative money values", () => {
    const row = {
      ...validRow,
      grossSales: Number.NaN,
      settlementAmount: -1,
    };

    const issues = validateSettlementRow(row);

    expect(issues).toEqual([
      expect.objectContaining({ issueType: "invalid_value", message: expect.stringContaining("grossSales") }),
      expect.objectContaining({ issueType: "invalid_value", message: expect.stringContaining("settlementAmount") }),
    ]);
  });

  it("returns source tracking issues when sourceFileName or sourceRowIndex is missing", () => {
    const row = {
      ...validRow,
      sourceFileName: "",
      sourceRowIndex: 0,
    };

    const issues = validateSettlementRow(row);

    expect(issues).toEqual([
      expect.objectContaining({ issueType: "missing_field", message: expect.stringContaining("sourceFileName") }),
      expect.objectContaining({ issueType: "invalid_value", message: expect.stringContaining("sourceRowIndex") }),
    ]);
  });

  it("merges issues from multiple rows", () => {
    const issues = validateSettlementRows([
      validRow,
      { ...validRow, rowId: "row-missing-author", author: "" },
      { ...validRow, rowId: "row-invalid-money", settlementAmount: Number.NaN },
    ]);

    expect(issues).toEqual([
      expect.objectContaining({ rowId: "row-missing-author", issueType: "missing_field" }),
      expect.objectContaining({ rowId: "row-invalid-money", issueType: "invalid_value" }),
    ]);
  });

  it("validates rows inside a BatchParseOrchestratorResult", () => {
    const result: BatchParseOrchestratorResult = {
      rows: [validRow, { ...validRow, rowId: "row-missing-title", mailerContentTitle: "" }],
      issues: [],
      fileResults: [],
    };

    expect(validateBatchParseResult(result)).toEqual([
      expect.objectContaining({
        rowId: "row-missing-title",
        issueType: "missing_field",
        message: expect.stringContaining("mailerContentTitle"),
      }),
    ]);
  });
});
