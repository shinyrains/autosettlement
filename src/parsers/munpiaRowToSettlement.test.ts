import { describe, expect, it } from "vitest";
import {
  mapMunpiaCalculatedOutputToSettlement,
  type MunpiaRowToSettlementContext,
  type MunpiaSettlementIdentity,
} from "./munpiaRowToSettlement";

const context: MunpiaRowToSettlementContext = {
  batchId: "batch-munpia",
  company: "sr",
  saleMonth: "2026-05",
  sourceFileName: "아레떼북스.xlsx",
};

const identity: MunpiaSettlementIdentity = {
  workCode: "485076",
  workTitle: "나 혼자 히든농장",
  author: "Corrected Author",
};

describe("munpia row to settlement mapper", () => {
  it("maps a web calculated output to SettlementRow", () => {
    const row = mapMunpiaCalculatedOutputToSettlement({
      context,
      identity,
      output: {
        kind: "web",
        grossSales: 29100,
        settlementAmount: 18333,
        sourceRefs: [{ sourceFileName: "아레떼북스.xlsx", sourceRowIndex: 6 }],
      },
    });

    expect(row).toEqual({
      rowId: "batch-munpia-munpia-sr-485076-web-아레떼북스.xlsx-6",
      company: "sr",
      platform: "munpia",
      saleMonth: "2026-05",
      workTitle: "나 혼자 히든농장",
      mailerContentTitle: "나 혼자 히든농장",
      author: "Corrected Author",
      grossSales: 29100,
      settlementAmount: 18333,
      sourceFileName: "아레떼북스.xlsx",
      sourceRowIndex: 6,
      issues: [],
    });
  });

  it("maps app suffix to mailerContentTitle", () => {
    const row = mapMunpiaCalculatedOutputToSettlement({
      context,
      identity,
      output: {
        kind: "app",
        grossSales: 7200,
        settlementAmount: 4082,
        sourceRefs: [{ sourceFileName: "아레떼북스.xlsx", sourceRowIndex: 9 }],
      },
    });

    expect(row.mailerContentTitle).toBe("나 혼자 히든농장(app)");
    expect(row.rowId).toBe("batch-munpia-munpia-sr-485076-app-아레떼북스.xlsx-9");
  });

  it("trims identity fields and omits publisher", () => {
    const row = mapMunpiaCalculatedOutputToSettlement({
      context,
      identity: {
        workCode: " 485076 ",
        workTitle: " 나 혼자 히든농장 ",
        author: " Corrected Author ",
      },
      output: {
        kind: "web",
        grossSales: 29100,
        settlementAmount: 18333,
        sourceRefs: [{ sourceFileName: "아레떼북스.xlsx", sourceRowIndex: 6 }],
      },
    });

    expect(row.workTitle).toBe("나 혼자 히든농장");
    expect(row.author).toBe("Corrected Author");
    expect(row.publisher).toBeUndefined();
  });

  it("falls back to context source when sourceRefs are empty", () => {
    const row = mapMunpiaCalculatedOutputToSettlement({
      context,
      identity,
      output: {
        kind: "web",
        grossSales: 29100,
        settlementAmount: 18333,
        sourceRefs: [],
      },
    });

    expect(row.sourceFileName).toBe("아레떼북스.xlsx");
    expect(row.sourceRowIndex).toBe(0);
  });
});
