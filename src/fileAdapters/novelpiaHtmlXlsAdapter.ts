import type { ParseIssue } from "../types/settlement";
import type { FileAdapterContext, FileAdapterResult, TabularFileRow } from "./types";

export function parseNovelpiaHtmlXlsAdapter(
  context: FileAdapterContext,
  file: unknown,
): FileAdapterResult {
  const html = normalizeHtmlXlsInput(file);
  if (html === null) {
    return {
      rows: [],
      issues: [createParseIssue(context, "Novelpia HTML-XLS adapter expects string or byte file contents.")],
    };
  }

  const document = new DOMParser().parseFromString(html, "text/html");
  const table = document.querySelector("table");

  if (!table) {
    return {
      rows: [],
      issues: [createParseIssue(context, "Novelpia HTML-XLS table is missing.")],
    };
  }

  const rows = Array.from(table.querySelectorAll("tr")).map((row, index) => ({
    cells: Array.from(row.querySelectorAll("th,td")).map((cell) => normalizeCell(cell.textContent)),
    sourceRowIndex: index + 1,
  }));

  if (rows.length === 0) {
    return {
      rows: [],
      issues: [createParseIssue(context, "Novelpia HTML-XLS table is empty.")],
    };
  }

  const header = rows[0]?.cells.map((cell, index) => (index === 0 ? cell.replace(/^\uFEFF/, "") : cell)) ?? [];
  if (header.length === 0 || header.every((cell) => cell === "")) {
    return {
      rows: [],
      issues: [createParseIssue(context, "Novelpia HTML-XLS header row is missing.")],
    };
  }

  if (header.some((cell) => cell === "")) {
    return {
      rows: [],
      issues: [createParseIssue(context, "Novelpia HTML-XLS header contains an empty header key.")],
    };
  }

  const dataRows = rows.slice(1).flatMap((row) => buildRow(header, row, context));
  return { rows: dataRows, issues: [] };
}

type HtmlRow = {
  cells: string[];
  sourceRowIndex: number;
};

function buildRow(header: string[], sourceRow: HtmlRow, context: FileAdapterContext): TabularFileRow[] {
  if (sourceRow.cells.every((cell) => cell === "") || isTotalRow(sourceRow.cells)) {
    return [];
  }

  const row: TabularFileRow = {};
  header.forEach((columnName, index) => {
    row[columnName] = sourceRow.cells[index] ?? "";
  });

  row.sourceFileName = context.sourceFileName;
  row.sourceRowIndex = sourceRow.sourceRowIndex;
  return [row];
}

function normalizeCell(value: string | null): string {
  return (value ?? "").replace(/\u00A0/g, " ").trim();
}

function normalizeHtmlXlsInput(file: unknown): string | null {
  if (typeof file === "string") {
    return file;
  }

  const bytes = toUint8Array(file);
  if (bytes !== null) {
    return decodeHtmlXlsBytes(bytes);
  }

  return null;
}

function toUint8Array(file: unknown): Uint8Array | null {
  if (file instanceof Uint8Array) {
    return file;
  }

  if (file instanceof ArrayBuffer) {
    return new Uint8Array(file);
  }

  if (ArrayBuffer.isView(file)) {
    return new Uint8Array(file.buffer, file.byteOffset, file.byteLength);
  }

  return null;
}

function decodeHtmlXlsBytes(bytes: Uint8Array): string | null {
  const candidates = hasUtf8Bom(bytes)
    ? [decodeWithEncoding(bytes, "utf-8")]
    : [decodeWithEncoding(bytes, "utf-8"), decodeWithEncoding(bytes, "euc-kr")];

  return candidates.find((candidate) => candidate !== null && !hasBrokenDecodeMarker(candidate)) ?? null;
}

function decodeWithEncoding(bytes: Uint8Array, encoding: string): string | null {
  try {
    return new TextDecoder(encoding, { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
}

function hasUtf8Bom(bytes: Uint8Array): boolean {
  return bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf;
}

function hasBrokenDecodeMarker(text: string): boolean {
  return text.includes("\uFFFD");
}

function isTotalRow(cells: string[]): boolean {
  return cells.some((cell) => cell.trim() === "합계");
}

function createParseIssue(context: FileAdapterContext, message: string): ParseIssue {
  return {
    issueId: `${context.batchId}-${context.platform}-novelpia-html_xls-parse_error-file`,
    batchId: context.batchId,
    company: context.company,
    platform: context.platform,
    severity: "error",
    issueType: "parse_error",
    message,
    sourceFileName: context.sourceFileName,
  };
}
