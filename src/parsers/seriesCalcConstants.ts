export type SeriesCalcCategory =
  | "icookie"
  | "cookie_auto_charge"
  | "google"
  | "google_external"
  | "onestore"
  | "redeem"
  | "free";

export type SeriesCalcGroup = "general" | "app";

export type SeriesRoundingPolicy = {
  source: "series_calc_method_xlsx";
  rule: "follow_authority_file";
  note: string;
};

export const SERIES_CALC_AUTHORITY = {
  fileName: "시리즈 계산방법.xlsx",
  principle: "follow_authority_file",
  forbidsArbitraryFormula: true,
  forbidsColumnGuessing: true,
} as const;

export const SERIES_CALC_RATES = {
  icookie: 0.49,
  cookie_auto_charge: 0.679,
  google: 0.63,
  google_external: 0.637,
  onestore: 0.644,
  redeem: 0.595,
  free: 0.7,
} as const satisfies Record<SeriesCalcCategory, number>;

export const SERIES_REQUIRED_FILE_COUNTS = {
  general: 3,
  app: 3,
  total: 6,
} as const satisfies Record<SeriesCalcGroup | "total", number>;

export const SERIES_EXPECTED_HTML_TABLE_INDEX = 1 as const;

export const SERIES_ROUNDING_POLICY = {
  source: "series_calc_method_xlsx",
  rule: "follow_authority_file",
  note:
    "Do not hard-code rounding, truncation, or final amount handling until it is confirmed from 시리즈 계산방법.xlsx and fixture expected values.",
} as const satisfies SeriesRoundingPolicy;

// Intentionally not defined here:
// - original Series column names
// - category-to-column mappings
// - grossSales or settlementAmount formulas
// These remain authority/fixture-driven follow-up work to avoid freezing a guessed formula.
