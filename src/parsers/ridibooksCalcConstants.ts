export type RidibooksFileSlot = "base" | "file1" | "event" | "mgCorrection";

export type RidibooksOutputKind = "normal" | "app" | "event" | "eventApp";

export type RidibooksRateKind = "normal" | "app" | "mg";

export type RidibooksRequiredColumnGroup = {
  identity: readonly string[];
  amounts: readonly string[];
};

export const RIDIBOOKS_FILE_SLOTS = {
  base: { required: true },
  file1: { required: true },
  event: { required: false },
  mgCorrection: { required: false },
} as const satisfies Record<RidibooksFileSlot, { required: boolean }>;

export const RIDIBOOKS_CALC_RATES = {
  normal: 0.7,
  app: 0.7,
  mg: 0.6,
} as const satisfies Record<RidibooksRateKind, number>;

export const RIDIBOOKS_OUTPUT_SUFFIXES = {
  normal: "",
  app: "(app)",
  event: "(이벤트)",
  eventApp: "(이벤트)(app)",
} as const satisfies Record<RidibooksOutputKind, string>;

export const RIDIBOOKS_MG_POLICY = {
  source: "explicit_correction_input",
  forbidsFilenameInference: true,
  forbidsSourceRowInference: true,
  defaultWhenMissing: "non_mg",
  recommendedPrimaryKey: "도서 ID",
  fallbackKey: "작품명",
} as const;

export const RIDIBOOKS_EVENT_PERIOD_POLICY = {
  requiredWhenEventFileExists: true,
  missingPeriodBlocksParsing: true,
  classificationColumn: "결제일",
  startDateField: "eventStartDate",
  endDateField: "eventEndDate",
} as const;

export const RIDIBOOKS_REQUIRED_COLUMNS = {
  base: {
    identity: ["도서 ID", "제목", "저자", "출판사"],
    amounts: [
      "일반판매액",
      "일반취소액",
      "앱마켓정산대상액",
      "앱마켓 수수료",
      "앱마켓취소액",
      "정산액",
    ],
  },
  file1: {
    identity: ["도서 ID", "제목"],
    amounts: ["일반판매액", "일반취소액", "정산액"],
  },
  event: {
    identity: ["도서ID", "제목"],
    amounts: [
      "결제일",
      "일반판매액",
      "일반정산액",
      "ios앱마켓정산대상액",
      "ios앱마켓정산액",
      "Android앱마켓정산대상액",
      "Android앱마켓정산액",
      "OneStore앱마켓정산대상액",
      "OneStore앱마켓정산액",
    ],
  },
  mgCorrection: {
    matching: ["도서 ID", "작품명"],
    values: ["MG 여부"],
  },
} as const;

// This file intentionally defines only Ridibooks parser contract constants.
// It must not calculate grossSales, settlementAmount, MG overrides, or event replacement.
