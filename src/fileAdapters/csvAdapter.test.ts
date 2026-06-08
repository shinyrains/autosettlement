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
});
