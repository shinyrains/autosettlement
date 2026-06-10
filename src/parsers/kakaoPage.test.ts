import { describe, expect, it } from "vitest";
import type { ParserContext, TabularRow } from "./parserContract";
import { parseKakaoPage } from "./kakaoPage";

const baseContext: ParserContext = {
  batchId: "batch-kakao-page",
  company: "sr",
  platform: "kakao_page",
  saleMonth: "2026-05",
  sourceFileName: "kakao-page-sample.xlsx",
};

function createValidRow(overrides: Partial<TabularRow> = {}): TabularRow {
  return {
    시리즈명: "둠스데이 [완결]",
    작가명: "산호초",
    발행자명: "Arete",
    "총합계-원화": 2340,
    공급가액: 1499,
    sourceFileName: "kakao-page-sample.xlsx",
    sourceRowIndex: 3,
    ...overrides,
  };
}

describe("kakao page parser", () => {
  it("creates SettlementRow values from the contracted Kakao Page columns", () => {
    const result = parseKakaoPage(baseContext, [createValidRow()]);

    expect(result.issues).toEqual([]);
    expect(result.rows).toEqual([
      expect.objectContaining({
        rowId: "batch-kakao-page-kakao_page-3",
        company: "sr",
        platform: "kakao_page",
        saleMonth: "2026-05",
        workTitle: "둠스데이 [완결]",
        mailerContentTitle: "둠스데이 [완결]",
        author: "산호초",
        publisher: "Arete",
        grossSales: 2340,
        settlementAmount: 1499,
        sourceFileName: "kakao-page-sample.xlsx",
        sourceRowIndex: 3,
        issues: [],
      }),
    ]);
  });

  it("returns missing_column when a required Kakao Page column is absent", () => {
    const row = createValidRow();
    delete row["공급가액"];

    const result = parseKakaoPage(baseContext, [row]);

    expect(result.rows).toEqual([]);
    expect(result.issues).toEqual([
      expect.objectContaining({
        issueType: "missing_column",
        severity: "error",
        sourceFileName: "kakao-page-sample.xlsx",
      }),
    ]);
  });

  it("returns missing_field when a required identity value is blank", () => {
    const result = parseKakaoPage(baseContext, [createValidRow({ 시리즈명: "" })]);

    expect(result.rows).toEqual([]);
    expect(result.issues).toEqual([
      expect.objectContaining({
        issueType: "missing_field",
        severity: "error",
        sourceRowIndex: 3,
      }),
    ]);
  });

  it("preserves negative monetary values when the workbook expresses refunds", () => {
    const result = parseKakaoPage(baseContext, [createValidRow({ "총합계-원화": -390, 공급가액: -262 })]);

    expect(result.issues).toEqual([]);
    expect(result.rows).toEqual([
      expect.objectContaining({
        grossSales: -390,
        settlementAmount: -262,
      }),
    ]);
  });
});
