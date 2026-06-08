import type { FileKind } from "../fileAdapters/types";
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

export function runBatchParseOrchestrator(
  input: BatchParseOrchestratorInput,
  dependencies: FileParseOrchestratorDependencies = {},
): BatchParseOrchestratorResult {
  return input.files.reduce<BatchParseOrchestratorResult>(
    (batchResult, file) => {
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

      return batchResult;
    },
    {
      rows: [],
      issues: [],
      fileResults: [],
    },
  );
}
