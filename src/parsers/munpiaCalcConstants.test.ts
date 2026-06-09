import { describe, expect, it } from "vitest";
import {
  MUNPIA_AUTHOR_CORRECTION_POLICY,
  MUNPIA_CALC_RATES,
  MUNPIA_OUTPUT_SUFFIXES,
  MUNPIA_REQUIRED_COLUMNS,
  MUNPIA_ROUNDING_POLICY,
  MUNPIA_SOURCE_STRUCTURE,
  MUNPIA_TOTAL_ROW_POLICY,
  MUNPIA_ZERO_ROW_POLICY,
} from "./munpiaCalcConstants";

describe("munpia calculation constants", () => {
  it("fixes source structure and total row policy", () => {
    expect(MUNPIA_SOURCE_STRUCTURE).toMatchObject({
      fileKind: "xlsx",
      sheetSelection: "first_sheet",
      headerRowIndex: 1,
      dataStartRowIndex: 3,
      headerTrimRequired: true,
    });
    expect(MUNPIA_TOTAL_ROW_POLICY).toEqual({
      markerColumn: "번호",
      markerValue: "Total",
      exclude: true,
    });
  });

  it("fixes required columns with exact IOS casing", () => {
    expect(MUNPIA_REQUIRED_COLUMNS.identity).toEqual(["작가", "작품"]);
    expect(MUNPIA_REQUIRED_COLUMNS.amounts).toEqual([
      "총매출",
      "IOS매출",
      "Google매출",
    ]);
    expect(MUNPIA_REQUIRED_COLUMNS.reference).toEqual(["정산"]);
    expect(MUNPIA_REQUIRED_COLUMNS.correction).toEqual(["작품코드", "계정"]);
  });

  it("fixes web and app rates without implementing calculation", () => {
    expect(MUNPIA_CALC_RATES).toEqual({
      web: 0.63,
      iosApp: 0.441,
      googleApp: 0.567,
    });
  });

  it("fixes output suffix and zero row policies", () => {
    expect(MUNPIA_OUTPUT_SUFFIXES).toEqual({
      web: "",
      app: "(app)",
    });
    expect(MUNPIA_ZERO_ROW_POLICY).toEqual({
      skipZeroWebGrossSales: true,
      skipZeroAppGrossSales: true,
    });
  });

  it("fixes author correction and rounding policies", () => {
    expect(MUNPIA_AUTHOR_CORRECTION_POLICY).toMatchObject({
      source: "explicit_correction_input",
      primaryKey: "작품코드",
      fallbackKey: "작품",
      forbidsAutomaticGuessing: true,
      forbidsFuzzyMatching: true,
    });
    expect(MUNPIA_AUTHOR_CORRECTION_POLICY.requiredForAuthorLabels).toEqual([
      "AreteBooks",
      "aretebooks",
      "아레떼북스",
    ]);
    expect(MUNPIA_ROUNDING_POLICY).toEqual({
      rule: "round_nearest_integer",
      source: "munpia_contract",
    });
  });
});
