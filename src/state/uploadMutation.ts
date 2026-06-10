import type { PlatformUploadCard } from "../data/mockSettlement";
import { parseCsvAdapter, parseXlsxAdapter } from "../fileAdapters";
import type { FileAdapterResult, FileKind } from "../fileAdapters/types";
import { runBatchParseOrchestrator, type BatchParseFileInput, type BatchParseOrchestratorResult } from "../orchestrators/batchParseOrchestrator";
import { parseMunpiaFileGroup } from "../parsers/munpiaGroupParser";
import type { BatchPlatformUploadSlot, BatchPlatformUploadSlotKey, ParseIssue, Platform } from "../types/settlement";
import type { AppDraftState } from "./appState";

type BrowserUploadFile = {
  name: string;
  arrayBuffer(): Promise<ArrayBuffer>;
};

export type LiveUploadTarget = {
  upload: PlatformUploadCard;
  slotKey?: BatchPlatformUploadSlotKey;
};

type UploadMutationDependencies = {
  parseBatch?: typeof runBatchParseOrchestrator;
  now?: () => string;
};

type LiveUploadAcceptedKind = "csv" | "xlsx" | "xls";

type SingleFileLiveUploadSpec = {
  kind: "single";
  uploadId: string;
  company: AppDraftState["uploads"][number]["company"];
  platform: Platform;
  acceptedKinds: LiveUploadAcceptedKind[];
  uiLabel: string;
};

type SlotLiveUploadSpec = {
  kind: "slot";
  uploadId: string;
  company: AppDraftState["uploads"][number]["company"];
  platform: Platform;
  slotKey: BatchPlatformUploadSlotKey;
  acceptedKinds: LiveUploadAcceptedKind[];
  uiLabel: string;
};

type RuntimeUploadSnapshot = {
  fileName: string;
  fileKind: FileKind;
  content: Uint8Array;
  uploadedAt: string;
};

type PersistedMunpiaSlotSnapshot = {
  fileName: string;
  fileKind: FileKind;
  uploadedAt: string;
  rows: Record<string, unknown>[];
  issues: ParseIssue[];
};

const SINGLE_FILE_LIVE_UPLOAD_SPECS: SingleFileLiveUploadSpec[] = [
  {
    kind: "single",
    uploadId: "upload-sr-misterblue",
    company: "sr",
    platform: "misterblue",
    acceptedKinds: ["xlsx"],
    uiLabel: "미스터블루 단일 XLSX 1-file",
  },
  {
    kind: "single",
    uploadId: "upload-raon-panmurim",
    company: "raon",
    platform: "panmurim",
    acceptedKinds: ["xlsx"],
    uiLabel: "판무림 단일 XLSX 1-file",
  },
  {
    kind: "single",
    uploadId: "upload-raon-bookcube",
    company: "raon",
    platform: "bookcube",
    acceptedKinds: ["xlsx"],
    uiLabel: "북큐브 단일 XLSX 1-file",
  },
];

const SLOT_LIVE_UPLOAD_SPECS: SlotLiveUploadSpec[] = [
  {
    kind: "slot",
    uploadId: "upload-raon-munpia",
    company: "raon",
    platform: "munpia",
    slotKey: "settlement",
    acceptedKinds: ["xlsx"],
    uiLabel: "문피아 정산 슬롯 XLSX 1-file",
  },
  {
    kind: "slot",
    uploadId: "upload-raon-munpia",
    company: "raon",
    platform: "munpia",
    slotKey: "authorCorrection",
    acceptedKinds: ["csv", "xlsx"],
    uiLabel: "문피아 작가 보정 슬롯 CSV/XLSX 1-file",
  },
];

const liveUploadRuntimeSnapshots = new Map<string, RuntimeUploadSnapshot>();
const PERSISTED_MUNPIA_SLOT_SNAPSHOT_STORAGE_KEY = "autosettlement.munpia-grouped-slot-snapshots.v1";
const STAGE_ONLY_ISSUE_MARKER = "-live-upload-stage-";

export function resetLiveUploadRuntimeState(options: { preservePersistedSnapshots?: boolean } = {}): void {
  liveUploadRuntimeSnapshots.clear();
  if (!options.preservePersistedSnapshots) {
    clearPersistedMunpiaSlotSnapshots();
  }
}

export function isLiveUploadEnabled(upload: PlatformUploadCard): boolean {
  return getSingleFileLiveUploadSpec(upload) !== undefined;
}

export function isLiveUploadSlotEnabled(upload: PlatformUploadCard, slot: BatchPlatformUploadSlot): boolean {
  return getSlotLiveUploadSpec(upload, slot.slotKey) !== undefined;
}

export function getLiveUploadAcceptAttribute(target: LiveUploadTarget): string | undefined {
  const spec = getLiveUploadSpec(target);
  return spec?.acceptedKinds.map((kind) => `.${kind}`).join(",");
}

export function getLiveUploadDescription(target: LiveUploadTarget): string | undefined {
  return getLiveUploadSpec(target)?.uiLabel;
}

export async function applyLiveUploadMutation(
  state: AppDraftState,
  target: LiveUploadTarget,
  files: BrowserUploadFile[],
  dependencies: UploadMutationDependencies = {},
): Promise<AppDraftState> {
  if (target.slotKey) {
    return applyMunpiaSlotUploadMutation(state, target, files, dependencies);
  }

  return applySingleFileUploadMutation(state, target.upload, files, dependencies);
}

async function applySingleFileUploadMutation(
  state: AppDraftState,
  upload: PlatformUploadCard,
  files: BrowserUploadFile[],
  dependencies: UploadMutationDependencies,
): Promise<AppDraftState> {
  const uploadedAt = dependencies.now?.() ?? new Date().toISOString();
  const liveSpec = getSingleFileLiveUploadSpec(upload);

  if (!liveSpec) {
    return applyFailureResult(
      state,
      upload,
      files.map((file) => file.name),
      uploadedAt,
      createUploadIssue(
        state,
        upload,
        files[0]?.name,
        `현재 live upload가 승인된 카드는 ${formatApprovedSingleFileLiveUploadCards()}뿐입니다.`,
      ),
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
  if (!fileKind || !isAcceptedFileKind(liveSpec, fileKind)) {
    return applyFailureResult(
      state,
      upload,
      [file.name],
      uploadedAt,
      createUploadIssue(
        state,
        upload,
        file.name,
        `지원하지 않는 파일 확장자입니다. 현재 ${liveSpec.uiLabel} 경로는 ${formatAcceptedKinds(liveSpec.acceptedKinds)}만 허용됩니다.`,
      ),
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

async function applyMunpiaSlotUploadMutation(
  state: AppDraftState,
  target: LiveUploadTarget,
  files: BrowserUploadFile[],
  dependencies: UploadMutationDependencies,
): Promise<AppDraftState> {
  const uploadedAt = dependencies.now?.() ?? new Date().toISOString();
  const upload = target.upload;
  const slotKey = target.slotKey;
  const slot = upload.slots?.find((candidate) => candidate.slotKey === slotKey);
  const liveSpec = slot ? getSlotLiveUploadSpec(upload, slot.slotKey) : undefined;

  if (!slot || !liveSpec) {
    return applyStageOnlyMunpiaResult(
      state,
      upload,
      upload.slots ?? [],
      uploadedAt,
      createStageOnlyIssue(
        state,
        upload,
        slotKey,
        files[0]?.name,
        "현재 live grouped upload가 승인된 슬롯이 아닙니다.",
      ),
    );
  }

  if (files.length !== 1) {
    return applyStageOnlyMunpiaResult(
      state,
      upload,
      updateMunpiaSlotMetadata(upload.slots ?? [], slot.slotKey, {
        status: "error",
        issueCount: 1,
        lastUploadedAt: uploadedAt,
      }),
      uploadedAt,
      createStageOnlyIssue(
        state,
        upload,
        slot.slotKey,
        files[0]?.name,
        "문피아 grouped live upload는 슬롯당 파일 1개만 허용합니다.",
      ),
    );
  }

  const file = files[0];
  const fileKind = inferFileKind(file.name);
  if (!fileKind || !isAcceptedFileKind(liveSpec, fileKind)) {
    return applyStageOnlyMunpiaResult(
      state,
      upload,
      updateMunpiaSlotMetadata(upload.slots ?? [], slot.slotKey, {
        status: "error",
        fileCount: 1,
        sourceFileNames: [file.name],
        issueCount: 1,
        lastUploadedAt: uploadedAt,
      }),
      uploadedAt,
      createStageOnlyIssue(
        state,
        upload,
        slot.slotKey,
        file.name,
        `지원하지 않는 파일 확장자입니다. 현재 ${liveSpec.uiLabel} 경로는 ${formatAcceptedKinds(liveSpec.acceptedKinds)}만 허용됩니다.`,
      ),
    );
  }

  const runtimeSnapshot: RuntimeUploadSnapshot = {
    fileName: file.name,
    fileKind,
    content: new Uint8Array(await file.arrayBuffer()),
    uploadedAt,
  };
  saveRuntimeSnapshot(state, upload, slot.slotKey, runtimeSnapshot);
  const persistedSnapshot = createPersistedMunpiaSlotSnapshot(state, upload, slot.slotKey, runtimeSnapshot);
  savePersistedMunpiaSlotSnapshot(state, upload, slot.slotKey, persistedSnapshot);

  const currentSlots = upload.slots ?? [];
  const stagedSlots = updateMunpiaSlotMetadata(currentSlots, slot.slotKey, {
    status: "uploaded",
    fileCount: 1,
    sourceFileNames: [file.name],
    issueCount: 0,
    lastUploadedAt: uploadedAt,
  });

  const settlementSnapshot = readPersistedMunpiaSlotSnapshot(state, upload, "settlement");
  const authorCorrectionSnapshot = readPersistedMunpiaSlotSnapshot(state, upload, "authorCorrection");

  if (!settlementSnapshot) {
    return applyStageOnlyMunpiaResult(
      state,
      upload,
      stagedSlots,
      uploadedAt,
      createStageOnlyIssue(
        state,
        upload,
        slot.slotKey,
        file.name,
        hasSettlementMetadata(upload)
          ? "현재 브라우저 runtime/persisted snapshot에는 문피아 정산 입력이 없어 재계산할 수 없습니다. 정산 파일을 다시 업로드하세요."
          : "문피아 grouped live upload는 정산 파일 슬롯 업로드 후에만 보정 파일 재계산을 수행합니다.",
        hasSettlementMetadata(upload) ? "parse_error" : "missing_file",
      ),
    );
  }

  try {
    const result = canUseInjectedMunpiaBatchParse(dependencies, state, upload, authorCorrectionSnapshot)
      ? (dependencies.parseBatch ?? runBatchParseOrchestrator)({
          batchId: state.batch.batchId,
          files: buildMunpiaBatchParseInputs(
            state,
            upload,
            readRuntimeSnapshot(state, upload, "settlement")!,
            authorCorrectionSnapshot ? readRuntimeSnapshot(state, upload, "authorCorrection") : undefined,
          ),
        })
      : runPersistedMunpiaGroupedParse(state, upload, settlementSnapshot, authorCorrectionSnapshot);

    return applySuccessfulMunpiaGroupedResult(
      state,
      upload,
      stagedSlots,
      uploadedAt,
      result,
      {
        settlement: settlementSnapshot,
        authorCorrection: authorCorrectionSnapshot,
      },
    );
  } catch (error) {
    const message = error instanceof Error
      ? error.message
      : "알 수 없는 문피아 grouped upload 오류가 발생했습니다.";
    return applyStageOnlyMunpiaResult(
      state,
      upload,
      stagedSlots,
      uploadedAt,
      createStageOnlyIssue(state, upload, slot.slotKey, file.name, message),
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
    status: deriveUploadStatus(rowCountOrZero(rows), issues),
    fileCount: sourceFileNames.length,
    sourceFileNames,
    parsedRowCount: rows.length,
    issueCount: issues.length,
    lastUploadedAt: uploadedAt,
  };

  return mergeCommittedUploadResult(state, upload, nextUpload, rows, issues, uploadedAt);
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

  return mergeCommittedUploadResult(state, upload, nextUpload, [], [issue], uploadedAt);
}

function applySuccessfulMunpiaGroupedResult(
  state: AppDraftState,
  upload: PlatformUploadCard,
  stagedSlots: BatchPlatformUploadSlot[],
  uploadedAt: string,
  result: BatchParseOrchestratorResult,
  snapshots: {
    settlement: PersistedMunpiaSlotSnapshot;
    authorCorrection?: PersistedMunpiaSlotSnapshot;
  },
): AppDraftState {
  const rows = result.rows.filter((row) => row.company === upload.company && row.platform === upload.platform);
  const issues = result.issues.filter((issue) => issue.company === upload.company && issue.platform === upload.platform);
  const nextSlots = deriveCommittedMunpiaSlots(stagedSlots, issues, snapshots);
  const nextUpload = buildMunpiaAggregateUpload(upload, nextSlots, rows.length, issues.length, deriveUploadStatus(rowCountOrZero(rows), issues), uploadedAt);
  return mergeCommittedUploadResult(state, upload, nextUpload, rows, issues, uploadedAt);
}

function applyStageOnlyMunpiaResult(
  state: AppDraftState,
  upload: PlatformUploadCard,
  nextSlots: BatchPlatformUploadSlot[],
  uploadedAt: string,
  stageIssue: ParseIssue,
): AppDraftState {
  const preservedRowsForPlatform = state.rows.filter((row) => row.company === upload.company && row.platform === upload.platform);
  const preservedIssuesForPlatform = state.issues.filter((issue) => (
    issue.company === upload.company
    && issue.platform === upload.platform
    && !isStageOnlyIssueForUpload(issue, upload)
  ));
  const nextIssuesForPlatform = [...preservedIssuesForPlatform, stageIssue];
  const nextUpload = buildMunpiaAggregateUpload(
    upload,
    nextSlots,
    preservedRowsForPlatform.length,
    nextIssuesForPlatform.length,
    deriveGroupedStageStatus(nextSlots, nextIssuesForPlatform),
    uploadedAt,
  );

  return mergeStageOnlyUploadResult(state, upload, nextUpload, nextIssuesForPlatform, uploadedAt);
}

function mergeCommittedUploadResult(
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

function mergeStageOnlyUploadResult(
  state: AppDraftState,
  upload: PlatformUploadCard,
  nextUpload: PlatformUploadCard,
  nextIssuesForUpload: AppDraftState["issues"],
  uploadedAt: string,
): AppDraftState {
  const uploads = state.uploads.map((currentUpload) => currentUpload.uploadId === upload.uploadId ? nextUpload : currentUpload);
  const preservedIssues = state.issues.filter((issue) => issue.company !== upload.company || issue.platform !== upload.platform);
  return {
    ...state,
    batch: {
      ...state.batch,
      uploads,
      updatedAt: uploadedAt,
    },
    uploads,
    issues: [...preservedIssues, ...nextIssuesForUpload],
  };
}

function deriveCommittedMunpiaSlots(
  slots: BatchPlatformUploadSlot[],
  issues: ParseIssue[],
  snapshots: {
    settlement: PersistedMunpiaSlotSnapshot;
    authorCorrection?: PersistedMunpiaSlotSnapshot;
  },
): BatchPlatformUploadSlot[] {
  return slots.map((slot) => {
    const snapshot = slot.slotKey === "settlement"
      ? snapshots.settlement
      : slot.slotKey === "authorCorrection"
        ? snapshots.authorCorrection
        : undefined;

    if (!snapshot) {
      return {
        ...slot,
        fileCount: 0,
        sourceFileNames: [],
        issueCount: 0,
      };
    }

    const slotIssues = issues.filter((issue) => issue.sourceFileName === snapshot.fileName);
    return {
      ...slot,
      status: deriveSlotStatus(1, slotIssues, true),
      fileCount: 1,
      sourceFileNames: [snapshot.fileName],
      issueCount: slotIssues.length,
      lastUploadedAt: snapshot.uploadedAt,
    };
  });
}

function buildMunpiaAggregateUpload(
  upload: PlatformUploadCard,
  slots: BatchPlatformUploadSlot[],
  parsedRowCount: number,
  issueCount: number,
  status: PlatformUploadCard["status"],
  uploadedAt: string,
): PlatformUploadCard {
  const sourceFileNames = slots.flatMap((slot) => slot.sourceFileNames);
  const fileCount = slots.reduce((sum, slot) => sum + slot.fileCount, 0);
  return {
    ...upload,
    status,
    fileCount,
    sourceFileNames,
    parsedRowCount,
    issueCount,
    lastUploadedAt: uploadedAt,
    slots,
  };
}

function updateMunpiaSlotMetadata(
  slots: BatchPlatformUploadSlot[],
  slotKey: BatchPlatformUploadSlotKey,
  nextValues: Partial<BatchPlatformUploadSlot>,
): BatchPlatformUploadSlot[] {
  return slots.map((slot) => (
    slot.slotKey === slotKey
      ? { ...slot, ...nextValues }
      : slot
  ));
}

function deriveGroupedStageStatus(
  slots: BatchPlatformUploadSlot[],
  issues: ParseIssue[],
): PlatformUploadCard["status"] {
  const settlementSlot = slots.find((slot) => slot.slotKey === "settlement");
  if (!settlementSlot || settlementSlot.fileCount === 0) {
    return "error";
  }

  if (issues.some((issue) => issue.severity === "error")) {
    return "error";
  }

  if (issues.length > 0) {
    return "warning";
  }

  return "uploaded";
}

function deriveSlotStatus(
  fileCount: number,
  issues: ParseIssue[],
  committed: boolean,
): BatchPlatformUploadSlot["status"] {
  if (fileCount === 0) {
    return "empty";
  }

  if (issues.some((issue) => issue.severity === "error")) {
    return "error";
  }

  if (issues.length > 0) {
    return "warning";
  }

  return committed ? "parsed" : "uploaded";
}

function buildMunpiaBatchParseInputs(
  state: AppDraftState,
  upload: PlatformUploadCard,
  settlement: RuntimeUploadSnapshot,
  authorCorrection?: RuntimeUploadSnapshot,
): BatchParseFileInput[] {
  const files: BatchParseFileInput[] = [
    {
      company: upload.company,
      platform: upload.platform,
      fileKind: settlement.fileKind,
      fileName: settlement.fileName,
      saleMonth: state.batch.settlementMonth,
      slot: "settlement",
      content: settlement.content,
    },
  ];

  if (authorCorrection) {
    files.push({
      company: upload.company,
      platform: upload.platform,
      fileKind: authorCorrection.fileKind,
      fileName: authorCorrection.fileName,
      saleMonth: state.batch.settlementMonth,
      slot: "authorCorrection",
      content: authorCorrection.content,
    });
  }

  return files;
}

function saveRuntimeSnapshot(
  state: AppDraftState,
  upload: PlatformUploadCard,
  slotKey: BatchPlatformUploadSlotKey,
  snapshot: RuntimeUploadSnapshot,
): void {
  liveUploadRuntimeSnapshots.set(createRuntimeSnapshotKey(state.batch.batchId, upload.uploadId, slotKey), snapshot);
}

function createPersistedMunpiaSlotSnapshot(
  state: AppDraftState,
  upload: PlatformUploadCard,
  slotKey: BatchPlatformUploadSlotKey,
  snapshot: RuntimeUploadSnapshot,
): PersistedMunpiaSlotSnapshot {
  const adapterResult = runMunpiaSlotAdapter(state, upload, slotKey, snapshot);
  return {
    fileName: snapshot.fileName,
    fileKind: snapshot.fileKind,
    uploadedAt: snapshot.uploadedAt,
    rows: adapterResult.rows,
    issues: adapterResult.issues,
  };
}

function runMunpiaSlotAdapter(
  state: AppDraftState,
  upload: PlatformUploadCard,
  slotKey: BatchPlatformUploadSlotKey,
  snapshot: RuntimeUploadSnapshot,
): FileAdapterResult {
  if (snapshot.fileKind === "csv") {
    return parseCsvAdapter({
      batchId: state.batch.batchId,
      company: upload.company,
      platform: upload.platform,
      saleMonth: state.batch.settlementMonth,
      sourceFileName: snapshot.fileName,
      fileKind: snapshot.fileKind,
      slot: slotKey,
    }, snapshot.content);
  }

  return parseXlsxAdapter({
    batchId: state.batch.batchId,
    company: upload.company,
    platform: upload.platform,
    saleMonth: state.batch.settlementMonth,
    sourceFileName: snapshot.fileName,
    fileKind: snapshot.fileKind,
    slot: slotKey,
  }, snapshot.content);
}

function savePersistedMunpiaSlotSnapshot(
  state: AppDraftState,
  upload: PlatformUploadCard,
  slotKey: BatchPlatformUploadSlotKey,
  snapshot: PersistedMunpiaSlotSnapshot,
): void {
  const storage = getBrowserStorage();
  if (!storage) {
    return;
  }

  const allSnapshots = readAllPersistedMunpiaSlotSnapshots(storage);
  allSnapshots[createRuntimeSnapshotKey(state.batch.batchId, upload.uploadId, slotKey)] = snapshot;
  storage.setItem(PERSISTED_MUNPIA_SLOT_SNAPSHOT_STORAGE_KEY, JSON.stringify(allSnapshots));
}

function readPersistedMunpiaSlotSnapshot(
  state: AppDraftState,
  upload: PlatformUploadCard,
  slotKey: BatchPlatformUploadSlotKey,
): PersistedMunpiaSlotSnapshot | undefined {
  const storage = getBrowserStorage();
  if (!storage) {
    return undefined;
  }

  return readAllPersistedMunpiaSlotSnapshots(storage)[createRuntimeSnapshotKey(state.batch.batchId, upload.uploadId, slotKey)];
}

function readAllPersistedMunpiaSlotSnapshots(
  storage: Storage,
): Record<string, PersistedMunpiaSlotSnapshot> {
  const raw = storage.getItem(PERSISTED_MUNPIA_SLOT_SNAPSHOT_STORAGE_KEY);
  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw) as Record<string, PersistedMunpiaSlotSnapshot>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function clearPersistedMunpiaSlotSnapshots(): void {
  getBrowserStorage()?.removeItem(PERSISTED_MUNPIA_SLOT_SNAPSHOT_STORAGE_KEY);
}

function canUseInjectedMunpiaBatchParse(
  dependencies: UploadMutationDependencies,
  state: AppDraftState,
  upload: PlatformUploadCard,
  authorCorrectionSnapshot?: PersistedMunpiaSlotSnapshot,
): boolean {
  if (!dependencies.parseBatch) {
    return false;
  }

  const settlementRuntime = readRuntimeSnapshot(state, upload, "settlement");
  if (!settlementRuntime) {
    return false;
  }

  if (!authorCorrectionSnapshot) {
    return true;
  }

  return readRuntimeSnapshot(state, upload, "authorCorrection") !== undefined;
}

function runPersistedMunpiaGroupedParse(
  state: AppDraftState,
  upload: PlatformUploadCard,
  settlement: PersistedMunpiaSlotSnapshot,
  authorCorrection?: PersistedMunpiaSlotSnapshot,
): BatchParseOrchestratorResult {
  const result = parseMunpiaFileGroup(
    {
      batchId: state.batch.batchId,
      company: upload.company,
      platform: "munpia",
      saleMonth: state.batch.settlementMonth,
      sourceFileNames: [settlement.fileName, ...(authorCorrection ? [authorCorrection.fileName] : [])],
    },
    [
      {
        sourceFileName: settlement.fileName,
        slot: "settlement",
        rows: settlement.rows,
        issues: settlement.issues,
      },
      ...(authorCorrection
        ? [{
            sourceFileName: authorCorrection.fileName,
            slot: "authorCorrection",
            rows: authorCorrection.rows,
            issues: authorCorrection.issues,
          }]
        : []),
    ],
  );

  return {
    rows: result.rows,
    issues: result.issues,
    fileResults: [
      {
        fileName: settlement.fileName,
        company: upload.company,
        platform: upload.platform,
        fileKind: settlement.fileKind,
        saleMonth: state.batch.settlementMonth,
        status: settlement.issues.length > 0 ? "failed" as const : "success" as const,
        rowCount: settlement.rows.length,
        issueCount: settlement.issues.length,
      },
      ...(authorCorrection
        ? [{
            fileName: authorCorrection.fileName,
            company: upload.company,
            platform: upload.platform,
            fileKind: authorCorrection.fileKind,
            saleMonth: state.batch.settlementMonth,
            status: authorCorrection.issues.length > 0 ? "failed" as const : "success" as const,
            rowCount: authorCorrection.rows.length,
            issueCount: authorCorrection.issues.length,
          }]
        : []),
    ],
  };
}

function readRuntimeSnapshot(
  state: AppDraftState,
  upload: PlatformUploadCard,
  slotKey: BatchPlatformUploadSlotKey,
): RuntimeUploadSnapshot | undefined {
  return liveUploadRuntimeSnapshots.get(createRuntimeSnapshotKey(state.batch.batchId, upload.uploadId, slotKey));
}

function createRuntimeSnapshotKey(batchId: string, uploadId: string, slotKey: BatchPlatformUploadSlotKey): string {
  return [batchId, uploadId, slotKey].join("\u001f");
}

function hasSettlementMetadata(upload: PlatformUploadCard): boolean {
  return upload.slots?.some((slot) => slot.slotKey === "settlement" && slot.fileCount > 0) ?? false;
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

function rowCountOrZero(rows: AppDraftState["rows"]): number {
  return rows.length;
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

function getLiveUploadSpec(target: LiveUploadTarget): SingleFileLiveUploadSpec | SlotLiveUploadSpec | undefined {
  return target.slotKey
    ? getSlotLiveUploadSpec(target.upload, target.slotKey)
    : getSingleFileLiveUploadSpec(target.upload);
}

function getSingleFileLiveUploadSpec(upload: PlatformUploadCard): SingleFileLiveUploadSpec | undefined {
  return SINGLE_FILE_LIVE_UPLOAD_SPECS.find((spec) => (
    spec.uploadId === upload.uploadId
    && spec.company === upload.company
    && spec.platform === upload.platform
    && upload.requiredFileCount === 1
    && (upload.slots?.length ?? 0) === 0
  ));
}

function getSlotLiveUploadSpec(
  upload: PlatformUploadCard,
  slotKey: BatchPlatformUploadSlotKey,
): SlotLiveUploadSpec | undefined {
  return SLOT_LIVE_UPLOAD_SPECS.find((spec) => (
    spec.uploadId === upload.uploadId
    && spec.company === upload.company
    && spec.platform === upload.platform
    && spec.slotKey === slotKey
    && (upload.slots?.length ?? 0) > 0
  ));
}

function isAcceptedFileKind(spec: SingleFileLiveUploadSpec | SlotLiveUploadSpec, fileKind: FileKind): boolean {
  if (fileKind === "html_xls") {
    return spec.acceptedKinds.includes("xls");
  }

  return spec.acceptedKinds.includes(fileKind as LiveUploadAcceptedKind);
}

function formatAcceptedKinds(acceptedKinds: LiveUploadAcceptedKind[]): string {
  return acceptedKinds.map((kind) => `.${kind}`).join("/");
}

function formatApprovedSingleFileLiveUploadCards(): string {
  return SINGLE_FILE_LIVE_UPLOAD_SPECS.map((spec) => spec.uiLabel).join(", ");
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

function createStageOnlyIssue(
  state: AppDraftState,
  upload: PlatformUploadCard,
  slotKey: BatchPlatformUploadSlotKey | undefined,
  sourceFileName: string | undefined,
  message: string,
  issueType: ParseIssue["issueType"] = "parse_error",
): ParseIssue {
  const normalizedSlotKey = slotKey ?? "settlement";
  return {
    issueId: `${state.batch.batchId}-${upload.uploadId}${STAGE_ONLY_ISSUE_MARKER}${normalizedSlotKey}`,
    batchId: state.batch.batchId,
    company: upload.company,
    platform: upload.platform,
    severity: "error",
    issueType,
    message,
    sourceFileName,
  };
}

function isStageOnlyIssueForUpload(issue: ParseIssue, upload: PlatformUploadCard): boolean {
  return issue.issueId.startsWith(`${upload.batchId}-${upload.uploadId}${STAGE_ONLY_ISSUE_MARKER}`);
}

function getBrowserStorage(): Storage | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }

  return window.localStorage;
}
