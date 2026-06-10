import { readFileSync } from "node:fs";
import * as path from "node:path";
import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { parseKyoboXlsxAdapter } from "./kyoboXlsxAdapter";
import type { FileAdapterContext } from "./types";

const baseContext: FileAdapterContext = {
  batchId: "batch-kyobo-xlsx",
  company: "sr",
  platform: "kyobo",
  saleMonth: "2026-05",
  sourceFileName: "정산내역조회.xlsx",
  fileKind: "xlsx",
};

function readSampleWorkbook(): Uint8Array {
  return readFileSync(
    path.resolve(
      process.cwd(),
      "tmp/platform-samples/kyobo/정산내역조회.xlsx",
    ),
  );
}

function createWorkbookWithoutRequiredHeader(): Uint8Array {
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet([
    ["정산내역조회"],
    ["판매기간", "상품명", "저자", "출판사", "정산대상판매가총액"],
    ["합계"],
    ["2026-05", "테스트 제목", "테스트 저자", "Arete", 900],
  ]);
  XLSX.utils.book_append_sheet(workbook, sheet, "Sheet1");
  return XLSX.write(workbook, { type: "array", bookType: "xlsx" }) as Uint8Array;
}

describe("kyobo xlsx adapter", () => {
  it("reads the audited workbook, skips title/summary rows, and uses row 2 as the header", () => {
    const result = parseKyoboXlsxAdapter(baseContext, readSampleWorkbook());

    expect(result.issues).toEqual([]);
    expect(result.rows).toHaveLength(46);
    expect(result.rows[0]).toEqual(
      expect.objectContaining({
        판매기간: "2026-05",
        상품명: "1챕터의 고인물. 6",
        저자: "산호초",
        출판사: "Arete",
        정산대상판매가총액: 900,
        정산액: 450,
        sourceFileName: "정산내역조회.xlsx",
        sourceRowIndex: 4,
      }),
    );
  });

  it("returns parse_error when a contracted header is missing", () => {
    const result = parseKyoboXlsxAdapter(baseContext, createWorkbookWithoutRequiredHeader());

    expect(result.rows).toEqual([]);
    expect(result.issues).toEqual([
      expect.objectContaining({
        issueType: "parse_error",
        message: expect.stringContaining("정산액"),
      }),
    ]);
  });
});
