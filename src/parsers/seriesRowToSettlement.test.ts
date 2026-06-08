import { describe, expect, it } from "vitest";
import type { TabularRow } from "./parserContract";
import type { SeriesRowCalculation } from "./seriesCalcUtils";
import { mapSeriesRowToSettlement } from "./seriesRowToSettlement";
import { SERIES_IDENTITY_COLUMNS } from "./seriesColumnMappings";

const calculation: SeriesRowCalculation = {
  categoryAmounts: [],
  grossSales: 700,
  settlementAmount: 475.3,
  referenceAmounts: {
    total: 700,
    marketFeeEstimate: 21,
    paidTicketAdjustment: 0,
  },
  sourceRefs: [{ sourceFileName: "contentsSelling_2026-06-08.xls", sourceRowIndex: 2 }],
};

const identityRow: TabularRow = {
  [SERIES_IDENTITY_COLUMNS.workTitle]: "천재 무림 트레이너 [독점]",
  [SERIES_IDENTITY_COLUMNS.author]: "크루크루",
  [SERIES_IDENTITY_COLUMNS.publisher]: "Arete",
};

const baseContext = {
  batchId: "batch-series-001",
  company: "sr" as const,
  saleMonth: "2026-06",
  sourceFileName: "contentsSelling_2026-06-08.xls",
};

describe("series row to settlement mapper", () => {
  it("maps a general series row calculation into one SettlementRow", () => {
    const row = mapSeriesRowToSettlement({
      calculation,
      identityRow,
      context: baseContext,
      slot: "general",
    });

    expect(row).toEqual({
      rowId: "batch-series-001-series-sr-general-contentsSelling_2026-06-08.xls-2",
      company: "sr",
      platform: "series",
      saleMonth: "2026-06",
      workTitle: "천재 무림 트레이너 [독점]",
      mailerContentTitle: "천재 무림 트레이너 [독점]",
      author: "크루크루",
      publisher: "Arete",
      grossSales: 700,
      settlementAmount: 475.3,
      sourceFileName: "contentsSelling_2026-06-08.xls",
      sourceRowIndex: 2,
      issues: [],
    });
    expect("sourceRefs" in row).toBe(false);
  });

  it("adds the app suffix only when slot is app", () => {
    const row = mapSeriesRowToSettlement({
      calculation,
      identityRow,
      context: baseContext,
      slot: "app",
    });

    expect(row.workTitle).toBe("천재 무림 트레이너 [독점]");
    expect(row.mailerContentTitle).toBe("천재 무림 트레이너 [독점](app)");
  });

  it("creates deterministic row ids for the same input", () => {
    const input = {
      calculation,
      identityRow,
      context: baseContext,
      slot: "general" as const,
    };

    expect(mapSeriesRowToSettlement(input).rowId).toBe(mapSeriesRowToSettlement(input).rowId);
  });
});
