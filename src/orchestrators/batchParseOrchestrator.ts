import { parseCsvAdapter, parseHtmlXlsAdapter, parseXlsxAdapter } from "../fileAdapters";
import { resolveFileAdapter } from "../fileAdapters/resolveFileAdapter";
import type { FileAdapter, FileAdapterResult, FileKind } from "../fileAdapters/types";
import { parseJoaraFileGroup, parseMunpiaFileGroup, parseRidibooksFileGroup, parseSeriesFileGroup } from "../parsers";
import type { PlatformFileGroupInput, PlatformFileGroupParserContext } from "../parsers";
import type { JoaraGroupFileInput } from "../parsers/joaraGroupParser";
import type { MunpiaGroupFileInput } from "../parsers/munpiaGroupParser";
import type { RidibooksFileSlot } from "../parsers/ridibooksCalcConstants";
import type { RidibooksGroupFileInput, RidibooksGroupParserContext } from "../parsers/ridibooksGroupParser";
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
  eventPeriod?: {
    startDate: string;
    endDate: string;
  };
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

type RidibooksFileGroup = {
  context: RidibooksGroupParserContext;
  files: RidibooksGroupFileInput[];
};

type MunpiaFileGroup = {
  context: PlatformFileGroupParserContext;
  files: MunpiaGroupFileInput[];
};

type JoaraFileGroup = {
  context: PlatformFileGroupParserContext;
  files: JoaraGroupFileInput[];
};

type GroupFlushEntry =
  | { platform: "series"; key: string }
  | { platform: "ridibooks"; key: string }
  | { platform: "munpia"; key: string }
  | { platform: "joara"; key: string };

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
  const ridibooksGroups = new Map<string, RidibooksFileGroup>();
  const munpiaGroups = new Map<string, MunpiaFileGroup>();
  const joaraGroups = new Map<string, JoaraFileGroup>();
  const groupFlushOrder: GroupFlushEntry[] = [];

  for (const file of input.files) {
    if (file.platform === "series") {
      collectSeriesFile(input.batchId, file, batchResult, seriesGroups, groupFlushOrder, dependencies);
      continue;
    }

    if (file.platform === "ridibooks") {
      collectRidibooksFile(input.batchId, file, batchResult, ridibooksGroups, groupFlushOrder, dependencies);
      continue;
    }

    if (file.platform === "munpia") {
      collectMunpiaFile(input.batchId, file, batchResult, munpiaGroups, groupFlushOrder, dependencies);
      continue;
    }

    if (file.platform === "joara") {
      collectJoaraFile(input.batchId, file, batchResult, joaraGroups, groupFlushOrder, dependencies);
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
        status: getFileResultStatus(fileResult.issues),
        rowCount: fileResult.rows.length,
        issueCount: fileResult.issues.length,
      });

  }

  for (const entry of groupFlushOrder) {
    if (entry.platform === "series") {
      const group = seriesGroups.get(entry.key);
      if (group) {
        const groupResult = parseSeriesFileGroup(group.context, group.files);
        applyGroupIssuesToFileResults(batchResult.fileResults, group.context, group.files, groupResult.issues);
        batchResult.rows.push(...groupResult.rows);
        batchResult.issues.push(...groupResult.issues);
      }
      continue;
    }

    if (entry.platform === "munpia") {
      const group = munpiaGroups.get(entry.key);
      if (group) {
        const groupResult = parseMunpiaFileGroup(group.context, group.files);
        applyGroupIssuesToFileResults(batchResult.fileResults, group.context, group.files, groupResult.issues);
        batchResult.rows.push(...groupResult.rows);
        batchResult.issues.push(...groupResult.issues);
      }
      continue;
    }

    if (entry.platform === "joara") {
      const group = joaraGroups.get(entry.key);
      if (group) {
        const groupResult = parseJoaraFileGroup(group.context, group.files);
        applyGroupIssuesToFileResults(batchResult.fileResults, group.context, group.files, groupResult.issues);
        batchResult.rows.push(...groupResult.rows);
        batchResult.issues.push(...groupResult.issues);
      }
      continue;
    }

    const group = ridibooksGroups.get(entry.key);
    if (group) {
      const groupResult = parseRidibooksFileGroup(group.context, group.files);
      applyGroupIssuesToFileResults(batchResult.fileResults, group.context, group.files, groupResult.issues);
      batchResult.rows.push(...groupResult.rows);
      batchResult.issues.push(...groupResult.issues);
    }
  }

  return batchResult;
}

function collectSeriesFile(
  batchId: string,
  file: BatchParseFileInput,
  batchResult: BatchParseOrchestratorResult,
  seriesGroups: Map<string, SeriesFileGroup>,
  groupFlushOrder: GroupFlushEntry[],
  dependencies: FileParseOrchestratorDependencies,
): void {
  const adapterResult = runFileAdapter(batchId, file, dependencies);
  const groupKey = createSeriesGroupKey(file);
  const group = getOrCreateSeriesGroup(batchId, file, groupKey, seriesGroups, groupFlushOrder);

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
    status: getFileResultStatus(adapterResult.issues),
    rowCount: adapterResult.rows.length,
    issueCount: adapterResult.issues.length,
  });
}

function collectRidibooksFile(
  batchId: string,
  file: BatchParseFileInput,
  batchResult: BatchParseOrchestratorResult,
  ridibooksGroups: Map<string, RidibooksFileGroup>,
  groupFlushOrder: GroupFlushEntry[],
  dependencies: FileParseOrchestratorDependencies,
): void {
  const adapterResult = runFileAdapter(batchId, file, dependencies);
  const groupKey = createRidibooksGroupKey(file);
  const group = getOrCreateRidibooksGroup(batchId, file, groupKey, ridibooksGroups, groupFlushOrder);

  group.context.sourceFileNames.push(file.fileName);
  if (group.context.eventPeriod === undefined && file.eventPeriod !== undefined) {
    group.context.eventPeriod = file.eventPeriod;
  }
  group.files.push({
    sourceFileName: file.fileName,
    slot: file.slot as RidibooksFileSlot,
    rows: adapterResult.rows,
    issues: adapterResult.issues,
  });

  batchResult.fileResults.push({
    fileName: file.fileName,
    company: file.company,
    platform: file.platform,
    fileKind: file.fileKind,
    saleMonth: file.saleMonth,
    status: getFileResultStatus(adapterResult.issues),
    rowCount: adapterResult.rows.length,
    issueCount: adapterResult.issues.length,
  });
}

function collectMunpiaFile(
  batchId: string,
  file: BatchParseFileInput,
  batchResult: BatchParseOrchestratorResult,
  munpiaGroups: Map<string, MunpiaFileGroup>,
  groupFlushOrder: GroupFlushEntry[],
  dependencies: FileParseOrchestratorDependencies,
): void {
  const adapterResult = runFileAdapter(batchId, file, dependencies);
  const groupKey = createMunpiaGroupKey(file);
  const group = getOrCreateMunpiaGroup(batchId, file, groupKey, munpiaGroups, groupFlushOrder);

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
    status: getFileResultStatus(adapterResult.issues),
    rowCount: adapterResult.rows.length,
    issueCount: adapterResult.issues.length,
  });
}

function collectJoaraFile(
  batchId: string,
  file: BatchParseFileInput,
  batchResult: BatchParseOrchestratorResult,
  joaraGroups: Map<string, JoaraFileGroup>,
  groupFlushOrder: GroupFlushEntry[],
  dependencies: FileParseOrchestratorDependencies,
): void {
  const adapterResult = runFileAdapter(batchId, file, dependencies);
  const groupKey = createJoaraGroupKey(file);
  const group = getOrCreateJoaraGroup(batchId, file, groupKey, joaraGroups, groupFlushOrder);

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
    status: getFileResultStatus(adapterResult.issues),
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
  const adapter = resolveFileAdapter(file.platform, file.fileKind, adapters);

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

function getFileResultStatus(issues: ParseIssue[]): BatchParseFileResultStatus {
  return issues.some((issue) => issue.severity === "error") ? "failed" : "success";
}

type GroupFileWithIssues = {
  sourceFileName: string;
  issues: ParseIssue[];
};

function applyGroupIssuesToFileResults(
  fileResults: BatchParseFileResult[],
  context: PlatformFileGroupParserContext | RidibooksGroupParserContext,
  files: GroupFileWithIssues[],
  issues: ParseIssue[],
): void {
  const adapterIssueIds = new Set(files.flatMap((file) => file.issues.map((issue) => issue.issueId)));

  for (const issue of issues) {
    if (issue.sourceFileName === undefined || adapterIssueIds.has(issue.issueId)) {
      continue;
    }

    const fileResult = fileResults.find(
      (candidate) =>
        candidate.company === context.company &&
        candidate.platform === context.platform &&
        candidate.saleMonth === context.saleMonth &&
        candidate.fileName === issue.sourceFileName,
    );

    if (fileResult === undefined) {
      continue;
    }

    fileResult.issueCount += 1;
    if (issue.severity === "error") {
      fileResult.status = "failed";
    }
  }
}

function getOrCreateSeriesGroup(
  batchId: string,
  file: BatchParseFileInput,
  groupKey: string,
  seriesGroups: Map<string, SeriesFileGroup>,
  groupFlushOrder: GroupFlushEntry[],
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
  groupFlushOrder.push({ platform: "series", key: groupKey });
  return group;
}

function createSeriesGroupKey(file: BatchParseFileInput): string {
  return [file.company, file.platform, file.saleMonth].join("\u001f");
}

function getOrCreateRidibooksGroup(
  batchId: string,
  file: BatchParseFileInput,
  groupKey: string,
  ridibooksGroups: Map<string, RidibooksFileGroup>,
  groupFlushOrder: GroupFlushEntry[],
): RidibooksFileGroup {
  const existingGroup = ridibooksGroups.get(groupKey);
  if (existingGroup !== undefined) {
    return existingGroup;
  }

  const group: RidibooksFileGroup = {
    context: {
      batchId,
      company: file.company,
      platform: "ridibooks",
      saleMonth: file.saleMonth,
      sourceFileNames: [],
      ...(file.eventPeriod ? { eventPeriod: file.eventPeriod } : {}),
    },
    files: [],
  };
  ridibooksGroups.set(groupKey, group);
  groupFlushOrder.push({ platform: "ridibooks", key: groupKey });
  return group;
}

function createRidibooksGroupKey(file: BatchParseFileInput): string {
  return [file.company, file.platform, file.saleMonth].join("\u001f");
}

function getOrCreateMunpiaGroup(
  batchId: string,
  file: BatchParseFileInput,
  groupKey: string,
  munpiaGroups: Map<string, MunpiaFileGroup>,
  groupFlushOrder: GroupFlushEntry[],
): MunpiaFileGroup {
  const existingGroup = munpiaGroups.get(groupKey);
  if (existingGroup !== undefined) {
    return existingGroup;
  }

  const group: MunpiaFileGroup = {
    context: {
      batchId,
      company: file.company,
      platform: "munpia",
      saleMonth: file.saleMonth,
      sourceFileNames: [],
    },
    files: [],
  };
  munpiaGroups.set(groupKey, group);
  groupFlushOrder.push({ platform: "munpia", key: groupKey });
  return group;
}

function createMunpiaGroupKey(file: BatchParseFileInput): string {
  return [file.company, file.platform, file.saleMonth].join("\u001f");
}

function getOrCreateJoaraGroup(
  batchId: string,
  file: BatchParseFileInput,
  groupKey: string,
  joaraGroups: Map<string, JoaraFileGroup>,
  groupFlushOrder: GroupFlushEntry[],
): JoaraFileGroup {
  const existingGroup = joaraGroups.get(groupKey);
  if (existingGroup !== undefined) {
    return existingGroup;
  }

  const group: JoaraFileGroup = {
    context: {
      batchId,
      company: file.company,
      platform: "joara",
      saleMonth: file.saleMonth,
      sourceFileNames: [],
    },
    files: [],
  };
  joaraGroups.set(groupKey, group);
  groupFlushOrder.push({ platform: "joara", key: groupKey });
  return group;
}

function createJoaraGroupKey(file: BatchParseFileInput): string {
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
