import { parseCsvAdapter, parseHtmlXlsAdapter, parseXlsxAdapter } from "../fileAdapters";
import type { FileAdapter, FileAdapterResult, FileKind } from "../fileAdapters/types";
import { parseSeriesFileGroup } from "../parsers";
import type { PlatformFileGroupInput, PlatformFileGroupParserContext } from "../parsers";
import type { Company, ParseIssue, Platform, SettlementRow } from "../types/settlement";
import {
  runFileParseOrchestrator,
  type FileParseOrchestratorDependencies,
} from "./fileParseOrchestrator";

export type BatchParseFileInput = {
  company: Company;
  platform: Platform;
  fileKind: FileKind;
  fileName: string;
  saleMonth: string;
  slot?: string;
  content: unknown;
};

export type BatchParseOrchestratorInput = {
  batchId: string;
  files: BatchParseFileInput[];
};

export type BatchParseFileResultStatus = "success" | "failed";

export type BatchParseFileResult = {
  fileName: string;
  company: Company;
  platform: Platform;
  fileKind: FileKind;
  saleMonth: string;
  status: BatchParseFileResultStatus;
  rowCount: number;
  issueCount: number;
};

export type BatchParseOrchestratorResult = {
  rows: SettlementRow[];
  issues: ParseIssue[];
  fileResults: BatchParseFileResult[];
};

type SeriesFileGroup = {
  context: PlatformFileGroupParserContext;
  files: PlatformFileGroupInput[];
};

const defaultAdapters: Record<FileKind, FileAdapter> = {
  csv: parseCsvAdapter,
  xlsx: parseXlsxAdapter,
  html_xls: parseHtmlXlsAdapter,
};

export function runBatchParseOrchestrator(
  input: BatchParseOrchestratorInput,
  dependencies: FileParseOrchestratorDependencies = {},
): BatchParseOrchestratorResult {
  const batchResult: BatchParseOrchestratorResult = {
    rows: [],
    issues: [],
    fileResults: [],
  };
  const seriesGroups = new Map<string, SeriesFileGroup>();

  for (const file of input.files) {
    if (file.platform === "series") {
      collectSeriesFile(input.batchId, file, batchResult, seriesGroups, dependencies);
      continue;
    }

      const fileResult = runFileParseOrchestrator(
        {
          fileKind: file.fileKind,
          platform: file.platform,
          adapterContext: {
            batchId: input.batchId,
            company: file.company,
            platform: file.platform,
            saleMonth: file.saleMonth,
            sourceFileName: file.fileName,
            fileKind: file.fileKind,
          },
          parserContext: {
            batchId: input.batchId,
            company: file.company,
            platform: file.platform,
            saleMonth: file.saleMonth,
            sourceFileName: file.fileName,
          },
          fileContent: file.content,
        },
        dependencies,
      );

      batchResult.rows.push(...fileResult.rows);
      batchResult.issues.push(...fileResult.issues);
      batchResult.fileResults.push({
        fileName: file.fileName,
        company: file.company,
        platform: file.platform,
        fileKind: file.fileKind,
        saleMonth: file.saleMonth,
        status: fileResult.issues.length > 0 ? "failed" : "success",
        rowCount: fileResult.rows.length,
        issueCount: fileResult.issues.length,
      });

  }

  for (const group of seriesGroups.values()) {
    const groupResult = parseSeriesFileGroup(group.context, group.files);
    batchResult.rows.push(...groupResult.rows);
    batchResult.issues.push(...groupResult.issues);
  }

  return batchResult;
}

function collectSeriesFile(
  batchId: string,
  file: BatchParseFileInput,
  batchResult: BatchParseOrchestratorResult,
  seriesGroups: Map<string, SeriesFileGroup>,
  dependencies: FileParseOrchestratorDependencies,
): void {
  const adapterResult = runFileAdapter(batchId, file, dependencies);
  const groupKey = createSeriesGroupKey(file);
  const group = getOrCreateSeriesGroup(batchId, file, groupKey, seriesGroups);

  group.context.sourceFileNames.push(file.fileName);
  group.files.push({
    sourceFileName: file.fileName,
    slot: file.slot,
    rows: adapterResult.rows,
    issues: adapterResult.issues,
  });

  batchResult.fileResults.push({
    fileName: file.fileName,
    company: file.company,
    platform: file.platform,
    fileKind: file.fileKind,
    saleMonth: file.saleMonth,
    status: adapterResult.issues.length > 0 ? "failed" : "success",
    rowCount: adapterResult.rows.length,
    issueCount: adapterResult.issues.length,
  });
}

function runFileAdapter(
  batchId: string,
  file: BatchParseFileInput,
  dependencies: FileParseOrchestratorDependencies,
): FileAdapterResult {
  const adapters = {
    ...defaultAdapters,
    ...dependencies.adapters,
  };
  const adapter = adapters[file.fileKind];

  if (!adapter) {
    return {
      rows: [],
      issues: [createUnsupportedFileKindIssue(batchId, file)],
    };
  }

  return adapter(
    {
      batchId,
      company: file.company,
      platform: file.platform,
      saleMonth: file.saleMonth,
      sourceFileName: file.fileName,
      fileKind: file.fileKind,
      slot: file.slot,
    },
    file.content,
  );
}

function getOrCreateSeriesGroup(
  batchId: string,
  file: BatchParseFileInput,
  groupKey: string,
  seriesGroups: Map<string, SeriesFileGroup>,
): SeriesFileGroup {
  const existingGroup = seriesGroups.get(groupKey);
  if (existingGroup !== undefined) {
    return existingGroup;
  }

  const group: SeriesFileGroup = {
    context: {
      batchId,
      company: file.company,
      platform: "series",
      saleMonth: file.saleMonth,
      sourceFileNames: [],
    },
    files: [],
  };
  seriesGroups.set(groupKey, group);
  return group;
}

function createSeriesGroupKey(file: BatchParseFileInput): string {
  return [file.company, file.platform, file.saleMonth].join("\u001f");
}

function createUnsupportedFileKindIssue(batchId: string, file: BatchParseFileInput): ParseIssue {
  return {
    issueId: `${batchId}-${file.platform}-unsupported-file-kind`,
    batchId,
    company: file.company,
    platform: file.platform,
    severity: "error",
    issueType: "parse_error",
    message: `Unsupported fileKind "${String(file.fileKind)}".`,
    sourceFileName: file.fileName,
  };
}
