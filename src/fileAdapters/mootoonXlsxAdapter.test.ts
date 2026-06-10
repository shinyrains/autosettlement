import { readFileSync } from "node:fs";
import * as path from "node:path";
import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { parseMootoonXlsxAdapter } from "./mootoonXlsxAdapter";
import type { FileAdapterContext } from "./types";

const baseContext: FileAdapterContext = {
  batchId: "batch-mootoon-xlsx",
  company: "raon",
  platform: "mootoon",
  saleMonth: "2026-05",
  sourceFileName: "라온이엔엠[2026-05]__소설__작품별내역__무툰.xlsx",
  fileKind: "xlsx",
};

function readSampleWorkbook(): Uint8Array {
  return readFileSync(
    path.resolve(
      process.cwd(),
      "tmp/platform-samples/mootoon/라온이엔엠[2026-05]__소설__작품별내역__무툰.xlsx",
    ),
  );
}

function createWorkbookWithoutRequiredHeader(): Uint8Array {
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet([
    ["작품정보", "", "", "", "", "정산총액", ""],
    ["NO", "구분", "작가", "장르", "타이틀", "정산총액", ""],
    ["", "", "", "", "", "계산금액", ""],
    ["SUM"],
    [],
    [1, "소설", "손연우", "무협", "강호돌파(江湖突破)", "4,500", "3,150"],
  ]);
  XLSX.utils.book_append_sheet(workbook, sheet, "Sheet1");
  return XLSX.write(workbook, { type: "array", bookType: "xlsx" }) as Uint8Array;
}

describe("mootoon xlsx adapter", () => {
  it("reads the audited workbook, flattens the 3-row header, and skips summary rows", () => {
    const result = parseMootoonXlsxAdapter(baseContext, readSampleWorkbook());

    expect(result.issues).toEqual([]);
    expect(result.rows).toHaveLength(194);
    expect(result.rows[0]).toEqual(
      expect.objectContaining({
        작가: "손연우",
        타이틀: "강호돌파(江湖突破)",
        "정산총액 / 계산금액": "4,500",
        "정산총액 / 정산금액": "3,150",
        sourceFileName: "라온이엔엠[2026-05]__소설__작품별내역__무툰.xlsx",
        sourceRowIndex: 6,
      }),
    );
  });

  it("returns missing_column when a contracted header is missing", () => {
    const result = parseMootoonXlsxAdapter(baseContext, createWorkbookWithoutRequiredHeader());

    expect(result.rows).toEqual([]);
    expect(result.issues).toEqual([
      expect.objectContaining({
        issueType: "missing_column",
        message: expect.stringContaining("정산총액 / 정산금액"),
      }),
    ]);
  });
});
