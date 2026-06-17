import { describe, expect, it } from "vitest";
import type { ParserContext, TabularRow } from "./parserContract";
import { parseSeriesSingleFileRows } from "./seriesSingleFileParser";
import {
  SERIES_CATEGORY_COLUMN_MAPPINGS,
  SERIES_IDENTITY_COLUMNS,
  SERIES_REFERENCE_COLUMNS,
} from "./seriesColumnMappings";

const context: ParserContext = {
  batchId: "batch-series-single",
  company: "sr",
  platform: "series",
  saleMonth: "2026-06",
  sourceFileName: "contentsSelling_2026-06-08.xls",
};

function seriesRow(input: {
  workTitle: string;
  author: string;
  sourceRowIndex: number;
  cookieAutoCharge?: number;
  googleExternal?: number;
  total?: number;
}): TabularRow {
  return {
    [SERIES_IDENTITY_COLUMNS.workTitle]: input.workTitle,
    [SERIES_IDENTITY_COLUMNS.author]: input.author,
    [SERIES_IDENTITY_COLUMNS.publisher]: "Arete",
    [SERIES_CATEGORY_COLUMN_MAPPINGS.cookie_auto_charge[5]]: input.cookieAutoCharge ?? 0,
    [SERIES_CATEGORY_COLUMN_MAPPINGS.google_external[1]]: input.googleExternal ?? 0,
    [SERIES_REFERENCE_COLUMNS.total]: input.total ?? 0,
    sourceFileName: context.sourceFileName,
    sourceRowIndex: input.sourceRowIndex,
  };
}

describe("series single file parser", () => {
  it("maps sample TabularRows into general SettlementRows", () => {
    const result = parseSeriesSingleFileRows(context, [
      seriesRow({
        workTitle: "천재 무림 트레이너 [독점]",
        author: "크루크루",
        sourceRowIndex: 2,
        cookieAutoCharge: 700,
        total: 700,
      }),
      seriesRow({
        workTitle: "칼든 자들의 도시",
        author: "장영훈",
        sourceRowIndex: 3,
        cookieAutoCharge: 300,
        googleExternal: 120,
        total: 420,
      }),
    ], "general");

    expect(result.issues).toEqual([]);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]).toEqual(
      expect.objectContaining({
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
      }),
    );
    expect(result.rows[1]).toEqual(
      expect.objectContaining({
        workTitle: "칼든 자들의 도시",
        mailerContentTitle: "칼든 자들의 도시",
        grossSales: 420,
        settlementAmount: 280.14,
        sourceRowIndex: 3,
      }),
    );
  });

  it("uses only the slot argument to add the app mailer content suffix", () => {
    const result = parseSeriesSingleFileRows(
      context,
      [
        seriesRow({
          workTitle: "전지적 투자 시점 [독점]",
          author: "필로스",
          sourceRowIndex: 4,
          cookieAutoCharge: 200,
          total: 200,
        }),
      ],
      "app",
    );

    expect(result.rows[0]).toEqual(
      expect.objectContaining({
        workTitle: "전지적 투자 시점 [독점]",
        mailerContentTitle: "전지적 투자 시점 [독점](app)",
        grossSales: 200,
        settlementAmount: 135.8,
      }),
    );
  });

  it("excludes total rows before calculation and mapping", () => {
    const result = parseSeriesSingleFileRows(
      context,
      [
        seriesRow({
          workTitle: "천마하라고 누가 칼들고 협박함 [독점]",
          author: "크루크루",
          sourceRowIndex: 5,
          cookieAutoCharge: 100,
          total: 100,
        }),
        {
          [SERIES_IDENTITY_COLUMNS.workTitle]: "합계",
          [SERIES_REFERENCE_COLUMNS.total]: 100,
          sourceFileName: context.sourceFileName,
          sourceRowIndex: 7,
        },
      ],
      "general",
    );

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].workTitle).toBe("천마하라고 누가 칼들고 협박함 [독점]");
    expect(result.rows[0].sourceRowIndex).toBe(5);
  });

  it("reports missing Series identity fields instead of emitting blank settlement rows", () => {
    const result = parseSeriesSingleFileRows(context, [
      seriesRow({
        workTitle: "",
        author: "크루크루",
        sourceRowIndex: 8,
        cookieAutoCharge: 100,
        total: 100,
      }),
      seriesRow({
        workTitle: "작품명 있음",
        author: "",
        sourceRowIndex: 9,
        cookieAutoCharge: 100,
        total: 100,
      }),
    ], "general");

    expect(result.rows).toEqual([]);
    expect(result.issues).toEqual([
      expect.objectContaining({
        issueType: "missing_field",
        severity: "error",
        sourceFileName: "contentsSelling_2026-06-08.xls",
        sourceRowIndex: 8,
        message: expect.stringContaining("컨텐츠"),
      }),
      expect.objectContaining({
        issueType: "missing_field",
        severity: "error",
        sourceFileName: "contentsSelling_2026-06-08.xls",
        sourceRowIndex: 9,
        message: expect.stringContaining("작가명"),
      }),
    ]);
  });

  it("reports invalid Series numeric cells instead of silently treating them as zero", () => {
    const result = parseSeriesSingleFileRows(context, [{
      ...seriesRow({
        workTitle: "숫자 오류 작품",
        author: "작가",
        sourceRowIndex: 10,
        cookieAutoCharge: 100,
        total: 100,
      }),
      [SERIES_CATEGORY_COLUMN_MAPPINGS.google_external[1]]: "bad-money",
    }], "general");

    expect(result.rows).toEqual([]);
    expect(result.issues).toEqual([
      expect.objectContaining({
        issueType: "invalid_value",
        severity: "error",
        sourceFileName: "contentsSelling_2026-06-08.xls",
        sourceRowIndex: 10,
        message: expect.stringContaining(SERIES_CATEGORY_COLUMN_MAPPINGS.google_external[1]),
      }),
    ]);
  });

});
