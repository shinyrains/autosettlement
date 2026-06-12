import type { ParseIssue } from "../types/settlement";
import type { FileAdapterContext, FileAdapterResult, TabularFileRow } from "./types";

type HtmlTableRow = {
  cells: string[];
  sourceRowIndex: number;
};

type HtmlHeader = {
  columnNames: string[];
  dataStartIndex: number;
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

  const header = createHeader(dataTable, tableRows);
  if (header.columnNames.every((cell) => cell === "")) {
    return {
      rows: [],
      issues: [createHtmlXlsParseIssue(context, "HTML XLS header row is missing.")],
    };
  }

  if (header.columnNames.some((cell) => cell === "")) {
    return {
      rows: [],
      issues: [createHtmlXlsParseIssue(context, "HTML XLS header contains an empty header key.")],
    };
  }

  return {
    rows: tableRows
      .slice(header.dataStartIndex)
      .filter((row) => !isTotalRow(row.cells))
      .flatMap((row) => buildRow(header.columnNames, row, context)),
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

function createHeader(table: HTMLTableElement, tableRows: HtmlTableRow[]): HtmlHeader {
  const headerRows = countHeaderRows(table);

  if (headerRows <= 1) {
    return {
      columnNames: tableRows[0].cells.map((cell, index) => normalizeHeaderCell(cell, index)),
      dataStartIndex: 1,
    };
  }

  const grid = buildHeaderGrid(table, headerRows);
  const bottomHeaderRow = grid[headerRows - 1] ?? [];

  return {
    columnNames: bottomHeaderRow.map((bottomCell, index) => {
      const topCell = grid[0]?.[index] ?? "";
      if (topCell === "" || topCell === bottomCell) {
        return normalizeHeaderCell(bottomCell, index);
      }
      if (bottomCell === "") {
        return "";
      }
      return normalizeHeaderCell(`${topCell} / ${bottomCell}`, index);
    }),
    dataStartIndex: headerRows,
  };
}

function countHeaderRows(table: HTMLTableElement): number {
  const firstRow = table.querySelector("tr");
  if (!firstRow) {
    return 0;
  }

  const maxRowSpan = Math.max(
    1,
    ...Array.from(firstRow.querySelectorAll("th,td")).map((cell) => Number(cell.getAttribute("rowspan") ?? "1")),
  );
  return maxRowSpan > 1 ? maxRowSpan : 1;
}

function buildHeaderGrid(table: HTMLTableElement, headerRows: number): string[][] {
  const grid: string[][] = [];
  const rows = Array.from(table.querySelectorAll("tr")).slice(0, headerRows);

  rows.forEach((row, rowIndex) => {
    grid[rowIndex] ??= [];
    let columnIndex = 0;

    for (const cell of Array.from(row.querySelectorAll("th,td"))) {
      while (grid[rowIndex][columnIndex] !== undefined) {
        columnIndex += 1;
      }

      const text = normalizeCellText(cell.textContent);
      const rowSpan = Number(cell.getAttribute("rowspan") ?? "1");
      const colSpan = Number(cell.getAttribute("colspan") ?? "1");

      for (let rowOffset = 0; rowOffset < rowSpan; rowOffset += 1) {
        for (let columnOffset = 0; columnOffset < colSpan; columnOffset += 1) {
          grid[rowIndex + rowOffset] ??= [];
          grid[rowIndex + rowOffset][columnIndex + columnOffset] = text;
        }
      }

      columnIndex += colSpan;
    }
  });

  return grid;
}

function buildRow(
  header: string[],
  sourceRow: HtmlTableRow,
  context: FileAdapterContext,
): TabularFileRow[] {
  if (sourceRow.cells.every((cell) => cell === "")) {
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
