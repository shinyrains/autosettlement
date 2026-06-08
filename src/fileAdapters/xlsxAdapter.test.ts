import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { parseXlsxAdapter } from "./xlsxAdapter";
import type { FileAdapterContext } from "./types";

const baseContext: FileAdapterContext = {
  batchId: "batch-xlsx",
  company: "sr",
  platform: "kyobo",
  saleMonth: "2026-06",
  sourceFileName: "kyobo-sample.xlsx",
  fileKind: "xlsx",
};

function createWorkbookBuffer(sheets: Array<{ name: string; rows: unknown[][] }>): ArrayBuffer {
  const workbook = XLSX.utils.book_new();

  sheets.forEach((sheet) => {
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(sheet.rows), sheet.name);
  });

  return XLSX.write(workbook, { bookType: "xlsx", type: "array" }) as ArrayBuffer;
}

describe("xlsx file adapter", () => {
  it("converts a normal XLSX first sheet into TabularFileRow objects", () => {
    const file = createWorkbookBuffer([
      {
        name: "정산",
        rows: [["상품명", "저자", "정산액"], ["검은 별의 서점", "한도윤", 7368]],
      },
    ]);

    const result = parseXlsxAdapter(baseContext, file);

    expect(result.issues).toEqual([]);
    expect(result.rows).toEqual([
      {
        상품명: "검은 별의 서점",
        저자: "한도윤",
        정산액: 7368,
        sourceFileName: "kyobo-sample.xlsx",
        sourceRowIndex: 2,
      },
    ]);
  });

  it("reads only the first sheet", () => {
    const file = createWorkbookBuffer([
      { name: "첫시트", rows: [["상품명"], ["첫 번째"]] },
      { name: "두번째시트", rows: [["상품명"], ["두 번째"]] },
    ]);

    const result = parseXlsxAdapter(baseContext, file);

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].상품명).toBe("첫 번째");
  });

  it("excludes empty rows while preserving source row indexes", () => {
    const file = createWorkbookBuffer([
      {
        name: "정산",
        rows: [["상품명", "저자"], ["검은 별의 서점", "한도윤"], [], ["푸른 달", "서하린"]],
      },
    ]);

    const result = parseXlsxAdapter(baseContext, file);

    expect(result.rows).toEqual([
      expect.objectContaining({ 상품명: "검은 별의 서점", sourceRowIndex: 2 }),
      expect.objectContaining({ 상품명: "푸른 달", sourceRowIndex: 4 }),
    ]);
  });

  it("returns parse_error for an empty sheet", () => {
    const file = createWorkbookBuffer([{ name: "빈시트", rows: [] }]);

    const result = parseXlsxAdapter(baseContext, file);

    expect(result.rows).toEqual([]);
    expect(result.issues).toEqual([
      expect.objectContaining({
        issueType: "parse_error",
        severity: "error",
        sourceFileName: "kyobo-sample.xlsx",
        message: expect.stringContaining("empty"),
      }),
    ]);
  });

  it("returns parse_error when the header row is missing", () => {
    const file = createWorkbookBuffer([{ name: "정산", rows: [["", ""], ["값", 100]] }]);

    const result = parseXlsxAdapter(baseContext, file);

    expect(result.rows).toEqual([]);
    expect(result.issues).toEqual([
      expect.objectContaining({
        issueType: "parse_error",
        message: expect.stringContaining("header"),
      }),
    ]);
  });

  it("preserves number and string values for platform parsers", () => {
    const file = createWorkbookBuffer([
      { name: "정산", rows: [["상품명", "정산액"], ["검은 별의 서점", 7368]] },
    ]);

    const result = parseXlsxAdapter(baseContext, file);

    expect(result.rows[0].상품명).toBe("검은 별의 서점");
    expect(result.rows[0].정산액).toBe(7368);
  });

  it("keeps Korean column names exactly as headers", () => {
    const file = createWorkbookBuffer([
      { name: "정산", rows: [["도서명", "저자명", "출판사"], ["바람의 기록", "김서윤", "라온"]] },
    ]);

    const result = parseXlsxAdapter(baseContext, file);

    expect(Object.keys(result.rows[0])).toEqual([
      "도서명",
      "저자명",
      "출판사",
      "sourceFileName",
      "sourceRowIndex",
    ]);
  });
});
