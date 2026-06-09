import { describe, expect, it } from "vitest";
import type { ParserContext, TabularRow } from "./parserContract";
import { getParser, parsePlatformRows, supportedParserPlatforms } from "./registry";
import type { Platform } from "../types/settlement";

const baseContext: ParserContext = {
  batchId: "batch-test",
  company: "raon",
  platform: "novelpia",
  saleMonth: "2026-06",
  sourceFileName: "registry-sample.xlsx",
};

const novelpiaRow: TabularRow = {
  상품명: "검은 별의 서점",
  작가명: "서도윤",
  판매금액: "18,420",
  정산금액: "7,368",
};

describe("parser registry", () => {
  it("exposes the implemented Simple Extract platforms", () => {
    expect(supportedParserPlatforms).toEqual([
      "novelpia",
      "mootoon",
      "epyrus",
      "kyobo",
      "yes24",
      "aladin",
      "guru_company",
      "misterblue",
    ]);
  });

  it("returns a parser for supported platforms", () => {
    expect(getParser("novelpia")).toEqual(expect.any(Function));
    expect(getParser("misterblue")).toEqual(expect.any(Function));
  });

  it("runs the selected parser with the requested platform in context", () => {
    const result = parsePlatformRows("novelpia", baseContext, [novelpiaRow]);

    expect(result.issues).toEqual([]);
    expect(result.rows).toEqual([
      expect.objectContaining({
        rowId: "batch-test-novelpia-2",
        platform: "novelpia",
        workTitle: "검은 별의 서점",
        author: "서도윤",
        grossSales: 18420,
        settlementAmount: 7368,
        sourceFileName: "registry-sample.xlsx",
      }),
    ]);
  });

  it("keeps parser selection authoritative when context has a different platform", () => {
    const result = parsePlatformRows(
      "novelpia",
      { ...baseContext, platform: "series" },
      [novelpiaRow],
    );

    expect(result.rows[0].platform).toBe("novelpia");
  });

  it.each<Platform>(["series", "munpia", "ridibooks"])(
    "returns mapping_failed for unsupported Formula Platform %s",
    (platform) => {
      const result = parsePlatformRows(platform, baseContext, []);

      expect(result.rows).toEqual([]);
      expect(result.issues).toEqual([
        expect.objectContaining({
          platform,
          issueType: "mapping_failed",
          severity: "error",
          message: expect.stringContaining("not implemented"),
        }),
      ]);
    },
  );

  it("returns mapping_failed for an unknown platform value", () => {
    const result = parsePlatformRows("unknown_platform" as Platform, baseContext, []);

    expect(result.rows).toEqual([]);
    expect(result.issues).toEqual([
      expect.objectContaining({
        platform: "unknown_platform",
        issueType: "mapping_failed",
        severity: "error",
      }),
    ]);
  });
});
