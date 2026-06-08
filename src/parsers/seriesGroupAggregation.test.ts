import { describe, expect, it } from "vitest";
import type { SettlementRow } from "../types/settlement";
import { aggregateSeriesSettlementRows } from "./seriesGroupAggregation";

function settlementRow(input: Partial<SettlementRow> = {}): SettlementRow {
  return {
    rowId: input.rowId ?? "row-1",
    company: input.company ?? "sr",
    platform: input.platform ?? "series",
    saleMonth: input.saleMonth ?? "2026-06",
    workTitle: input.workTitle ?? "Same Work",
    mailerContentTitle: input.mailerContentTitle ?? "Same Work",
    author: input.author ?? "Same Author",
    publisher: input.publisher ?? "Same Publisher",
    grossSales: input.grossSales ?? 100,
    settlementAmount: input.settlementAmount ?? 67.9,
    sourceFileName: input.sourceFileName ?? "general-1.xls",
    sourceRowIndex: input.sourceRowIndex ?? 2,
    issues: input.issues ?? [],
  };
}

describe("series group aggregation", () => {
  it("aggregates rows with the same company, platform, saleMonth, title, author, publisher, and mailer content title", () => {
    const rows = [
      settlementRow({
        rowId: "first-row",
        grossSales: 100,
        settlementAmount: 67.9,
        sourceFileName: "general-1.xls",
        sourceRowIndex: 2,
      }),
      settlementRow({
        rowId: "second-row",
        grossSales: 200,
        settlementAmount: 135.8,
        sourceFileName: "general-2.xls",
        sourceRowIndex: 3,
      }),
    ];

    const result = aggregateSeriesSettlementRows(rows);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      ...rows[0],
      grossSales: 300,
      settlementAmount: 203.7,
    });
  });

  it("does not aggregate rows when mailerContentTitle differs between general and app rows", () => {
    const result = aggregateSeriesSettlementRows([
      settlementRow({ mailerContentTitle: "Same Work", grossSales: 100 }),
      settlementRow({ mailerContentTitle: "Same Work(app)", grossSales: 200 }),
    ]);

    expect(result).toHaveLength(2);
    expect(result.map((row) => row.grossSales)).toEqual([100, 200]);
  });

  it("does not aggregate rows when publisher differs, including missing publisher", () => {
    const result = aggregateSeriesSettlementRows([
      settlementRow({ publisher: "Publisher A", grossSales: 100 }),
      settlementRow({ publisher: undefined, grossSales: 200 }),
    ]);

    expect(result).toHaveLength(2);
  });

  it("keeps the first row source as the representative source and does not mutate input rows", () => {
    const rows = [
      settlementRow({ grossSales: 100, sourceFileName: "general-1.xls", sourceRowIndex: 2 }),
      settlementRow({ grossSales: 200, sourceFileName: "general-2.xls", sourceRowIndex: 10 }),
    ];
    const originalRows = structuredClone(rows);

    const result = aggregateSeriesSettlementRows(rows);

    expect(result[0].sourceFileName).toBe("general-1.xls");
    expect(result[0].sourceRowIndex).toBe(2);
    expect(rows).toEqual(originalRows);
  });
});
