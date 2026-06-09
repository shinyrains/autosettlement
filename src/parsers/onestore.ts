import type { Company, ParseIssue, SettlementRow } from "../types/settlement";
import type { ParserContext, ParserResult, TabularRow } from "./parserContract";
import { parseMoney } from "./simpleExtractUtils";

const REQUIRED_COLUMNS = ["상품명", "출판사", "글작가", "합계", "정산지급액"] as const;

export function parseOnestore(context: ParserContext, rows: TabularRow[]): ParserResult {
  const normalizedRows = rows.map(trimHeaderNames);
  const missingColumns = validateRequiredColumns(context, normalizedRows);
  if (missingColumns.length > 0) {
    return { rows: [], issues: missingColumns };
  }

  const issues: ParseIssue[] = [];
  const settlementRows: SettlementRow[] = [];

  for (const row of normalizedRows) {
    const workTitle = readText(row["상품명"]);
    const publisher = readText(row["출판사"]);
    const author = readText(row["글작가"]);

    if (workTitle === "" || publisher === "" || author === "") {
      issues.push(createIssue({
        context,
        row,
        issueType: "missing_field",
        message: "Onestore identity field is missing: 상품명, 출판사, or 글작가.",
      }));
      continue;
    }

    const company = resolveCompanyFromPublisher(publisher);
    if (!company) {
      issues.push(createIssue({
        context,
        row,
        issueType: "company_split_failed",
        message: `Onestore publisher normalization did not match a company: ${publisher}.`,
      }));
      continue;
    }

    const grossSales = parseMoney(row["합계"]);
    if (grossSales === null) {
      issues.push(createIssue({
        context,
        row,
        company,
        issueType: "invalid_value",
        message: "Onestore numeric field is invalid: 합계.",
      }));
      continue;
    }

    const settlementAmount = parseMoney(row["정산지급액"]);
    if (settlementAmount === null) {
      issues.push(createIssue({
        context,
        row,
        company,
        issueType: "invalid_value",
        message: "Onestore numeric field is invalid: 정산지급액.",
      }));
      continue;
    }

    settlementRows.push({
      rowId: `${context.batchId}-onestore-${company}-${getSourceRowIndex(row) ?? "file"}`,
      company,
      platform: "onestore",
      saleMonth: context.saleMonth,
      workTitle,
      mailerContentTitle: workTitle,
      author,
      publisher,
      grossSales,
      settlementAmount,
      sourceFileName: getSourceFileName(row, context),
      sourceRowIndex: getSourceRowIndex(row) ?? 0,
      issues: [],
    });
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
      message: `Onestore required column is missing: ${column}.`,
    }));
}

function resolveCompanyFromPublisher(publisher: string): Company | undefined {
  const normalizedPublisher = normalizePublisher(publisher);
  if (normalizedPublisher === "arete") {
    return "sr";
  }

  if (normalizedPublisher === "라온이앤엠" || normalizedPublisher === "라온e&m") {
    return "raon";
  }

  return undefined;
}

function normalizePublisher(value: string): string {
  return value.trim().toLowerCase().replace(/[\s_-]/g, "");
}

function createIssue({
  context,
  issueType,
  message,
  row,
  company,
}: {
  context: ParserContext;
  issueType: ParseIssue["issueType"];
  message: string;
  row?: TabularRow;
  company?: Company;
}): ParseIssue {
  const sourceFileName = row ? getSourceFileName(row, context) : context.sourceFileName;
  const sourceRowIndex = row ? getSourceRowIndex(row) : undefined;
  return {
    issueId: [
      context.batchId,
      "onestore",
      issueType,
      sourceFileName,
      sourceRowIndex ?? "file",
      hashText(message),
    ].join("-"),
    batchId: context.batchId,
    company: company ?? context.company,
    platform: "onestore",
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
