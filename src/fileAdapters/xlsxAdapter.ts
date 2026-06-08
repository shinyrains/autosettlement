import * as XLSX from "xlsx";
import type { ParseIssue } from "../types/settlement";
import type { FileAdapterContext, FileAdapterResult, TabularFileRow } from "./types";

type SheetRow = unknown[];

export function parseXlsxAdapter(
  context: FileAdapterContext,
  file: unknown,
): FileAdapterResult {
  const workbookResult = readWorkbook(context, file);
  if (workbookResult.issue) {
    return { rows: [], issues: [workbookResult.issue] };
  }

  const firstSheetName = workbookResult.workbook.SheetNames[0];
  if (!firstSheetName) {
    return {
      rows: [],
      issues: [createXlsxParseIssue(context, "XLSX workbook has no sheets.")],
    };
  }

  const sheet = workbookResult.workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json<SheetRow>(sheet, {
    header: 1,
    blankrows: true,
    defval: "",
    raw: true,
  });

  if (rows.length === 0) {
    return {
      rows: [],
      issues: [createXlsxParseIssue(context, "XLSX first sheet is empty.")],
    };
  }

  const header = rows[0].map((cell, index) => normalizeHeaderCell(cell, index));
  if (header.every((cell) => cell === "")) {
    return {
      rows: [],
      issues: [createXlsxParseIssue(context, "XLSX header row is missing.")],
    };
  }

  return {
    rows: rows.slice(1).flatMap((row, index) => buildRow(header, row, context, index + 2)),
    issues: [],
  };
}

function readWorkbook(
  context: FileAdapterContext,
  file: unknown,
): { workbook: XLSX.WorkBook; issue?: never } | { workbook?: never; issue: ParseIssue } {
  try {
    if (file instanceof ArrayBuffer || ArrayBuffer.isView(file)) {
      return { workbook: XLSX.read(file, { type: "array", cellDates: false }) };
    }

    return {
      issue: createXlsxParseIssue(context, "XLSX adapter expects ArrayBuffer or typed array contents."),
    };
  } catch {
    return {
      issue: createXlsxParseIssue(context, "XLSX file could not be parsed."),
    };
  }
}

function normalizeHeaderCell(cell: unknown, index: number): string {
  const normalized = String(cell ?? "").trim();
  return index === 0 ? normalized.replace(/^\uFEFF/, "") : normalized;
}

function buildRow(
  header: string[],
  sourceRow: SheetRow,
  context: FileAdapterContext,
  sourceRowIndex: number,
): TabularFileRow[] {
  if (sourceRow.every((cell) => cell === "" || cell === null || cell === undefined)) {
    return [];
  }

  const row: TabularFileRow = {};

  header.forEach((columnName, index) => {
    if (columnName !== "") {
      row[columnName] = sourceRow[index] ?? "";
    }
  });

  row.sourceFileName = context.sourceFileName;
  row.sourceRowIndex = sourceRowIndex;

  return [row];
}

function createXlsxParseIssue(context: FileAdapterContext, message: string): ParseIssue {
  return {
    issueId: `${context.batchId}-${context.platform}-xlsx-parse_error-file`,
    batchId: context.batchId,
    company: context.company,
    platform: context.platform,
    severity: "error",
    issueType: "parse_error",
    message,
    sourceFileName: context.sourceFileName,
  };
}
