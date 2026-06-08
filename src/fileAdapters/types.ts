import type { Company, ParseIssue, Platform } from "../types/settlement";
import type { TabularRow } from "../parsers/parserContract";

export type FileKind = "csv" | "xlsx" | "html_xls";

export type FileAdapterContext = {
  batchId: string;
  company: Company;
  platform: Platform;
  saleMonth: string;
  sourceFileName: string;
  fileKind: FileKind;
  slot?: string;
};

export type TabularFileRow = TabularRow & {
  sourceFileName?: string;
  sourceRowIndex?: number;
};

export type FileAdapterResult = {
  rows: TabularFileRow[];
  issues: ParseIssue[];
};

export type FileAdapter = (
  context: FileAdapterContext,
  file: unknown,
) => FileAdapterResult;
