import type { ParseIssue, SettlementRow } from "../types/settlement";
import type { ParserContext, ParserResult, TabularRow } from "./parserContract";

const REQUIRED_COLUMNS = [
  "작품코드",
  "작품명",
  "작가명",
  "합계(정액+종량) / 정산액",
  "종량 / 블루머니 / 권별 대여 / 매출액",
  "종량 / 블루머니 / 권별 소장 / 매출액",
  "종량 / 블루머니 / 전권 대여 / 매출액",
  "종량 / 블루머니 / 전권 소장 / 매출액",
  "종량 / A.앱머니 / 권별 대여 / 매출액",
  "종량 / A.앱머니 / 권별 소장 / 매출액",
  "종량 / A.앱머니 / 전권 대여 / 매출액",
  "종량 / A.앱머니 / 전권 소장 / 매출액",
  "종량 / i.앱머니 / 권별 대여 / 매출액",
  "종량 / i.앱머니 / 권별 소장 / 매출액",
  "종량 / i.앱머니 / 전권 대여 / 매출액",
  "종량 / i.앱머니 / 전권 소장 / 매출액",
] as const;

const NORMAL_GROSS_COLUMNS = [
  "종량 / 블루머니 / 권별 대여 / 매출액",
  "종량 / 블루머니 / 권별 소장 / 매출액",
  "종량 / 블루머니 / 전권 대여 / 매출액",
  "종량 / 블루머니 / 전권 소장 / 매출액",
] as const;

const APP_GROSS_COLUMNS = [
  "종량 / A.앱머니 / 권별 대여 / 매출액",
  "종량 / A.앱머니 / 권별 소장 / 매출액",
  "종량 / A.앱머니 / 전권 대여 / 매출액",
  "종량 / A.앱머니 / 전권 소장 / 매출액",
  "종량 / i.앱머니 / 권별 대여 / 매출액",
  "종량 / i.앱머니 / 권별 소장 / 매출액",
  "종량 / i.앱머니 / 전권 대여 / 매출액",
  "종량 / i.앱머니 / 전권 소장 / 매출액",
] as const;

const TOTAL_SETTLEMENT_COLUMN = "합계(정액+종량) / 정산액" as const;

export function parseMisterblueSingleFileRows(
  context: ParserContext,
  rows: TabularRow[],
): ParserResult {
  const normalizedRows = rows.map(trimHeaderNames);
  const missingColumns = validateRequiredColumns(context, normalizedRows);
  if (missingColumns.length > 0) {
    return { rows: [], issues: missingColumns };
  }

  const issues: ParseIssue[] = [];
  const settlementRows: SettlementRow[] = [];
  const seenKeys = new Set<string>();

  for (const row of normalizedRows) {
    if (isAggregateSummaryRow(row)) {
      continue;
    }

    const workTitle = readText(row["작품명"]);
    const author = readText(row["작가명"]);
    if (workTitle === "" || author === "") {
      issues.push(createIssue({
        context,
        row,
        issueType: "missing_field",
        message: "Misterblue identity field is missing: 작품명 or 작가명.",
      }));
      continue;
    }

    const normalGrossResult = readGrossGroup(row, NORMAL_GROSS_COLUMNS);
    if (normalGrossResult.ok === false) {
      issues.push(createIssue({
        context,
        row,
        issueType: "invalid_value",
        message: normalGrossResult.message,
      }));
      continue;
    }

    const appGrossResult = readGrossGroup(row, APP_GROSS_COLUMNS);
    if (appGrossResult.ok === false) {
      issues.push(createIssue({
        context,
        row,
        issueType: "invalid_value",
        message: appGrossResult.message,
      }));
      continue;
    }

    const totalSettlement = parseMoney(row[TOTAL_SETTLEMENT_COLUMN]);
    if (totalSettlement === null) {
      issues.push(createIssue({
        context,
        row,
        issueType: "invalid_value",
        message: `Misterblue numeric field is invalid: ${TOTAL_SETTLEMENT_COLUMN}.`,
      }));
      continue;
    }

    const normalGross = normalGrossResult.value;
    const appGross = appGrossResult.value;
    const totalGross = round1(normalGross + appGross);
    if (totalGross <= 0) {
      continue;
    }

    const normalSettlement = normalGross > 0 && appGross > 0
      ? round1(totalSettlement * normalGross / totalGross)
      : normalGross > 0
        ? round1(totalSettlement)
        : 0;
    const appSettlement = appGross > 0 && normalGross > 0
      ? round1(totalSettlement - normalSettlement)
      : appGross > 0
        ? round1(totalSettlement)
        : 0;

    if (normalGross > 0) {
      const duplicateKey = `${workTitle}\u001f${author}\u001fnormal`;
      if (seenKeys.has(duplicateKey)) {
        issues.push(createIssue({
          context,
          row,
          issueType: "duplicate_row",
          message: `Duplicate Misterblue output row detected for normal split: ${workTitle}.`,
        }));
      } else {
        seenKeys.add(duplicateKey);
        settlementRows.push(buildSettlementRow({
          context,
          row,
          workTitle,
          author,
          rowType: "normal",
          grossSales: normalGross,
          settlementAmount: normalSettlement,
        }));
      }
    }

    if (appGross > 0) {
      const duplicateKey = `${workTitle}\u001f${author}\u001fapp`;
      if (seenKeys.has(duplicateKey)) {
        issues.push(createIssue({
          context,
          row,
          issueType: "duplicate_row",
          message: `Duplicate Misterblue output row detected for app split: ${workTitle}.`,
        }));
      } else {
        seenKeys.add(duplicateKey);
        settlementRows.push(buildSettlementRow({
          context,
          row,
          workTitle,
          author,
          rowType: "app",
          grossSales: appGross,
          settlementAmount: appSettlement,
        }));
      }
    }
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
      message: `Misterblue required column is missing: ${column}.`,
    }));
}

function isAggregateSummaryRow(row: TabularRow): boolean {
  return readText(row["작품코드"]) === "" && readText(row["작품명"]) === "" && readText(row["작가명"]) === "";
}

function readGrossGroup(
  row: TabularRow,
  columns: readonly string[],
): { ok: true; value: number } | { ok: false; message: string } {
  let total = 0;
  for (const column of columns) {
    const parsed = parseMoneyOrBlankAsZero(row[column]);
    if (parsed === null) {
      return { ok: false, message: `Misterblue numeric field is invalid: ${column}.` };
    }
    total += parsed;
  }
  return { ok: true, value: round1(total) };
}

function parseMoneyOrBlankAsZero(value: unknown): number | null {
  if (value === "" || value === null || value === undefined) {
    return 0;
  }
  return parseMoney(value);
}

function parseMoney(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  const normalized = String(value ?? "").replace(/,/g, "").trim();
  if (normalized === "") {
    return null;
  }
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function buildSettlementRow({
  context,
  row,
  workTitle,
  author,
  rowType,
  grossSales,
  settlementAmount,
}: {
  context: ParserContext;
  row: TabularRow;
  workTitle: string;
  author: string;
  rowType: "normal" | "app";
  grossSales: number;
  settlementAmount: number;
}): SettlementRow {
  const sourceRowIndex = getSourceRowIndex(row);
  return {
    rowId: `${context.batchId}-misterblue-${sourceRowIndex ?? "file"}-${rowType}`,
    company: context.company,
    platform: "misterblue",
    saleMonth: context.saleMonth,
    workTitle,
    mailerContentTitle: rowType === "app" ? `${workTitle}(app)` : workTitle,
    author,
    grossSales: round1(grossSales),
    settlementAmount: round1(settlementAmount),
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
      "misterblue",
      issueType,
      sourceFileName,
      sourceRowIndex ?? "file",
      hashText(message),
    ].join("-"),
    batchId: context.batchId,
    company: context.company,
    platform: "misterblue",
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

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function hashText(value: string): string {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash.toString(36);
}
