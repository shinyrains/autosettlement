import { describe, expect, it } from "vitest";
import type { ParserContext, TabularRow } from "./parserContract";
import { parseBookcube } from "./bookcube";

const baseContext: ParserContext = {
  batchId: "batch-bookcube",
  company: "raon",
  platform: "bookcube",
  saleMonth: "2026-05",
  sourceFileName: "bookcube-sample.xlsx",
};

function createValidRow(overrides: Partial<TabularRow> = {}): TabularRow {
  return {
    제목: "짝사랑을 끝냈더니 소꿉친구들이 나에게 집착한다 1",
    저자: "봄날의복길이",
    출판권자: "B cafe",
    판매액: 3000,
    정산액: 2100,
    sourceFileName: "bookcube-sample.xlsx",
    sourceRowIndex: 3,
    ...overrides,
  };
}

describe("bookcube parser", () => {
  it("creates SettlementRow values from the contracted Bookcube columns", () => {
    const result = parseBookcube(baseContext, [createValidRow()]);

    expect(result.issues).toEqual([]);
    expect(result.rows).toEqual([
      expect.objectContaining({
        rowId: "batch-bookcube-bookcube-3",
        company: "raon",
        platform: "bookcube",
        saleMonth: "2026-05",
        workTitle: "짝사랑을 끝냈더니 소꿉친구들이 나에게 집착한다 1",
        mailerContentTitle: "짝사랑을 끝냈더니 소꿉친구들이 나에게 집착한다 1",
        author: "봄날의복길이",
        publisher: "B cafe",
        grossSales: 3000,
        settlementAmount: 2100,
        sourceFileName: "bookcube-sample.xlsx",
        sourceRowIndex: 3,
        issues: [],
      }),
    ]);
  });

  it("returns missing_column when a required Bookcube column is absent", () => {
    const row = createValidRow();
    delete row["정산액"];

    const result = parseBookcube(baseContext, [row]);

    expect(result.rows).toEqual([]);
    expect(result.issues).toEqual([
      expect.objectContaining({
        issueType: "missing_column",
        severity: "error",
        sourceFileName: "bookcube-sample.xlsx",
      }),
    ]);
  });

  it("returns missing_field when a required identity value is blank", () => {
    const result = parseBookcube(baseContext, [createValidRow({ 제목: "" })]);

    expect(result.rows).toEqual([]);
    expect(result.issues).toEqual([
      expect.objectContaining({
        issueType: "missing_field",
        severity: "error",
        sourceRowIndex: 3,
      }),
    ]);
  });

  it("returns invalid_value when the sales amount cannot be parsed", () => {
    const result = parseBookcube(baseContext, [createValidRow({ 판매액: "not-a-number" })]);

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
