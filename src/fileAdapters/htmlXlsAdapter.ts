import type { ParseIssue } from "../types/settlement";
import type { FileAdapterContext, FileAdapterResult, TabularFileRow } from "./types";

type HtmlTableRow = {
  cells: string[];
  sourceRowIndex: number;
};

export function parseHtmlXlsAdapter(
  context: FileAdapterContext,
  file: unknown,
): FileAdapterResult {
  if (typeof file !== "string") {
    return {
      rows: [],
      issues: [createHtmlXlsParseIssue(context, "HTML XLS adapter expects string file contents.")],
    };
  }

  const document = new DOMParser().parseFromString(file, "text/html");
  const tables = Array.from(document.querySelectorAll("table"));
  const dataTable = tables[1];

  if (!dataTable) {
    return {
      rows: [],
      issues: [createHtmlXlsParseIssue(context, "HTML XLS second table is missing.")],
    };
  }

  const tableRows = readTableRows(dataTable);
  if (tableRows.length === 0) {
    return {
      rows: [],
      issues: [createHtmlXlsParseIssue(context, "HTML XLS second table is empty.")],
    };
  }

  const header = tableRows[0].cells.map((cell, index) => normalizeHeaderCell(cell, index));
  if (header.every((cell) => cell === "")) {
    return {
      rows: [],
      issues: [createHtmlXlsParseIssue(context, "HTML XLS header row is missing.")],
    };
  }

  return {
    rows: tableRows.slice(1).flatMap((row) => buildRow(header, row, context)),
    issues: [],
  };
}

function readTableRows(table: HTMLTableElement): HtmlTableRow[] {
  return Array.from(table.querySelectorAll("tr")).map((row, index) => ({
    cells: Array.from(row.querySelectorAll("th,td")).map((cell) => normalizeCellText(cell.textContent)),
    sourceRowIndex: index + 1,
  }));
}

function normalizeCellText(value: string | null): string {
  return (value ?? "").replace(/\u00A0/g, " ").trim();
}

function normalizeHeaderCell(cell: string, index: number): string {
  return index === 0 ? cell.replace(/^\uFEFF/, "") : cell;
}

function buildRow(
  header: string[],
  sourceRow: HtmlTableRow,
  context: FileAdapterContext,
): TabularFileRow[] {
  if (sourceRow.cells.every((cell) => cell === "")) {
    return [];
  }

  if (isTotalRow(sourceRow.cells)) {
    return [];
  }

  const row: TabularFileRow = {};

  header.forEach((columnName, index) => {
    if (columnName !== "") {
      row[columnName] = sourceRow.cells[index] ?? "";
    }
  });

  row.sourceFileName = context.sourceFileName;
  row.sourceRowIndex = sourceRow.sourceRowIndex;

  return [row];
}

function isTotalRow(cells: string[]): boolean {
  return cells.some((cell) => cell.trim() === "합계");
}

function createHtmlXlsParseIssue(context: FileAdapterContext, message: string): ParseIssue {
  return {
    issueId: `${context.batchId}-${context.platform}-html_xls-parse_error-file`,
    batchId: context.batchId,
    company: context.company,
    platform: context.platform,
    severity: "error",
    issueType: "parse_error",
    message,
    sourceFileName: context.sourceFileName,
  };
}
