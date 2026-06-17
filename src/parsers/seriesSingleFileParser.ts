import type { ParseIssue } from "../types/settlement";
import type { ParserContext, ParserResult, TabularRow } from "./parserContract";
import type { SeriesCalcGroup } from "./seriesCalcConstants";
import { calculateSeriesRow, isSeriesTotalRow } from "./seriesCalcUtils";
import {
  SERIES_CATEGORY_COLUMN_MAPPINGS,
  SERIES_IDENTITY_COLUMNS,
  SERIES_REFERENCE_COLUMNS,
} from "./seriesColumnMappings";
import { mapSeriesRowToSettlement } from "./seriesRowToSettlement";

const NUMERIC_COLUMNS = [
  ...Object.values(SERIES_CATEGORY_COLUMN_MAPPINGS).flat(),
  ...Object.values(SERIES_REFERENCE_COLUMNS),
] as const;

export function parseSeriesSingleFileRows(
  context: ParserContext,
  rows: TabularRow[],
  slot: SeriesCalcGroup,
): ParserResult {
  const issues: ParseIssue[] = [];
  const settlementRows = rows
    .filter((row) => !isSeriesTotalRow(row))
    .flatMap((row) => {
      const identityIssue = validateIdentity(context, row);
      if (identityIssue) {
        issues.push(identityIssue);
        return [];
      }

      const amountIssue = validateNumericCells(context, row);
      if (amountIssue) {
        issues.push(amountIssue);
        return [];
      }

      return [mapSeriesRowToSettlement({
        calculation: calculateSeriesRow(row),
        identityRow: row,
        context,
        slot,
      })];
    });

  return {
    rows: settlementRows,
    issues,
  };
}

function validateIdentity(context: ParserContext, row: TabularRow): ParseIssue | undefined {
  const missingColumn = [SERIES_IDENTITY_COLUMNS.workTitle, SERIES_IDENTITY_COLUMNS.author]
    .find((column) => readText(row[column]) === "");

  if (!missingColumn) {
    return undefined;
  }

  return createIssue({
    context,
    row,
    issueType: "missing_field",
    message: `Series identity field is missing: ${missingColumn}.`,
  });
}

function validateNumericCells(context: ParserContext, row: TabularRow): ParseIssue | undefined {
  const invalidColumn = NUMERIC_COLUMNS.find((column) => !isValidOptionalSeriesNumber(row[column]));
  if (!invalidColumn) {
    return undefined;
  }

  return createIssue({
    context,
    row,
    issueType: "invalid_value",
    message: `Series numeric field is invalid: ${invalidColumn}.`,
  });
}

function isValidOptionalSeriesNumber(value: unknown): boolean {
  if (value === undefined || value === null || value === "") {
    return true;
  }

  if (typeof value === "number") {
    return Number.isFinite(value);
  }

  const normalized = String(value).trim().replace(/,/g, "");
  if (normalized === "") {
    return true;
  }

  return Number.isFinite(Number(normalized));
}

function createIssue({
  context,
  row,
  issueType,
  message,
}: {
  context: ParserContext;
  row: TabularRow;
  issueType: ParseIssue["issueType"];
  message: string;
}): ParseIssue {
  const sourceFileName = getSourceFileName(row, context);
  const sourceRowIndex = getSourceRowIndex(row);
  return {
    issueId: [
      context.batchId,
      "series",
      issueType,
      sourceFileName,
      sourceRowIndex ?? "file",
      hashText(message),
    ].join("-"),
    batchId: context.batchId,
    company: context.company,
    platform: "series",
    severity: "error",
    issueType,
    message,
    sourceFileName,
    ...(sourceRowIndex !== undefined ? { sourceRowIndex } : {}),
  };
}

function getSourceFileName(row: TabularRow, context: ParserContext): string {
  return typeof row.sourceFileName === "string" ? row.sourceFileName : context.sourceFileName;
}

function getSourceRowIndex(row: TabularRow): number | undefined {
  return typeof row.sourceRowIndex === "number" ? row.sourceRowIndex : undefined;
}

function readText(value: unknown): string {
  return String(value ?? "").trim();
}

function hashText(value: string): string {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash.toString(36);
}
