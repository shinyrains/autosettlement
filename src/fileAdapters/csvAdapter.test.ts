import { readFileSync } from "node:fs";
import * as path from "node:path";
import { describe, expect, it } from "vitest";
import type { FileAdapterContext } from "./types";
import { parseCsvAdapter } from "./csvAdapter";

const baseContext: FileAdapterContext = {
  batchId: "batch-csv",
  company: "raon",
  platform: "guru_company",
  saleMonth: "2026-06",
  sourceFileName: "guru-sample.csv",
  fileKind: "csv",
};

function readEpyrusSampleCsv(): Uint8Array {
  return readFileSync(
    path.resolve(
      process.cwd(),
      "tmp/platform-samples/epyrus/2026년04월정산내역_라온E＆M.csv",
    ),
  );
}

describe("csv file adapter", () => {
  it("converts a normal CSV into TabularFileRow objects", () => {
    const result = parseCsvAdapter(
      baseContext,
      "작품명,작가,정산대상금액,콘텐츠정산금액\n검은 별의 서점,한도윤,18420,7368",
    );

    expect(result.issues).toEqual([]);
    expect(result.rows).toEqual([
      {
        작품명: "검은 별의 서점",
        작가: "한도윤",
        정산대상금액: "18420",
        콘텐츠정산금액: "7368",
        sourceFileName: "guru-sample.csv",
        sourceRowIndex: 2,
      },
    ]);
  });

  it("keeps comma-containing money values as strings without numeric conversion", () => {
    const result = parseCsvAdapter(
      baseContext,
      '작품명,작가,정산대상금액,콘텐츠정산금액\n검은 별의 서점,한도윤,"18,420","7,368"',
    );

    expect(result.rows[0].정산대상금액).toBe("18,420");
    expect(result.rows[0].콘텐츠정산금액).toBe("7,368");
  });

  it("excludes empty rows while preserving source row indexes", () => {
    const result = parseCsvAdapter(
      baseContext,
      "작품명,작가\n검은 별의 서점,한도윤\n,\n푸른 달,서하린",
    );

    expect(result.rows).toEqual([
      expect.objectContaining({ 작품명: "검은 별의 서점", sourceRowIndex: 2 }),
      expect.objectContaining({ 작품명: "푸른 달", sourceRowIndex: 4 }),
    ]);
  });

  it("returns a parse_error issue for an empty file", () => {
    const result = parseCsvAdapter(baseContext, "");

    expect(result.rows).toEqual([]);
    expect(result.issues).toEqual([
      expect.objectContaining({
        batchId: "batch-csv",
        company: "raon",
        platform: "guru_company",
        issueType: "parse_error",
        severity: "error",
        sourceFileName: "guru-sample.csv",
        message: expect.stringContaining("empty"),
      }),
    ]);
  });

  it("returns a parse_error issue when the header row is missing", () => {
    const result = parseCsvAdapter(baseContext, ",,\n검은 별의 서점,한도윤,18420");

    expect(result.rows).toEqual([]);
    expect(result.issues).toEqual([
      expect.objectContaining({
        issueType: "parse_error",
        message: expect.stringContaining("header"),
      }),
    ]);
  });

  it("keeps Korean column names exactly as headers", () => {
    const result = parseCsvAdapter(baseContext, "도서명,저자명,출판사\n바람의 기록,김서윤,라온");

    expect(Object.keys(result.rows[0])).toEqual([
      "도서명",
      "저자명",
      "출판사",
      "sourceFileName",
      "sourceRowIndex",
    ]);
  });
  it("decodes UTF-8 BOM byte input before parsing", () => {
    const bytes = new Uint8Array([
      0xef,
      0xbb,
      0xbf,
      ...Array.from(new TextEncoder().encode("상품명,작가\n검은 별의 시점,서도원")),
    ]);

    const result = parseCsvAdapter(baseContext, bytes);

    expect(result.issues).toEqual([]);
    expect(result.rows).toEqual([
      expect.objectContaining({
        상품명: "검은 별의 시점",
        작가: "서도원",
        sourceRowIndex: 2,
      }),
    ]);
  });

  it("decodes CP949 byte input before parsing", () => {
    const bytes = new Uint8Array([
      0xbb,
      0xf3,
      0xc7,
      0xb0,
      0xb8,
      0xed,
      0x2c,
      0xc0,
      0xdb,
      0xb0,
      0xa1,
      0x0a,
      0xb0,
      0xcb,
      0xc0,
      0xba,
      0x20,
      0xba,
      0xb0,
      0xc0,
      0xc7,
      0x20,
      0xbd,
      0xc3,
      0xc1,
      0xa1,
      0x2c,
      0xbc,
      0xad,
      0xb5,
      0xb5,
      0xbf,
      0xf8,
    ]);

    const result = parseCsvAdapter(baseContext, bytes);

    expect(result.issues).toEqual([]);
    expect(result.rows).toEqual([
      expect.objectContaining({
        상품명: "검은 별의 시점",
        작가: "서도원",
        sourceRowIndex: 2,
      }),
    ]);
  });

  it("decodes the audited Epyrus CP949 sample without mojibake", () => {
    const result = parseCsvAdapter(
      {
        ...baseContext,
        platform: "epyrus",
        saleMonth: "2026-04",
        sourceFileName: "2026년04월정산내역_라온E＆M.csv",
      },
      readEpyrusSampleCsv(),
    );

    expect(result.issues).toEqual([]);
    expect(result.rows).toHaveLength(151);
    expect(result.rows[0]).toEqual(
      expect.objectContaining({
        정산자: "라온E＆M",
        판매구분: "앱",
        제목: "그의 비밀 2",
        저자: "시커먼스",
        출판사: "라온E＆M",
        판매금액: "2,720",
        정산액: "1,904",
        sourceRowIndex: 2,
      }),
    );
  });

  it("returns a parse_error when byte input cannot be decoded safely", () => {
    const result = parseCsvAdapter(baseContext, new Uint8Array([0xff, 0xff, 0xff]));

    expect(result.rows).toEqual([]);
    expect(result.issues).toEqual([
      expect.objectContaining({
        issueType: "parse_error",
        message: expect.stringContaining("decode"),
      }),
    ]);
  });
});
