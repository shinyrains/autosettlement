import { describe, expect, it } from "vitest";
import type { ParserContext } from "./parserContract";
import { parseNovelpia } from "./novelpia";
import { simpleExtractMappings } from "./simpleExtractMappings";

const context: ParserContext = {
  batchId: "batch-test",
  company: "raon",
  platform: "novelpia",
  saleMonth: "2026-06",
  sourceFileName: "novelpia-sample.xlsx",
};

describe("parseNovelpia", () => {
  it("creates SettlementRow values from Novelpia sample columns", () => {
    const result = parseNovelpia(context, [
      {
        상품명: "검은 별의 서점",
        작가명: "서도윤",
        판매금액: "18,420",
        정산금액: "7,368",
      },
    ]);

    expect(result.issues).toEqual([]);
    expect(result.rows).toEqual([
      expect.objectContaining({
        rowId: "batch-test-novelpia-2",
        company: "raon",
        platform: "novelpia",
        saleMonth: "2026-06",
        workTitle: "검은 별의 서점",
        mailerContentTitle: "검은 별의 서점",
        author: "서도윤",
        grossSales: 18420,
        settlementAmount: 7368,
        sourceFileName: "novelpia-sample.xlsx",
        sourceRowIndex: 2,
        issues: [],
      }),
    ]);
  });

  it("returns missing_column when a required Novelpia column is absent", () => {
    const result = parseNovelpia(context, [
      {
        상품명: "검은 별의 서점",
        작가명: "서도윤",
        판매금액: "18,420",
      },
    ]);

    expect(result.rows).toEqual([]);
    expect(result.issues).toEqual([
      expect.objectContaining({
        issueType: "missing_column",
        severity: "error",
        sourceFileName: "novelpia-sample.xlsx",
      }),
    ]);
  });

  it("returns missing_field when a required value is blank", () => {
    const result = parseNovelpia(context, [
      {
        상품명: "",
        작가명: "서도윤",
        판매금액: "18,420",
        정산금액: "7,368",
      },
    ]);

    expect(result.rows).toEqual([]);
    expect(result.issues).toEqual([
      expect.objectContaining({
        issueType: "missing_field",
        severity: "error",
        sourceRowIndex: 2,
      }),
    ]);
  });

  it("returns invalid_value when money columns cannot be parsed", () => {
    const result = parseNovelpia(context, [
      {
        상품명: "검은 별의 서점",
        작가명: "서도윤",
        판매금액: "not-a-number",
        정산금액: "7,368",
      },
    ]);

    expect(result.rows).toEqual([]);
    expect(result.issues).toEqual([
      expect.objectContaining({
        issueType: "invalid_value",
        severity: "error",
        sourceRowIndex: 2,
      }),
    ]);
  });
});

describe("simpleExtractMappings", () => {
  it("prepares mapping contracts for the first seven Simple Extract platforms", () => {
    expect(Object.keys(simpleExtractMappings)).toEqual([
      "novelpia",
      "mootoon",
      "epyrus",
      "kyobo",
      "yes24",
      "aladin",
      "guru_company",
    ]);
  });
});
