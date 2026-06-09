import { readFileSync } from "node:fs";
import * as path from "node:path";
import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { parseBookcubeXlsxAdapter } from "./bookcubeXlsxAdapter";
import type { FileAdapterContext } from "./types";

const baseContext: FileAdapterContext = {
  batchId: "batch-bookcube-xlsx",
  company: "raon",
  platform: "bookcube",
  saleMonth: "2026-05",
  sourceFileName: "북큐브 상세매출 2026-5~2026-5 (1).xlsx",
  fileKind: "xlsx",
};

function readSampleWorkbook(): Uint8Array {
  return readFileSync(
    path.resolve(
      process.cwd(),
      "tmp/platform-samples/bookcube/북큐브 상세매출 2026-5~2026-5 (1).xlsx",
    ),
  );
}

function createWorkbookWithoutRequiredHeader(): Uint8Array {
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet([
    ["정산액 합계", "2,100"],
    ["제목", "저자", "출판권자", "판매액"],
    ["테스트 제목 1", "테스트 저자", "B cafe", 3000],
  ]);
  XLSX.utils.book_append_sheet(workbook, sheet, "Sheet1");
  return XLSX.write(workbook, { type: "array", bookType: "xlsx" }) as Uint8Array;
}

describe("bookcube xlsx adapter", () => {
  it("reads the audited workbook, skips the summary row, and uses row 2 as the header", () => {
    const result = parseBookcubeXlsxAdapter(baseContext, readSampleWorkbook());

    expect(result.issues).toEqual([]);
    expect(result.rows).toHaveLength(5);
    expect(result.rows[0]).toEqual(
      expect.objectContaining({
        제목: "짝사랑을 끝냈더니 소꿉친구들이 나에게 집착한다 1",
        저자: "봄날의복길이",
        출판권자: "B cafe",
        판매액: 3000,
        정산액: 2100,
        sourceFileName: "북큐브 상세매출 2026-5~2026-5 (1).xlsx",
        sourceRowIndex: 3,
      }),
    );
  });

  it("returns parse_error when a contracted header is missing", () => {
    const result = parseBookcubeXlsxAdapter(baseContext, createWorkbookWithoutRequiredHeader());

    expect(result.rows).toEqual([]);
    expect(result.issues).toEqual([
      expect.objectContaining({
        issueType: "parse_error",
        message: expect.stringContaining("정산액"),
      }),
    ]);
  });
});
