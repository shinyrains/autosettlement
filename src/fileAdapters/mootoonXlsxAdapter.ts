import * as XLSX from "xlsx";
import type { ParseIssue } from "../types/settlement";
import type { FileAdapterContext, FileAdapterResult, TabularFileRow } from "./types";

type SheetRow = unknown[];

const HEADER_TOP_ROW_INDEX = 1;
const HEADER_MID_ROW_INDEX = 2;
const HEADER_LEAF_ROW_INDEX = 3;
const DATA_START_ROW_INDEX = 6;
const REQUIRED_HEADERS = ["작가", "타이틀", "정산총액 / 계산금액", "정산총액 / 정산금액"] as const;
const HIERARCHICAL_HEADER_PARENTS = new Set([
  "사용코인",
  "취소코인",
  "합계",
  "공제수수료",
  "정산총액",
]);

export function parseMootoonXlsxAdapter(
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
      issues: [createParseError(context, "Mootoon workbook does not contain a worksheet.")],
    };
  }

  const sheet = workbookResult.workbook.Sheets[firstSheetName];
  if (!sheet) {
    return {
      rows: [],
      issues: [createParseError(context, `Mootoon sheet \"${firstSheetName}\" is missing.`)],
    };
  }

  const rows = XLSX.utils.sheet_to_json<SheetRow>(sheet, {
    header: 1,
    blankrows: true,
    defval: "",
    raw: true,
  });

  if (rows.length < DATA_START_ROW_INDEX) {
    return {
      rows: [],
      issues: [createParseError(context, "Mootoon worksheet is missing the contracted header/data rows.")],
    };
  }

  const header = createHeader(
    rows[HEADER_TOP_ROW_INDEX - 1] ?? [],
    rows[HEADER_MID_ROW_INDEX - 1] ?? [],
    rows[HEADER_LEAF_ROW_INDEX - 1] ?? [],
  );
  if (header.length === 0 || header.every((cell) => cell === "")) {
    return {
      rows: [],
      issues: [createParseError(context, "Mootoon header rows are empty.")],
    };
  }

  if (header.some((cell) => cell === "")) {
    return {
      rows: [],
      issues: [createParseError(context, "Mootoon header contains an empty header key.")],
    };
  }

  const duplicateHeader = findDuplicateHeader(header);
  if (duplicateHeader) {
    return {
      rows: [],
      issues: [createParseError(context, `Mootoon header contains a duplicate key: ${duplicateHeader}.`)],
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

function createHeader(topRow: SheetRow, midRow: SheetRow, leafRow: SheetRow): string[] {
  const width = Math.max(topRow.length, midRow.length, leafRow.length);
  const topHeaders = carryForward(topRow, width);
  const midHeaders = carryForward(midRow, width);

  return Array.from({ length: width }, (_, index) => {
    const top = normalizeHeaderCell(topHeaders[index]);
    const mid = normalizeHeaderCell(midHeaders[index]);
    const leaf = normalizeHeaderCell(leafRow[index]);

    if (leaf !== "") {
      if (mid !== "" && HIERARCHICAL_HEADER_PARENTS.has(mid) && leaf !== mid) {
        return `${mid} / ${leaf}`;
      }
      if (mid !== "" && mid !== leaf) {
        return leaf;
      }
      if (top !== "" && HIERARCHICAL_HEADER_PARENTS.has(top) && leaf !== top) {
        return `${top} / ${leaf}`;
      }
      return leaf;
    }

    if (mid !== "") {
      return mid;
    }

    return top;
  }).map((headerCell, index) => (index === 0 ? headerCell.replace(/^\uFEFF/, "") : headerCell));
}

function carryForward(row: SheetRow, width: number): string[] {
  const result: string[] = [];
  let lastHeader = "";
  for (let index = 0; index < width; index += 1) {
    const current = normalizeHeaderCell(row[index]);
    if (current !== "") {
      lastHeader = current;
    }
    result.push(lastHeader);
  }
  return result;
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
      issue: createParseError(context, "Mootoon XLSX adapter expects ArrayBuffer or typed array contents."),
    };
  } catch {
    return {
      issue: createParseError(context, "Mootoon XLSX file could not be parsed."),
    };
  }
}

function normalizeHeaderCell(cell: unknown): string {
  return String(cell ?? "").trim();
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
    issueId: `${context.batchId}-${context.platform}-mootoon_xlsx-parse_error-file`,
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
    issueId: `${context.batchId}-${context.platform}-mootoon_xlsx-missing-column-${hashText(column)}`,
    batchId: context.batchId,
    company: context.company,
    platform: context.platform,
    severity: "error",
    issueType: "missing_column",
    message: `Mootoon contracted header is missing: ${column}.`,
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
