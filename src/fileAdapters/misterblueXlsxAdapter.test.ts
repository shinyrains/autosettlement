import { readFileSync } from "node:fs";
import * as path from "node:path";
import { describe, expect, it } from "vitest";
import { parseMisterblueXlsxAdapter } from "./misterblueXlsxAdapter";
import type { FileAdapterContext } from "./types";

const baseContext: FileAdapterContext = {
  batchId: "batch-misterblue-xlsx",
  company: "raon",
  platform: "misterblue",
  saleMonth: "2026-04",
  sourceFileName: "작품별정산_2026-04-01_2026-04-30.xlsx",
  fileKind: "xlsx",
};

function readSampleWorkbook(): Uint8Array {
  return readFileSync(
    path.resolve(
      process.cwd(),
      "tmp/platform-samples/misterblue/작품별정산_2026-04-01_2026-04-30.xlsx",
    ),
  );
}

describe("misterblue xlsx adapter", () => {
  it("reads the 작품별 sheet and flattens the 4-row header hierarchy", () => {
    const result = parseMisterblueXlsxAdapter(baseContext, readSampleWorkbook());

    expect(result.issues).toEqual([]);
    expect(result.rows[0]).toEqual(
      expect.objectContaining({
        작품코드: "raon0115",
        작품명: "[개정판] 창천마혼 [단행본]",
        작가명: "초(류희윤)",
        "종량 / 블루머니 / 권별 소장 / 매출액": 35000,
        "합계(정액+종량) / 정산액": 22050,
        sourceFileName: "작품별정산_2026-04-01_2026-04-30.xlsx",
        sourceRowIndex: 6,
      }),
    );
  });

  it("does not read the 볼륨별 sheet as data rows", () => {
    const result = parseMisterblueXlsxAdapter(baseContext, readSampleWorkbook());

    expect(result.issues).toEqual([]);
    expect(Object.keys(result.rows[0])).not.toContain("볼륨No.");
    expect(result.rows[0]).not.toHaveProperty("판매 형태");
  });
});
