import type { ParseIssue, SettlementRow } from "../types/settlement";
import type { ParserContext, ParserResult, TabularRow } from "./parserContract";
import { parseMoney } from "./simpleExtractUtils";

const REQUIRED_COLUMNS = [
  "회차 제목",
  "저자",
  "출판사",
  "합계 총액 / 판매금액",
  "표지 / 정산비율",
] as const;

export function parsePanmurim(context: ParserContext, rows: TabularRow[]): ParserResult {
  const normalizedRows = rows.map(trimHeaderNames);
  const missingColumns = validateRequiredColumns(context, normalizedRows);
  if (missingColumns.length > 0) {
    return { rows: [], issues: missingColumns };
  }

  const issues: ParseIssue[] = [];
  const settlementRows: SettlementRow[] = [];

  for (const row of normalizedRows) {
    const workTitle = readText(row["회차 제목"]);
    const author = readText(row["저자"]);
    const publisher = readText(row["출판사"]);

    if (workTitle === "" || author === "") {
      issues.push(createIssue({
        context,
        row,
        issueType: "missing_field",
        message: "Panmurim identity field is missing: 회차 제목 or 저자.",
      }));
      continue;
    }

    const grossSales = parseMoney(row["합계 총액 / 판매금액"]);
    if (grossSales === null) {
      issues.push(createIssue({
        context,
        row,
        issueType: "invalid_value",
        message: "Panmurim numeric field is invalid: 합계 총액 / 판매금액.",
      }));
      continue;
    }

    const settlementRate = parseMoney(row["표지 / 정산비율"]);
    if (settlementRate === null) {
      issues.push(createIssue({
        context,
        row,
        issueType: "invalid_value",
        message: "Panmurim numeric field is invalid: 표지 / 정산비율.",
      }));
      continue;
    }

    settlementRows.push(buildSettlementRow({
      context,
      row,
      workTitle,
      author,
      publisher,
      grossSales,
      settlementAmount: grossSales * settlementRate,
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
      message: `Panmurim required column is missing: ${column}.`,
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
    rowId: `${context.batchId}-panmurim-${sourceRowIndex ?? "file"}`,
    company: context.company,
    platform: "panmurim",
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
      "panmurim",
      issueType,
      sourceFileName,
      sourceRowIndex ?? "file",
      hashText(message),
    ].join("-"),
    batchId: context.batchId,
    company: context.company,
    platform: "panmurim",
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
