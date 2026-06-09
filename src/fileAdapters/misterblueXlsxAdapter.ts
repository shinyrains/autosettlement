import * as XLSX from "xlsx";
import type { ParseIssue } from "../types/settlement";
import type { FileAdapterContext, FileAdapterResult, TabularFileRow } from "./types";

type SheetRow = unknown[];
type MergeRange = XLSX.Range;

const MISTERBLUE_SHEET_NAME = "작품별";
const TITLE_ROW_INDEX = 1;
const HEADER_START_ROW_INDEX = 2;
const HEADER_END_ROW_INDEX = 5;
const DATA_START_ROW_INDEX = 6;

export function parseMisterblueXlsxAdapter(
  context: FileAdapterContext,
  file: unknown,
): FileAdapterResult {
  const workbookResult = readWorkbook(context, file);
  if (workbookResult.issue) {
    return { rows: [], issues: [workbookResult.issue] };
  }

  const sheet = workbookResult.workbook.Sheets[MISTERBLUE_SHEET_NAME];
  if (!sheet) {
    return {
      rows: [],
      issues: [createXlsxParseIssue(context, `Misterblue sheet "${MISTERBLUE_SHEET_NAME}" is missing.`)],
    };
  }

  const ref = sheet["!ref"];
  if (!ref) {
    return {
      rows: [],
      issues: [createXlsxParseIssue(context, "Misterblue sheet is empty.")],
    };
  }

  const range = XLSX.utils.decode_range(ref);
  if (range.e.r + 1 < DATA_START_ROW_INDEX) {
    return {
      rows: [],
      issues: [createXlsxParseIssue(context, "Misterblue sheet is missing data rows.")],
    };
  }

  const merges = (sheet["!merges"] ?? []) as MergeRange[];
  const header = createHeader(sheet, merges, range.e.c);
  if (header.every((cell) => cell === "")) {
    return {
      rows: [],
      issues: [createXlsxParseIssue(context, "Misterblue header rows are missing.")],
    };
  }

  if (header.some((cell) => cell === "")) {
    return {
      rows: [],
      issues: [createXlsxParseIssue(context, "Misterblue header contains an empty header key.")],
    };
  }

  const duplicateHeader = findDuplicateHeader(header);
  if (duplicateHeader) {
    return {
      rows: [],
      issues: [createXlsxParseIssue(context, `Misterblue header contains a duplicate key: ${duplicateHeader}.`)],
    };
  }

  const rows = XLSX.utils.sheet_to_json<SheetRow>(sheet, {
    header: 1,
    blankrows: true,
    defval: "",
    raw: true,
  });

  return {
    rows: rows
      .slice(DATA_START_ROW_INDEX - 1)
      .flatMap((row, index) => buildRow(header, row, context, DATA_START_ROW_INDEX + index)),
    issues: [],
  };
}

function createHeader(sheet: XLSX.WorkSheet, merges: MergeRange[], lastColumnIndex: number): string[] {
  const headerRows = [] as string[][];
  for (let rowIndex = HEADER_START_ROW_INDEX; rowIndex <= HEADER_END_ROW_INDEX; rowIndex += 1) {
    headerRows.push(
      Array.from({ length: lastColumnIndex + 1 }, (_, columnIndex) =>
        normalizeHeaderCell(
          readMergedCellText(sheet, merges, rowIndex - 1, columnIndex),
          columnIndex,
        ),
      ),
    );
  }

  return Array.from({ length: lastColumnIndex + 1 }, (_, columnIndex) => {
    const parts = headerRows
      .map((row) => row[columnIndex] ?? "")
      .filter((part, index, values) => part !== "" && values[index - 1] !== part);
    return parts.join(" / ");
  });
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
      issue: createXlsxParseIssue(context, "Misterblue XLSX adapter expects ArrayBuffer or typed array contents."),
    };
  } catch {
    return {
      issue: createXlsxParseIssue(context, "Misterblue XLSX file could not be parsed."),
    };
  }
}

function readMergedCellText(
  sheet: XLSX.WorkSheet,
  merges: MergeRange[],
  rowIndex: number,
  columnIndex: number,
): string {
  const cell = readMergedCellValue(sheet, merges, rowIndex, columnIndex);
  return String(cell ?? "").trim();
}

function readMergedCellValue(
  sheet: XLSX.WorkSheet,
  merges: MergeRange[],
  rowIndex: number,
  columnIndex: number,
): unknown {
  const merged = merges.find((range) => (
    rowIndex >= range.s.r
    && rowIndex <= range.e.r
    && columnIndex >= range.s.c
    && columnIndex <= range.e.c
  ));

  const resolvedRowIndex = merged?.s.r ?? rowIndex;
  const resolvedColumnIndex = merged?.s.c ?? columnIndex;
  const address = XLSX.utils.encode_cell({ r: resolvedRowIndex, c: resolvedColumnIndex });
  return sheet[address]?.v;
}

function normalizeHeaderCell(cell: string, index: number): string {
  return index === 0 ? cell.replace(/^\uFEFF/, "") : cell;
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

function createXlsxParseIssue(context: FileAdapterContext, message: string): ParseIssue {
  return {
    issueId: `${context.batchId}-${context.platform}-misterblue_xlsx-parse_error-file`,
    batchId: context.batchId,
    company: context.company,
    platform: context.platform,
    severity: "error",
    issueType: "parse_error",
    message,
    sourceFileName: context.sourceFileName,
  };
}
