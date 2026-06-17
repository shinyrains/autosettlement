import { Building2 } from "lucide-react";
import { useId, useState } from "react";
import {
  companyLabels,
  platformLabels,
  uploadPlatformOrder,
  type PlatformUploadCard,
} from "../data/mockSettlement";
import {
  getLiveUploadAcceptAttribute,
  getLiveUploadDescription,
  isLiveUploadSlotEnabled,
  type LiveUploadTarget,
} from "../state/uploadMutation";
import type { BatchPlatformUploadSlot, BatchPlatformUploadSlotKey, Company, Platform } from "../types/settlement";
import { MiniMetric, StatusBadge } from "./ShellPrimitives";

const RIDIBOOKS_GROUPED_SNAPSHOT_STORAGE_KEY = "autosettlement.ridibooks-grouped-slot-snapshots.v1";

type UploadSectionProps = {
  activeCompany?: Company;
  uploads: PlatformUploadCard[];
  onUploadFiles?: (target: LiveUploadTarget, files: File[]) => Promise<void> | void;
  onPassUpload?: (target: LiveUploadTarget) => void;
  isUploadEnabled?: (upload: PlatformUploadCard) => boolean;
};

export function UploadSection({ activeCompany = "raon", uploads, onUploadFiles, onPassUpload, isUploadEnabled }: UploadSectionProps) {
  const modeUploads = getCompanyModeUploads(uploads, activeCompany);
  return (
    <section id="step-1" className="space-y-5">
      <CompanyUploadGroup
        company={activeCompany}
        uploads={modeUploads}
        onUploadFiles={onUploadFiles}
        onPassUpload={onPassUpload}
        isUploadEnabled={isUploadEnabled}
      />
    </section>
  );
}

function CompanyUploadGroup({
  company,
  uploads: allUploads,
  onUploadFiles,
  onPassUpload,
  isUploadEnabled,
}: {
  company: Company;
  uploads: PlatformUploadCard[];
  onUploadFiles?: UploadSectionProps["onUploadFiles"];
  onPassUpload?: UploadSectionProps["onPassUpload"];
  isUploadEnabled?: UploadSectionProps["isUploadEnabled"];
}) {
  const uploads = allUploads;
  const readyCount = uploads.filter((upload) => upload.status === "parsed").length;
  return (
    <section className="rounded-md border border-line bg-ink-850">
      <div className="flex items-center justify-between border-b border-line px-5 py-4">
        <div className="flex items-center gap-3">
          <Building2 className="h-5 w-5 text-signal" />
          <div>
            <h2 className="text-lg font-semibold tracking-normal">{companyLabels[company]} 업로드 영역</h2>
            <p className="text-sm text-slate-400">회사 모드: {companyLabels[company]}</p>
            <p className="text-sm text-slate-400">전체 플랫폼 {uploads.length}개 · 원스토어는 양사 공유 업로드</p>
          </div>
        </div>
        <span className="rounded-md border border-line px-3 py-1 font-mono text-sm text-mint">{readyCount}/{uploads.length}</span>
      </div>
      <div className="grid grid-cols-2 gap-3 p-4">
        {uploads.map((upload) => (
          <UploadCard
            key={upload.uploadId}
            activeCompany={company}
            upload={upload}
            onUploadFiles={onUploadFiles}
            onPassUpload={onPassUpload}
            isUploadEnabled={isUploadEnabled?.(upload) ?? false}
          />
        ))}
      </div>
    </section>
  );
}

function getCompanyModeUploads(allUploads: PlatformUploadCard[], company: Company): PlatformUploadCard[] {
  return uploadPlatformOrder.map((platform) => {
    const sharedUpload = allUploads.find((upload) => upload.platform === platform && (upload.sharedCompanies?.length ?? 0) > 1);
    if (sharedUpload) {
      return sharedUpload;
    }

    const companyUpload = allUploads.find((upload) => upload.company === company && upload.platform === platform);
    if (companyUpload) {
      return companyUpload;
    }

    return createPendingUploadCard(company, platform);
  });
}

function createPendingUploadCard(company: Company, platform: Platform): PlatformUploadCard {
  const uploadId = `upload-${company}-${platform.replace(/_/g, "-")}-pending`;
  const slots = createPendingUploadSlots(uploadId, platform);
  return {
    uploadId,
    batchId: "batch-2026-06",
    company,
    platform,
    platformLabel: platformLabels[platform],
    category: platform === "series" ? "series" : "domestic",
    status: "empty",
    fileCount: 0,
    requiredFileCount: getPendingRequiredFileCount(platform),
    sourceFileNames: [],
    parsedRowCount: 0,
    issueCount: 0,
    ...(slots.length > 0 ? { slots } : {}),
  };
}

function getPendingRequiredFileCount(platform: Platform): number {
  if (platform === "ridibooks" || platform === "joara") {
    return 2;
  }

  return platform === "series" ? 6 : 1;
}

function createPendingUploadSlots(uploadId: string, platform: Platform): BatchPlatformUploadSlot[] {
  if (platform === "munpia") {
    return [
      createPendingSlot(uploadId, "settlement", "정산 파일", true, ["xlsx"]),
      createPendingSlot(uploadId, "authorCorrection", "작가 보정", false, ["csv", "xlsx"]),
    ];
  }

  if (platform === "ridibooks") {
    return [
      createPendingSlot(uploadId, "base", "기본 정산", true, ["csv"]),
      createPendingSlot(uploadId, "file1", "1번 파일 보정", true, ["csv"]),
      createPendingSlot(uploadId, "event", "이벤트 거래", false, ["csv"]),
      createPendingSlot(uploadId, "mgCorrection", "MG 보정", false, ["csv", "xlsx"]),
    ];
  }

  if (platform === "joara") {
    return [
      createPendingSlot(uploadId, "settlementDetail", "정산 상세리스트", true, ["csv"]),
      createPendingSlot(uploadId, "workSettlement", "작품별 정산리스트", true, ["csv"]),
    ];
  }

  return [];
}

function createPendingSlot(
  uploadId: string,
  slotKey: BatchPlatformUploadSlotKey,
  label: string,
  required: boolean,
  acceptedFileKinds: BatchPlatformUploadSlot["acceptedFileKinds"],
): BatchPlatformUploadSlot {
  return {
    slotId: `${uploadId}-${slotKey}`,
    slotKey,
    label,
    required,
    acceptedFileKinds,
    status: "empty",
    fileCount: 0,
    sourceFileNames: [],
    issueCount: 0,
  };
}

function UploadCard({
  activeCompany,
  upload,
  onUploadFiles,
  onPassUpload,
  isUploadEnabled,
}: {
  activeCompany: Company;
  upload: PlatformUploadCard;
  onUploadFiles?: UploadSectionProps["onUploadFiles"];
  onPassUpload?: UploadSectionProps["onPassUpload"];
  isUploadEnabled: boolean;
}) {
  const complete = upload.fileCount >= upload.requiredFileCount;
  const hasSlots = (upload.slots?.length ?? 0) > 0;
  const sharedUploadOwner = getSharedUploadOwner(upload);
  const sharedUploadLocked = sharedUploadOwner !== undefined && sharedUploadOwner !== activeCompany;
  const uploadTarget = sharedUploadOwner === undefined ? { ...upload, company: activeCompany } : upload;
  const canCardUpload = !hasSlots && isUploadEnabled && onUploadFiles !== undefined;
  const canPassCard = !hasSlots
    && !upload.uploadId.endsWith("-pending")
    && upload.fileCount < upload.requiredFileCount
    && upload.status !== "error"
    && onPassUpload !== undefined;
  const hasAnyLiveSlot = upload.slots?.some((slot) => isLiveUploadSlotEnabled(upload, slot)) ?? false;
  const liveUploadDescription = getLiveUploadDescription({ upload });
  const acceptAttribute = getLiveUploadAcceptAttribute({ upload }) ?? ".xlsx";
  return (
    <article className="rounded-md border border-line bg-ink-800 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-base font-semibold text-white">{upload.platformLabel}</p>
          <p className="mt-1 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">{upload.category}</p>
          {upload.sharedCompanies && upload.sharedCompanies.length > 1 ? (
            <p className="mt-1 text-xs text-slate-400">공유 대상: {upload.sharedCompanies.map((company) => companyLabels[company]).join(" + ")}</p>
          ) : null}
        </div>
        <StatusBadge status={upload.status} />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <MiniMetric label="필수" value={`${upload.requiredFileCount}개`} emphasis={upload.requiredFileCount === 6} />
        <MiniMetric label="업로드" value={`${upload.fileCount}개`} emphasis={complete} />
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-ink-950">
        <div
          className={complete ? "h-full bg-mint" : upload.status === "error" ? "h-full bg-coral" : "h-full bg-amber"}
          style={{ width: `${Math.min(100, (upload.fileCount / upload.requiredFileCount) * 100)}%` }}
        />
      </div>
      <p className="mt-3 truncate text-xs text-slate-400">{upload.sourceFileNames[0] ?? "파일 대기"}</p>
      {canCardUpload ? (
        <FileUploadControl
          target={{ upload: uploadTarget }}
          disabled={sharedUploadLocked}
          label={complete ? "파일 교체" : "파일 업로드"}
          dataTestId={`upload-input-${upload.uploadId}`}
          acceptAttribute={acceptAttribute}
          description={liveUploadDescription}
          onUploadFiles={onUploadFiles}
        />
      ) : null}
      {canCardUpload && sharedUploadLocked && sharedUploadOwner ? (
        <p className="mt-2 text-xs text-amber">
          {companyLabels[sharedUploadOwner]}에서 공통 업로드 완료 · 수정은 {companyLabels[sharedUploadOwner]} 정산에서 진행
        </p>
      ) : null}
      {canCardUpload && !sharedUploadLocked && complete ? (
        <p className="mt-2 text-xs text-slate-400">잘못 올린 파일은 다시 업로드하면 교체됩니다.</p>
      ) : null}
      {canPassCard ? (
        <PassUploadButton label={upload.platformLabel} onClick={() => onPassUpload?.({ upload })} />
      ) : null}
      {!canCardUpload && !hasSlots ? (
        <p className="mt-3 text-xs text-slate-500">파일 업로드 연결 예정</p>
      ) : null}
      {upload.requiredFileCount === 6 ? (
        <p className="mt-2 rounded border border-line bg-ink-950 px-2 py-1 text-xs text-slate-300">필수 6개: 일반 3개 + 앱 3개</p>
      ) : null}
      {hasSlots ? (
        <div className="mt-4 space-y-2 rounded-md border border-line bg-ink-950/70 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-400">슬롯 상태</p>
          {upload.slots?.map((slot) => (
            <SlotUploadCard
              key={slot.slotId}
              slot={slot}
              upload={upload}
              onUploadFiles={onUploadFiles}
              onPassUpload={onPassUpload}
            />
          ))}
          {!hasAnyLiveSlot ? (
            <p className="text-xs text-slate-500">grouped 계약 정렬만 반영됨 · 파일 업로드 연결 예정</p>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

function getSharedUploadOwner(upload: PlatformUploadCard): Company | undefined {
  if ((upload.sharedCompanies?.length ?? 0) <= 1 || upload.fileCount < upload.requiredFileCount) {
    return undefined;
  }

  return upload.company;
}

function getRequiredSlotFileCounts(upload: PlatformUploadCard): Map<string, number> {
  const requiredSlots = (upload.slots ?? []).filter((slot) => slot.required);
  if (requiredSlots.length === 0) {
    return new Map();
  }

  const baseCount = Math.floor(upload.requiredFileCount / requiredSlots.length);
  const remainder = upload.requiredFileCount % requiredSlots.length;
  return new Map(
    requiredSlots.map((slot, index) => [
      slot.slotId,
      Math.max(baseCount + (index < remainder ? 1 : 0), 1),
    ]),
  );
}

function SlotUploadCard({
  slot,
  upload,
  onUploadFiles,
  onPassUpload,
}: {
  slot: BatchPlatformUploadSlot;
  upload: PlatformUploadCard;
  onUploadFiles?: UploadSectionProps["onUploadFiles"];
  onPassUpload?: UploadSectionProps["onPassUpload"];
}) {
  const target: LiveUploadTarget = { upload, slotKey: slot.slotKey };
  const requiredSlotFileCount = getRequiredSlotFileCounts(upload).get(slot.slotId) ?? 1;
  const canUpload = isLiveUploadSlotEnabled(upload, slot) && onUploadFiles !== undefined;
  const canPass = slot.required
    && !upload.uploadId.endsWith("-pending")
    && slot.fileCount < requiredSlotFileCount
    && slot.status !== "error"
    && onPassUpload !== undefined;
  const acceptAttribute = getLiveUploadAcceptAttribute(target) ?? ".xlsx";
  const description = getLiveUploadDescription(target);

  return (
    <div className="rounded-md border border-line bg-ink-900 px-3 py-2">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-white">{slot.label}</p>
          <p className="mt-1 text-xs text-slate-400">
            {slot.required ? "required" : "optional"} · {slot.acceptedFileKinds.join("/")}
          </p>
        </div>
        <StatusBadge status={slot.status} />
      </div>
      <p className="mt-2 truncate text-xs text-slate-400">{slot.sourceFileNames[0] ?? "파일 대기"}</p>
      {canUpload ? (
        <FileUploadControl
          target={target}
          dataTestId={`upload-input-${slot.slotId}`}
          acceptAttribute={acceptAttribute}
          description={description}
          onUploadFiles={onUploadFiles}
        />
      ) : (
        <p className="mt-2 text-xs text-slate-500">파일 업로드 연결 예정</p>
      )}
      {canPass ? <PassUploadButton label={slot.label} onClick={() => onPassUpload(target)} /> : null}
    </div>
  );
}

function PassUploadButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      className="mt-2 rounded-md border border-amber/40 bg-amber/10 px-3 py-2 text-xs font-semibold text-amber transition hover:bg-amber/20"
      onClick={onClick}
    >
      {label} 파일 없음으로 PASS 처리
    </button>
  );
}

function FileUploadControl({
  target,
  disabled = false,
  label = "파일 업로드",
  dataTestId,
  acceptAttribute,
  description,
  onUploadFiles,
}: {
  target: LiveUploadTarget;
  disabled?: boolean;
  label?: string;
  dataTestId: string;
  acceptAttribute: string;
  description: string | undefined;
  onUploadFiles?: UploadSectionProps["onUploadFiles"];
}) {
  const inputId = useId();
  const [isUploading, setIsUploading] = useState(false);
  const allowMultiple = target.slotKey === "seriesGeneral" || target.slotKey === "seriesApp";
  const needsRidibooksEventPeriod = isRidibooksEventTarget(target);
  const persistedEventPeriod = needsRidibooksEventPeriod
    ? readPersistedRidibooksEventPeriod(target)
    : undefined;
  const [eventStartDate, setEventStartDate] = useState(() => persistedEventPeriod?.startDate ?? "");
  const [eventEndDate, setEventEndDate] = useState(() => persistedEventPeriod?.endDate ?? "");
  const hasRidibooksEventPeriod = !needsRidibooksEventPeriod || (eventStartDate.trim() !== "" && eventEndDate.trim() !== "");
  const inputDisabled = disabled || !hasRidibooksEventPeriod;
  const uploadTarget = needsRidibooksEventPeriod
    ? {
        ...target,
        eventPeriod: {
          startDate: eventStartDate,
          endDate: eventEndDate,
        },
      }
    : target;

  return (
    <div className="mt-3 space-y-2">
      {needsRidibooksEventPeriod ? (
        <div className="grid grid-cols-2 gap-2 rounded-md border border-line bg-ink-950/80 p-2">
          <label className="space-y-1 text-xs text-slate-300">
            <span>이벤트 시작일</span>
            <input
              data-testid={`${dataTestId}-event-start`}
              type="date"
              value={eventStartDate}
              onChange={(event) => setEventStartDate(event.currentTarget.value)}
              className="w-full rounded border border-line bg-ink-900 px-2 py-1 text-xs text-slate-100"
            />
          </label>
          <label className="space-y-1 text-xs text-slate-300">
            <span>이벤트 종료일</span>
            <input
              data-testid={`${dataTestId}-event-end`}
              type="date"
              value={eventEndDate}
              onChange={(event) => setEventEndDate(event.currentTarget.value)}
              className="w-full rounded border border-line bg-ink-900 px-2 py-1 text-xs text-slate-100"
            />
          </label>
          <p className="col-span-2 text-[11px] text-slate-400">event CSV 업로드 전 eventPeriod를 먼저 입력해야 live 재계산됩니다.</p>
        </div>
      ) : null}
      <input
        id={inputId}
        data-testid={dataTestId}
        type="file"
        accept={acceptAttribute}
        multiple={allowMultiple}
        disabled={inputDisabled}
        className="hidden"
        onChange={async (event) => {
          const files = Array.from(event.currentTarget.files ?? []);
          const inputElement = event.currentTarget;
          if (files.length === 0 || !onUploadFiles) {
            return;
          }

          setIsUploading(true);
          try {
            await onUploadFiles(uploadTarget, files);
          } finally {
            setIsUploading(false);
            inputElement.value = "";
          }
        }}
      />
      <label
        htmlFor={inputId}
        className={[
          "inline-flex items-center rounded-md border border-line bg-ink-950 px-3 py-2 text-xs font-semibold text-slate-200 transition",
          inputDisabled ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:bg-ink-900",
        ].join(" ")}
      >
        {isUploading ? "처리 중..." : label}
      </label>
      {description ? <p className="text-xs text-slate-400">현재 live path: {description}</p> : null}
    </div>
  );
}

function isRidibooksEventTarget(target: LiveUploadTarget): boolean {
  return target.upload.platform === "ridibooks" && target.slotKey === "event";
}

type PersistedRidibooksEventPeriod = {
  startDate: string;
  endDate: string;
};

type PersistedRidibooksSlotSnapshot = {
  eventPeriod?: PersistedRidibooksEventPeriod;
};

function readPersistedRidibooksEventPeriod(target: LiveUploadTarget): PersistedRidibooksEventPeriod | undefined {
  const storage = typeof window === "undefined" ? undefined : window.localStorage;
  if (!storage || !target.slotKey) {
    return undefined;
  }

  const raw = storage.getItem(RIDIBOOKS_GROUPED_SNAPSHOT_STORAGE_KEY);
  if (!raw) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(raw) as Record<string, PersistedRidibooksSlotSnapshot>;
    const snapshot = parsed?.[createGroupedSnapshotKey(target.upload.batchId, target.upload.uploadId, target.slotKey)];
    const startDate = snapshot?.eventPeriod?.startDate?.trim();
    const endDate = snapshot?.eventPeriod?.endDate?.trim();
    if (!startDate || !endDate) {
      return undefined;
    }

    return { startDate, endDate };
  } catch {
    return undefined;
  }
}

function createGroupedSnapshotKey(batchId: string, uploadId: string, slotKey: BatchPlatformUploadSlotKey): string {
  return [batchId, uploadId, slotKey].join("\u001f");
}
