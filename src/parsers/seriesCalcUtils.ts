import type { TabularRow } from "./parserContract";
import {
  SERIES_CALC_RATES,
  type SeriesCalcCategory,
} from "./seriesCalcConstants";
import {
  SERIES_CATEGORY_COLUMN_MAPPINGS,
  SERIES_REFERENCE_COLUMNS,
  SERIES_TOTAL_ROW_MARKER,
} from "./seriesColumnMappings";
import type { SeriesSourceRef } from "./seriesContract";

export type SeriesCategoryAmount = {
  category: SeriesCalcCategory;
  grossAmount: number;
  rate: number;
  settlementAmount: number;
  sourceRefs: SeriesSourceRef[];
};

export type SeriesReferenceAmounts = {
  total: number;
  marketFeeEstimate: number;
  paidTicketAdjustment: number;
};

export type SeriesRowCalculation = {
  categoryAmounts: SeriesCategoryAmount[];
  grossSales: number;
  settlementAmount: number;
  referenceAmounts: SeriesReferenceAmounts;
  sourceRefs: SeriesSourceRef[];
};

export function calculateSeriesRow(row: TabularRow): SeriesRowCalculation {
  const sourceRefs = createSourceRefs(row);
  const categoryAmounts = (Object.keys(SERIES_CATEGORY_COLUMN_MAPPINGS) as SeriesCalcCategory[]).map(
    (category) => {
      const grossAmount = sumColumns(row, SERIES_CATEGORY_COLUMN_MAPPINGS[category]);
      return {
        category,
        grossAmount,
        rate: SERIES_CALC_RATES[category],
        settlementAmount: normalizeAmount(grossAmount * SERIES_CALC_RATES[category]),
        sourceRefs,
      };
    },
  );

  const paidCategoryAmounts = categoryAmounts.filter((amount) => amount.category !== "free");

  return {
    categoryAmounts,
    grossSales: normalizeAmount(sumValues(paidCategoryAmounts.map((amount) => amount.grossAmount))),
    settlementAmount: normalizeAmount(
      sumValues(paidCategoryAmounts.map((amount) => amount.settlementAmount)),
    ),
    referenceAmounts: {
      total: parseSeriesNumber(row[SERIES_REFERENCE_COLUMNS.total]),
      marketFeeEstimate: parseSeriesNumber(row[SERIES_REFERENCE_COLUMNS.marketFeeEstimate]),
      paidTicketAdjustment: parseSeriesNumber(row[SERIES_REFERENCE_COLUMNS.paidTicketAdjustment]),
    },
    sourceRefs,
  };
}

export function isSeriesTotalRow(row: TabularRow): boolean {
  return Object.values(row).some((value) => String(value).trim() === SERIES_TOTAL_ROW_MARKER);
}

function sumColumns(row: TabularRow, columnNames: readonly string[]): number {
  return normalizeAmount(sumValues(columnNames.map((columnName) => parseSeriesNumber(row[columnName]))));
}

function sumValues(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

function parseSeriesNumber(value: unknown): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  const normalized = String(value ?? "").trim().replace(/,/g, "");
  if (normalized === "") {
    return 0;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function createSourceRefs(row: TabularRow): SeriesSourceRef[] {
  const sourceFileName = row.sourceFileName;
  const sourceRowIndex = row.sourceRowIndex;

  if (typeof sourceFileName !== "string" || typeof sourceRowIndex !== "number") {
    return [];
  }

  return [{ sourceFileName, sourceRowIndex }];
}

function normalizeAmount(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
