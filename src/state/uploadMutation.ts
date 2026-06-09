import type { PlatformUploadCard } from "../data/mockSettlement";
import { runBatchParseOrchestrator, type BatchParseOrchestratorResult } from "../orchestrators/batchParseOrchestrator";
import type { FileKind } from "../fileAdapters/types";
import type { ParseIssue, Platform } from "../types/settlement";
import type { AppDraftState } from "./appState";

type BrowserUploadFile = {
  name: string;
  arrayBuffer(): Promise<ArrayBuffer>;
};

type UploadMutationDependencies = {
  parseBatch?: typeof runBatchParseOrchestrator;
  now?: () => string;
};

const LIVE_UPLOAD_PLATFORM: Platform = "misterblue";
const LIVE_UPLOAD_COMPANY = "sr";

export function isLiveUploadEnabled(upload: PlatformUploadCard): boolean {
  return upload.company === LIVE_UPLOAD_COMPANY
    && upload.platform === LIVE_UPLOAD_PLATFORM
    && upload.requiredFileCount === 1
    && (upload.slots?.length ?? 0) === 0;
}

export async function applyLiveUploadMutation(
  state: AppDraftState,
  upload: PlatformUploadCard,
  files: BrowserUploadFile[],
  dependencies: UploadMutationDependencies = {},
): Promise<AppDraftState> {
  const uploadedAt = dependencies.now?.() ?? new Date().toISOString();

  if (!isLiveUploadEnabled(upload)) {
    return applyFailureResult(
      state,
      upload,
      files.map((file) => file.name),
      uploadedAt,
      createUploadIssue(state, upload, files[0]?.name, "현재 live upload가 승인된 카드는 미스터블루 1-file 경로뿐입니다."),
    );
  }

  if (files.length !== 1) {
    return applyFailureResult(
      state,
      upload,
      files.map((file) => file.name),
      uploadedAt,
      createUploadIssue(state, upload, files[0]?.name, "현재 live upload slice는 파일 1개만 허용합니다."),
    );
  }

  const file = files[0];
  const fileKind = inferFileKind(file.name);
  if (!fileKind) {
    return applyFailureResult(
      state,
      upload,
      [file.name],
      uploadedAt,
      createUploadIssue(state, upload, file.name, "지원하지 않는 파일 확장자입니다. csv/xlsx/xls만 허용됩니다."),
    );
  }

  try {
    const result = (dependencies.parseBatch ?? runBatchParseOrchestrator)({
      batchId: state.batch.batchId,
      files: [
        {
          company: upload.company,
          platform: upload.platform,
          fileKind,
          fileName: file.name,
          saleMonth: state.batch.settlementMonth,
          content: new Uint8Array(await file.arrayBuffer()),
        },
      ],
    });

    return applySuccessfulResult(state, upload, [file.name], uploadedAt, result);
  } catch (error) {
    const message = error instanceof Error
      ? error.message
      : "알 수 없는 업로드 오류가 발생했습니다.";
    return applyFailureResult(
      state,
      upload,
      [file.name],
      uploadedAt,
      createUploadIssue(state, upload, file.name, message),
    );
  }
}

function applySuccessfulResult(
  state: AppDraftState,
  upload: PlatformUploadCard,
  sourceFileNames: string[],
  uploadedAt: string,
  result: BatchParseOrchestratorResult,
): AppDraftState {
  const rows = result.rows.filter((row) => row.company === upload.company && row.platform === upload.platform);
  const issues = result.issues.filter((issue) => issue.company === upload.company && issue.platform === upload.platform);
  const nextUpload: PlatformUploadCard = {
    ...upload,
    status: deriveUploadStatus(rows.length, issues),
    fileCount: sourceFileNames.length,
    sourceFileNames,
    parsedRowCount: rows.length,
    issueCount: issues.length,
    lastUploadedAt: uploadedAt,
  };

  return mergeUploadResult(state, upload, nextUpload, rows, issues, uploadedAt);
}

function applyFailureResult(
  state: AppDraftState,
  upload: PlatformUploadCard,
  sourceFileNames: string[],
  uploadedAt: string,
  issue: ParseIssue,
): AppDraftState {
  const nextUpload: PlatformUploadCard = {
    ...upload,
    status: "error",
    fileCount: sourceFileNames.length,
    sourceFileNames,
    parsedRowCount: 0,
    issueCount: 1,
    lastUploadedAt: uploadedAt,
  };

  return mergeUploadResult(state, upload, nextUpload, [], [issue], uploadedAt);
}

function mergeUploadResult(
  state: AppDraftState,
  upload: PlatformUploadCard,
  nextUpload: PlatformUploadCard,
  nextRowsForUpload: AppDraftState["rows"],
  nextIssuesForUpload: AppDraftState["issues"],
  uploadedAt: string,
): AppDraftState {
  const preservedRows = state.rows.filter((row) => row.company !== upload.company || row.platform !== upload.platform);
  const preservedIssues = state.issues.filter((issue) => issue.company !== upload.company || issue.platform !== upload.platform);
  const uploads = state.uploads.map((currentUpload) => currentUpload.uploadId === upload.uploadId ? nextUpload : currentUpload);
  const rows = [...preservedRows, ...nextRowsForUpload];
  const issues = [...preservedIssues, ...nextIssuesForUpload];
  const selectedRowId = rows.some((row) => row.rowId === state.selectedRowId)
    ? state.selectedRowId
    : rows[0]?.rowId ?? "";

  return {
    ...state,
    batch: {
      ...state.batch,
      uploads,
      updatedAt: uploadedAt,
    },
    uploads,
    rows,
    issues,
    selectedRowId,
  };
}

function deriveUploadStatus(rowCount: number, issues: ParseIssue[]): PlatformUploadCard["status"] {
  if (issues.some((issue) => issue.severity === "error")) {
    return "error";
  }

  if (issues.length > 0) {
    return "warning";
  }

  if (rowCount > 0) {
    return "parsed";
  }

  return "uploaded";
}

function inferFileKind(fileName: string): FileKind | null {
  const normalizedFileName = fileName.toLowerCase();
  if (normalizedFileName.endsWith(".csv")) {
    return "csv";
  }

  if (normalizedFileName.endsWith(".xlsx")) {
    return "xlsx";
  }

  if (normalizedFileName.endsWith(".xls")) {
    return "html_xls";
  }

  return null;
}

function createUploadIssue(
  state: AppDraftState,
  upload: PlatformUploadCard,
  sourceFileName: string | undefined,
  message: string,
): ParseIssue {
  return {
    issueId: `${state.batch.batchId}-${upload.uploadId}-upload-mutation-error`,
    batchId: state.batch.batchId,
    company: upload.company,
    platform: upload.platform,
    severity: "error",
    issueType: "parse_error",
    message,
    sourceFileName,
  };
}
