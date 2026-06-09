import { describe, expect, it } from "vitest";
import type { TabularRow } from "./parserContract";
import { RIDIBOOKS_REQUIRED_COLUMNS } from "./ridibooksCalcConstants";
import {
  calculateRidibooksEventRow,
  type RidibooksEventRowCalculation,
} from "./ridibooksEventCalcUtils";

function makeEventRow(overrides: Partial<TabularRow> = {}): TabularRow {
  const [bookId, title] = RIDIBOOKS_REQUIRED_COLUMNS.event.identity;
  const [
    paidAt,
    normalSales,
    normalSettlementAmount,
    iosTargetAmount,
    iosSettlementAmount,
    androidTargetAmount,
    androidSettlementAmount,
    oneStoreTargetAmount,
    oneStoreSettlementAmount,
  ] = RIDIBOOKS_REQUIRED_COLUMNS.event.amounts;

  return {
    [bookId]: "RIDI-001",
    [title]: "Sample Work",
    [paidAt]: "2026-04-15",
    [normalSales]: "1,000",
    [normalSettlementAmount]: "700",
    [iosTargetAmount]: "100",
    [iosSettlementAmount]: "44.1",
    [androidTargetAmount]: "200",
    [androidSettlementAmount]: "113.4",
    [oneStoreTargetAmount]: "300",
    [oneStoreSettlementAmount]: "210",
    sourceFileName: "calculate_date_tran_1.csv",
    sourceRowIndex: 2,
    ...overrides,
  };
}

function byKind(
  result: RidibooksEventRowCalculation,
  kind: "normal" | "app" | "event" | "eventApp",
) {
  const item = result.outputRows.find((row) => row.kind === kind);
  if (!item) {
    throw new Error(`Missing Ridibooks event output for ${kind}`);
  }
  return item;
}

describe("ridibooks event calc utils", () => {
  it("calculates event normal and event app rows inside the event period", () => {
    const result = calculateRidibooksEventRow(makeEventRow(), {
      startDate: "2026-04-01",
      endDate: "2026-04-30",
    });

    expect(byKind(result, "event")).toEqual({
      kind: "event",
      grossSales: 1000,
      settlementAmount: 700,
      sourceRefs: [{ sourceFileName: "calculate_date_tran_1.csv", sourceRowIndex: 2 }],
    });
    expect(byKind(result, "eventApp")).toEqual({
      kind: "eventApp",
      grossSales: 600,
      settlementAmount: 367.5,
      sourceRefs: [{ sourceFileName: "calculate_date_tran_1.csv", sourceRowIndex: 2 }],
    });
  });

  it("calculates normal and app rows outside the event period without event suffix kinds", () => {
    const result = calculateRidibooksEventRow(makeEventRow({ [RIDIBOOKS_REQUIRED_COLUMNS.event.amounts[0]]: "2026-05-01" }), {
      startDate: "2026-04-01",
      endDate: "2026-04-30",
    });

    expect(byKind(result, "normal")).toEqual(
      expect.objectContaining({
        kind: "normal",
        grossSales: 1000,
        settlementAmount: 700,
      }),
    );
    expect(byKind(result, "app")).toEqual(
      expect.objectContaining({
        kind: "app",
        grossSales: 600,
        settlementAmount: 367.5,
      }),
    );
  });

  it("treats event period boundaries as inclusive", () => {
    const result = calculateRidibooksEventRow(makeEventRow({ [RIDIBOOKS_REQUIRED_COLUMNS.event.amounts[0]]: "2026-04-30" }), {
      startDate: "2026-04-01",
      endDate: "2026-04-30",
    });

    expect(result.outputRows.map((row) => row.kind)).toEqual(["event", "eventApp"]);
  });

  it("parses blank, invalid, comma, and signed amount cells using zero fallback for row calculation", () => {
    const result = calculateRidibooksEventRow(
      makeEventRow({
        [RIDIBOOKS_REQUIRED_COLUMNS.event.amounts[1]]: "1,200",
        [RIDIBOOKS_REQUIRED_COLUMNS.event.amounts[2]]: "not-a-number",
        [RIDIBOOKS_REQUIRED_COLUMNS.event.amounts[3]]: "",
        [RIDIBOOKS_REQUIRED_COLUMNS.event.amounts[4]]: "10",
        [RIDIBOOKS_REQUIRED_COLUMNS.event.amounts[5]]: "-20",
        [RIDIBOOKS_REQUIRED_COLUMNS.event.amounts[6]]: "5",
      }),
      {
        startDate: "2026-04-01",
        endDate: "2026-04-30",
      },
    );

    expect(byKind(result, "event").grossSales).toBe(1200);
    expect(byKind(result, "event").settlementAmount).toBe(0);
    expect(byKind(result, "eventApp").grossSales).toBe(280);
    expect(byKind(result, "eventApp").settlementAmount).toBe(225);
  });
});
