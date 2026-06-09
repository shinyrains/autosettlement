import { describe, expect, it } from "vitest";
import type { TabularRow } from "./parserContract";
import { MUNPIA_REQUIRED_COLUMNS, MUNPIA_TOTAL_ROW_POLICY } from "./munpiaCalcConstants";
import {
  calculateMunpiaRow,
  isMunpiaTotalRow,
} from "./munpiaRowCalcUtils";

function makeMunpiaRow(overrides: Partial<TabularRow> = {}): TabularRow {
  const [author, workTitle] = MUNPIA_REQUIRED_COLUMNS.identity;
  const [webGross, iosGross, googleGross] = MUNPIA_REQUIRED_COLUMNS.amounts;
  const [settlementReference] = MUNPIA_REQUIRED_COLUMNS.reference;
  const [workCode, account] = MUNPIA_REQUIRED_COLUMNS.correction;

  return {
    [author]: "Sample Author",
    [workTitle]: "Sample Work",
    [webGross]: "1,000",
    [iosGross]: "200",
    [googleGross]: "300",
    [settlementReference]: "889",
    [workCode]: "MUN-001",
    [account]: "sample",
    sourceFileName: "아레떼북스.xlsx",
    sourceRowIndex: 3,
    ...overrides,
  };
}

describe("munpia row calculation utils", () => {
  it("calculates web and app outputs from one row", () => {
    const calculation = calculateMunpiaRow(makeMunpiaRow());

    expect(calculation.outputRows).toEqual([
      {
        kind: "web",
        grossSales: 1000,
        settlementAmount: 630,
        sourceRefs: [{ sourceFileName: "아레떼북스.xlsx", sourceRowIndex: 3 }],
      },
      {
        kind: "app",
        grossSales: 500,
        settlementAmount: 258,
        sourceRefs: [{ sourceFileName: "아레떼북스.xlsx", sourceRowIndex: 3 }],
      },
    ]);
    expect(calculation.referenceSettlementAmount).toBe(889);
  });

  it("rounds settlement amounts to nearest integer when decimal values require it", () => {
    const [webGross, iosGross, googleGross] = MUNPIA_REQUIRED_COLUMNS.amounts;

    const calculation = calculateMunpiaRow(makeMunpiaRow({
      [webGross]: "1",
      [iosGross]: "1",
      [googleGross]: "1",
    }));

    expect(calculation.outputRows).toEqual([
      expect.objectContaining({ kind: "web", grossSales: 1, settlementAmount: 1 }),
      expect.objectContaining({ kind: "app", grossSales: 2, settlementAmount: 1 }),
    ]);
  });

  it("skips zero web and app rows independently", () => {
    const [webGross, iosGross, googleGross] = MUNPIA_REQUIRED_COLUMNS.amounts;

    expect(calculateMunpiaRow(makeMunpiaRow({
      [webGross]: "0",
      [iosGross]: "200",
      [googleGross]: "0",
    })).outputRows.map((row) => row.kind)).toEqual(["app"]);

    expect(calculateMunpiaRow(makeMunpiaRow({
      [webGross]: "1,000",
      [iosGross]: "-",
      [googleGross]: "-",
    })).outputRows.map((row) => row.kind)).toEqual(["web"]);
  });

  it("parses formatted, blank, and dash numeric cells", () => {
    const [webGross, iosGross, googleGross] = MUNPIA_REQUIRED_COLUMNS.amounts;

    const calculation = calculateMunpiaRow(makeMunpiaRow({
      [webGross]: " 1,234 ",
      [iosGross]: " - ",
      [googleGross]: "",
    }));

    expect(calculation.outputRows).toEqual([
      expect.objectContaining({ kind: "web", grossSales: 1234, settlementAmount: 777 }),
    ]);
  });

  it("detects Total rows by the configured marker column", () => {
    expect(isMunpiaTotalRow({
      [MUNPIA_TOTAL_ROW_POLICY.markerColumn]: "Total",
    })).toBe(true);

    expect(isMunpiaTotalRow(makeMunpiaRow())).toBe(false);
  });
});
