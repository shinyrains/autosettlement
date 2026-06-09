import { describe, expect, it } from "vitest";
import type { ParserContext, TabularRow } from "./parserContract";
import { parseOnestore } from "./onestore";

const baseContext: ParserContext = {
  batchId: "batch-onestore",
  company: "raon",
  platform: "onestore",
  saleMonth: "2026-06",
  sourceFileName: "onestore-sample.xlsx",
};

function createValidRow(overrides: Partial<TabularRow> = {}): TabularRow {
  return {
    상품명: "레이드 커맨더 4권",
    출판사: "Arete",
    글작가: "산호초",
    합계: 3200,
    정산지급액: 2016,
    sourceFileName: "onestore-sample.xlsx",
    sourceRowIndex: 3,
    ...overrides,
  };
}

describe("onestore parser", () => {
  it("creates SettlementRow values and splits company from publisher normalization", () => {
    const result = parseOnestore(baseContext, [
      createValidRow(),
      createValidRow({ 상품명: "플레이어 시스템 4권", 출판사: "라온E&M", 글작가: "현무지기", sourceRowIndex: 13 }),
    ]);

    expect(result.issues).toEqual([]);
    expect(result.rows).toEqual([
      expect.objectContaining({
        rowId: "batch-onestore-onestore-sr-3",
        company: "sr",
        platform: "onestore",
        saleMonth: "2026-06",
        workTitle: "레이드 커맨더 4권",
        mailerContentTitle: "레이드 커맨더 4권",
        author: "산호초",
        publisher: "Arete",
        grossSales: 3200,
        settlementAmount: 2016,
      }),
      expect.objectContaining({
        rowId: "batch-onestore-onestore-raon-13",
        company: "raon",
        platform: "onestore",
        workTitle: "플레이어 시스템 4권",
        author: "현무지기",
        publisher: "라온E&M",
        grossSales: 3200,
        settlementAmount: 2016,
      }),
    ]);
  });

  it("returns missing_column when a required Onestore column is absent", () => {
    const row = createValidRow();
    delete row["정산지급액"];

    const result = parseOnestore(baseContext, [row]);

    expect(result.rows).toEqual([]);
    expect(result.issues).toEqual([
      expect.objectContaining({
        issueType: "missing_column",
        severity: "error",
      }),
    ]);
  });

  it("returns company_split_failed when the publisher is unmatched", () => {
    const result = parseOnestore(baseContext, [createValidRow({ 출판사: "Unknown Publisher" })]);

    expect(result.rows).toEqual([]);
    expect(result.issues).toEqual([
      expect.objectContaining({
        issueType: "company_split_failed",
        severity: "error",
        sourceRowIndex: 3,
      }),
    ]);
  });

  it("returns invalid_value when the gross sales amount cannot be parsed", () => {
    const result = parseOnestore(baseContext, [createValidRow({ 합계: "not-a-number" })]);

    expect(result.rows).toEqual([]);
    expect(result.issues).toEqual([
      expect.objectContaining({
        issueType: "invalid_value",
        severity: "error",
        sourceRowIndex: 3,
      }),
    ]);
  });
});
