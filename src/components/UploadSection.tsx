import { Building2 } from "lucide-react";
import { useId, useState } from "react";
import {
  companyLabels,
  type PlatformUploadCard,
} from "../data/mockSettlement";
import type { Company } from "../types/settlement";
import { MiniMetric, StatusBadge } from "./ShellPrimitives";

type UploadSectionProps = {
  uploads: PlatformUploadCard[];
  onUploadFiles?: (upload: PlatformUploadCard, files: File[]) => Promise<void> | void;
  isUploadEnabled?: (upload: PlatformUploadCard) => boolean;
};

export function UploadSection({ uploads, onUploadFiles, isUploadEnabled }: UploadSectionProps) {
  return (
    <section id="step-1" className="grid grid-cols-2 gap-5">
      <CompanyUploadGroup company="raon" uploads={uploads} onUploadFiles={onUploadFiles} isUploadEnabled={isUploadEnabled} />
      <CompanyUploadGroup company="sr" uploads={uploads} onUploadFiles={onUploadFiles} isUploadEnabled={isUploadEnabled} />
    </section>
  );
}

function CompanyUploadGroup({
  company,
  uploads: allUploads,
  onUploadFiles,
  isUploadEnabled,
}: {
  company: Company;
  uploads: PlatformUploadCard[];
  onUploadFiles?: UploadSectionProps["onUploadFiles"];
  isUploadEnabled?: UploadSectionProps["isUploadEnabled"];
}) {
  const uploads = allUploads.filter((upload) => upload.company === company);
  const readyCount = uploads.filter((upload) => upload.status === "parsed").length;
  return (
    <section className="rounded-md border border-line bg-ink-850">
      <div className="flex items-center justify-between border-b border-line px-5 py-4">
        <div className="flex items-center gap-3">
          <Building2 className="h-5 w-5 text-signal" />
          <div>
            <h2 className="text-lg font-semibold tracking-normal">{companyLabels[company]} 업로드 영역</h2>
            <p className="text-sm text-slate-400">플랫폼 카드 단위 mock 상태</p>
          </div>
        </div>
        <span className="rounded-md border border-line px-3 py-1 font-mono text-sm text-mint">{readyCount}/{uploads.length}</span>
      </div>
      <div className="grid grid-cols-2 gap-3 p-4">
        {uploads.map((upload) => (
          <UploadCard
            key={upload.uploadId}
            upload={upload}
            onUploadFiles={onUploadFiles}
            isUploadEnabled={isUploadEnabled?.(upload) ?? false}
          />
        ))}
      </div>
    </section>
  );
}

function UploadCard({
  upload,
  onUploadFiles,
  isUploadEnabled,
}: {
  upload: PlatformUploadCard;
  onUploadFiles?: UploadSectionProps["onUploadFiles"];
  isUploadEnabled: boolean;
}) {
  const complete = upload.fileCount >= upload.requiredFileCount;
  const hasSlots = (upload.slots?.length ?? 0) > 0;
  const inputId = useId();
  const [isUploading, setIsUploading] = useState(false);
  const canUpload = isUploadEnabled && onUploadFiles !== undefined;
  return (
    <article className="rounded-md border border-line bg-ink-800 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-base font-semibold text-white">{upload.platformLabel}</p>
          <p className="mt-1 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">{upload.category}</p>
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
      {canUpload ? (
        <div className="mt-3 space-y-2">
          <input
            id={inputId}
            data-testid={`upload-input-${upload.uploadId}`}
            type="file"
            accept=".csv,.xlsx,.xls"
            className="hidden"
            onChange={async (event) => {
              const files = Array.from(event.currentTarget.files ?? []);
              const inputElement = event.currentTarget;
              if (files.length === 0 || !onUploadFiles) {
                return;
              }

              setIsUploading(true);
              try {
                await onUploadFiles(upload, files);
              } finally {
                setIsUploading(false);
                inputElement.value = "";
              }
            }}
          />
          <label
            htmlFor={inputId}
            className="inline-flex cursor-pointer items-center rounded-md border border-line bg-ink-950 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:bg-ink-900"
          >
            {isUploading ? "처리 중..." : "실파일 업로드"}
          </label>
          <p className="text-xs text-slate-400">현재 live path: 미스터블루 단일 XLSX 1-file</p>
        </div>
      ) : null}
      {!canUpload && !hasSlots ? (
        <p className="mt-3 text-xs text-slate-500">실업로드 연결 예정</p>
      ) : null}
      {upload.requiredFileCount === 6 ? (
        <p className="mt-2 rounded border border-line bg-ink-950 px-2 py-1 text-xs text-slate-300">필수 6개: 일반 3개 + 앱 3개</p>
      ) : null}
      {hasSlots ? (
        <div className="mt-4 space-y-2 rounded-md border border-line bg-ink-950/70 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-400">슬롯 상태</p>
          {upload.slots?.map((slot) => (
            <div key={slot.slotId} className="rounded-md border border-line bg-ink-900 px-3 py-2">
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
            </div>
          ))}
        </div>
      ) : null}
    </article>
  );
}
