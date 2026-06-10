import { readFileSync } from "node:fs";
import * as path from "node:path";
import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { parseKakaoPageXlsxAdapter } from "./kakaoPageXlsxAdapter";
import type { FileAdapterContext } from "./types";

const baseContext: FileAdapterContext = {
  batchId: "batch-kakao-page-xlsx",
  company: "sr",
  platform: "kakao_page",
  saleMonth: "2026-05",
  sourceFileName: "카카오페이지 일반계약_2026-05_주식회사 에스알이앤엠_CP월정산내역.xlsx",
  fileKind: "xlsx",
};

function readSampleWorkbook(): Uint8Array {
  return readFileSync(
    path.resolve(
      process.cwd(),
      "tmp/platform-samples/kakao_page/카카오페이지 일반계약_2026-05_주식회사 에스알이앤엠_CP월정산내역.xlsx",
    ),
  );
}

function createWorkbookWithoutRequiredHeader(): Uint8Array {
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet([
    ["기초정보", "", "", "", "거래액(원화)", "", "정산금액"],
    ["특별/일반", "발행자명", "작가명", "시리즈명", "총합계-원화", "총합계-순매출", "세액"],
    ["일반", "Arete", "산호초", "둠스데이 [완결]", 2340, 2141, 0],
  ]);
  XLSX.utils.book_append_sheet(workbook, sheet, "정산리포트_카카오페이지_2026-05");
  return XLSX.write(workbook, { type: "array", bookType: "xlsx" }) as Uint8Array;
}

describe("kakao page xlsx adapter", () => {
  it("reads the audited workbook and keeps row-2 leaf headers as canonical keys", () => {
    const result = parseKakaoPageXlsxAdapter(baseContext, readSampleWorkbook());

    expect(result.issues).toEqual([]);
    expect(result.rows).toHaveLength(207);
    expect(result.rows[0]).toEqual(
      expect.objectContaining({
        시리즈명: "둠스데이 [완결]",
        작가명: "산호초",
        발행자명: "Arete",
        "총합계-원화": 2340,
        공급가액: 1499,
        sourceFileName: "카카오페이지 일반계약_2026-05_주식회사 에스알이앤엠_CP월정산내역.xlsx",
        sourceRowIndex: 3,
      }),
    );
    expect(result.rows.some((row) => Number(row["총합계-원화"]) < 0)).toBe(true);
  });

  it("returns missing_column when a contracted header is missing", () => {
    const result = parseKakaoPageXlsxAdapter(baseContext, createWorkbookWithoutRequiredHeader());

    expect(result.rows).toEqual([]);
    expect(result.issues).toEqual([
      expect.objectContaining({
        issueType: "missing_column",
        message: expect.stringContaining("공급가액"),
      }),
    ]);
  });
});
