import type { SeriesCalcCategory } from "./seriesCalcConstants";

export type SeriesColumnName = string;

export const SERIES_IDENTITY_COLUMNS = {
  workTitle: "컨텐츠",
  author: "작가명",
  publisher: "출판사",
} as const;

export const SERIES_REFERENCE_COLUMNS = {
  total: "합계",
  marketFeeEstimate: "마켓수수료(추정치)",
  paidTicketAdjustment: "유상 이용권 보정",
} as const;

export const SERIES_TOTAL_ROW_MARKER = "합계" as const;

export const SERIES_CATEGORY_COLUMN_MAPPINGS = {
  icookie: [
    "대여권 / 유상i쿠키",
    "소장권 / 유상i쿠키",
    "i쿠키로 대여 / 유상",
    "i쿠키로 구매 / 유상",
  ],
  cookie_auto_charge: [
    "대여권 / 유상쿠키",
    "소장권 / 유상쿠키",
    "대여권 / 유상자동충전쿠키",
    "소장권 / 유상자동충전쿠키",
    "쿠키로 대여 / 유상",
    "쿠키로 구매 / 유상",
    "자동충전 쿠키로 대여 / 유상",
    "자동충전 쿠키로 구매 / 유상",
  ],
  google: ["구글 쿠키로 대여 / 유상", "구글 쿠키로 구매 / 유상"],
  google_external: ["구글 외부 쿠키로 대여 / 유상", "구글 외부 쿠키로 구매 / 유상"],
  onestore: ["원스토어 쿠키로 대여 / 유상", "원스토어 쿠키로 구매 / 유상"],
  redeem: ["리딤 쿠키로 대여 / 유상", "리딤 쿠키로 구매 / 유상"],
  free: [
    "대여권 / 무료이용권",
    "대여권 / 무상쿠키",
    "대여권 / 무상i쿠키",
    "대여권 / 무상자동충전쿠키",
    "소장권 / 무료이용권",
    "소장권 / 무상쿠키",
    "소장권 / 무상i쿠키",
    "소장권 / 무상자동충전쿠키",
    "쿠키로 대여 / 무상",
    "쿠키로 구매 / 무상",
    "i쿠키로 대여 / 무상",
    "i쿠키로 구매 / 무상",
    "자동충전 쿠키로 대여 / 무상",
    "자동충전 쿠키로 구매 / 무상",
    "구글 쿠키로 대여 / 무상",
    "구글 쿠키로 구매 / 무상",
    "구글 외부 쿠키로 대여 / 무상",
    "구글 외부 쿠키로 구매 / 무상",
    "원스토어 쿠키로 대여 / 무상",
    "원스토어 쿠키로 구매 / 무상",
    "리딤 쿠키로 대여 / 무상",
    "리딤 쿠키로 구매 / 무상",
  ],
} as const satisfies Record<SeriesCalcCategory, readonly SeriesColumnName[]>;

// This file intentionally contains only column contract constants.
// It must not calculate grossSales, settlementAmount, fees, or rounding.
