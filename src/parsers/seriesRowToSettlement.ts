import type { TabularRow } from "./parserContract";
import type { SeriesCalcGroup } from "./seriesCalcConstants";
import type { SeriesRowCalculation } from "./seriesCalcUtils";
import { SERIES_IDENTITY_COLUMNS } from "./seriesColumnMappings";
import type { Company, SettlementRow } from "../types/settlement";

export type SeriesRowToSettlementContext = {
  batchId: string;
  company: Company;
  saleMonth: string;
  sourceFileName: string;
};

export type MapSeriesRowToSettlementInput = {
  calculation: SeriesRowCalculation;
  identityRow: TabularRow;
  context: SeriesRowToSettlementContext;
  slot: SeriesCalcGroup;
};

export function mapSeriesRowToSettlement({
  calculation,
  identityRow,
  context,
  slot,
}: MapSeriesRowToSettlementInput): SettlementRow {
  const representativeSource = calculation.sourceRefs[0] ?? {
    sourceFileName: context.sourceFileName,
    sourceRowIndex: 0,
  };
  const workTitle = readIdentityField(identityRow, SERIES_IDENTITY_COLUMNS.workTitle);

  return {
    rowId: [
      context.batchId,
      "series",
      context.company,
      slot,
      representativeSource.sourceFileName,
      representativeSource.sourceRowIndex,
    ].join("-"),
    company: context.company,
    platform: "series",
    saleMonth: context.saleMonth,
    workTitle,
    mailerContentTitle: slot === "app" ? `${workTitle}(app)` : workTitle,
    author: readIdentityField(identityRow, SERIES_IDENTITY_COLUMNS.author),
    publisher: readOptionalIdentityField(identityRow, SERIES_IDENTITY_COLUMNS.publisher),
    grossSales: calculation.grossSales,
    settlementAmount: calculation.settlementAmount,
    sourceFileName: representativeSource.sourceFileName,
    sourceRowIndex: representativeSource.sourceRowIndex,
    issues: [],
  };
}

function readIdentityField(row: TabularRow, columnName: string): string {
  return String(row[columnName] ?? "").trim();
}

function readOptionalIdentityField(row: TabularRow, columnName: string): string | undefined {
  const value = readIdentityField(row, columnName);
  return value === "" ? undefined : value;
}
