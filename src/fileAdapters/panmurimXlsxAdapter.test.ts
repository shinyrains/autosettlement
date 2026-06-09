import { readFileSync } from "node:fs";
import * as path from "node:path";
import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { parsePanmurimXlsxAdapter } from "./panmurimXlsxAdapter";
import type { FileAdapterContext } from "./types";

const baseContext: FileAdapterContext = {
  batchId: "batch-panmurim-xlsx",
  company: "raon",
  platform: "panmurim",
  saleMonth: "2026-05",
  sourceFileName: "（주）라온이앤엠_2026년 5월.xlsx",
  fileKind: "xlsx",
};

function readSampleWorkbook(): Uint8Array {
  return readFileSync(
    path.resolve(
      process.cwd(),
      "tmp/platform-samples/panmurim/（주）라온이앤엠_2026년 5월.xlsx",
    ),
  );
}

function createWorkbookWithoutCoverRate(): Uint8Array {
  const workbook = XLSX.utils.book_new();
  const cover = XLSX.utils.aoa_to_sheet([["정산월", "2026년 5월"]]);
  const detail = XLSX.utils.aoa_to_sheet([
    [],
    [],
    ["", "", "", "", "카테고리", "", "", "", "", "", "", "소장", "", "", "대여", "", "", "정액제", "유료대여권", "", "", ""],
    ["", "NO", "시리즈 코드", "각 권 코드", "대분류", "중분류", "작품 제목", "회차 제목", "저자", "CP", "출판사", "웹판매건수", "앱판매건수", "판매금액", "웹판매건수", "앱판매건수", "판매금액", "이용건수", "이용건수", "판매금액", "포인트 사용", "판매금액"],
    ["", 1, 2765347, 2765349, "단행본", "현대 판타지", "그의 비밀", "그의 비밀 2권", "시커먼스", "（주）라온이앤엠", "라온E&M", 1, 0, 3200, 0, 0, 0, 0, 0, 0, 0, 3200],
  ]);
  XLSX.utils.book_append_sheet(workbook, cover, "표지");
  XLSX.utils.book_append_sheet(workbook, detail, "세부내역");
  return XLSX.write(workbook, { type: "array", bookType: "xlsx" }) as Uint8Array;
}

describe("panmurim xlsx adapter", () => {
  it("reads the audited workbook and injects the normalized cover-sheet settlement rate", () => {
    const result = parsePanmurimXlsxAdapter(baseContext, readSampleWorkbook());

    expect(result.issues).toEqual([]);
    expect(result.rows).toHaveLength(354);
    expect(result.rows[0]).toEqual(
      expect.objectContaining({
        "작품 제목": "그의 비밀",
        "회차 제목": "그의 비밀 2권",
        저자: "시커먼스",
        출판사: "라온E&M",
        "소장 / 판매금액": 3200,
        "합계 총액 / 판매금액": 3200,
        "표지 / 정산비율": 0.7,
        sourceFileName: "（주）라온이앤엠_2026년 5월.xlsx",
        sourceRowIndex: 5,
      }),
    );
  });

  it("returns parse_error when the cover-sheet settlement rate is missing", () => {
    const result = parsePanmurimXlsxAdapter(baseContext, createWorkbookWithoutCoverRate());

    expect(result.rows).toEqual([]);
    expect(result.issues).toEqual([
      expect.objectContaining({
        issueType: "parse_error",
        message: expect.stringContaining("settlement rate is missing"),
      }),
    ]);
  });
});
