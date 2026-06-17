import * as XLSX from "xlsx";
import type { ParseIssue } from "../types/settlement";
import type { FileAdapterContext, FileAdapterResult, TabularFileRow } from "./types";

type SheetRow = unknown[];

const COVER_SHEET_NAME = "표지";
const DETAIL_SHEET_NAME = "세부내역";
const GROUP_HEADER_ROW_INDEX = 3;
const BASE_HEADER_ROW_INDEX = 4;
const DATA_START_ROW_INDEX = 5;
const DETAIL_LAST_COLUMN_INDEX = 21;
const NORMALIZED_RATE_COLUMN = "표지 / 정산비율";
const REQUIRED_ROW_COLUMNS = ["회차 제목", "저자", "출판사", "합계 총액 / 판매금액"] as const;

export function parsePanmurimXlsxAdapter(
  context: FileAdapterContext,
  file: unknown,
): FileAdapterResult {
  const workbookResult = readWorkbook(context, file);
  if (workbookResult.issue) {
    return { rows: [], issues: [workbookResult.issue] };
  }

  const coverSheet = findWorksheet(workbookResult.workbook, COVER_SHEET_NAME);
  if (!coverSheet) {
    return {
      rows: [],
      issues: [createIssue(context, `Panmurim sheet "${COVER_SHEET_NAME}" is missing.`)],
    };
  }

  const detailSheet = findWorksheet(workbookResult.workbook, DETAIL_SHEET_NAME);
  if (!detailSheet) {
    return {
      rows: [],
      issues: [createIssue(context, `Panmurim sheet "${DETAIL_SHEET_NAME}" is missing.`)],
    };
  }

  const settlementRate = readSettlementRate(context, coverSheet);
  if (settlementRate.ok === false) {
    return {
      rows: [],
      issues: [settlementRate.issue],
    };
  }

  const rows = XLSX.utils.sheet_to_json<SheetRow>(detailSheet, {
    header: 1,
    blankrows: true,
    defval: "",
    raw: true,
  });

  if (rows.length < DATA_START_ROW_INDEX) {
    return {
      rows: [],
      issues: [createIssue(context, "Panmurim detail sheet is missing data rows.")],
    };
  }

  const header = createHeader(rows);
  if (header.some((cell) => cell === "")) {
    return {
      rows: [],
      issues: [createIssue(context, "Panmurim detail header contains an empty header key inside the contracted data range.")],
    };
  }

  const missingHeader = REQUIRED_ROW_COLUMNS.find((column) => !header.includes(column));
  if (missingHeader) {
    return {
      rows: [],
      issues: [createIssue(context, `Panmurim contracted header is missing: ${missingHeader}.`)],
    };
  }

  return {
    rows: rows
      .slice(DATA_START_ROW_INDEX - 1)
      .flatMap((row, index) => buildRow(header, row, context, DATA_START_ROW_INDEX + index, settlementRate.value)),
    issues: [],
  };
}

function createHeader(rows: SheetRow[]): string[] {
  const detailHeader = rows[BASE_HEADER_ROW_INDEX - 1] ?? [];
  const groupHeader = rows[GROUP_HEADER_ROW_INDEX - 1] ?? [];
  const summaryHeader = rows[0] ?? [];

  let activeGroup = "";
  let activeSummary = "";
  return Array.from({ length: DETAIL_LAST_COLUMN_INDEX }, (_, zeroIndex) => {
    const columnIndex = zeroIndex + 1;
    const base = normalizeHeaderCell(detailHeader[columnIndex] ?? "");
    const groupValue = normalizeHeaderCell(groupHeader[columnIndex] ?? "");
    const summaryValue = normalizeHeaderCell(summaryHeader[columnIndex] ?? "");

    if (groupValue !== "" && groupValue !== "0") {
      activeGroup = groupValue;
    }
    if (summaryValue !== "" && summaryValue !== "0") {
      activeSummary = summaryValue;
    }

    if (columnIndex >= 20 && activeSummary !== "" && base !== "") {
      return `${activeSummary} / ${base}`;
    }

    if (columnIndex >= 12 && activeGroup !== "" && base !== "") {
      return `${activeGroup} / ${base}`;
    }

    return base;
  });
}

function buildRow(
  header: string[],
  sourceRow: SheetRow,
  context: FileAdapterContext,
  sourceRowIndex: number,
  settlementRate: number,
): TabularFileRow[] {
  const values = sourceRow.slice(1, DETAIL_LAST_COLUMN_INDEX + 1);
  if (values.every((cell) => cell === "" || cell === null || cell === undefined)) {
    return [];
  }

  const row: TabularFileRow = {};
  header.forEach((columnName, index) => {
    row[columnName] = values[index] ?? "";
  });
  row[NORMALIZED_RATE_COLUMN] = settlementRate;
  row.sourceFileName = context.sourceFileName;
  row.sourceRowIndex = sourceRowIndex;
  return [row];
}

function readSettlementRate(
  context: FileAdapterContext,
  coverSheet: XLSX.WorkSheet,
): { ok: true; value: number } | { ok: false; issue: ParseIssue } {
  const rows = XLSX.utils.sheet_to_json<SheetRow>(coverSheet, {
    header: 1,
    blankrows: true,
    defval: "",
    raw: true,
  });

  for (const row of rows) {
    for (let index = 0; index < row.length; index += 1) {
      if (normalizeHeaderCell(row[index]) !== "정산비율") {
        continue;
      }
      const normalizedRate = normalizeRate(row[index + 1]);
      if (normalizedRate === null) {
        return {
          ok: false,
          issue: createIssue(context, "Panmurim cover sheet settlement rate is invalid."),
        };
      }
      return { ok: true, value: normalizedRate };
    }
  }

  return {
    ok: false,
    issue: createIssue(context, "Panmurim cover sheet settlement rate is missing."),
  };
}

function normalizeRate(value: unknown): number | null {
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      return null;
    }
    if (value > 1) {
      return value / 100;
    }
    return value;
  }

  const text = String(value ?? "").replace(/%/g, "").replace(/,/g, "").trim();
  if (text === "") {
    return null;
  }

  const parsed = Number(text);
  if (!Number.isFinite(parsed)) {
    return null;
  }
  return parsed > 1 ? parsed / 100 : parsed;
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
      issue: createIssue(context, "Panmurim XLSX adapter expects ArrayBuffer or typed array contents."),
    };
  } catch {
    return {
      issue: createIssue(context, "Panmurim XLSX file could not be parsed."),
    };
  }
}

function normalizeHeaderCell(cell: unknown): string {
  return String(cell ?? "").trim().replace(/^\uFEFF/, "");
}

function normalizeSheetName(name: string): string {
  return name.replace(/\uFEFF/g, "").trim();
}

function findWorksheet(workbook: XLSX.WorkBook, expectedName: string): XLSX.WorkSheet | undefined {
  const exact = workbook.Sheets[expectedName];
  if (exact) {
    return exact;
  }

  const actualName = workbook.SheetNames.find((name) => normalizeSheetName(name) === expectedName);
  return actualName ? workbook.Sheets[actualName] : undefined;
}

function createIssue(context: FileAdapterContext, message: string): ParseIssue {
  return {
    issueId: `${context.batchId}-${context.platform}-panmurim_xlsx-parse_error-file`,
    batchId: context.batchId,
    company: context.company,
    platform: context.platform,
    severity: "error",
    issueType: "parse_error",
    message,
    sourceFileName: context.sourceFileName,
  };
}
