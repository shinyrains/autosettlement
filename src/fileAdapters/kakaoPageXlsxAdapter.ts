import * as XLSX from "xlsx";
import type { ParseIssue } from "../types/settlement";
import type { FileAdapterContext, FileAdapterResult, TabularFileRow } from "./types";

type SheetRow = unknown[];

const HEADER_TOP_ROW_INDEX = 1;
const HEADER_LEAF_ROW_INDEX = 2;
const DATA_START_ROW_INDEX = 3;
const REQUIRED_HEADERS = ["시리즈명", "작가명", "발행자명", "총합계-원화", "공급가액"] as const;

export function parseKakaoPageXlsxAdapter(
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
      issues: [createParseError(context, "Kakao Page workbook does not contain a worksheet.")],
    };
  }

  const sheet = workbookResult.workbook.Sheets[firstSheetName];
  if (!sheet) {
    return {
      rows: [],
      issues: [createParseError(context, `Kakao Page sheet \"${firstSheetName}\" is missing.`)],
    };
  }

  const rows = XLSX.utils.sheet_to_json<SheetRow>(sheet, {
    header: 1,
    blankrows: true,
    defval: "",
    raw: true,
  });

  if (rows.length < HEADER_LEAF_ROW_INDEX) {
    return {
      rows: [],
      issues: [createParseError(context, "Kakao Page worksheet is missing the contracted header rows.")],
    };
  }

  const header = createHeader(rows[HEADER_TOP_ROW_INDEX - 1] ?? [], rows[HEADER_LEAF_ROW_INDEX - 1] ?? []);
  if (header.length === 0 || header.every((cell) => cell === "")) {
    return {
      rows: [],
      issues: [createParseError(context, "Kakao Page header rows are empty.")],
    };
  }

  if (header.some((cell) => cell === "")) {
    return {
      rows: [],
      issues: [createParseError(context, "Kakao Page header contains an empty header key.")],
    };
  }

  const duplicateHeader = findDuplicateHeader(header);
  if (duplicateHeader) {
    return {
      rows: [],
      issues: [createParseError(context, `Kakao Page header contains a duplicate key: ${duplicateHeader}.`)],
    };
  }

  const missingHeader = REQUIRED_HEADERS.find((column) => !header.includes(column));
  if (missingHeader) {
    return {
      rows: [],
      issues: [createMissingColumnIssue(context, missingHeader)],
    };
  }

  return {
    rows: rows
      .slice(DATA_START_ROW_INDEX - 1)
      .flatMap((row, index) => buildRow(header, row, context, DATA_START_ROW_INDEX + index)),
    issues: [],
  };
}

function createHeader(topRow: SheetRow, leafRow: SheetRow): string[] {
  const width = Math.max(topRow.length, leafRow.length);
  const parentHeaders: string[] = [];
  const leafHeaders: string[] = [];
  let lastParent = "";

  for (let index = 0; index < width; index += 1) {
    const parent = normalizeHeaderCell(topRow[index]);
    if (parent !== "") {
      lastParent = parent;
    }
    parentHeaders.push(lastParent);
    leafHeaders.push(normalizeHeaderCell(leafRow[index]));
  }

  const leafCounts = new Map<string, number>();
  leafHeaders.forEach((leaf) => {
    if (leaf === "") {
      return;
    }
    leafCounts.set(leaf, (leafCounts.get(leaf) ?? 0) + 1);
  });

  return leafHeaders.map((leaf, index) => {
    const parent = parentHeaders[index] ?? "";
    if (leaf === "") {
      return parent;
    }
    if ((leafCounts.get(leaf) ?? 0) === 1 || parent === "" || parent === leaf) {
      return leaf;
    }
    return `${parent} / ${leaf}`;
  });
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
      issue: createParseError(context, "Kakao Page XLSX adapter expects ArrayBuffer or typed array contents."),
    };
  } catch {
    return {
      issue: createParseError(context, "Kakao Page XLSX file could not be parsed."),
    };
  }
}

function normalizeHeaderCell(cell: unknown): string {
  return String(cell ?? "").trim().replace(/^\uFEFF/, "");
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

function createParseError(context: FileAdapterContext, message: string): ParseIssue {
  return {
    issueId: `${context.batchId}-${context.platform}-kakao_page_xlsx-parse_error-file`,
    batchId: context.batchId,
    company: context.company,
    platform: context.platform,
    severity: "error",
    issueType: "parse_error",
    message,
    sourceFileName: context.sourceFileName,
  };
}

function createMissingColumnIssue(context: FileAdapterContext, column: string): ParseIssue {
  return {
    issueId: `${context.batchId}-${context.platform}-kakao_page_xlsx-missing-column-${hashText(column)}`,
    batchId: context.batchId,
    company: context.company,
    platform: context.platform,
    severity: "error",
    issueType: "missing_column",
    message: `Kakao Page contracted header is missing: ${column}.`,
    sourceFileName: context.sourceFileName,
  };
}

function hashText(value: string): string {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash.toString(36);
}
