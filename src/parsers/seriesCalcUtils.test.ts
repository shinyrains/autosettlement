import { describe, expect, it } from "vitest";
import type { TabularRow } from "./parserContract";
import {
  calculateSeriesRow,
  isSeriesTotalRow,
  type SeriesRowCalculation,
} from "./seriesCalcUtils";
import {
  SERIES_CATEGORY_COLUMN_MAPPINGS,
  SERIES_IDENTITY_COLUMNS,
  SERIES_REFERENCE_COLUMNS,
} from "./seriesColumnMappings";

function makeSeriesRow(input: {
  workTitle: string;
  author: string;
  publisher?: string;
  sourceRowIndex: number;
  cookieAutoCharge?: number;
  googleExternal?: number;
  sourceTotal?: number;
  marketFeeEstimate?: number;
  paidTicketAdjustment?: number;
}): TabularRow {
  return {
    [SERIES_IDENTITY_COLUMNS.workTitle]: input.workTitle,
    [SERIES_IDENTITY_COLUMNS.author]: input.author,
    [SERIES_IDENTITY_COLUMNS.publisher]: input.publisher ?? "Arete",
    [SERIES_CATEGORY_COLUMN_MAPPINGS.cookie_auto_charge[5]]: input.cookieAutoCharge ?? 0,
    [SERIES_CATEGORY_COLUMN_MAPPINGS.google_external[1]]: input.googleExternal ?? 0,
    [SERIES_REFERENCE_COLUMNS.total]: input.sourceTotal ?? 0,
    [SERIES_REFERENCE_COLUMNS.marketFeeEstimate]: input.marketFeeEstimate ?? 0,
    [SERIES_REFERENCE_COLUMNS.paidTicketAdjustment]: input.paidTicketAdjustment ?? 0,
    sourceFileName: "contentsSelling_2026-06-08.xls",
    sourceRowIndex: input.sourceRowIndex,
  };
}

function byCategory(result: SeriesRowCalculation, category: string) {
  const amount = result.categoryAmounts.find((item) => item.category === category);
  if (!amount) {
    throw new Error(`Missing category amount for ${category}`);
  }
  return amount;
}

describe("series calc utils", () => {
  it("calculates category amounts and settlement for sample source row 2", () => {
    const result = calculateSeriesRow(
      makeSeriesRow({
        workTitle: "천재 무림 트레이너 [독점]",
        author: "크루크루",
        sourceRowIndex: 2,
        cookieAutoCharge: 700,
        sourceTotal: 700,
        marketFeeEstimate: 21,
      }),
    );

    expect(byCategory(result, "cookie_auto_charge")).toEqual({
      category: "cookie_auto_charge",
      grossAmount: 700,
      rate: 0.679,
      settlementAmount: 475.3,
      sourceRefs: [{ sourceFileName: "contentsSelling_2026-06-08.xls", sourceRowIndex: 2 }],
    });
    expect(result.grossSales).toBe(700);
    expect(result.settlementAmount).toBe(475.3);
    expect(result.referenceAmounts).toEqual({
      total: 700,
      marketFeeEstimate: 21,
      paidTicketAdjustment: 0,
    });
  });

  it("calculates all five sample row candidates without subtracting reference columns", () => {
    const rows = [
      makeSeriesRow({
        workTitle: "천재 무림 트레이너 [독점]",
        author: "크루크루",
        sourceRowIndex: 2,
        cookieAutoCharge: 700,
        sourceTotal: 700,
        marketFeeEstimate: 21,
      }),
      makeSeriesRow({
        workTitle: "칼든 자들의 도시",
        author: "장영훈",
        sourceRowIndex: 3,
        cookieAutoCharge: 300,
        googleExternal: 120,
        sourceTotal: 420,
        marketFeeEstimate: 19.8,
      }),
      makeSeriesRow({
        workTitle: "전지적 투자 시점 [독점]",
        author: "필로스",
        sourceRowIndex: 4,
        cookieAutoCharge: 200,
        sourceTotal: 200,
        marketFeeEstimate: 6,
      }),
      makeSeriesRow({
        workTitle: "천마하라고 누가 칼들고 협박함 [독점]",
        author: "크루크루",
        sourceRowIndex: 5,
        cookieAutoCharge: 100,
        sourceTotal: 100,
        marketFeeEstimate: 3,
      }),
      makeSeriesRow({
        workTitle: "벽뚫로 날먹하는 해결사 생활 [독점]",
        author: "패스트",
        sourceRowIndex: 6,
        sourceTotal: 0,
      }),
    ];

    const results = rows.map(calculateSeriesRow);

    expect(results.map((result) => result.grossSales)).toEqual([700, 420, 200, 100, 0]);
    expect(results.map((result) => result.settlementAmount)).toEqual([
      475.3, 280.14, 135.8, 67.9, 0,
    ]);
  });

  it("does not include free category amounts in grossSales or settlementAmount", () => {
    const row = makeSeriesRow({
      workTitle: "무료 샘플",
      author: "작가",
      sourceRowIndex: 8,
      sourceTotal: 100,
    });
    row[SERIES_CATEGORY_COLUMN_MAPPINGS.free[0]] = 100;

    const result = calculateSeriesRow(row);

    expect(byCategory(result, "free")).toEqual(
      expect.objectContaining({
        category: "free",
        grossAmount: 100,
        rate: 0.7,
        settlementAmount: 70,
      }),
    );
    expect(result.grossSales).toBe(0);
    expect(result.settlementAmount).toBe(0);
  });

  it("identifies the final total row by the total row marker", () => {
    expect(isSeriesTotalRow({ [SERIES_IDENTITY_COLUMNS.workTitle]: "합계" })).toBe(true);
    expect(isSeriesTotalRow({ [SERIES_IDENTITY_COLUMNS.workTitle]: "작품명" })).toBe(false);
  });
});
