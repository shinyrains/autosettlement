import type { ParseIssue, SettlementRow } from "../types/settlement";
import type { ParserContext, ParserResult, TabularRow } from "./parserContract";
import { parseMoney } from "./simpleExtractUtils";

const REQUIRED_COLUMNS = ["제목", "저자", "판매액", "정산액"] as const;

export function parseBookcube(context: ParserContext, rows: TabularRow[]): ParserResult {
  const normalizedRows = rows.map(trimHeaderNames);
  const missingColumns = validateRequiredColumns(context, normalizedRows);
  if (missingColumns.length > 0) {
    return { rows: [], issues: missingColumns };
  }

  const issues: ParseIssue[] = [];
  const settlementRows: SettlementRow[] = [];

  for (const row of normalizedRows) {
    const workTitle = readText(row["제목"]);
    const author = readText(row["저자"]);

    if (workTitle === "" || author === "") {
      issues.push(createIssue({
        context,
        row,
        issueType: "missing_field",
        message: "Bookcube identity field is missing: 제목 or 저자.",
      }));
      continue;
    }

    const grossSales = parseMoney(row["판매액"]);
    if (grossSales === null) {
      issues.push(createIssue({
        context,
        row,
        issueType: "invalid_value",
        message: "Bookcube numeric field is invalid: 판매액.",
      }));
      continue;
    }

    const settlementAmount = parseMoney(row["정산액"]);
    if (settlementAmount === null) {
      issues.push(createIssue({
        context,
        row,
        issueType: "invalid_value",
        message: "Bookcube numeric field is invalid: 정산액.",
      }));
      continue;
    }

    settlementRows.push(buildSettlementRow({
      context,
      row,
      workTitle,
      author,
      publisher: readText(row["출판권자"]),
      grossSales,
      settlementAmount,
    }));
  }

  return { rows: settlementRows, issues };
}

function trimHeaderNames(row: TabularRow): TabularRow {
  return Object.fromEntries(Object.entries(row).map(([key, value]) => [key.trim(), value]));
}

function validateRequiredColumns(context: ParserContext, rows: TabularRow[]): ParseIssue[] {
  if (rows.length === 0) {
    return [];
  }

  const presentColumns = new Set(rows.flatMap((row) => Object.keys(row)));
  return REQUIRED_COLUMNS
    .filter((column) => !presentColumns.has(column))
    .map((column) => createIssue({
      context,
      issueType: "missing_column",
      message: `Bookcube required column is missing: ${column}.`,
    }));
}

function buildSettlementRow({
  context,
  row,
  workTitle,
  author,
  publisher,
  grossSales,
  settlementAmount,
}: {
  context: ParserContext;
  row: TabularRow;
  workTitle: string;
  author: string;
  publisher: string;
  grossSales: number;
  settlementAmount: number;
}): SettlementRow {
  const sourceRowIndex = getSourceRowIndex(row);
  return {
    rowId: `${context.batchId}-bookcube-${sourceRowIndex ?? "file"}`,
    company: context.company,
    platform: "bookcube",
    saleMonth: context.saleMonth,
    workTitle,
    mailerContentTitle: workTitle,
    author,
    ...(publisher === "" ? {} : { publisher }),
    grossSales,
    settlementAmount,
    sourceFileName: getSourceFileName(row, context),
    sourceRowIndex: sourceRowIndex ?? 0,
    issues: [],
  };
}

function createIssue({
  context,
  issueType,
  message,
  row,
}: {
  context: ParserContext;
  issueType: ParseIssue["issueType"];
  message: string;
  row?: TabularRow;
}): ParseIssue {
  const sourceFileName = row ? getSourceFileName(row, context) : context.sourceFileName;
  const sourceRowIndex = row ? getSourceRowIndex(row) : undefined;
  return {
    issueId: [
      context.batchId,
      "bookcube",
      issueType,
      sourceFileName,
      sourceRowIndex ?? "file",
      hashText(message),
    ].join("-"),
    batchId: context.batchId,
    company: context.company,
    platform: "bookcube",
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
