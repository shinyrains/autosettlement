import { describe, expect, it } from "vitest";
import {
  mapRidibooksCalculatedOutputToSettlement,
  type RidibooksRowToSettlementContext,
  type RidibooksSettlementIdentity,
} from "./ridibooksRowToSettlement";

const context: RidibooksRowToSettlementContext = {
  batchId: "batch-ridi",
  company: "raon",
  saleMonth: "2026-05",
  sourceFileName: "calculate_1.csv",
};

const identity: RidibooksSettlementIdentity = {
  bookId: "RIDI-001",
  workTitle: "Sample Work",
  author: "Sample Author",
  publisher: "Sample Publisher",
};

describe("ridibooks row to settlement mapper", () => {
  it("maps a normal calculated output to SettlementRow", () => {
    const row = mapRidibooksCalculatedOutputToSettlement({
      context,
      identity,
      output: {
        kind: "normal",
        grossSales: 720,
        settlementAmount: 534,
        sourceRefs: [
          { sourceFileName: "calculate_1.csv", sourceRowIndex: 2 },
          { sourceFileName: "calculate_1 (1).csv", sourceRowIndex: 2 },
        ],
      },
    });

    expect(row).toEqual({
      rowId: "batch-ridi-ridibooks-raon-RIDI-001-normal-calculate_1.csv-2",
      company: "raon",
      platform: "ridibooks",
      saleMonth: "2026-05",
      workTitle: "Sample Work",
      mailerContentTitle: "Sample Work",
      author: "Sample Author",
      publisher: "Sample Publisher",
      grossSales: 720,
      settlementAmount: 534,
      sourceFileName: "calculate_1.csv",
      sourceRowIndex: 2,
      issues: [],
    });
  });

  it("maps app and event suffixes to mailerContentTitle", () => {
    const kinds = ["app", "event", "eventApp"] as const;
    const rows = kinds.map((kind) =>
      mapRidibooksCalculatedOutputToSettlement({
        context,
        identity,
        output: {
          kind,
          grossSales: 100,
          settlementAmount: 70,
          sourceRefs: [{ sourceFileName: "calculate_date_tran_1.csv", sourceRowIndex: 10 }],
        },
      }),
    );

    expect(rows.map((row) => row.mailerContentTitle)).toEqual([
      "Sample Work(app)",
      "Sample Work(이벤트)",
      "Sample Work(이벤트)(app)",
    ]);
  });

  it("omits publisher when it is blank", () => {
    const row = mapRidibooksCalculatedOutputToSettlement({
      context,
      identity: { ...identity, publisher: "" },
      output: {
        kind: "normal",
        grossSales: 720,
        settlementAmount: 534,
        sourceRefs: [{ sourceFileName: "calculate_1.csv", sourceRowIndex: 2 }],
      },
    });

    expect(row.publisher).toBeUndefined();
  });

  it("falls back to context source when sourceRefs are empty", () => {
    const row = mapRidibooksCalculatedOutputToSettlement({
      context,
      identity,
      output: {
        kind: "normal",
        grossSales: 720,
        settlementAmount: 534,
        sourceRefs: [],
      },
    });

    expect(row.sourceFileName).toBe("calculate_1.csv");
    expect(row.sourceRowIndex).toBe(0);
  });
});
