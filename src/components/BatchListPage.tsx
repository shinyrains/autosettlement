import { createExportPackages } from "../exporters";
import { getReviewExportReadiness, getReviewExportStage } from "../selectors";
import type { AppDraftState } from "../state/appState";

type BatchListPageProps = {
  draftState: AppDraftState | null;
  onOpenBatch: () => void;
  onCreateNewBatch: () => void;
};

type BatchSummaryStatus = "uploading" | "review_needed" | "export_validation" | "ready_for_export" | "completed";

const statusLabels: Record<BatchSummaryStatus, string> = {
  uploading: "업로드 중",
  review_needed: "검수 필요",
  export_validation: "출력 검증 필요",
  ready_for_export: "출력 가능",
  completed: "완료",
};

const statusClasses: Record<BatchSummaryStatus, string> = {
  uploading: "border-sky-400/30 bg-sky-500/10 text-sky-200",
  review_needed: "border-amber/40 bg-amber/10 text-amber",
  export_validation: "border-violet-400/30 bg-violet-500/10 text-violet-200",
  ready_for_export: "border-emerald-400/30 bg-emerald-500/10 text-emerald-200",
  completed: "border-violet-400/30 bg-violet-500/10 text-violet-200",
};

function formatBatchHistoryTimestamp(timestamp?: string): string {
  if (!timestamp) {
    return "기록 없음";
  }

  const [datePart, timePart = ""] = timestamp.split("T");
  const timeWithoutSeconds = timePart.slice(0, 5);
  return timeWithoutSeconds ? `${datePart} ${timeWithoutSeconds}` : datePart;
}

function getLatestUploadTimestamp(draftState: AppDraftState): string | undefined {
  return draftState.uploads
    .flatMap((upload) => [upload.lastUploadedAt, ...(upload.slots ?? []).map((slot) => slot.lastUploadedAt)])
    .filter((timestamp): timestamp is string => Boolean(timestamp))
    .sort((left, right) => Date.parse(right) - Date.parse(left))[0];
}

function getMissingRequiredUploadCount(draftState: AppDraftState): number {
  return draftState.uploads.reduce((sum, upload) => {
    if (upload.slots?.length) {
      const requiredSlotUploadedFiles = upload.slots
        .filter((slot) => slot.required)
        .reduce((slotSum, slot) => slotSum + slot.fileCount, 0);
      return sum + Math.max(upload.requiredFileCount - requiredSlotUploadedFiles, 0);
    }
    return sum + Math.max(upload.requiredFileCount - upload.fileCount, 0);
  }, 0);
}

function getNextBatchAction({
  missingRequiredFiles,
  readiness,
}: {
  missingRequiredFiles: number;
  readiness: ReturnType<typeof getReviewExportReadiness>;
}): string {
  if (missingRequiredFiles > 0) {
    return `필수 파일 ${missingRequiredFiles}개 추가 업로드 필요`;
  }
  if (readiness.unresolvedIssueCount > 0) {
    return `이슈 ${readiness.unresolvedIssueCount}건 확인 필요`;
  }
  if (readiness.pendingReviewCount > 0) {
    return `검수 미확정 ${readiness.pendingReviewCount}건 처리 필요`;
  }
  if (getReviewExportStage(readiness) === "export_validation") {
    return "출력 검증 blocker 확인 필요";
  }
  return "회사별 출력 파일 다운로드 가능";
}

function getBatchBlockerSummary(readiness: ReturnType<typeof getReviewExportReadiness>): string {
  return `주요 blocker: 이슈 ${readiness.unresolvedIssueCount}건 / 검수 미확정 ${readiness.pendingReviewCount}건`;
}

function getBatchBlockerDetails({
  missingRequiredFiles,
  draftState,
  readiness,
}: {
  missingRequiredFiles: number;
  draftState: AppDraftState;
  readiness: ReturnType<typeof getReviewExportReadiness>;
}): string[] {
  const details: string[] = [];
  if (missingRequiredFiles > 0) {
    details.push(`업로드 누락: 필수 파일 ${missingRequiredFiles}개`);
  }
  if (draftState.issues.length > 0) {
    details.push(`최우선 이슈: ${draftState.issues[0].message}`);
  }
  if (readiness.pendingReviewCount > 0) {
    details.push(`검수 대기: ${readiness.pendingReviewCount}/${draftState.rows.length}행`);
  }
  if (details.length === 0) {
    details.push("현재 운영 blocker 없음");
  }
  return details;
}

export function BatchListPage({ draftState, onOpenBatch, onCreateNewBatch }: BatchListPageProps) {
  if (!draftState) {
    return (
      <main className="min-h-screen bg-ink-950 px-8 py-10 text-slate-100">
        <div className="mx-auto flex max-w-5xl flex-col gap-8">
          <header className="flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-slate-400">AutoSettlement MVP</p>
              <h1 className="mt-2 text-3xl font-semibold text-white">배치 목록 / 배치 진입</h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
                저장된 활성 배치 임시 저장본이 아직 없습니다. 새 배치를 시작하면 업로드/검수/출력 화면으로 진입합니다.
              </p>
            </div>
            <button
              type="button"
              className="rounded-md border border-emerald-400/40 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-500/20"
              onClick={onCreateNewBatch}
            >
              새 배치 시작
            </button>
          </header>

          <section className="rounded-2xl border border-dashed border-line bg-ink-900/80 px-6 py-10 text-center">
            <p className="text-lg font-semibold text-white">저장된 배치 없음</p>
            <p className="mt-3 text-sm text-slate-400">브라우저 저장소에 복원 가능한 활성 임시 저장본이 없으므로 재진입 버튼은 노출되지 않습니다.</p>
          </section>
        </div>
      </main>
    );
  }

  const uploadedFiles = draftState.uploads.reduce((sum, upload) => sum + upload.fileCount, 0);
  const requiredFiles = draftState.uploads.reduce((sum, upload) => sum + upload.requiredFileCount, 0);
  const exportResult = createExportPackages(draftState.rows);
  const readiness = getReviewExportReadiness(
    draftState.rows,
    draftState.issues,
    draftState.reviewDecisions,
    exportResult,
  );
  const summaryStatus = getBatchSummaryStatus({
    uploadedFiles,
    requiredFiles,
    exportStage: getReviewExportStage(readiness),
  });
  const latestUploadTimestamp = getLatestUploadTimestamp(draftState);
  const missingRequiredFiles = getMissingRequiredUploadCount(draftState);
  const nextBatchAction = getNextBatchAction({ missingRequiredFiles, readiness });
  const blockerSummary = getBatchBlockerSummary(readiness);
  const blockerDetails = getBatchBlockerDetails({ missingRequiredFiles, draftState, readiness });

  return (
    <main className="min-h-screen bg-ink-950 px-8 py-10 text-slate-100">
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <header className="flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-slate-400">AutoSettlement MVP</p>
            <h1 className="mt-2 text-3xl font-semibold text-white">배치 목록 / 배치 진입</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
              브라우저에 저장된 활성 배치 임시 저장본을 다시 열거나, 초기 상태에서 새 배치 작업을 시작합니다.
            </p>
          </div>
          <button
            type="button"
            className="rounded-md border border-emerald-400/40 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-500/20"
            onClick={onCreateNewBatch}
          >
            새 배치 시작
          </button>
        </header>

        <section className="rounded-2xl border border-line bg-ink-900/80 shadow-card">
          <div className="flex items-center justify-between gap-4 border-b border-line px-6 py-5">
            <div>
              <p className="text-sm font-semibold text-slate-200">현재 브라우저 저장 배치</p>
              <p className="mt-1 text-sm text-slate-500">업로드 / 검수 / 출력 상태를 요약한 단일 진입 카드</p>
            </div>
            <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusClasses[summaryStatus]}`}>
              {statusLabels[summaryStatus]}
            </span>
          </div>

          <div className="grid gap-6 px-6 py-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div>
              <div className="flex items-center gap-3 text-sm text-slate-400">
                <span>{draftState.batch.settlementMonth}</span>
                <span className="h-1 w-1 rounded-full bg-slate-600" />
                <span>{draftState.batch.batchId}</span>
              </div>
              <h2 className="mt-3 text-2xl font-semibold text-white">{draftState.batch.batchName}</h2>
              <dl className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
                <SummaryCard label="업로드" value={`${uploadedFiles}/${requiredFiles}`} helper={`선택 파일 기준 · 필수 누락 ${missingRequiredFiles}개`} />
                <SummaryCard label="정산 행" value={`${draftState.rows.length}`} helper="정규화 완료 행" />
                <SummaryCard label="이슈" value={`${draftState.issues.length}`} helper="오류/누락/매칭 실패" />
                <SummaryCard label="출력" value={`${readiness.readyExportCount}/4`} helper="검수 완료 후 다운로드 가능" />
              </dl>
              <div className="mt-6 rounded-xl border border-line bg-ink-850 p-4">
                <p className="text-sm font-semibold text-slate-200">배치 진행 내역</p>
                <div className="mt-3 grid gap-2 text-sm text-slate-400 md:grid-cols-3">
                  <p>생성: {formatBatchHistoryTimestamp(draftState.batch.createdAt)}</p>
                  <p>최근 수정: {formatBatchHistoryTimestamp(draftState.batch.updatedAt)}</p>
                  <p>최근 업로드: {formatBatchHistoryTimestamp(latestUploadTimestamp)}</p>
                </div>
              </div>
            </div>

            <aside className="rounded-xl border border-line bg-ink-850 p-5">
              <p className="text-sm font-semibold text-slate-200">현재 진입 액션</p>
              <div className="mt-3 rounded-lg border border-line bg-ink-900 p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">다음 필요 액션</p>
                <p className="mt-2 text-sm font-medium text-slate-100">{nextBatchAction}</p>
                <p className="mt-2 text-xs text-slate-500">{blockerSummary}</p>
              </div>
              <div className="mt-3 rounded-lg border border-line bg-ink-900 p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">운영 blocker 상세</p>
                <ul className="mt-2 space-y-1 text-xs text-slate-400">
                  {blockerDetails.map((detail) => (
                    <li key={detail}>• <span>{detail}</span></li>
                  ))}
                </ul>
              </div>
              <ul className="mt-3 space-y-2 text-sm text-slate-400">
                <li>• 저장된 활성 배치 임시 저장본 다시 열기</li>
                <li>• 초기 상태 샘플로 새 배치 재시작</li>
                <li>• 브라우저 재진입 시 임시 저장 복원 상태 확인</li>
              </ul>
              <button
                type="button"
                className="mt-5 w-full rounded-md border border-line bg-ink-800 px-4 py-3 text-sm font-semibold text-slate-100 transition hover:bg-ink-700"
                onClick={onOpenBatch}
              >
                이 배치 열기
              </button>
            </aside>
          </div>
        </section>
      </div>
    </main>
  );
}

function SummaryCard({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <div className="rounded-xl border border-line bg-ink-850 p-4">
      <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</dt>
      <dd className="mt-3 text-2xl font-semibold text-white">{value}</dd>
      <p className="mt-2 text-xs text-slate-500">{helper}</p>
    </div>
  );
}

function getBatchSummaryStatus({
  uploadedFiles,
  requiredFiles,
  exportStage,
}: {
  uploadedFiles: number;
  requiredFiles: number;
  exportStage: "reviewing" | "export_validation" | "ready_for_export";
}): BatchSummaryStatus {
  if (uploadedFiles < requiredFiles) {
    return "uploading";
  }
  if (exportStage === "ready_for_export") {
    return "ready_for_export";
  }
  if (exportStage === "export_validation") {
    return "export_validation";
  }
  return "review_needed";
}
