import type { PlatformUploadCard } from "../data/mockSettlement";
import { parseCsvAdapter, parseHtmlXlsAdapter, parseXlsxAdapter } from "../fileAdapters";
import type { FileAdapterResult, FileKind } from "../fileAdapters/types";
import { runBatchParseOrchestrator, type BatchParseFileInput, type BatchParseOrchestratorResult } from "../orchestrators/batchParseOrchestrator";
import { parseJoaraFileGroup } from "../parsers/joaraGroupParser";
import { parseMunpiaFileGroup } from "../parsers/munpiaGroupParser";
import { parseRidibooksFileGroup } from "../parsers/ridibooksGroupParser";
import { parseSeriesFileGroup } from "../parsers/seriesGroupParser";
import type { BatchPlatformUploadSlot, BatchPlatformUploadSlotKey, ParseIssue, Platform } from "../types/settlement";
import type { AppDraftState } from "./appState";

type BrowserUploadFile = {
  name: string;
  arrayBuffer(): Promise<ArrayBuffer>;
};

type RidibooksEventPeriod = {
  startDate: string;
  endDate: string;
};

export type LiveUploadTarget = {
  upload: PlatformUploadCard;
  slotKey?: BatchPlatformUploadSlotKey;
  eventPeriod?: RidibooksEventPeriod;
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

type MixedCompanyLiveUploadSpec = {
  kind: "mixed";
  uploadId: string;
  company: AppDraftState["uploads"][number]["company"];
  platform: Platform;
  sharedCompanies: AppDraftState["uploads"][number]["company"][];
  acceptedKinds: LiveUploadAcceptedKind[];
  uiLabel: string;
  replacementTargets: Array<{
    company: AppDraftState["uploads"][number]["company"];
    platform: Platform;
  }>;
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

type PersistedGroupedFileSnapshot = {
  fileName: string;
  fileKind: FileKind;
  uploadedAt: string;
  rows: Record<string, unknown>[];
  issues: ParseIssue[];
};

type PersistedGroupedSlotSnapshot = {
  files: PersistedGroupedFileSnapshot[];
  uploadedAt: string;
  eventPeriod?: RidibooksEventPeriod;
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
    uploadId: "upload-sr-panmurim",
    company: "sr",
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
  {
    kind: "single",
    uploadId: "upload-sr-bookcube",
    company: "sr",
    platform: "bookcube",
    acceptedKinds: ["xlsx"],
    uiLabel: "북큐브 단일 XLSX 1-file",
  },
  {
    kind: "single",
    uploadId: "upload-raon-epyrus",
    company: "raon",
    platform: "epyrus",
    acceptedKinds: ["csv"],
    uiLabel: "에피루스 단일 CSV 1-file",
  },
  {
    kind: "single",
    uploadId: "upload-sr-epyrus",
    company: "sr",
    platform: "epyrus",
    acceptedKinds: ["csv"],
    uiLabel: "에피루스 단일 CSV 1-file",
  },
  {
    kind: "single",
    uploadId: "upload-sr-yes24",
    company: "sr",
    platform: "yes24",
    acceptedKinds: ["xlsx"],
    uiLabel: "예스24 단일 XLSX 1-file",
  },
  {
    kind: "single",
    uploadId: "upload-sr-aladin",
    company: "sr",
    platform: "aladin",
    acceptedKinds: ["csv"],
    uiLabel: "알라딘 단일 CSV 1-file",
  },
  {
    kind: "single",
    uploadId: "upload-raon-guru-company",
    company: "raon",
    platform: "guru_company",
    acceptedKinds: ["csv"],
    uiLabel: "구루컴퍼니 단일 CSV 1-file",
  },
  {
    kind: "single",
    uploadId: "upload-sr-guru-company",
    company: "sr",
    platform: "guru_company",
    acceptedKinds: ["csv"],
    uiLabel: "구루컴퍼니 단일 CSV 1-file",
  },
  {
    kind: "single",
    uploadId: "upload-sr-kyobo",
    company: "sr",
    platform: "kyobo",
    acceptedKinds: ["xlsx"],
    uiLabel: "교보문고 단일 XLSX 1-file",
  },
  {
    kind: "single",
    uploadId: "upload-sr-kakao-page",
    company: "sr",
    platform: "kakao_page",
    acceptedKinds: ["xlsx"],
    uiLabel: "카카오페이지 단일 XLSX 1-file",
  },
  {
    kind: "single",
    uploadId: "upload-raon-mootoon",
    company: "raon",
    platform: "mootoon",
    acceptedKinds: ["xlsx"],
    uiLabel: "무툰 단일 XLSX 1-file",
  },
  {
    kind: "single",
    uploadId: "upload-sr-mootoon",
    company: "sr",
    platform: "mootoon",
    acceptedKinds: ["xlsx"],
    uiLabel: "무툰 단일 XLSX 1-file",
  },
  {
    kind: "single",
    uploadId: "upload-raon-novelpia",
    company: "raon",
    platform: "novelpia",
    acceptedKinds: ["xls"],
    uiLabel: "노벨피아 단일 HTML-XLS 1-file",
  },
  {
    kind: "single",
    uploadId: "upload-sr-novelpia",
    company: "sr",
    platform: "novelpia",
    acceptedKinds: ["xls"],
    uiLabel: "노벨피아 단일 HTML-XLS 1-file",
  },
];

const MIXED_COMPANY_LIVE_UPLOAD_SPECS: MixedCompanyLiveUploadSpec[] = [
  {
    kind: "mixed",
    uploadId: "upload-shared-onestore",
    company: "raon",
    platform: "onestore",
    sharedCompanies: ["raon", "sr"],
    acceptedKinds: ["xlsx"],
    uiLabel: "원스토어 공유 XLSX 1-file (raon+sr 동시 반영)",
    replacementTargets: [
      { company: "raon", platform: "onestore" },
      { company: "sr", platform: "onestore" },
    ],
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
  {
    kind: "slot",
    uploadId: "upload-raon-series",
    company: "raon",
    platform: "series",
    slotKey: "seriesGeneral",
    acceptedKinds: ["xls"],
    uiLabel: "시리즈 일반 슬롯 HTML-XLS 3-file",
  },
  {
    kind: "slot",
    uploadId: "upload-raon-series",
    company: "raon",
    platform: "series",
    slotKey: "seriesApp",
    acceptedKinds: ["xls"],
    uiLabel: "시리즈 앱 슬롯 HTML-XLS 3-file",
  },
  {
    kind: "slot",
    uploadId: "upload-sr-series",
    company: "sr",
    platform: "series",
    slotKey: "seriesGeneral",
    acceptedKinds: ["xls"],
    uiLabel: "시리즈 일반 슬롯 HTML-XLS 3-file",
  },
  {
    kind: "slot",
    uploadId: "upload-sr-series",
    company: "sr",
    platform: "series",
    slotKey: "seriesApp",
    acceptedKinds: ["xls"],
    uiLabel: "시리즈 앱 슬롯 HTML-XLS 3-file",
  },
  {
    kind: "slot",
    uploadId: "upload-raon-ridibooks",
    company: "raon",
    platform: "ridibooks",
    slotKey: "base",
    acceptedKinds: ["csv"],
    uiLabel: "리디북스 기본 정산 슬롯 CSV 1-file",
  },
  {
    kind: "slot",
    uploadId: "upload-raon-ridibooks",
    company: "raon",
    platform: "ridibooks",
    slotKey: "file1",
    acceptedKinds: ["csv"],
    uiLabel: "리디북스 file_1 보정 슬롯 CSV 1-file",
  },
  {
    kind: "slot",
    uploadId: "upload-raon-ridibooks",
    company: "raon",
    platform: "ridibooks",
    slotKey: "event",
    acceptedKinds: ["csv"],
    uiLabel: "리디북스 이벤트 거래 슬롯 CSV 1-file",
  },
  {
    kind: "slot",
    uploadId: "upload-raon-ridibooks",
    company: "raon",
    platform: "ridibooks",
    slotKey: "mgCorrection",
    acceptedKinds: ["csv", "xlsx"],
    uiLabel: "리디북스 MG 보정 슬롯 CSV/XLSX 1-file",
  },
  {
    kind: "slot",
    uploadId: "upload-raon-joara",
    company: "raon",
    platform: "joara",
    slotKey: "settlementDetail",
    acceptedKinds: ["csv"],
    uiLabel: "조아라 정산 상세리스트 슬롯 CSV 1-file",
  },
  {
    kind: "slot",
    uploadId: "upload-raon-joara",
    company: "raon",
    platform: "joara",
    slotKey: "workSettlement",
    acceptedKinds: ["csv"],
    uiLabel: "조아라 작품별 정산리스트 슬롯 CSV 1-file",
  },
];

const liveUploadRuntimeSnapshots = new Map<string, RuntimeUploadSnapshot>();
const seriesSlotRuntimeSnapshots = new Map<string, RuntimeUploadSnapshot[]>();
const PERSISTED_MUNPIA_SLOT_SNAPSHOT_STORAGE_KEY = "autosettlement.munpia-grouped-slot-snapshots.v1";
const PERSISTED_SERIES_SLOT_SNAPSHOT_STORAGE_KEY = "autosettlement.series-grouped-slot-snapshots.v1";
const PERSISTED_RIDIBOOKS_SLOT_SNAPSHOT_STORAGE_KEY = "autosettlement.ridibooks-grouped-slot-snapshots.v1";
const PERSISTED_JOARA_SLOT_SNAPSHOT_STORAGE_KEY = "autosettlement.joara-grouped-slot-snapshots.v1";
const STAGE_ONLY_ISSUE_MARKER = "-live-upload-stage-";

export function resetLiveUploadRuntimeState(options: { preservePersistedSnapshots?: boolean } = {}): void {
  liveUploadRuntimeSnapshots.clear();
  seriesSlotRuntimeSnapshots.clear();
  if (!options.preservePersistedSnapshots) {
    clearPersistedMunpiaSlotSnapshots();
    clearPersistedSeriesSlotSnapshots();
    clearPersistedRidibooksSlotSnapshots();
    clearPersistedJoaraSlotSnapshots();
  }
}

export function isLiveUploadEnabled(upload: PlatformUploadCard): boolean {
  return getSingleFileLiveUploadSpec(upload) !== undefined || getMixedCompanyLiveUploadSpec(upload) !== undefined;
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
    if (target.upload.platform === "munpia") {
      return applyMunpiaSlotUploadMutation(state, target, files, dependencies);
    }

    if (target.upload.platform === "series") {
      return applySeriesSlotUploadMutation(state, target, files, dependencies);
    }

    if (target.upload.platform === "ridibooks") {
      return applyRidibooksSlotUploadMutation(state, target, files, dependencies);
    }

    if (target.upload.platform === "joara") {
      return applyJoaraSlotUploadMutation(state, target, files, dependencies);
    }
  }

  const mixedSpec = getMixedCompanyLiveUploadSpec(target.upload);
  if (mixedSpec) {
    return applyMixedCompanyUploadMutation(state, target.upload, files, dependencies, mixedSpec);
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

async function applyMixedCompanyUploadMutation(
  state: AppDraftState,
  upload: PlatformUploadCard,
  files: BrowserUploadFile[],
  dependencies: UploadMutationDependencies,
  liveSpec: MixedCompanyLiveUploadSpec,
): Promise<AppDraftState> {
  const uploadedAt = dependencies.now?.() ?? new Date().toISOString();

  if (files.length !== 1) {
    return applyMixedCompanyFailureResult(
      state,
      upload,
      [files[0]?.name].filter((value): value is string => Boolean(value)),
      uploadedAt,
      liveSpec,
      createUploadIssue(state, upload, files[0]?.name, "현재 Onestore mixed-company live upload는 파일 1개만 허용합니다."),
    );
  }

  const file = files[0];
  const fileKind = inferFileKind(file.name);
  if (!fileKind || !isAcceptedFileKind(liveSpec, fileKind)) {
    return applyMixedCompanyFailureResult(
      state,
      upload,
      [file.name],
      uploadedAt,
      liveSpec,
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

    return applySuccessfulMixedCompanyResult(state, upload, [file.name], uploadedAt, result, liveSpec);
  } catch (error) {
    const message = error instanceof Error
      ? error.message
      : "알 수 없는 업로드 오류가 발생했습니다.";
    return applyMixedCompanyFailureResult(
      state,
      upload,
      [file.name],
      uploadedAt,
      liveSpec,
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

async function applySeriesSlotUploadMutation(
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
    return applyStageOnlySeriesResult(
      state,
      upload,
      upload.slots ?? [],
      uploadedAt,
      createStageOnlyIssue(
        state,
        upload,
        slotKey,
        files[0]?.name,
        "현재 live grouped upload가 승인된 시리즈 슬롯이 아닙니다.",
      ),
    );
  }

  if (files.length !== 3) {
    return applyStageOnlySeriesResult(
      state,
      upload,
      updateMunpiaSlotMetadata(upload.slots ?? [], slot.slotKey, {
        status: "error",
        fileCount: files.length,
        sourceFileNames: files.map((file) => file.name),
        issueCount: 1,
        lastUploadedAt: uploadedAt,
      }),
      uploadedAt,
      createStageOnlyIssue(
        state,
        upload,
        slot.slotKey,
        files[0]?.name,
        "시리즈 grouped live upload는 슬롯당 HTML-XLS 파일 3개를 한 번에 업로드해야 합니다.",
        "mapping_failed",
      ),
    );
  }

  const runtimeSnapshots = await Promise.all(files.map(async (file) => {
    const fileKind = inferFileKind(file.name);
    if (!fileKind || !isAcceptedFileKind(liveSpec, fileKind)) {
      throw createStageOnlyIssue(
        state,
        upload,
        slot.slotKey,
        file.name,
        `지원하지 않는 파일 확장자입니다. 현재 ${liveSpec.uiLabel} 경로는 ${formatAcceptedKinds(liveSpec.acceptedKinds)}만 허용됩니다.`,
      );
    }

    return {
      fileName: file.name,
      fileKind,
      content: new Uint8Array(await file.arrayBuffer()),
      uploadedAt,
    } satisfies RuntimeUploadSnapshot;
  })).catch((error: unknown) => error);

  if (!Array.isArray(runtimeSnapshots)) {
    return applyStageOnlySeriesResult(
      state,
      upload,
      updateMunpiaSlotMetadata(upload.slots ?? [], slot.slotKey, {
        status: "error",
        fileCount: files.length,
        sourceFileNames: files.map((file) => file.name),
        issueCount: 1,
        lastUploadedAt: uploadedAt,
      }),
      uploadedAt,
      runtimeSnapshots as ParseIssue,
    );
  }

  saveSeriesRuntimeSnapshots(state, upload, slot.slotKey, runtimeSnapshots);
  const persistedSnapshot = createPersistedSeriesSlotSnapshot(state, upload, slot.slotKey, runtimeSnapshots);
  savePersistedSeriesSlotSnapshot(state, upload, slot.slotKey, persistedSnapshot);

  const stagedSlots = updateMunpiaSlotMetadata(upload.slots ?? [], slot.slotKey, {
    status: "uploaded",
    fileCount: runtimeSnapshots.length,
    sourceFileNames: runtimeSnapshots.map((snapshot) => snapshot.fileName),
    issueCount: 0,
    lastUploadedAt: uploadedAt,
  });

  const generalSnapshot = readPersistedSeriesSlotSnapshot(state, upload, "seriesGeneral");
  const appSnapshot = readPersistedSeriesSlotSnapshot(state, upload, "seriesApp");

  if (!generalSnapshot || !appSnapshot || generalSnapshot.files.length !== 3 || appSnapshot.files.length !== 3) {
    return applyStageOnlySeriesResult(
      state,
      upload,
      stagedSlots,
      uploadedAt,
      createSeriesCompletenessIssue(state, upload, slot.slotKey, files[0]?.name, upload, generalSnapshot, appSnapshot),
    );
  }

  try {
    const result = canUseInjectedSeriesBatchParse(dependencies, state, upload)
      ? (dependencies.parseBatch ?? runBatchParseOrchestrator)({
          batchId: state.batch.batchId,
          files: buildSeriesBatchParseInputs(state, upload),
        })
      : runPersistedSeriesGroupedParse(state, upload, generalSnapshot, appSnapshot);

    return applySuccessfulSeriesGroupedResult(
      state,
      upload,
      stagedSlots,
      uploadedAt,
      result,
      {
        seriesGeneral: generalSnapshot,
        seriesApp: appSnapshot,
      },
    );
  } catch (error) {
    const message = error instanceof Error
      ? error.message
      : "알 수 없는 시리즈 grouped upload 오류가 발생했습니다.";
    return applyStageOnlySeriesResult(
      state,
      upload,
      stagedSlots,
      uploadedAt,
      createStageOnlyIssue(state, upload, slot.slotKey, files[0]?.name, message),
    );
  }
}

async function applyRidibooksSlotUploadMutation(
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
    return applyStageOnlyRidibooksResult(
      state,
      upload,
      upload.slots ?? [],
      uploadedAt,
      createStageOnlyIssue(
        state,
        upload,
        slotKey,
        files[0]?.name,
        "현재 live grouped upload가 승인된 리디북스 슬롯이 아닙니다.",
      ),
    );
  }

  if (files.length !== 1) {
    return applyStageOnlyRidibooksResult(
      state,
      upload,
      updateMunpiaSlotMetadata(upload.slots ?? [], slot.slotKey, {
        status: "error",
        fileCount: files.length,
        sourceFileNames: files.map((file) => file.name),
        issueCount: 1,
        lastUploadedAt: uploadedAt,
      }),
      uploadedAt,
      createStageOnlyIssue(
        state,
        upload,
        slot.slotKey,
        files[0]?.name,
        "리디북스 grouped live upload는 슬롯당 파일 1개만 허용합니다.",
        "mapping_failed",
      ),
    );
  }

  const file = files[0];
  const fileKind = inferFileKind(file.name);
  if (!fileKind || !isAcceptedFileKind(liveSpec, fileKind)) {
    return applyStageOnlyRidibooksResult(
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

  const eventPeriod = slot.slotKey === "event"
    ? normalizeRidibooksEventPeriod(target.eventPeriod)
    : undefined;

  if (slot.slotKey === "event" && !eventPeriod) {
    return applyStageOnlyRidibooksResult(
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
        "리디북스 event 슬롯은 이벤트 시작일/종료일(eventPeriod)을 함께 입력해야 live 재계산할 수 있습니다.",
        "missing_field",
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

  let persistedSnapshot: PersistedGroupedSlotSnapshot;
  try {
    persistedSnapshot = createPersistedRidibooksSlotSnapshot(state, upload, slot.slotKey, runtimeSnapshot, eventPeriod);
    savePersistedRidibooksSlotSnapshot(state, upload, slot.slotKey, persistedSnapshot);
  } catch (error) {
    const message = error instanceof Error ? error.message : "알 수 없는 저장 오류";
    return applyStageOnlyRidibooksResult(
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
        `리디북스 업로드 중 브라우저 저장 공간에 snapshot을 저장하지 못했습니다. 새로고침 후에도 같은 문제가 반복되면 기존 임시 업로드 상태를 초기화한 뒤 다시 업로드하세요. (${message})`,
      ),
    );
  }

  const stagedSlots = updateMunpiaSlotMetadata(upload.slots ?? [], slot.slotKey, {
    status: "uploaded",
    fileCount: 1,
    sourceFileNames: [file.name],
    issueCount: 0,
    lastUploadedAt: uploadedAt,
  });

  const baseSnapshot = readPersistedRidibooksSlotSnapshot(state, upload, "base");
  const file1Snapshot = readPersistedRidibooksSlotSnapshot(state, upload, "file1");
  const eventSnapshot = readPersistedRidibooksSlotSnapshot(state, upload, "event");
  const mgCorrectionSnapshot = readPersistedRidibooksSlotSnapshot(state, upload, "mgCorrection");

  if (!baseSnapshot || !file1Snapshot) {
    return applyStageOnlyRidibooksResult(
      state,
      upload,
      stagedSlots,
      uploadedAt,
      createRidibooksCompletenessIssue(state, upload, slot.slotKey, file.name, upload, baseSnapshot, file1Snapshot),
    );
  }

  try {
    const result = canUseInjectedRidibooksBatchParse(dependencies, state, upload, eventSnapshot, mgCorrectionSnapshot)
      ? (dependencies.parseBatch ?? runBatchParseOrchestrator)({
          batchId: state.batch.batchId,
          files: buildRidibooksBatchParseInputs(state, upload),
        })
      : runPersistedRidibooksGroupedParse(state, upload, baseSnapshot, file1Snapshot, eventSnapshot, mgCorrectionSnapshot);

    return applySuccessfulRidibooksGroupedResult(
      state,
      upload,
      stagedSlots,
      uploadedAt,
      result,
      {
        base: baseSnapshot,
        file1: file1Snapshot,
        event: eventSnapshot,
        mgCorrection: mgCorrectionSnapshot,
      },
    );
  } catch (error) {
    const message = error instanceof Error
      ? error.message
      : "알 수 없는 리디북스 grouped upload 오류가 발생했습니다.";
    return applyStageOnlyRidibooksResult(
      state,
      upload,
      stagedSlots,
      uploadedAt,
      createStageOnlyIssue(state, upload, slot.slotKey, file.name, message),
    );
  }
}

async function applyJoaraSlotUploadMutation(
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
    return applyStageOnlyJoaraResult(
      state,
      upload,
      upload.slots ?? [],
      uploadedAt,
      createStageOnlyIssue(
        state,
        upload,
        slotKey,
        files[0]?.name,
        "현재 live grouped upload가 승인된 조아라 슬롯이 아닙니다.",
      ),
    );
  }

  if (files.length !== 1) {
    return applyStageOnlyJoaraResult(
      state,
      upload,
      updateMunpiaSlotMetadata(upload.slots ?? [], slot.slotKey, {
        status: "error",
        fileCount: files.length,
        sourceFileNames: files.map((file) => file.name),
        issueCount: 1,
        lastUploadedAt: uploadedAt,
      }),
      uploadedAt,
      createStageOnlyIssue(
        state,
        upload,
        slot.slotKey,
        files[0]?.name,
        "조아라 grouped live upload는 슬롯당 파일 1개만 허용합니다.",
        "mapping_failed",
      ),
    );
  }

  const file = files[0];
  const fileKind = inferFileKind(file.name);
  if (!fileKind || !isAcceptedFileKind(liveSpec, fileKind)) {
    return applyStageOnlyJoaraResult(
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
  const persistedSnapshot = createPersistedJoaraSlotSnapshot(state, upload, slot.slotKey, runtimeSnapshot);
  savePersistedJoaraSlotSnapshot(state, upload, slot.slotKey, persistedSnapshot);

  const stagedSlots = updateMunpiaSlotMetadata(upload.slots ?? [], slot.slotKey, {
    status: "uploaded",
    fileCount: 1,
    sourceFileNames: [file.name],
    issueCount: 0,
    lastUploadedAt: uploadedAt,
  });

  const settlementDetailSnapshot = readPersistedJoaraSlotSnapshot(state, upload, "settlementDetail");
  const workSettlementSnapshot = readPersistedJoaraSlotSnapshot(state, upload, "workSettlement");

  if (!settlementDetailSnapshot || !workSettlementSnapshot) {
    return applyStageOnlyJoaraResult(
      state,
      upload,
      stagedSlots,
      uploadedAt,
      createJoaraCompletenessIssue(state, upload, slot.slotKey, file.name, settlementDetailSnapshot, workSettlementSnapshot),
    );
  }

  try {
    const result = canUseInjectedJoaraBatchParse(dependencies, state, upload)
      ? (dependencies.parseBatch ?? runBatchParseOrchestrator)({
          batchId: state.batch.batchId,
          files: buildJoaraBatchParseInputs(state, upload),
        })
      : runPersistedJoaraGroupedParse(state, upload, settlementDetailSnapshot, workSettlementSnapshot);

    return applySuccessfulJoaraGroupedResult(
      state,
      upload,
      stagedSlots,
      uploadedAt,
      result,
      {
        settlementDetail: settlementDetailSnapshot,
        workSettlement: workSettlementSnapshot,
      },
    );
  } catch (error) {
    const message = error instanceof Error
      ? error.message
      : "알 수 없는 조아라 grouped upload 오류가 발생했습니다.";
    return applyStageOnlyJoaraResult(
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

  return mergeCommittedUploadResult(
    state,
    upload,
    nextUpload,
    rows,
    issues,
    uploadedAt,
    [{ company: upload.company, platform: upload.platform }],
  );
}

function applySuccessfulMixedCompanyResult(
  state: AppDraftState,
  upload: PlatformUploadCard,
  sourceFileNames: string[],
  uploadedAt: string,
  result: BatchParseOrchestratorResult,
  spec: MixedCompanyLiveUploadSpec,
): AppDraftState {
  const rows = result.rows.filter((row) => matchesReplacementTarget(spec.replacementTargets, row.company, row.platform));
  const issues = result.issues.filter((issue) => matchesReplacementTarget(spec.replacementTargets, issue.company, issue.platform));
  const nextUpload: PlatformUploadCard = {
    ...upload,
    status: deriveUploadStatus(rowCountOrZero(rows), issues),
    fileCount: sourceFileNames.length,
    sourceFileNames,
    parsedRowCount: rows.length,
    issueCount: issues.length,
    lastUploadedAt: uploadedAt,
  };

  return mergeCommittedUploadResult(
    state,
    upload,
    nextUpload,
    rows,
    issues,
    uploadedAt,
    spec.replacementTargets,
  );
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

  return mergeCommittedUploadResult(
    state,
    upload,
    nextUpload,
    [],
    [issue],
    uploadedAt,
    [{ company: upload.company, platform: upload.platform }],
  );
}

function applyMixedCompanyFailureResult(
  state: AppDraftState,
  upload: PlatformUploadCard,
  sourceFileNames: string[],
  uploadedAt: string,
  spec: MixedCompanyLiveUploadSpec,
  issue: ParseIssue,
): AppDraftState {
  const preservedRowsForTargets = state.rows.filter((row) => matchesReplacementTarget(spec.replacementTargets, row.company, row.platform));
  const preservedIssuesForTargets = state.issues.filter((candidate) => matchesReplacementTarget(spec.replacementTargets, candidate.company, candidate.platform));
  const nextIssuesForTargets = [...preservedIssuesForTargets, issue];
  const nextUpload: PlatformUploadCard = {
    ...upload,
    status: "error",
    fileCount: sourceFileNames.length,
    sourceFileNames,
    parsedRowCount: preservedRowsForTargets.length,
    issueCount: nextIssuesForTargets.length,
    lastUploadedAt: uploadedAt,
  };

  return mergeCommittedUploadResult(
    state,
    upload,
    nextUpload,
    preservedRowsForTargets,
    nextIssuesForTargets,
    uploadedAt,
    spec.replacementTargets,
  );
}

function applySuccessfulMunpiaGroupedResult(
  state: AppDraftState,
  upload: PlatformUploadCard,
  stagedSlots: BatchPlatformUploadSlot[],
  uploadedAt: string,
  result: BatchParseOrchestratorResult,
  snapshots: {
    settlement: PersistedGroupedSlotSnapshot;
    authorCorrection?: PersistedGroupedSlotSnapshot;
  },
): AppDraftState {
  const rows = result.rows.filter((row) => row.company === upload.company && row.platform === upload.platform);
  const issues = result.issues.filter((issue) => issue.company === upload.company && issue.platform === upload.platform);
  const nextSlots = deriveCommittedMunpiaSlots(stagedSlots, issues, snapshots);
  const nextUpload = buildGroupedAggregateUpload(upload, nextSlots, rows.length, issues.length, deriveUploadStatus(rowCountOrZero(rows), issues), uploadedAt);
  return mergeCommittedUploadResult(
    state,
    upload,
    nextUpload,
    rows,
    issues,
    uploadedAt,
    [{ company: upload.company, platform: upload.platform }],
  );
}

function applySuccessfulSeriesGroupedResult(
  state: AppDraftState,
  upload: PlatformUploadCard,
  stagedSlots: BatchPlatformUploadSlot[],
  uploadedAt: string,
  result: BatchParseOrchestratorResult,
  snapshots: {
    seriesGeneral: PersistedGroupedSlotSnapshot;
    seriesApp: PersistedGroupedSlotSnapshot;
  },
): AppDraftState {
  const rows = result.rows.filter((row) => row.company === upload.company && row.platform === upload.platform);
  const issues = result.issues.filter((issue) => issue.company === upload.company && issue.platform === upload.platform);
  const nextSlots = deriveCommittedSeriesSlots(stagedSlots, issues, snapshots);
  const nextUpload = buildGroupedAggregateUpload(upload, nextSlots, rows.length, issues.length, deriveUploadStatus(rowCountOrZero(rows), issues), uploadedAt);
  return mergeCommittedUploadResult(
    state,
    upload,
    nextUpload,
    rows,
    issues,
    uploadedAt,
    [{ company: upload.company, platform: upload.platform }],
  );
}

function applySuccessfulJoaraGroupedResult(
  state: AppDraftState,
  upload: PlatformUploadCard,
  stagedSlots: BatchPlatformUploadSlot[],
  uploadedAt: string,
  result: BatchParseOrchestratorResult,
  snapshots: {
    settlementDetail: PersistedGroupedSlotSnapshot;
    workSettlement: PersistedGroupedSlotSnapshot;
  },
): AppDraftState {
  const rows = result.rows.filter((row) => row.company === upload.company && row.platform === upload.platform);
  const issues = result.issues.filter((issue) => issue.company === upload.company && issue.platform === upload.platform);
  const nextSlots = deriveCommittedJoaraSlots(stagedSlots, issues, snapshots);
  const nextUpload = buildGroupedAggregateUpload(upload, nextSlots, rows.length, issues.length, deriveUploadStatus(rowCountOrZero(rows), issues), uploadedAt);
  return mergeCommittedUploadResult(
    state,
    upload,
    nextUpload,
    rows,
    issues,
    uploadedAt,
    [{ company: upload.company, platform: upload.platform }],
  );
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
    && !isStageOnlyIssueForUpload(issue, state.batch.batchId, upload)
  ));
  const nextIssuesForPlatform = [...preservedIssuesForPlatform, stageIssue];
  const nextUpload = buildGroupedAggregateUpload(
    upload,
    nextSlots,
    preservedRowsForPlatform.length,
    nextIssuesForPlatform.length,
    deriveGroupedStageStatus(nextSlots, nextIssuesForPlatform),
    uploadedAt,
  );

  return mergeStageOnlyUploadResult(state, upload, nextUpload, nextIssuesForPlatform, uploadedAt);
}

function applyStageOnlySeriesResult(
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
    && !isStageOnlyIssueForUpload(issue, state.batch.batchId, upload)
  ));
  const nextIssuesForPlatform = [...preservedIssuesForPlatform, stageIssue];
  const nextUpload = buildGroupedAggregateUpload(
    upload,
    nextSlots,
    preservedRowsForPlatform.length,
    nextIssuesForPlatform.length,
    deriveSeriesGroupedStageStatus(nextSlots, nextIssuesForPlatform),
    uploadedAt,
  );

  return mergeStageOnlyUploadResult(state, upload, nextUpload, nextIssuesForPlatform, uploadedAt);
}

function applySuccessfulRidibooksGroupedResult(
  state: AppDraftState,
  upload: PlatformUploadCard,
  stagedSlots: BatchPlatformUploadSlot[],
  uploadedAt: string,
  result: BatchParseOrchestratorResult,
  snapshots: {
    base: PersistedGroupedSlotSnapshot;
    file1: PersistedGroupedSlotSnapshot;
    event?: PersistedGroupedSlotSnapshot;
    mgCorrection?: PersistedGroupedSlotSnapshot;
  },
): AppDraftState {
  const rows = result.rows.filter((row) => row.company === upload.company && row.platform === upload.platform);
  const issues = result.issues.filter((issue) => issue.company === upload.company && issue.platform === upload.platform);
  const nextSlots = deriveCommittedRidibooksSlots(stagedSlots, issues, snapshots);
  const nextUpload = buildGroupedAggregateUpload(upload, nextSlots, rows.length, issues.length, deriveUploadStatus(rowCountOrZero(rows), issues), uploadedAt);
  return mergeCommittedUploadResult(
    state,
    upload,
    nextUpload,
    rows,
    issues,
    uploadedAt,
    [{ company: upload.company, platform: upload.platform }],
  );
}

function applyStageOnlyRidibooksResult(
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
    && !isStageOnlyIssueForUpload(issue, state.batch.batchId, upload)
  ));
  const nextIssuesForPlatform = [...preservedIssuesForPlatform, stageIssue];
  const nextUpload = buildGroupedAggregateUpload(
    upload,
    nextSlots,
    preservedRowsForPlatform.length,
    nextIssuesForPlatform.length,
    deriveRidibooksGroupedStageStatus(nextSlots, nextIssuesForPlatform),
    uploadedAt,
  );

  return mergeStageOnlyUploadResult(state, upload, nextUpload, nextIssuesForPlatform, uploadedAt);
}

function applyStageOnlyJoaraResult(
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
    && !isStageOnlyIssueForUpload(issue, state.batch.batchId, upload)
  ));
  const nextIssuesForPlatform = [...preservedIssuesForPlatform, stageIssue];
  const nextUpload = buildGroupedAggregateUpload(
    upload,
    nextSlots,
    preservedRowsForPlatform.length,
    nextIssuesForPlatform.length,
    deriveJoaraGroupedStageStatus(nextSlots, nextIssuesForPlatform),
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
  replacementTargets: Array<{ company: PlatformUploadCard["company"]; platform: Platform }>,
): AppDraftState {
  const preservedRows = state.rows.filter((row) => !matchesReplacementTarget(replacementTargets, row.company, row.platform));
  const preservedIssues = state.issues.filter((issue) => !matchesReplacementTarget(replacementTargets, issue.company, issue.platform));
  const uploads = state.uploads.some((currentUpload) => currentUpload.uploadId === upload.uploadId)
    ? state.uploads.map((currentUpload) => currentUpload.uploadId === upload.uploadId ? nextUpload : currentUpload)
    : [...state.uploads, nextUpload];
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
  const uploads = state.uploads.some((currentUpload) => currentUpload.uploadId === upload.uploadId)
    ? state.uploads.map((currentUpload) => currentUpload.uploadId === upload.uploadId ? nextUpload : currentUpload)
    : [...state.uploads, nextUpload];
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
    settlement: PersistedGroupedSlotSnapshot;
    authorCorrection?: PersistedGroupedSlotSnapshot;
  },
): BatchPlatformUploadSlot[] {
  return slots.map((slot) => {
    const snapshot = slot.slotKey === "settlement"
      ? snapshots.settlement
      : slot.slotKey === "authorCorrection"
        ? snapshots.authorCorrection
        : undefined;

    if (!snapshot || snapshot.files.length === 0) {
      return {
        ...slot,
        fileCount: 0,
        sourceFileNames: [],
        issueCount: 0,
      };
    }

    const sourceFileNames = snapshot.files.map((file) => file.fileName);
    const slotIssues = issues.filter((issue) => issue.sourceFileName ? sourceFileNames.includes(issue.sourceFileName) : false);
    return {
      ...slot,
      status: deriveSlotStatus(snapshot.files.length, slotIssues, true),
      fileCount: snapshot.files.length,
      sourceFileNames,
      issueCount: slotIssues.length,
      lastUploadedAt: snapshot.uploadedAt,
    };
  });
}

function deriveCommittedSeriesSlots(
  slots: BatchPlatformUploadSlot[],
  issues: ParseIssue[],
  snapshots: {
    seriesGeneral: PersistedGroupedSlotSnapshot;
    seriesApp: PersistedGroupedSlotSnapshot;
  },
): BatchPlatformUploadSlot[] {
  return slots.map((slot) => {
    const snapshot = slot.slotKey === "seriesGeneral"
      ? snapshots.seriesGeneral
      : slot.slotKey === "seriesApp"
        ? snapshots.seriesApp
        : undefined;

    if (!snapshot || snapshot.files.length === 0) {
      return {
        ...slot,
        fileCount: 0,
        sourceFileNames: [],
        issueCount: 0,
      };
    }

    const sourceFileNames = snapshot.files.map((file) => file.fileName);
    const slotIssues = issues.filter((issue) => issue.sourceFileName ? sourceFileNames.includes(issue.sourceFileName) : false);
    return {
      ...slot,
      status: deriveSlotStatus(snapshot.files.length, slotIssues, true),
      fileCount: snapshot.files.length,
      sourceFileNames,
      issueCount: slotIssues.length,
      lastUploadedAt: snapshot.uploadedAt,
    };
  });
}

function deriveCommittedRidibooksSlots(
  slots: BatchPlatformUploadSlot[],
  issues: ParseIssue[],
  snapshots: {
    base: PersistedGroupedSlotSnapshot;
    file1: PersistedGroupedSlotSnapshot;
    event?: PersistedGroupedSlotSnapshot;
    mgCorrection?: PersistedGroupedSlotSnapshot;
  },
): BatchPlatformUploadSlot[] {
  return slots.map((slot) => {
    const snapshot = slot.slotKey === "base"
      ? snapshots.base
      : slot.slotKey === "file1"
        ? snapshots.file1
        : slot.slotKey === "event"
          ? snapshots.event
          : slot.slotKey === "mgCorrection"
            ? snapshots.mgCorrection
            : undefined;

    if (!snapshot || snapshot.files.length === 0) {
      return {
        ...slot,
        status: "empty",
        fileCount: 0,
        sourceFileNames: [],
        issueCount: 0,
        lastUploadedAt: undefined,
      };
    }

    const sourceFileNames = snapshot.files.map((file) => file.fileName);
    const slotIssues = issues.filter((issue) => issue.sourceFileName ? sourceFileNames.includes(issue.sourceFileName) : false);
    return {
      ...slot,
      status: deriveSlotStatus(snapshot.files.length, slotIssues, true),
      fileCount: snapshot.files.length,
      sourceFileNames,
      issueCount: slotIssues.length,
      lastUploadedAt: snapshot.uploadedAt,
    };
  });
}

function deriveCommittedJoaraSlots(
  slots: BatchPlatformUploadSlot[],
  issues: ParseIssue[],
  snapshots: {
    settlementDetail: PersistedGroupedSlotSnapshot;
    workSettlement: PersistedGroupedSlotSnapshot;
  },
): BatchPlatformUploadSlot[] {
  return slots.map((slot) => {
    const snapshot = slot.slotKey === "settlementDetail"
      ? snapshots.settlementDetail
      : slot.slotKey === "workSettlement"
        ? snapshots.workSettlement
        : undefined;

    if (!snapshot || snapshot.files.length === 0) {
      return {
        ...slot,
        status: "empty",
        fileCount: 0,
        sourceFileNames: [],
        issueCount: 0,
        lastUploadedAt: undefined,
      };
    }

    const sourceFileNames = snapshot.files.map((file) => file.fileName);
    const slotIssues = issues.filter((issue) => issue.sourceFileName ? sourceFileNames.includes(issue.sourceFileName) : false);
    return {
      ...slot,
      status: deriveSlotStatus(snapshot.files.length, slotIssues, true),
      fileCount: snapshot.files.length,
      sourceFileNames,
      issueCount: slotIssues.length,
      lastUploadedAt: snapshot.uploadedAt,
    };
  });
}

function buildGroupedAggregateUpload(
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

function deriveSeriesGroupedStageStatus(
  slots: BatchPlatformUploadSlot[],
  issues: ParseIssue[],
): PlatformUploadCard["status"] {
  const generalSlot = slots.find((slot) => slot.slotKey === "seriesGeneral");
  const appSlot = slots.find((slot) => slot.slotKey === "seriesApp");
  const isComplete = (generalSlot?.fileCount ?? 0) === 3 && (appSlot?.fileCount ?? 0) === 3;

  if (issues.some((issue) => issue.severity === "error")) {
    return "error";
  }

  if (!isComplete || issues.length > 0) {
    return "warning";
  }

  return "uploaded";
}

function deriveRidibooksGroupedStageStatus(
  slots: BatchPlatformUploadSlot[],
  issues: ParseIssue[],
): PlatformUploadCard["status"] {
  const baseSlot = slots.find((slot) => slot.slotKey === "base");
  const file1Slot = slots.find((slot) => slot.slotKey === "file1");
  const hasRequiredSlots = (baseSlot?.fileCount ?? 0) === 1 && (file1Slot?.fileCount ?? 0) === 1;

  if (issues.some((issue) => issue.severity === "error")) {
    return "error";
  }

  if (!hasRequiredSlots || issues.length > 0) {
    return "warning";
  }

  return "uploaded";
}

function deriveJoaraGroupedStageStatus(
  slots: BatchPlatformUploadSlot[],
  issues: ParseIssue[],
): PlatformUploadCard["status"] {
  const settlementDetailSlot = slots.find((slot) => slot.slotKey === "settlementDetail");
  const workSettlementSlot = slots.find((slot) => slot.slotKey === "workSettlement");
  const hasRequiredSlots = (settlementDetailSlot?.fileCount ?? 0) === 1 && (workSettlementSlot?.fileCount ?? 0) === 1;

  if (issues.some((issue) => issue.severity === "error")) {
    return "error";
  }

  if (!hasRequiredSlots || issues.length > 0) {
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

function buildSeriesBatchParseInputs(
  state: AppDraftState,
  upload: PlatformUploadCard,
): BatchParseFileInput[] {
  const generalFiles = readSeriesRuntimeSnapshots(state, upload, "seriesGeneral") ?? [];
  const appFiles = readSeriesRuntimeSnapshots(state, upload, "seriesApp") ?? [];

  return [
    ...generalFiles.map((file) => ({
      company: upload.company,
      platform: upload.platform,
      fileKind: file.fileKind,
      fileName: file.fileName,
      saleMonth: state.batch.settlementMonth,
      slot: "general" as const,
      content: file.content,
    })),
    ...appFiles.map((file) => ({
      company: upload.company,
      platform: upload.platform,
      fileKind: file.fileKind,
      fileName: file.fileName,
      saleMonth: state.batch.settlementMonth,
      slot: "app" as const,
      content: file.content,
    })),
  ];
}

function buildRidibooksBatchParseInputs(
  state: AppDraftState,
  upload: PlatformUploadCard,
): BatchParseFileInput[] {
  const base = readRuntimeSnapshot(state, upload, "base");
  const file1 = readRuntimeSnapshot(state, upload, "file1");
  const event = readRuntimeSnapshot(state, upload, "event");
  const mgCorrection = readRuntimeSnapshot(state, upload, "mgCorrection");
  const eventSnapshot = readPersistedRidibooksSlotSnapshot(state, upload, "event");

  return [
    ...(base ? [{
      company: upload.company,
      platform: upload.platform,
      fileKind: base.fileKind,
      fileName: base.fileName,
      saleMonth: state.batch.settlementMonth,
      slot: "base" as const,
      content: base.content,
    }] : []),
    ...(file1 ? [{
      company: upload.company,
      platform: upload.platform,
      fileKind: file1.fileKind,
      fileName: file1.fileName,
      saleMonth: state.batch.settlementMonth,
      slot: "file1" as const,
      content: file1.content,
    }] : []),
    ...(event ? [{
      company: upload.company,
      platform: upload.platform,
      fileKind: event.fileKind,
      fileName: event.fileName,
      saleMonth: state.batch.settlementMonth,
      slot: "event" as const,
      ...(eventSnapshot?.eventPeriod ? { eventPeriod: eventSnapshot.eventPeriod } : {}),
      content: event.content,
    }] : []),
    ...(mgCorrection ? [{
      company: upload.company,
      platform: upload.platform,
      fileKind: mgCorrection.fileKind,
      fileName: mgCorrection.fileName,
      saleMonth: state.batch.settlementMonth,
      slot: "mgCorrection" as const,
      content: mgCorrection.content,
    }] : []),
  ];
}

function buildJoaraBatchParseInputs(
  state: AppDraftState,
  upload: PlatformUploadCard,
): BatchParseFileInput[] {
  const settlementDetail = readRuntimeSnapshot(state, upload, "settlementDetail");
  const workSettlement = readRuntimeSnapshot(state, upload, "workSettlement");

  return [
    ...(settlementDetail ? [{
      company: upload.company,
      platform: upload.platform,
      fileKind: settlementDetail.fileKind,
      fileName: settlementDetail.fileName,
      saleMonth: state.batch.settlementMonth,
      slot: "settlementDetail" as const,
      content: settlementDetail.content,
    }] : []),
    ...(workSettlement ? [{
      company: upload.company,
      platform: upload.platform,
      fileKind: workSettlement.fileKind,
      fileName: workSettlement.fileName,
      saleMonth: state.batch.settlementMonth,
      slot: "workSettlement" as const,
      content: workSettlement.content,
    }] : []),
  ];
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
): PersistedGroupedSlotSnapshot {
  return createPersistedGroupedSlotSnapshot(state, upload, slotKey, [snapshot]);
}

function createPersistedSeriesSlotSnapshot(
  state: AppDraftState,
  upload: PlatformUploadCard,
  slotKey: BatchPlatformUploadSlotKey,
  snapshots: RuntimeUploadSnapshot[],
): PersistedGroupedSlotSnapshot {
  return createPersistedGroupedSlotSnapshot(state, upload, slotKey, snapshots);
}

function createPersistedRidibooksSlotSnapshot(
  state: AppDraftState,
  upload: PlatformUploadCard,
  slotKey: BatchPlatformUploadSlotKey,
  snapshot: RuntimeUploadSnapshot,
  eventPeriod?: RidibooksEventPeriod,
): PersistedGroupedSlotSnapshot {
  return createPersistedGroupedSlotSnapshot(state, upload, slotKey, [snapshot], eventPeriod);
}

function createPersistedJoaraSlotSnapshot(
  state: AppDraftState,
  upload: PlatformUploadCard,
  slotKey: BatchPlatformUploadSlotKey,
  snapshot: RuntimeUploadSnapshot,
): PersistedGroupedSlotSnapshot {
  return createPersistedGroupedSlotSnapshot(state, upload, slotKey, [snapshot]);
}

function createPersistedGroupedSlotSnapshot(
  state: AppDraftState,
  upload: PlatformUploadCard,
  slotKey: BatchPlatformUploadSlotKey,
  snapshots: RuntimeUploadSnapshot[],
  eventPeriod?: RidibooksEventPeriod,
): PersistedGroupedSlotSnapshot {
  return {
    files: snapshots.map((snapshot) => {
      const adapterResult = runGroupedSlotAdapter(state, upload, slotKey, snapshot);
      return {
        fileName: snapshot.fileName,
        fileKind: snapshot.fileKind,
        uploadedAt: snapshot.uploadedAt,
        rows: adapterResult.rows,
        issues: adapterResult.issues,
      };
    }),
    uploadedAt: snapshots.length > 0 ? snapshots[snapshots.length - 1].uploadedAt : new Date().toISOString(),
    ...(eventPeriod ? { eventPeriod } : {}),
  };
}

function runGroupedSlotAdapter(
  state: AppDraftState,
  upload: PlatformUploadCard,
  slotKey: BatchPlatformUploadSlotKey,
  snapshot: RuntimeUploadSnapshot,
): FileAdapterResult {
  const baseInput = {
    batchId: state.batch.batchId,
    company: upload.company,
    platform: upload.platform,
    saleMonth: state.batch.settlementMonth,
    sourceFileName: snapshot.fileName,
    fileKind: snapshot.fileKind,
    slot: slotKey,
  };

  if (snapshot.fileKind === "csv") {
    return parseCsvAdapter(baseInput, snapshot.content);
  }

  if (snapshot.fileKind === "html_xls") {
    return parseHtmlXlsAdapter(baseInput, decodeTextFileContent(snapshot.content));
  }

  return parseXlsxAdapter(baseInput, snapshot.content);
}

function savePersistedMunpiaSlotSnapshot(
  state: AppDraftState,
  upload: PlatformUploadCard,
  slotKey: BatchPlatformUploadSlotKey,
  snapshot: PersistedGroupedSlotSnapshot,
): void {
  savePersistedGroupedSlotSnapshot(PERSISTED_MUNPIA_SLOT_SNAPSHOT_STORAGE_KEY, state, upload, slotKey, snapshot);
}

function savePersistedSeriesSlotSnapshot(
  state: AppDraftState,
  upload: PlatformUploadCard,
  slotKey: BatchPlatformUploadSlotKey,
  snapshot: PersistedGroupedSlotSnapshot,
): void {
  savePersistedGroupedSlotSnapshot(PERSISTED_SERIES_SLOT_SNAPSHOT_STORAGE_KEY, state, upload, slotKey, snapshot);
}

function savePersistedRidibooksSlotSnapshot(
  state: AppDraftState,
  upload: PlatformUploadCard,
  slotKey: BatchPlatformUploadSlotKey,
  snapshot: PersistedGroupedSlotSnapshot,
): void {
  savePersistedGroupedSlotSnapshot(PERSISTED_RIDIBOOKS_SLOT_SNAPSHOT_STORAGE_KEY, state, upload, slotKey, snapshot);
}

function savePersistedJoaraSlotSnapshot(
  state: AppDraftState,
  upload: PlatformUploadCard,
  slotKey: BatchPlatformUploadSlotKey,
  snapshot: PersistedGroupedSlotSnapshot,
): void {
  savePersistedGroupedSlotSnapshot(PERSISTED_JOARA_SLOT_SNAPSHOT_STORAGE_KEY, state, upload, slotKey, snapshot);
}

function savePersistedGroupedSlotSnapshot(
  storageKey: string,
  state: AppDraftState,
  upload: PlatformUploadCard,
  slotKey: BatchPlatformUploadSlotKey,
  snapshot: PersistedGroupedSlotSnapshot,
): void {
  const storage = getBrowserStorage();
  if (!storage) {
    return;
  }

  const allSnapshots = readAllPersistedGroupedSlotSnapshots(storage, storageKey);
  allSnapshots[createRuntimeSnapshotKey(state.batch.batchId, upload.uploadId, slotKey)] = snapshot;
  storage.setItem(storageKey, JSON.stringify(allSnapshots));
}

function readPersistedMunpiaSlotSnapshot(
  state: AppDraftState,
  upload: PlatformUploadCard,
  slotKey: BatchPlatformUploadSlotKey,
): PersistedGroupedSlotSnapshot | undefined {
  return readPersistedGroupedSlotSnapshot(PERSISTED_MUNPIA_SLOT_SNAPSHOT_STORAGE_KEY, state, upload, slotKey);
}

function readPersistedSeriesSlotSnapshot(
  state: AppDraftState,
  upload: PlatformUploadCard,
  slotKey: BatchPlatformUploadSlotKey,
): PersistedGroupedSlotSnapshot | undefined {
  return readPersistedGroupedSlotSnapshot(PERSISTED_SERIES_SLOT_SNAPSHOT_STORAGE_KEY, state, upload, slotKey);
}

function readPersistedRidibooksSlotSnapshot(
  state: AppDraftState,
  upload: PlatformUploadCard,
  slotKey: BatchPlatformUploadSlotKey,
): PersistedGroupedSlotSnapshot | undefined {
  return readPersistedGroupedSlotSnapshot(PERSISTED_RIDIBOOKS_SLOT_SNAPSHOT_STORAGE_KEY, state, upload, slotKey);
}

function readPersistedJoaraSlotSnapshot(
  state: AppDraftState,
  upload: PlatformUploadCard,
  slotKey: BatchPlatformUploadSlotKey,
): PersistedGroupedSlotSnapshot | undefined {
  return readPersistedGroupedSlotSnapshot(PERSISTED_JOARA_SLOT_SNAPSHOT_STORAGE_KEY, state, upload, slotKey);
}

function readPersistedGroupedSlotSnapshot(
  storageKey: string,
  state: AppDraftState,
  upload: PlatformUploadCard,
  slotKey: BatchPlatformUploadSlotKey,
): PersistedGroupedSlotSnapshot | undefined {
  const storage = getBrowserStorage();
  if (!storage) {
    return undefined;
  }

  return readAllPersistedGroupedSlotSnapshots(storage, storageKey)[createRuntimeSnapshotKey(state.batch.batchId, upload.uploadId, slotKey)];
}

function readAllPersistedGroupedSlotSnapshots(
  storage: Storage,
  storageKey: string,
): Record<string, PersistedGroupedSlotSnapshot> {
  const raw = storage.getItem(storageKey);
  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw) as Record<string, PersistedGroupedSlotSnapshot>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function clearPersistedMunpiaSlotSnapshots(): void {
  getBrowserStorage()?.removeItem(PERSISTED_MUNPIA_SLOT_SNAPSHOT_STORAGE_KEY);
}

function clearPersistedSeriesSlotSnapshots(): void {
  getBrowserStorage()?.removeItem(PERSISTED_SERIES_SLOT_SNAPSHOT_STORAGE_KEY);
}

function clearPersistedRidibooksSlotSnapshots(): void {
  getBrowserStorage()?.removeItem(PERSISTED_RIDIBOOKS_SLOT_SNAPSHOT_STORAGE_KEY);
}

function clearPersistedJoaraSlotSnapshots(): void {
  getBrowserStorage()?.removeItem(PERSISTED_JOARA_SLOT_SNAPSHOT_STORAGE_KEY);
}

function saveSeriesRuntimeSnapshots(
  state: AppDraftState,
  upload: PlatformUploadCard,
  slotKey: BatchPlatformUploadSlotKey,
  snapshots: RuntimeUploadSnapshot[],
): void {
  seriesSlotRuntimeSnapshots.set(createRuntimeSnapshotKey(state.batch.batchId, upload.uploadId, slotKey), snapshots);
}

function readSeriesRuntimeSnapshots(
  state: AppDraftState,
  upload: PlatformUploadCard,
  slotKey: BatchPlatformUploadSlotKey,
): RuntimeUploadSnapshot[] | undefined {
  return seriesSlotRuntimeSnapshots.get(createRuntimeSnapshotKey(state.batch.batchId, upload.uploadId, slotKey));
}

function canUseInjectedMunpiaBatchParse(
  dependencies: UploadMutationDependencies,
  state: AppDraftState,
  upload: PlatformUploadCard,
  authorCorrectionSnapshot?: PersistedGroupedSlotSnapshot,
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

function canUseInjectedSeriesBatchParse(
  dependencies: UploadMutationDependencies,
  state: AppDraftState,
  upload: PlatformUploadCard,
): boolean {
  if (!dependencies.parseBatch) {
    return false;
  }

  const generalRuntime = readSeriesRuntimeSnapshots(state, upload, "seriesGeneral");
  const appRuntime = readSeriesRuntimeSnapshots(state, upload, "seriesApp");
  return (generalRuntime?.length ?? 0) === 3 && (appRuntime?.length ?? 0) === 3;
}

function canUseInjectedRidibooksBatchParse(
  dependencies: UploadMutationDependencies,
  state: AppDraftState,
  upload: PlatformUploadCard,
  eventSnapshot?: PersistedGroupedSlotSnapshot,
  mgCorrectionSnapshot?: PersistedGroupedSlotSnapshot,
): boolean {
  if (!dependencies.parseBatch) {
    return false;
  }

  const baseRuntime = readRuntimeSnapshot(state, upload, "base");
  const file1Runtime = readRuntimeSnapshot(state, upload, "file1");
  if (!baseRuntime || !file1Runtime) {
    return false;
  }

  if (eventSnapshot && !readRuntimeSnapshot(state, upload, "event")) {
    return false;
  }

  return !(mgCorrectionSnapshot && !readRuntimeSnapshot(state, upload, "mgCorrection"));
}

function canUseInjectedJoaraBatchParse(
  dependencies: UploadMutationDependencies,
  state: AppDraftState,
  upload: PlatformUploadCard,
): boolean {
  if (!dependencies.parseBatch) {
    return false;
  }

  return readRuntimeSnapshot(state, upload, "settlementDetail") !== undefined
    && readRuntimeSnapshot(state, upload, "workSettlement") !== undefined;
}

function runPersistedMunpiaGroupedParse(
  state: AppDraftState,
  upload: PlatformUploadCard,
  settlement: PersistedGroupedSlotSnapshot,
  authorCorrection?: PersistedGroupedSlotSnapshot,
): BatchParseOrchestratorResult {
  const settlementFiles = settlement.files;
  const authorFiles = authorCorrection?.files ?? [];
  const result = parseMunpiaFileGroup(
    {
      batchId: state.batch.batchId,
      company: upload.company,
      platform: "munpia",
      saleMonth: state.batch.settlementMonth,
      sourceFileNames: [...settlementFiles.map((file) => file.fileName), ...authorFiles.map((file) => file.fileName)],
    },
    [
      ...settlementFiles.map((file) => ({
        sourceFileName: file.fileName,
        slot: "settlement" as const,
        rows: file.rows,
        issues: file.issues,
      })),
      ...authorFiles.map((file) => ({
        sourceFileName: file.fileName,
        slot: "authorCorrection" as const,
        rows: file.rows,
        issues: file.issues,
      })),
    ],
  );

  return {
    rows: result.rows,
    issues: result.issues,
    fileResults: [...settlementFiles, ...authorFiles].map((file) => ({
      fileName: file.fileName,
      company: upload.company,
      platform: upload.platform,
      fileKind: file.fileKind,
      saleMonth: state.batch.settlementMonth,
      status: file.issues.length > 0 ? "failed" as const : "success" as const,
      rowCount: file.rows.length,
      issueCount: file.issues.length,
    })),
  };
}

function runPersistedSeriesGroupedParse(
  state: AppDraftState,
  upload: PlatformUploadCard,
  seriesGeneral: PersistedGroupedSlotSnapshot,
  seriesApp: PersistedGroupedSlotSnapshot,
): BatchParseOrchestratorResult {
  const result = parseSeriesFileGroup(
    {
      batchId: state.batch.batchId,
      company: upload.company,
      platform: "series",
      saleMonth: state.batch.settlementMonth,
      sourceFileNames: [...seriesGeneral.files.map((file) => file.fileName), ...seriesApp.files.map((file) => file.fileName)],
    },
    [
      ...seriesGeneral.files.map((file) => ({
        sourceFileName: file.fileName,
        slot: "general" as const,
        rows: file.rows,
        issues: file.issues,
      })),
      ...seriesApp.files.map((file) => ({
        sourceFileName: file.fileName,
        slot: "app" as const,
        rows: file.rows,
        issues: file.issues,
      })),
    ],
  );

  return {
    rows: result.rows,
    issues: result.issues,
    fileResults: [...seriesGeneral.files, ...seriesApp.files].map((file) => ({
      fileName: file.fileName,
      company: upload.company,
      platform: upload.platform,
      fileKind: file.fileKind,
      saleMonth: state.batch.settlementMonth,
      status: file.issues.length > 0 ? "failed" as const : "success" as const,
      rowCount: file.rows.length,
      issueCount: file.issues.length,
    })),
  };
}

function runPersistedJoaraGroupedParse(
  state: AppDraftState,
  upload: PlatformUploadCard,
  settlementDetail: PersistedGroupedSlotSnapshot,
  workSettlement: PersistedGroupedSlotSnapshot,
): BatchParseOrchestratorResult {
  const result = parseJoaraFileGroup(
    {
      batchId: state.batch.batchId,
      company: upload.company,
      platform: "joara",
      saleMonth: state.batch.settlementMonth,
      sourceFileNames: [
        ...settlementDetail.files.map((file) => file.fileName),
        ...workSettlement.files.map((file) => file.fileName),
      ],
    },
    [
      ...settlementDetail.files.map((file) => ({
        sourceFileName: file.fileName,
        slot: "settlementDetail" as const,
        rows: file.rows,
        issues: file.issues,
      })),
      ...workSettlement.files.map((file) => ({
        sourceFileName: file.fileName,
        slot: "workSettlement" as const,
        rows: file.rows,
        issues: file.issues,
      })),
    ],
  );

  return {
    rows: result.rows,
    issues: result.issues,
    fileResults: [...settlementDetail.files, ...workSettlement.files].map((file) => ({
      fileName: file.fileName,
      company: upload.company,
      platform: upload.platform,
      fileKind: file.fileKind,
      saleMonth: state.batch.settlementMonth,
      status: file.issues.length > 0 ? "failed" as const : "success" as const,
      rowCount: file.rows.length,
      issueCount: file.issues.length,
    })),
  };
}

function runPersistedRidibooksGroupedParse(
  state: AppDraftState,
  upload: PlatformUploadCard,
  base: PersistedGroupedSlotSnapshot,
  file1: PersistedGroupedSlotSnapshot,
  event?: PersistedGroupedSlotSnapshot,
  mgCorrection?: PersistedGroupedSlotSnapshot,
): BatchParseOrchestratorResult {
  const result = parseRidibooksFileGroup(
    {
      batchId: state.batch.batchId,
      company: upload.company,
      platform: "ridibooks",
      saleMonth: state.batch.settlementMonth,
      sourceFileNames: [
        ...base.files.map((file) => file.fileName),
        ...file1.files.map((file) => file.fileName),
        ...(event?.files.map((file) => file.fileName) ?? []),
        ...(mgCorrection?.files.map((file) => file.fileName) ?? []),
      ],
      ...(event?.eventPeriod ? { eventPeriod: event.eventPeriod } : {}),
    },
    [
      ...base.files.map((file) => ({
        sourceFileName: file.fileName,
        slot: "base" as const,
        rows: file.rows,
        issues: file.issues,
      })),
      ...file1.files.map((file) => ({
        sourceFileName: file.fileName,
        slot: "file1" as const,
        rows: file.rows,
        issues: file.issues,
      })),
      ...(event?.files.map((file) => ({
        sourceFileName: file.fileName,
        slot: "event" as const,
        rows: file.rows,
        issues: file.issues,
      })) ?? []),
      ...(mgCorrection?.files.map((file) => ({
        sourceFileName: file.fileName,
        slot: "mgCorrection" as const,
        rows: file.rows,
        issues: file.issues,
      })) ?? []),
    ],
  );

  return {
    rows: result.rows,
    issues: result.issues,
    fileResults: [...base.files, ...file1.files, ...(event?.files ?? []), ...(mgCorrection?.files ?? [])].map((file) => ({
      fileName: file.fileName,
      company: upload.company,
      platform: upload.platform,
      fileKind: file.fileKind,
      saleMonth: state.batch.settlementMonth,
      status: file.issues.length > 0 ? "failed" as const : "success" as const,
      rowCount: file.rows.length,
      issueCount: file.issues.length,
    })),
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

function matchesReplacementTarget(
  targets: Array<{ company: PlatformUploadCard["company"]; platform: Platform }>,
  company: PlatformUploadCard["company"],
  platform: Platform,
): boolean {
  return targets.some((target) => target.company === company && target.platform === platform);
}

function decodeTextFileContent(content: Uint8Array): string {
  return new TextDecoder().decode(content);
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

function getLiveUploadSpec(target: LiveUploadTarget): SingleFileLiveUploadSpec | MixedCompanyLiveUploadSpec | SlotLiveUploadSpec | undefined {
  return target.slotKey
    ? getSlotLiveUploadSpec(target.upload, target.slotKey)
    : getSingleFileLiveUploadSpec(target.upload) ?? getMixedCompanyLiveUploadSpec(target.upload);
}

function getSingleFileLiveUploadSpec(upload: PlatformUploadCard): SingleFileLiveUploadSpec | undefined {
  return SINGLE_FILE_LIVE_UPLOAD_SPECS.find((spec) => (
    spec.company === upload.company
    && spec.platform === upload.platform
    && upload.requiredFileCount === 1
    && (upload.slots?.length ?? 0) === 0
  ));
}

function getMixedCompanyLiveUploadSpec(upload: PlatformUploadCard): MixedCompanyLiveUploadSpec | undefined {
  return MIXED_COMPANY_LIVE_UPLOAD_SPECS.find((spec) => (
    spec.uploadId === upload.uploadId
    && spec.company === upload.company
    && spec.platform === upload.platform
    && upload.requiredFileCount === 1
    && (upload.slots?.length ?? 0) === 0
    && spec.sharedCompanies.length === (upload.sharedCompanies?.length ?? 0)
    && spec.sharedCompanies.every((company) => upload.sharedCompanies?.includes(company))
  ));
}

function getSlotLiveUploadSpec(
  upload: PlatformUploadCard,
  slotKey: BatchPlatformUploadSlotKey,
): SlotLiveUploadSpec | undefined {
  return SLOT_LIVE_UPLOAD_SPECS.find((spec) => (
    spec.platform === upload.platform
    && spec.slotKey === slotKey
    && (upload.slots?.length ?? 0) > 0
  ));
}

function isAcceptedFileKind(spec: SingleFileLiveUploadSpec | MixedCompanyLiveUploadSpec | SlotLiveUploadSpec, fileKind: FileKind): boolean {
  if (fileKind === "html_xls") {
    return spec.acceptedKinds.includes("xls");
  }

  return spec.acceptedKinds.includes(fileKind as LiveUploadAcceptedKind);
}

function formatAcceptedKinds(acceptedKinds: LiveUploadAcceptedKind[]): string {
  return acceptedKinds.map((kind) => `.${kind}`).join("/");
}

function formatApprovedSingleFileLiveUploadCards(): string {
  return [...SINGLE_FILE_LIVE_UPLOAD_SPECS, ...MIXED_COMPANY_LIVE_UPLOAD_SPECS].map((spec) => spec.uiLabel).join(", ");
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
    uploadId: upload.uploadId,
    ...(slotKey ? { slotKey } : {}),
    sourceFileName,
  };
}

function createSeriesCompletenessIssue(
  state: AppDraftState,
  upload: PlatformUploadCard,
  slotKey: BatchPlatformUploadSlotKey,
  sourceFileName: string | undefined,
  previousUpload: PlatformUploadCard,
  generalSnapshot?: PersistedGroupedSlotSnapshot,
  appSnapshot?: PersistedGroupedSlotSnapshot,
): ParseIssue {
  const hadExistingMetadata = previousUpload.slots?.some((slot) => (
    (slot.slotKey === "seriesGeneral" || slot.slotKey === "seriesApp") && slot.fileCount > 0
  )) ?? false;

  const missingRuntimeRecovery = hadExistingMetadata
    && ((generalSnapshot?.files.length ?? 0) === 0 || (appSnapshot?.files.length ?? 0) === 0);

  if (missingRuntimeRecovery) {
    return createStageOnlyIssue(
      state,
      upload,
      slotKey,
      sourceFileName,
      "현재 브라우저 persisted snapshot에는 시리즈 3+3 입력이 모두 남아 있지 않아 재계산할 수 없습니다. 일반 3개와 앱 3개를 다시 업로드하세요.",
      "parse_error",
    );
  }

  return createStageOnlyIssue(
    state,
    upload,
    slotKey,
    sourceFileName,
    "시리즈 grouped live upload는 일반 3개 + 앱 3개가 모두 준비된 뒤에만 재계산합니다.",
    "missing_file",
  );
}

function createRidibooksCompletenessIssue(
  state: AppDraftState,
  upload: PlatformUploadCard,
  slotKey: BatchPlatformUploadSlotKey,
  sourceFileName: string | undefined,
  previousUpload: PlatformUploadCard,
  baseSnapshot?: PersistedGroupedSlotSnapshot,
  file1Snapshot?: PersistedGroupedSlotSnapshot,
): ParseIssue {
  const hadExistingMetadata = previousUpload.slots?.some((slot) => (
    (slot.slotKey === "base" || slot.slotKey === "file1") && slot.fileCount > 0
  )) ?? false;

  const missingRuntimeRecovery = hadExistingMetadata
    && ((baseSnapshot?.files.length ?? 0) === 0 || (file1Snapshot?.files.length ?? 0) === 0);

  if (missingRuntimeRecovery) {
    return createStageOnlyIssue(
      state,
      upload,
      slotKey,
      sourceFileName,
      "현재 브라우저 persisted snapshot에는 리디북스 base/file1 입력이 모두 남아 있지 않아 재계산할 수 없습니다. 기본 정산과 file_1 보정 파일을 다시 업로드하세요.",
      "parse_error",
    );
  }

  return createStageOnlyIssue(
    state,
    upload,
    slotKey,
    sourceFileName,
    slotKey === "event"
      ? "리디북스 event 슬롯 live upload는 기본 정산(base)과 file_1 보정(file1)이 먼저 준비되어야 합니다."
      : "리디북스 grouped live upload는 기본 정산(base)과 file_1 보정(file1)이 모두 준비된 뒤에만 재계산합니다.",
    "missing_file",
  );
}

function createJoaraCompletenessIssue(
  state: AppDraftState,
  upload: PlatformUploadCard,
  slotKey: BatchPlatformUploadSlotKey,
  sourceFileName: string | undefined,
  settlementDetailSnapshot?: PersistedGroupedSlotSnapshot,
  workSettlementSnapshot?: PersistedGroupedSlotSnapshot,
): ParseIssue {
  const hasOneSnapshotOnly = (settlementDetailSnapshot?.files.length ?? 0) > 0 || (workSettlementSnapshot?.files.length ?? 0) > 0;
  const missingRuntimeRecovery = hasOneSnapshotOnly
    && ((settlementDetailSnapshot?.files.length ?? 0) === 0 || (workSettlementSnapshot?.files.length ?? 0) === 0)
    && hasSettlementMetadata(upload);

  if (missingRuntimeRecovery) {
    return createStageOnlyIssue(
      state,
      upload,
      slotKey,
      sourceFileName,
      "현재 브라우저 persisted snapshot에는 조아라 정산 상세리스트/작품별 정산리스트 입력이 모두 남아 있지 않아 재계산할 수 없습니다. 두 파일을 다시 업로드하세요.",
      "parse_error",
    );
  }

  return createStageOnlyIssue(
    state,
    upload,
    slotKey,
    sourceFileName,
    slotKey === "workSettlement"
      ? "조아라 작품별 정산리스트 live upload는 정산 상세리스트가 먼저 준비되어야 합니다."
      : "조아라 grouped live upload는 정산 상세리스트와 작품별 정산리스트가 모두 준비된 뒤에만 재계산합니다.",
    "missing_file",
  );
}

function normalizeRidibooksEventPeriod(eventPeriod: RidibooksEventPeriod | undefined): RidibooksEventPeriod | undefined {
  if (!eventPeriod) {
    return undefined;
  }

  const startDate = eventPeriod.startDate.trim();
  const endDate = eventPeriod.endDate.trim();
  if (!startDate || !endDate) {
    return undefined;
  }

  return { startDate, endDate };
}

function isStageOnlyIssueForUpload(issue: ParseIssue, batchId: string, upload: PlatformUploadCard): boolean {
  return issue.issueId.startsWith(`${batchId}-${upload.uploadId}${STAGE_ONLY_ISSUE_MARKER}`);
}

function getBrowserStorage(): Storage | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }

  return window.localStorage;
}
