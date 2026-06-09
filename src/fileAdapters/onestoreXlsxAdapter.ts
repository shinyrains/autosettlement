import * as XLSX from "xlsx";
import type { ParseIssue } from "../types/settlement";
import type { FileAdapterContext, FileAdapterResult, TabularFileRow } from "./types";

type SheetRow = unknown[];

const HEADER_TOP_ROW_INDEX = 1;
const HEADER_LEAF_ROW_INDEX = 2;
const DATA_START_ROW_INDEX = 3;
const REQUIRED_HEADERS = ["상품명", "출판사", "글작가", "합계", "정산지급액"] as const;
const HIERARCHICAL_HEADER_PARENTS = new Set([
  "판매",
  "취소",
  "결제수단",
  "원화환산",
  "앱마켓수수료",
  "서비스이용료",
]);

export function parseOnestoreXlsxAdapter(
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
      issues: [createParseError(context, "Onestore workbook does not contain a worksheet.")],
    };
  }

  const sheet = workbookResult.workbook.Sheets[firstSheetName];
  if (!sheet) {
    return {
      rows: [],
      issues: [createParseError(context, `Onestore sheet \"${firstSheetName}\" is missing.`)],
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
      issues: [createParseError(context, "Onestore worksheet is missing the contracted header rows.")],
    };
  }

  const header = createHeader(rows[HEADER_TOP_ROW_INDEX - 1] ?? [], rows[HEADER_LEAF_ROW_INDEX - 1] ?? []);
  if (header.length === 0 || header.every((cell) => cell === "")) {
    return {
      rows: [],
      issues: [createParseError(context, "Onestore header rows are empty.")],
    };
  }

  if (header.some((cell) => cell === "")) {
    return {
      rows: [],
      issues: [createParseError(context, "Onestore header contains an empty header key.")],
    };
  }

  const duplicateHeader = findDuplicateHeader(header);
  if (duplicateHeader) {
    return {
      rows: [],
      issues: [createParseError(context, `Onestore header contains a duplicate key: ${duplicateHeader}.`)],
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
  const parentHeaders: string[] = [];
  let lastParent = "";

  const width = Math.max(topRow.length, leafRow.length);
  for (let index = 0; index < width; index += 1) {
    const parent = normalizeHeaderCell(topRow[index]);
    if (parent !== "") {
      lastParent = parent;
    }
    parentHeaders.push(lastParent);
  }

  return parentHeaders.map((parent, index) => {
    const leaf = normalizeHeaderCell(leafRow[index]);
    if (leaf === "") {
      return parent;
    }
    if (parent === "" || parent === leaf || !HIERARCHICAL_HEADER_PARENTS.has(parent)) {
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
      issue: createParseError(context, "Onestore XLSX adapter expects ArrayBuffer or typed array contents."),
    };
  } catch {
    return {
      issue: createParseError(context, "Onestore XLSX file could not be parsed."),
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
    issueId: `${context.batchId}-${context.platform}-onestore_xlsx-parse_error-file`,
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
    issueId: `${context.batchId}-${context.platform}-onestore_xlsx-missing-column-${hashText(column)}`,
    batchId: context.batchId,
    company: context.company,
    platform: context.platform,
    severity: "error",
    issueType: "missing_column",
    message: `Onestore contracted header is missing: ${column}.`,
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
