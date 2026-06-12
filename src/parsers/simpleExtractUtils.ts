import type { ParseIssue, SettlementRow } from "../types/settlement";
import type {
  CreateParseIssueInput,
  ParserContext,
  ParserResult,
  SimpleExtractMapping,
  TabularRow,
} from "./parserContract";

export function createParseIssue({
  context,
  issueType,
  message,
  sourceRowIndex,
  rowId,
}: CreateParseIssueInput): ParseIssue {
  return {
    issueId: [
      context.batchId,
      context.platform,
      issueType,
      sourceRowIndex ?? "file",
    ].join("-"),
    batchId: context.batchId,
    company: context.company,
    platform: context.platform,
    severity: "error",
    issueType,
    message,
    sourceFileName: context.sourceFileName,
    sourceRowIndex,
    rowId,
  };
}

export function findMissingColumns(rows: TabularRow[], mapping: SimpleExtractMapping): string[] {
  const availableColumns = new Set(rows.flatMap((row) => Object.keys(row)));
  return requiredColumns(mapping).filter((column) => !availableColumns.has(column));
}

export function requiredColumns(mapping: SimpleExtractMapping): string[] {
  return [
    mapping.columns.workTitle,
    mapping.columns.author,
    ...(mapping.platform === "yes24" && mapping.columns.publisher ? [mapping.columns.publisher] : []),
    mapping.columns.grossSales,
    mapping.columns.settlementAmount,
  ];
}

export function readRequiredString(row: TabularRow, columnName: string): string | null {
  const value = row[columnName];
  if (value === null || value === undefined) {
    return null;
  }
  const text = String(value).trim();
  return text.length > 0 ? text : null;
}

export function parseMoney(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (value === null || value === undefined) {
    return null;
  }
  const normalized = String(value).replace(/,/g, "").trim();
  if (normalized.length === 0) {
    return null;
  }
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export function buildSimpleExtractRow({
  context,
  mapping,
  row,
  sourceRowIndex,
}: {
  context: ParserContext;
  mapping: SimpleExtractMapping;
  row: TabularRow;
  sourceRowIndex: number;
}): SettlementRow | ParseIssue {
  const rowId = `${context.batchId}-${context.platform}-${sourceRowIndex}`;
  const workTitle = readRequiredString(row, mapping.columns.workTitle);
  const author = readRequiredString(row, mapping.columns.author);
  const grossSales = parseMoney(row[mapping.columns.grossSales]);
  const settlementAmount = parseMoney(row[mapping.columns.settlementAmount]);

  if (!workTitle || !author) {
    return createParseIssue({
      context,
      issueType: "missing_field",
      message: `Required value is missing at row ${sourceRowIndex}.`,
      sourceRowIndex,
      rowId,
    });
  }

  if (grossSales === null || settlementAmount === null) {
    return createParseIssue({
      context,
      issueType: "invalid_value",
      message: `Money value cannot be parsed at row ${sourceRowIndex}.`,
      sourceRowIndex,
      rowId,
    });
  }

  const publisher = mapping.columns.publisher
    ? readRequiredString(row, mapping.columns.publisher)
    : null;

  return {
    rowId,
    company: context.company,
    platform: context.platform,
    saleMonth: context.saleMonth,
    workTitle,
    mailerContentTitle: workTitle,
    author,
    ...(publisher ? { publisher } : {}),
    grossSales,
    settlementAmount,
    sourceFileName: context.sourceFileName,
    sourceRowIndex,
    issues: [],
  };
}

export function parseSimpleExtractRows({
  context,
  mapping,
  rows,
}: {
  context: ParserContext;
  mapping: SimpleExtractMapping;
  rows: TabularRow[];
}): ParserResult {
  const missingColumns = findMissingColumns(rows, mapping);
  if (missingColumns.length > 0) {
    return {
      rows: [],
      issues: [
        createParseIssue({
          context,
          issueType: "missing_column",
          message: `Missing required columns: ${missingColumns.join(", ")}`,
        }),
      ],
    };
  }

  return rows.reduce<ParserResult>(
    (result, row, index) => {
      const parsed = buildSimpleExtractRow({
        context,
        mapping,
        row,
        sourceRowIndex: index + 2,
      });

      if ("issueId" in parsed) {
        result.issues.push(parsed);
      } else {
        result.rows.push(parsed);
      }

      return result;
    },
    { rows: [], issues: [] },
  );
}
