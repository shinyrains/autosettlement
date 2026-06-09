import type { ParseIssue, SettlementRow } from "../types/settlement";
import {
  MUNPIA_REQUIRED_COLUMNS,
} from "./munpiaCalcConstants";
import { applyMunpiaAuthorCorrection } from "./munpiaAuthorCorrectionUtils";
import { calculateMunpiaRow, isMunpiaTotalRow } from "./munpiaRowCalcUtils";
import { mapMunpiaCalculatedOutputToSettlement } from "./munpiaRowToSettlement";
import type { ParserContext, ParserResult, TabularRow } from "./parserContract";

export type MunpiaSingleFileParserOptions = {
  authorCorrectionRows?: TabularRow[];
};

const REQUIRED_COLUMNS = [
  ...MUNPIA_REQUIRED_COLUMNS.identity,
  ...MUNPIA_REQUIRED_COLUMNS.amounts,
] as const;

export function parseMunpiaSingleFileRows(
  context: ParserContext,
  rows: TabularRow[],
  options: MunpiaSingleFileParserOptions = {},
): ParserResult {
  const normalizedRows = rows.map(trimHeaderNames);
  const columnIssues = validateRequiredColumns(context, normalizedRows);
  if (columnIssues.length > 0) {
    return { rows: [], issues: columnIssues };
  }

  const issues: ParseIssue[] = [];
  const settlementRows: SettlementRow[] = [];

  for (const row of normalizedRows) {
    if (isMunpiaTotalRow(row)) {
      continue;
    }

    const identity = readIdentity(row);
    const identityIssue = validateIdentity(context, row, identity);
    if (identityIssue) {
      issues.push(identityIssue);
      continue;
    }

    const amountIssue = validateAmountFields(context, row);
    if (amountIssue) {
      issues.push(amountIssue);
      continue;
    }

    const correction = applyMunpiaAuthorCorrection({
      context,
      author: identity.author,
      workCode: identity.workCode,
      workTitle: identity.workTitle,
      correctionRows: options.authorCorrectionRows ?? [],
    });
    if (correction.issues.length > 0) {
      issues.push(...correction.issues.map((issue) => normalizeAuthorCorrectionIssue(context, row, issue)));
      continue;
    }

    const calculation = calculateMunpiaRow(row);
    settlementRows.push(
      ...calculation.outputRows.map((output) =>
        mapMunpiaCalculatedOutputToSettlement({
          context,
          identity: {
            ...identity,
            author: correction.author,
          },
          output,
        }),
      ),
    );
  }

  return { rows: settlementRows, issues };
}

function trimHeaderNames(row: TabularRow): TabularRow {
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => [key.trim(), value]),
  );
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
      severity: "error",
      message: `Munpia required column is missing: ${column}.`,
    }));
}

function readIdentity(row: TabularRow): { workCode: string; workTitle: string; author: string } {
  return {
    workCode: readText(row[MUNPIA_REQUIRED_COLUMNS.correction[0]]),
    author: readText(row[MUNPIA_REQUIRED_COLUMNS.identity[0]]),
    workTitle: readText(row[MUNPIA_REQUIRED_COLUMNS.identity[1]]),
  };
}

function validateIdentity(
  context: ParserContext,
  row: TabularRow,
  identity: { workTitle: string; author: string },
): ParseIssue | undefined {
  if (identity.author === "") {
    return createIssue({
      context,
      issueType: "missing_field",
      severity: "error",
      message: "Munpia identity field is missing: 작가.",
      sourceFileName: getSourceFileName(row, context),
      sourceRowIndex: getSourceRowIndex(row),
    });
  }

  if (identity.workTitle === "") {
    return createIssue({
      context,
      issueType: "missing_field",
      severity: "error",
      message: "Munpia identity field is missing: 작품.",
      sourceFileName: getSourceFileName(row, context),
      sourceRowIndex: getSourceRowIndex(row),
    });
  }

  return undefined;
}

function validateAmountFields(context: ParserContext, row: TabularRow): ParseIssue | undefined {
  const invalidColumn = MUNPIA_REQUIRED_COLUMNS.amounts.find((column) => !isValidMunpiaNumber(row[column]));
  if (!invalidColumn) {
    return undefined;
  }

  return createIssue({
    context,
    issueType: "invalid_value",
    severity: "error",
    message: `Munpia numeric field is invalid: ${invalidColumn}.`,
    sourceFileName: getSourceFileName(row, context),
    sourceRowIndex: getSourceRowIndex(row),
  });
}

function normalizeAuthorCorrectionIssue(
  context: ParserContext,
  row: TabularRow,
  issue: ParseIssue,
): ParseIssue {
  if (issue.issueType !== "mapping_failed") {
    return issue;
  }

  return createIssue({
    context,
    issueType: issue.issueType,
    severity: issue.severity,
    message: issue.message,
    sourceFileName: getSourceFileName(row, context),
    sourceRowIndex: getSourceRowIndex(row),
  });
}

function isValidMunpiaNumber(value: unknown): boolean {
  if (typeof value === "number") {
    return Number.isFinite(value);
  }

  const normalized = String(value ?? "").trim().replace(/,/g, "");
  if (normalized === "" || normalized === "-") {
    return true;
  }

  return Number.isFinite(Number(normalized));
}

function createIssue({
  context,
  issueType,
  severity,
  message,
  sourceFileName,
  sourceRowIndex,
}: {
  context: ParserContext;
  issueType: ParseIssue["issueType"];
  severity: ParseIssue["severity"];
  message: string;
  sourceFileName?: string;
  sourceRowIndex?: number;
}): ParseIssue {
  return {
    issueId: [
      context.batchId,
      "munpia",
      issueType,
      severity,
      sourceFileName ?? context.sourceFileName,
      sourceRowIndex ?? "file",
      hashText(message),
    ].join("-"),
    batchId: context.batchId,
    company: context.company,
    platform: "munpia",
    severity,
    issueType,
    message,
    ...(sourceFileName ? { sourceFileName } : {}),
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
