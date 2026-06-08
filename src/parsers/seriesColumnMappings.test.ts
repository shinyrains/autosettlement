import { describe, expect, it } from "vitest";
import { SERIES_CALC_RATES } from "./seriesCalcConstants";
import {
  SERIES_CATEGORY_COLUMN_MAPPINGS,
  SERIES_IDENTITY_COLUMNS,
  SERIES_REFERENCE_COLUMNS,
  SERIES_TOTAL_ROW_MARKER,
} from "./seriesColumnMappings";

describe("series column mapping contract", () => {
  it("keeps category mapping keys aligned with series rate keys", () => {
    expect(Object.keys(SERIES_CATEGORY_COLUMN_MAPPINGS).sort()).toEqual(
      Object.keys(SERIES_CALC_RATES).sort(),
    );
  });

  it("defines identity, reference, and total row marker columns without calculation logic", () => {
    expect(SERIES_IDENTITY_COLUMNS).toEqual({
      workTitle: "컨텐츠",
      author: "작가명",
      publisher: "출판사",
    });
    expect(SERIES_REFERENCE_COLUMNS).toEqual({
      total: "합계",
      marketFeeEstimate: "마켓수수료(추정치)",
      paidTicketAdjustment: "유상 이용권 보정",
    });
    expect(SERIES_TOTAL_ROW_MARKER).toBe("합계");
  });
});
