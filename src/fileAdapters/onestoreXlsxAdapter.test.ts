import { readFileSync } from "node:fs";
import * as path from "node:path";
import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { parseOnestoreXlsxAdapter } from "./onestoreXlsxAdapter";
import type { FileAdapterContext } from "./types";

const baseContext: FileAdapterContext = {
  batchId: "batch-onestore-xlsx",
  company: "raon",
  platform: "onestore",
  saleMonth: "2026-06",
  sourceFileName: "정산내역_20260608_163327.xlsx",
  fileKind: "xlsx",
};

function readSampleWorkbook(): Uint8Array {
  return readFileSync(
    path.resolve(
      process.cwd(),
      "tmp/platform-samples/onestore/정산내역_20260608_163327.xlsx",
    ),
  );
}

function createWorkbookWithoutRequiredHeader(): Uint8Array {
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet([
    ["상품명", "출판사", "글작가", "합계"],
    ["", "", "", ""],
    ["레이드 커맨더 4권", "Arete", "산호초", 3200],
  ]);
  XLSX.utils.book_append_sheet(workbook, sheet, "multimedia");
  return XLSX.write(workbook, { type: "array", bookType: "xlsx" }) as Uint8Array;
}

describe("onestore xlsx adapter", () => {
  it("reads the audited workbook and flattens the two-row merged header structure", () => {
    const result = parseOnestoreXlsxAdapter(baseContext, readSampleWorkbook());

    expect(result.issues).toEqual([]);
    expect(result.rows).toHaveLength(13209);
    expect(result.rows[0]).toEqual(
      expect.objectContaining({
        상품명: "레이드 커맨더 4권",
        출판사: "Arete",
        글작가: "산호초",
        "판매 / 금액": 3200,
        합계: 3200,
        정산지급액: 2016,
        sourceFileName: "정산내역_20260608_163327.xlsx",
        sourceRowIndex: 3,
      }),
    );
  });

  it("returns missing_column when a contracted header is missing", () => {
    const result = parseOnestoreXlsxAdapter(baseContext, createWorkbookWithoutRequiredHeader());

    expect(result.rows).toEqual([]);
    expect(result.issues).toEqual([
      expect.objectContaining({
        issueType: "missing_column",
        message: expect.stringContaining("정산지급액"),
      }),
    ]);
  });
});
