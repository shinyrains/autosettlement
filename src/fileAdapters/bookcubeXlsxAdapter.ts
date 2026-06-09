import * as XLSX from "xlsx";
import type { ParseIssue } from "../types/settlement";
import type { FileAdapterContext, FileAdapterResult, TabularFileRow } from "./types";

type SheetRow = unknown[];

const HEADER_ROW_INDEX = 2;
const DATA_START_ROW_INDEX = 3;
const REQUIRED_HEADERS = ["제목", "저자", "판매액", "정산액"] as const;

export function parseBookcubeXlsxAdapter(
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
      issues: [createIssue(context, "Bookcube workbook does not contain a worksheet.")],
    };
  }

  const sheet = workbookResult.workbook.Sheets[firstSheetName];
  if (!sheet) {
    return {
      rows: [],
      issues: [createIssue(context, `Bookcube sheet "${firstSheetName}" is missing.`)],
    };
  }

  const rows = XLSX.utils.sheet_to_json<SheetRow>(sheet, {
    header: 1,
    blankrows: true,
    defval: "",
    raw: true,
  });

  if (rows.length < HEADER_ROW_INDEX) {
    return {
      rows: [],
      issues: [createIssue(context, "Bookcube worksheet is missing the contracted header row.")],
    };
  }

  const header = createHeader(rows[HEADER_ROW_INDEX - 1] ?? []);
  if (header.length === 0 || header.every((cell) => cell === "")) {
    return {
      rows: [],
      issues: [createIssue(context, "Bookcube header row is empty.")],
    };
  }

  if (header.some((cell) => cell === "")) {
    return {
      rows: [],
      issues: [createIssue(context, "Bookcube header contains an empty header key.")],
    };
  }

  const duplicateHeader = findDuplicateHeader(header);
  if (duplicateHeader) {
    return {
      rows: [],
      issues: [createIssue(context, `Bookcube header contains a duplicate key: ${duplicateHeader}.`)],
    };
  }

  const missingHeader = REQUIRED_HEADERS.find((column) => !header.includes(column));
  if (missingHeader) {
    return {
      rows: [],
      issues: [createIssue(context, `Bookcube contracted header is missing: ${missingHeader}.`)],
    };
  }

  return {
    rows: rows
      .slice(DATA_START_ROW_INDEX - 1)
      .flatMap((row, index) => buildRow(header, row, context, DATA_START_ROW_INDEX + index)),
    issues: [],
  };
}

function createHeader(sourceRow: SheetRow): string[] {
  return sourceRow.map((cell, index) => normalizeHeaderCell(cell, index));
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
    row[columnName] = sourceRow[index] ?? "";
  });
  row.sourceFileName = context.sourceFileName;
  row.sourceRowIndex = sourceRowIndex;
  return [row];
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
      issue: createIssue(context, "Bookcube XLSX adapter expects ArrayBuffer or typed array contents."),
    };
  } catch {
    return {
      issue: createIssue(context, "Bookcube XLSX file could not be parsed."),
    };
  }
}

function normalizeHeaderCell(cell: unknown, index: number): string {
  const text = String(cell ?? "").trim();
  return index === 0 ? text.replace(/^\uFEFF/, "") : text;
}

function findDuplicateHeader(header: string[]): string | undefined {
  const seen = new Set<string>();
  for (const column of header) {
    if (seen.has(column)) {
      return column;
    }
    seen.add(column);
  }
  return undefined;
}

function createIssue(context: FileAdapterContext, message: string): ParseIssue {
  return {
    issueId: `${context.batchId}-${context.platform}-bookcube_xlsx-parse_error-file`,
    batchId: context.batchId,
    company: context.company,
    platform: context.platform,
    severity: "error",
    issueType: "parse_error",
    message,
    sourceFileName: context.sourceFileName,
  };
}
