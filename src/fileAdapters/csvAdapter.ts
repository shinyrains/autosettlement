import type { ParseIssue } from "../types/settlement";
import type { FileAdapterContext, FileAdapterResult, TabularFileRow } from "./types";

type CsvRecord = {
  cells: string[];
  sourceRowIndex: number;
};

export function parseCsvAdapter(
  context: FileAdapterContext,
  file: unknown,
): FileAdapterResult {
  if (typeof file !== "string") {
    return {
      rows: [],
      issues: [createCsvParseIssue(context, "CSV adapter expects string file contents.")],
    };
  }

  const records = parseCsvRecords(file);
  if (records.length === 0) {
    return {
      rows: [],
      issues: [createCsvParseIssue(context, "CSV file is empty.")],
    };
  }

  const header = records[0].cells.map((cell, index) => normalizeHeaderCell(cell, index));
  if (header.every((cell) => cell === "")) {
    return {
      rows: [],
      issues: [createCsvParseIssue(context, "CSV header row is missing.")],
    };
  }

  return {
    rows: records.slice(1).flatMap((record) => buildRow(header, record, context)),
    issues: [],
  };
}

function parseCsvRecords(csv: string): CsvRecord[] {
  const records: CsvRecord[] = [];
  let cells: string[] = [];
  let cell = "";
  let inQuotes = false;
  let recordStartLine = 1;
  let currentLine = 1;

  for (let index = 0; index < csv.length; index += 1) {
    const char = csv[index];
    const nextChar = csv[index + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        cell += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      cells.push(cell);
      cell = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      cells.push(cell);
      records.push({ cells, sourceRowIndex: recordStartLine });
      cells = [];
      cell = "";

      if (char === "\r" && nextChar === "\n") {
        index += 1;
      }
      currentLine += 1;
      recordStartLine = currentLine;
      continue;
    }

    if (char === "\n") {
      currentLine += 1;
    }
    cell += char;
  }

  if (cell !== "" || cells.length > 0) {
    cells.push(cell);
    records.push({ cells, sourceRowIndex: recordStartLine });
  }

  return records;
}

function normalizeHeaderCell(cell: string, index: number): string {
  const normalized = cell.trim();
  return index === 0 ? normalized.replace(/^\uFEFF/, "") : normalized;
}

function buildRow(
  header: string[],
  record: CsvRecord,
  context: FileAdapterContext,
): TabularFileRow[] {
  if (record.cells.every((cell) => cell.trim() === "")) {
    return [];
  }

  const row: TabularFileRow = {};

  header.forEach((columnName, index) => {
    if (columnName !== "") {
      row[columnName] = record.cells[index] ?? "";
    }
  });

  row.sourceFileName = context.sourceFileName;
  row.sourceRowIndex = record.sourceRowIndex;

  return [row];
}

function createCsvParseIssue(context: FileAdapterContext, message: string): ParseIssue {
  return {
    issueId: `${context.batchId}-${context.platform}-csv-parse_error-file`,
    batchId: context.batchId,
    company: context.company,
    platform: context.platform,
    severity: "error",
    issueType: "parse_error",
    message,
    sourceFileName: context.sourceFileName,
  };
}
