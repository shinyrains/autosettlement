import { describe, expect, it } from "vitest";
import type { TabularRow } from "./parserContract";
import {
  RIDIBOOKS_REQUIRED_COLUMNS,
} from "./ridibooksCalcConstants";
import {
  calculateRidibooksBaseFilePair,
  type RidibooksRowCalculation,
} from "./ridibooksRowCalcUtils";

function makeBaseRow(overrides: Partial<TabularRow> = {}): TabularRow {
  const [bookId, title, author, publisher] = RIDIBOOKS_REQUIRED_COLUMNS.base.identity;
  const [
    normalSales,
    normalCancel,
    appTargetAmount,
    appFee,
    appCancelAmount,
    settlementAmount,
  ] = RIDIBOOKS_REQUIRED_COLUMNS.base.amounts;

  return {
    [bookId]: "RIDI-001",
    [title]: "Sample Work",
    [author]: "Sample Author",
    [publisher]: "Sample Publisher",
    [normalSales]: "1,000",
    [normalCancel]: "-100",
    [appTargetAmount]: "500",
    [appFee]: "150",
    [appCancelAmount]: "-50",
    [settlementAmount]: "999",
    sourceFileName: "calculate_1.csv",
    sourceRowIndex: 2,
    ...overrides,
  };
}

function makeFile1Row(overrides: Partial<TabularRow> = {}): TabularRow {
  const [bookId, title] = RIDIBOOKS_REQUIRED_COLUMNS.file1.identity;
  const [normalSales, normalCancel, settlementAmount] = RIDIBOOKS_REQUIRED_COLUMNS.file1.amounts;

  return {
    [bookId]: "RIDI-001",
    [title]: "Sample Work",
    [normalSales]: "200",
    [normalCancel]: "-20",
    [settlementAmount]: "30",
    sourceFileName: "calculate_1 (1).csv",
    sourceRowIndex: 2,
    ...overrides,
  };
}

function byKind(result: RidibooksRowCalculation, kind: "normal" | "app") {
  const item = result.outputRows.find((row) => row.kind === kind);
  if (!item) {
    throw new Error(`Missing Ridibooks calculation output for ${kind}`);
  }
  return item;
}

describe("ridibooks row calc utils", () => {
  it("calculates normal and app rows from a base/file_1 row pair", () => {
    const result = calculateRidibooksBaseFilePair(makeBaseRow(), makeFile1Row());

    expect(byKind(result, "normal")).toEqual({
      kind: "normal",
      grossSales: 720,
      settlementAmount: 534,
      sourceRefs: [
        { sourceFileName: "calculate_1.csv", sourceRowIndex: 2 },
        { sourceFileName: "calculate_1 (1).csv", sourceRowIndex: 2 },
      ],
    });
    expect(byKind(result, "app")).toEqual({
      kind: "app",
      grossSales: 550,
      settlementAmount: 280,
      sourceRefs: [{ sourceFileName: "calculate_1.csv", sourceRowIndex: 2 }],
    });
  });

  it("treats a missing file_1 row as zero adjustment for row-level calculation", () => {
    const result = calculateRidibooksBaseFilePair(makeBaseRow());

    expect(byKind(result, "normal")).toEqual(
      expect.objectContaining({
        grossSales: 900,
        settlementAmount: 630,
      }),
    );
  });

  it("keeps signed values and does not convert cancellations to absolute values", () => {
    const result = calculateRidibooksBaseFilePair(
      makeBaseRow({
        [RIDIBOOKS_REQUIRED_COLUMNS.base.amounts[1]]: "-300",
      }),
      makeFile1Row({
        [RIDIBOOKS_REQUIRED_COLUMNS.file1.amounts[1]]: "-100",
      }),
    );

    expect(byKind(result, "normal")).toEqual(
      expect.objectContaining({
        grossSales: 600,
        settlementAmount: 450,
      }),
    );
  });

  it("parses blank and invalid amount cells as zero for calculation utilities", () => {
    const result = calculateRidibooksBaseFilePair(
      makeBaseRow({
        [RIDIBOOKS_REQUIRED_COLUMNS.base.amounts[0]]: "",
        [RIDIBOOKS_REQUIRED_COLUMNS.base.amounts[2]]: "not-a-number",
      }),
    );

    expect(byKind(result, "normal").grossSales).toBe(-100);
    expect(byKind(result, "app").grossSales).toBe(50);
  });
});
