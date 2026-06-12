import { createExportPackages } from "../exporters";
import { getReviewExportReadiness, getReviewExportStage } from "../selectors";
import type { AppDraftState } from "../state/appState";
import type { Company } from "../types/settlement";
import {
  formatBatchHistoryTimestamp,
  formatCompanyOutputReadinessSummary,
  formatCompanyProgressSummary,
  formatIssueSeverityCounts,
  formatLatestChangeSummary,
  formatLatestUploadChange,
  formatUploadStatusCounts,
  getBatchBlockerDetails,
  getBatchBlockerSummary,
  getBatchCtaHint,
  getBatchSummaryStatus,
  getCompanyOutputReadinessSummaries,
  getCompanyProgressSummaries,
  getIssueSeverityCounts,
  getLatestReviewDecision,
  getLatestReviewDecisionDetail,
  getLatestReviewDecisionSummary,
  getLatestUploadChange,
  getLatestUploadTimestamp,
  getMissingRequiredUploadCount,
  getNextBatchAction,
  getNextReviewCandidateLabel,
  getUploadStatusCounts,
  statusClasses,
  statusLabels,
} from "./BatchListPage.helpers";

type BatchListPageProps = {
  draftState: AppDraftState | null;
  onOpenBatch: (company: Company) => void;
  onCreateNewBatch: (company: Company) => void;
};

export function BatchListPage({ draftState, onOpenBatch, onCreateNewBatch }: BatchListPageProps) {
  if (!draftState) {
    return (
      <main className="min-h-screen bg-ink-950 px-8 py-10 text-slate-100">
        <div className="mx-auto flex max-w-5xl flex-col gap-8">
          <header className="flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-slate-400">AutoSettlement MVP</p>
              <h1 className="mt-2 text-3xl font-semibold text-white">정산 작업 목록 / 작업 시작</h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
                저장된 활성 정산 작업 임시 저장본이 아직 없습니다. 새 정산 작업을 시작하면 업로드/검수/출력 화면으로 진입합니다.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                className="rounded-md border border-emerald-400/40 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-500/20"
                onClick={() => onCreateNewBatch("raon")}
              >
                라온이앤엠 정산
              </button>
              <button
                type="button"
                className="rounded-md border border-emerald-400/40 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-500/20"
                onClick={() => onCreateNewBatch("sr")}
              >
                에스알이앤엠 정산
              </button>
            </div>
          </header>

          <section className="rounded-2xl border border-dashed border-line bg-ink-900/80 px-6 py-10 text-center">
            <p className="text-lg font-semibold text-white">저장된 정산 작업 없음</p>
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
  const latestUploadChange = getLatestUploadChange(draftState);
  const uploadStatusCounts = getUploadStatusCounts(draftState);
  const companyProgressSummaries = getCompanyProgressSummaries(draftState);
  const companyOutputReadinessSummaries = getCompanyOutputReadinessSummaries(exportResult, readiness);
  const latestReviewDecisionSummary = getLatestReviewDecisionSummary(draftState);
  const latestReviewDecisionDetail = getLatestReviewDecisionDetail(draftState);
  const latestReviewDecision = getLatestReviewDecision(draftState);
  const missingRequiredFiles = getMissingRequiredUploadCount(draftState);
  const nextBatchAction = getNextBatchAction({ missingRequiredFiles, readiness });
  const ctaHint = getBatchCtaHint({ missingRequiredFiles, readiness });
  const blockerSummary = getBatchBlockerSummary(readiness);
  const blockerDetails = getBatchBlockerDetails({ missingRequiredFiles, draftState, readiness });
  const issueSeverityCounts = getIssueSeverityCounts(draftState);
  const nextReviewCandidateLabel = getNextReviewCandidateLabel(draftState);

  return (
    <main className="min-h-screen bg-ink-950 px-8 py-10 text-slate-100">
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <header className="flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-slate-400">AutoSettlement MVP</p>
            <h1 className="mt-2 text-3xl font-semibold text-white">정산 작업 목록 / 작업 시작</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
              브라우저에 저장된 활성 정산 작업 임시 저장본을 다시 열거나, 초기 상태에서 새 정산 작업을 시작합니다.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <button
              type="button"
              className="rounded-md border border-emerald-400/40 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-500/20"
              onClick={() => onCreateNewBatch("raon")}
            >
              라온이앤엠 정산
            </button>
            <button
              type="button"
              className="rounded-md border border-emerald-400/40 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-500/20"
              onClick={() => onCreateNewBatch("sr")}
            >
              에스알이앤엠 정산
            </button>
          </div>
        </header>

        <section className="rounded-2xl border border-line bg-ink-900/80 shadow-card">
          <div className="flex items-center justify-between gap-4 border-b border-line px-6 py-5">
            <div>
              <p className="text-sm font-semibold text-slate-200">현재 브라우저 저장 정산 작업</p>
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
                <SummaryCard
                  label="업로드"
                  value={`선택 파일 ${uploadedFiles}/${requiredFiles}`}
                  helper={`필수 파일 누락 ${missingRequiredFiles}개`}
                />
                <SummaryCard label="정산 행" value={`${draftState.rows.length}`} helper="정규화 완료 행" />
                <SummaryCard label="이슈" value={`${draftState.issues.length}`} helper="오류/누락/매칭 실패" />
                <SummaryCard label="출력" value={`${readiness.readyExportCount}/4`} helper="검수 완료 후 다운로드 가능" />
              </dl>
              <div className="mt-6 rounded-xl border border-line bg-ink-850 p-4">
                <p className="text-sm font-semibold text-slate-200">정산 작업 진행 내역</p>
                <div className="mt-3 grid gap-2 text-sm text-slate-400 md:grid-cols-4">
                  <p>생성: {formatBatchHistoryTimestamp(draftState.batch.createdAt)}</p>
                  <p>최근 수정: {formatBatchHistoryTimestamp(draftState.batch.updatedAt)}</p>
                  <p>최근 업로드: {formatBatchHistoryTimestamp(latestUploadTimestamp)}</p>
                  <p>최근 검수: {latestReviewDecisionSummary}</p>
                </div>
                <p className="mt-3 text-sm text-slate-400">최근 업로드 변경: {formatLatestUploadChange(latestUploadChange)}</p>
                <p className="mt-2 text-sm text-slate-400">{formatUploadStatusCounts(uploadStatusCounts)}</p>
                <p className="mt-2 text-sm text-slate-400">최근 검수 상세: {latestReviewDecisionDetail}</p>
                <div className="mt-4 rounded-lg border border-line bg-ink-900 p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">회사별 진행 요약</p>
                  <div className="mt-2 space-y-1 text-sm text-slate-400">
                    {companyProgressSummaries.map((summary) => (
                      <p key={summary.company}>{formatCompanyProgressSummary(summary)}</p>
                    ))}
                  </div>
                </div>
                <div className="mt-3 rounded-lg border border-line bg-ink-900 p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">출력 준비 상세</p>
                  <div className="mt-2 space-y-1 text-sm text-slate-400">
                    {companyOutputReadinessSummaries.map((summary) => (
                      <p key={summary.company}>{formatCompanyOutputReadinessSummary(summary)}</p>
                    ))}
                  </div>
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
                  <li>• <span>{formatIssueSeverityCounts(issueSeverityCounts)}</span></li>
                  {blockerDetails.map((detail) => (
                    <li key={detail}>• <span>{detail}</span></li>
                  ))}
                  {nextReviewCandidateLabel ? (
                    <li>• <span>다음 검수 후보: {nextReviewCandidateLabel}</span></li>
                  ) : null}
                  <li>• <span>{formatLatestChangeSummary(latestUploadTimestamp, latestReviewDecision?.updatedAt)}</span></li>
                </ul>
              </div>
              <ul className="mt-3 space-y-2 text-sm text-slate-400">
                <li>• 저장된 활성 정산 작업 임시 저장본 다시 열기</li>
                <li>• 초기 상태 샘플로 새 정산 작업 재시작</li>
                <li>• 브라우저 재진입 시 임시 저장 복원 상태 확인</li>
              </ul>
              <div className="mt-5 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  className="rounded-md border border-line bg-ink-800 px-3 py-3 text-sm font-semibold text-slate-100 transition hover:bg-ink-700"
                  onClick={() => onOpenBatch("raon")}
                >
                  라온이앤엠 정산
                </button>
                <button
                  type="button"
                  className="rounded-md border border-line bg-ink-800 px-3 py-3 text-sm font-semibold text-slate-100 transition hover:bg-ink-700"
                  onClick={() => onOpenBatch("sr")}
                >
                  에스알이앤엠 정산
                </button>
              </div>
              <p className="mt-2 text-xs text-slate-500">{ctaHint}</p>
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
