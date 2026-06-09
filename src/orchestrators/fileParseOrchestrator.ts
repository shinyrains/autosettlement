import { parseBookcubeXlsxAdapter, parseCsvAdapter, parseHtmlXlsAdapter, parseMisterblueXlsxAdapter, parsePanmurimXlsxAdapter, parseXlsxAdapter } from "../fileAdapters";
import type { FileAdapter, FileAdapterContext, FileKind } from "../fileAdapters/types";
import type { ParserContext, ParserResult, TabularRow } from "../parsers/parserContract";
import { parsePlatformRows } from "../parsers/registry";
import type { ParseIssue, Platform, SettlementRow } from "../types/settlement";

export type FileParseOrchestratorInput = {
  fileKind: FileKind;
  platform: Platform;
  adapterContext: FileAdapterContext;
  parserContext: ParserContext;
  fileContent: unknown;
};

export type FileParseOrchestratorResult = {
  rows: SettlementRow[];
  issues: ParseIssue[];
};

type ParseRows = (
  platform: Platform,
  context: ParserContext,
  rows: TabularRow[],
) => ParserResult;

export type FileParseOrchestratorDependencies = {
  adapters?: Partial<Record<FileKind, FileAdapter>>;
  parseRows?: ParseRows;
};

const defaultAdapters: Record<FileKind, FileAdapter> = {
  csv: parseCsvAdapter,
  xlsx: parseXlsxAdapter,
  html_xls: parseHtmlXlsAdapter,
};

export function runFileParseOrchestrator(
  input: FileParseOrchestratorInput,
  dependencies: FileParseOrchestratorDependencies = {},
): FileParseOrchestratorResult {
  const adapters = {
    ...defaultAdapters,
    ...dependencies.adapters,
  };
  const adapter = resolveAdapter(input.platform, input.fileKind, adapters);

  if (!adapter) {
    return {
      rows: [],
      issues: [createUnsupportedFileKindIssue(input)],
    };
  }

  const normalizedAdapterContext = {
    ...input.adapterContext,
    fileKind: input.fileKind,
    platform: input.platform,
  };
  const adapterResult = adapter(normalizedAdapterContext, input.fileContent);

  if (adapterResult.rows.length === 0 && adapterResult.issues.length > 0) {
    return {
      rows: [],
      issues: adapterResult.issues,
    };
  }

  const normalizedParserContext = {
    ...input.parserContext,
    platform: input.platform,
  };
  const parseRows = dependencies.parseRows ?? parsePlatformRows;
  const parserResult = parseRows(input.platform, normalizedParserContext, adapterResult.rows);

  return {
    rows: parserResult.rows,
    issues: [...adapterResult.issues, ...parserResult.issues],
  };
}

function createUnsupportedFileKindIssue(input: FileParseOrchestratorInput): ParseIssue {
  return {
    issueId: `${input.adapterContext.batchId}-${input.platform}-unsupported-file-kind`,
    batchId: input.adapterContext.batchId,
    company: input.adapterContext.company,
    platform: input.platform,
    severity: "error",
    issueType: "parse_error",
    message: `Unsupported fileKind "${String(input.fileKind)}".`,
    sourceFileName: input.adapterContext.sourceFileName,
  };
}

function resolveAdapter(
  platform: Platform,
  fileKind: FileKind,
  adapters: Record<FileKind, FileAdapter>,
): FileAdapter | undefined {
  if (platform === "misterblue" && fileKind === "xlsx") {
    return parseMisterblueXlsxAdapter;
  }

  if (platform === "panmurim" && fileKind === "xlsx") {
    return parsePanmurimXlsxAdapter;
  }

  if (platform === "bookcube" && fileKind === "xlsx") {
    return parseBookcubeXlsxAdapter;
  }

  return adapters[fileKind];
}
