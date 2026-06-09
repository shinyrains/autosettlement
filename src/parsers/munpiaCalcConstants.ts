export type MunpiaOutputKind = "web" | "app";

export type MunpiaRateKind = "web" | "iosApp" | "googleApp";

export type MunpiaSheetSelection = "first_sheet";

export type MunpiaRequiredColumnGroup = {
  identity: readonly string[];
  amounts: readonly string[];
  reference: readonly string[];
  correction: readonly string[];
};

export type MunpiaAuthorCorrectionPolicy = {
  source: "explicit_correction_input";
  primaryKey: "작품코드";
  fallbackKey: "작품";
  requiredForAuthorLabels: readonly string[];
  forbidsAutomaticGuessing: boolean;
  forbidsFuzzyMatching: boolean;
};

export const MUNPIA_SOURCE_STRUCTURE = {
  fileKind: "xlsx",
  sheetSelection: "first_sheet",
  headerRowIndex: 1,
  dataStartRowIndex: 3,
  headerTrimRequired: true,
} as const satisfies {
  fileKind: "xlsx";
  sheetSelection: MunpiaSheetSelection;
  headerRowIndex: number;
  dataStartRowIndex: number;
  headerTrimRequired: boolean;
};

export const MUNPIA_TOTAL_ROW_POLICY = {
  markerColumn: "번호",
  markerValue: "Total",
  exclude: true,
} as const;

export const MUNPIA_REQUIRED_COLUMNS = {
  identity: ["작가", "작품"],
  amounts: ["총매출", "IOS매출", "Google매출"],
  reference: ["정산"],
  correction: ["작품코드", "계정"],
} as const satisfies MunpiaRequiredColumnGroup;

export const MUNPIA_CALC_RATES = {
  web: 0.63,
  iosApp: 0.441,
  googleApp: 0.567,
} as const satisfies Record<MunpiaRateKind, number>;

export const MUNPIA_OUTPUT_SUFFIXES = {
  web: "",
  app: "(app)",
} as const satisfies Record<MunpiaOutputKind, string>;

export const MUNPIA_ZERO_ROW_POLICY = {
  skipZeroWebGrossSales: true,
  skipZeroAppGrossSales: true,
} as const;

export const MUNPIA_AUTHOR_CORRECTION_POLICY = {
  source: "explicit_correction_input",
  primaryKey: "작품코드",
  fallbackKey: "작품",
  requiredForAuthorLabels: ["AreteBooks", "aretebooks", "아레떼북스"],
  forbidsAutomaticGuessing: true,
  forbidsFuzzyMatching: true,
} as const satisfies MunpiaAuthorCorrectionPolicy;

export const MUNPIA_ROUNDING_POLICY = {
  rule: "round_nearest_integer",
  source: "munpia_contract",
} as const;

// This file intentionally defines Munpia parser contract constants only.
// It must not calculate grossSales, settlementAmount, author correction, or row splitting.
