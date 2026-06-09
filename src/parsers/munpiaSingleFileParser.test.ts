import { describe, expect, it } from "vitest";
import {
  MUNPIA_AUTHOR_CORRECTION_COLUMNS,
  MUNPIA_REQUIRED_COLUMNS,
} from "./munpiaCalcConstants";
import type { ParserContext, TabularRow } from "./parserContract";
import { parseMunpiaSingleFileRows } from "./munpiaSingleFileParser";

const context: ParserContext = {
  batchId: "batch-munpia-single",
  company: "sr",
  platform: "munpia",
  saleMonth: "2026-05",
  sourceFileName: "아레떼북스.xlsx",
};

function munpiaRow(overrides: Partial<TabularRow> = {}): TabularRow {
  return {
    번호: 1,
    [MUNPIA_REQUIRED_COLUMNS.correction[0]]: "485076",
    [MUNPIA_REQUIRED_COLUMNS.identity[0]]: "Sample Author",
    [MUNPIA_REQUIRED_COLUMNS.identity[1]]: "나 혼자 히든농장",
    [MUNPIA_REQUIRED_COLUMNS.amounts[0]]: 29100,
    [MUNPIA_REQUIRED_COLUMNS.amounts[1]]: 3000,
    [MUNPIA_REQUIRED_COLUMNS.amounts[2]]: 4200,
    [MUNPIA_REQUIRED_COLUMNS.reference[0]]: 22415,
    sourceFileName: context.sourceFileName,
    sourceRowIndex: 3,
    ...overrides,
  };
}

function correctionRow(overrides: Partial<TabularRow> = {}): TabularRow {
  return {
    [MUNPIA_AUTHOR_CORRECTION_COLUMNS.workCode]: "485076",
    [MUNPIA_AUTHOR_CORRECTION_COLUMNS.workTitle]: "나 혼자 히든농장",
    [MUNPIA_AUTHOR_CORRECTION_COLUMNS.author]: "Corrected Author",
    sourceFileName: "munpia-author-correction.csv",
    sourceRowIndex: 2,
    ...overrides,
  };
}

describe("munpia single file parser", () => {
  it("maps one normal source row into web and app SettlementRows", () => {
    const result = parseMunpiaSingleFileRows(context, [munpiaRow()]);

    expect(result.issues).toEqual([]);
    expect(result.rows).toHaveLength(2);
    expect(result.rows.map((row) => row.mailerContentTitle)).toEqual([
      "나 혼자 히든농장",
      "나 혼자 히든농장(app)",
    ]);
    expect(result.rows[0]).toEqual(expect.objectContaining({
      platform: "munpia",
      company: "sr",
      saleMonth: "2026-05",
      workTitle: "나 혼자 히든농장",
      author: "Sample Author",
      grossSales: 29100,
      settlementAmount: 18333,
      sourceFileName: "아레떼북스.xlsx",
      sourceRowIndex: 3,
    }));
    expect(result.rows[1]).toEqual(expect.objectContaining({
      grossSales: 7200,
      settlementAmount: 3704,
      sourceRowIndex: 3,
    }));
  });

  it("excludes Total rows before calculation", () => {
    const result = parseMunpiaSingleFileRows(context, [
      munpiaRow({ 번호: "Total", sourceRowIndex: 2 }),
      munpiaRow({ sourceRowIndex: 3 }),
    ]);

    expect(result.issues).toEqual([]);
    expect(result.rows).toHaveLength(2);
    expect(result.rows.every((row) => row.sourceRowIndex === 3)).toBe(true);
  });

  it("does not generate zero web or zero app rows", () => {
    const result = parseMunpiaSingleFileRows(context, [
      munpiaRow({ [MUNPIA_REQUIRED_COLUMNS.amounts[0]]: 0, sourceRowIndex: 4 }),
      munpiaRow({
        [MUNPIA_REQUIRED_COLUMNS.amounts[1]]: 0,
        [MUNPIA_REQUIRED_COLUMNS.amounts[2]]: 0,
        sourceRowIndex: 5,
      }),
    ]);

    expect(result.issues).toEqual([]);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]).toEqual(expect.objectContaining({
      mailerContentTitle: "나 혼자 히든농장(app)",
      sourceRowIndex: 4,
    }));
    expect(result.rows[1]).toEqual(expect.objectContaining({
      mailerContentTitle: "나 혼자 히든농장",
      sourceRowIndex: 5,
    }));
  });

  it("returns missing_column and no rows when a required column is absent", () => {
    const { [MUNPIA_REQUIRED_COLUMNS.amounts[1]]: _iosSales, ...rowWithoutIosSales } = munpiaRow();
    const result = parseMunpiaSingleFileRows(context, [rowWithoutIosSales]);

    expect(result.rows).toEqual([]);
    expect(result.issues).toEqual([
      expect.objectContaining({
        issueType: "missing_column",
        severity: "error",
        message: expect.stringContaining("IOS매출"),
      }),
    ]);
  });

  it("trims header names before required column validation", () => {
    const result = parseMunpiaSingleFileRows(context, [{
      " 번호 ": 1,
      " 작품코드 ": "485076",
      " 작가 ": "Sample Author",
      " 작품 ": "나 혼자 히든농장",
      " 총매출 ": 1000,
      " IOS매출 ": 0,
      " Google매출 ": 0,
      " 정산 ": 630,
      sourceFileName: context.sourceFileName,
      sourceRowIndex: 8,
    }]);

    expect(result.issues).toEqual([]);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toEqual(expect.objectContaining({
      grossSales: 1000,
      settlementAmount: 630,
      sourceRowIndex: 8,
    }));
  });

  it("skips rows with missing title or author identity fields", () => {
    const result = parseMunpiaSingleFileRows(context, [
      munpiaRow({ [MUNPIA_REQUIRED_COLUMNS.identity[0]]: "", sourceRowIndex: 6 }),
      munpiaRow({ [MUNPIA_REQUIRED_COLUMNS.identity[1]]: "", sourceRowIndex: 7 }),
    ]);

    expect(result.rows).toEqual([]);
    expect(result.issues).toEqual([
      expect.objectContaining({ issueType: "missing_field", sourceRowIndex: 6 }),
      expect.objectContaining({ issueType: "missing_field", sourceRowIndex: 7 }),
    ]);
  });

  it("skips rows with invalid numeric amount fields", () => {
    const result = parseMunpiaSingleFileRows(context, [
      munpiaRow({ [MUNPIA_REQUIRED_COLUMNS.amounts[0]]: "not-a-number", sourceRowIndex: 11 }),
    ]);

    expect(result.rows).toEqual([]);
    expect(result.issues).toEqual([
      expect.objectContaining({
        issueType: "invalid_value",
        severity: "error",
        message: expect.stringContaining("총매출"),
        sourceRowIndex: 11,
      }),
    ]);
  });

  it("applies AreteBooks author correction before settlement mapping", () => {
    const result = parseMunpiaSingleFileRows(
      context,
      [munpiaRow({ [MUNPIA_REQUIRED_COLUMNS.identity[0]]: "AreteBooks" })],
      { authorCorrectionRows: [correctionRow()] },
    );

    expect(result.issues).toEqual([]);
    expect(result.rows).toHaveLength(2);
    expect(result.rows.every((row) => row.author === "Corrected Author")).toBe(true);
  });

  it("skips only the affected row when required author correction is missing", () => {
    const result = parseMunpiaSingleFileRows(context, [
      munpiaRow({ [MUNPIA_REQUIRED_COLUMNS.identity[0]]: "AreteBooks", sourceRowIndex: 9 }),
      munpiaRow({ [MUNPIA_REQUIRED_COLUMNS.identity[0]]: "Normal Author", sourceRowIndex: 10 }),
    ]);

    expect(result.rows).toHaveLength(2);
    expect(result.rows.every((row) => row.sourceRowIndex === 10)).toBe(true);
    expect(result.issues).toEqual([
      expect.objectContaining({
        issueType: "mapping_failed",
        severity: "error",
        sourceFileName: "아레떼북스.xlsx",
        sourceRowIndex: 9,
      }),
    ]);
  });

  it("reports author correction mismatch on the affected source row", () => {
    const result = parseMunpiaSingleFileRows(
      context,
      [munpiaRow({ [MUNPIA_REQUIRED_COLUMNS.identity[0]]: "AreteBooks", sourceRowIndex: 12 })],
      { authorCorrectionRows: [correctionRow({
        [MUNPIA_AUTHOR_CORRECTION_COLUMNS.workCode]: "404",
        [MUNPIA_AUTHOR_CORRECTION_COLUMNS.workTitle]: "Other Work",
        sourceFileName: "munpia-author-correction.csv",
        sourceRowIndex: 4,
      })] },
    );

    expect(result.rows).toEqual([]);
    expect(result.issues).toEqual([
      expect.objectContaining({
        issueType: "mapping_failed",
        sourceFileName: "아레떼북스.xlsx",
        sourceRowIndex: 12,
      }),
    ]);
  });
});
