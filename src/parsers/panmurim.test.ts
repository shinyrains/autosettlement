import { describe, expect, it } from "vitest";
import type { ParserContext, TabularRow } from "./parserContract";
import { parsePanmurim } from "./panmurim";

const baseContext: ParserContext = {
  batchId: "batch-panmurim",
  company: "raon",
  platform: "panmurim",
  saleMonth: "2026-05",
  sourceFileName: "panmurim-sample.xlsx",
};

function createValidRow(overrides: Partial<TabularRow> = {}): TabularRow {
  return {
    "작품 제목": "그의 비밀",
    "회차 제목": "그의 비밀 2권",
    저자: "시커먼스",
    출판사: "라온E&M",
    "합계 총액 / 판매금액": 3200,
    "표지 / 정산비율": 0.7,
    sourceFileName: "panmurim-sample.xlsx",
    sourceRowIndex: 5,
    ...overrides,
  };
}

describe("panmurim parser", () => {
  it("creates SettlementRow values from the contracted Panmurim columns", () => {
    const result = parsePanmurim(baseContext, [createValidRow()]);

    expect(result.issues).toEqual([]);
    expect(result.rows).toEqual([
      expect.objectContaining({
        rowId: "batch-panmurim-panmurim-5",
        company: "raon",
        platform: "panmurim",
        saleMonth: "2026-05",
        workTitle: "그의 비밀 2권",
        mailerContentTitle: "그의 비밀 2권",
        author: "시커먼스",
        publisher: "라온E&M",
        grossSales: 3200,
        settlementAmount: 2240,
        sourceFileName: "panmurim-sample.xlsx",
        sourceRowIndex: 5,
        issues: [],
      }),
    ]);
  });

  it("rounds calculated settlement amounts to one decimal place", () => {
    const result = parsePanmurim(baseContext, [
      createValidRow({ "합계 총액 / 판매금액": 17636.57 }),
    ]);

    expect(result.issues).toEqual([]);
    expect(result.rows[0]).toEqual(expect.objectContaining({
      grossSales: 17636.57,
      settlementAmount: 12345.6,
    }));
  });

  it("returns missing_column when a required Panmurim column is absent", () => {
    const row = createValidRow();
    delete row["표지 / 정산비율"];

    const result = parsePanmurim(baseContext, [row]);

    expect(result.rows).toEqual([]);
    expect(result.issues).toEqual([
      expect.objectContaining({
        issueType: "missing_column",
        severity: "error",
        sourceFileName: "panmurim-sample.xlsx",
      }),
    ]);
  });

  it("returns missing_field when a required identity value is blank", () => {
    const result = parsePanmurim(baseContext, [createValidRow({ "회차 제목": "" })]);

    expect(result.rows).toEqual([]);
    expect(result.issues).toEqual([
      expect.objectContaining({
        issueType: "missing_field",
        severity: "error",
        sourceRowIndex: 5,
      }),
    ]);
  });

  it("returns invalid_value when the total amount cannot be parsed", () => {
    const result = parsePanmurim(baseContext, [createValidRow({ "합계 총액 / 판매금액": "not-a-number" })]);

    expect(result.rows).toEqual([]);
    expect(result.issues).toEqual([
      expect.objectContaining({
        issueType: "invalid_value",
        severity: "error",
        sourceRowIndex: 5,
      }),
    ]);
  });
});
