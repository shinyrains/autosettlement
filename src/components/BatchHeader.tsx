import type { Batch } from "../types/settlement";
import { HeaderMetric } from "./ShellPrimitives";

export function BatchHeader({
  batch,
  uploadedFiles,
  requiredFiles,
  rowsCount,
  issueCount,
  readyExports,
  onResetState,
  onBackToBatchList,
}: {
  batch: Batch;
  uploadedFiles: number;
  requiredFiles: number;
  rowsCount: number;
  issueCount: number;
  readyExports: number;
  onResetState: () => void;
  onBackToBatchList?: () => void;
}) {
  return (
    <header className="border-b border-line bg-ink-900/95 px-8 py-5">
      <div className="mx-auto flex max-w-[1660px] items-center justify-between gap-8">
        <div>
          <div className="flex items-center gap-3 text-sm text-slate-400">
            <span>Batch</span>
            <span className="h-1 w-1 rounded-full bg-slate-600" />
            <span>{batch.settlementMonth}</span>
            <span className="h-1 w-1 rounded-full bg-slate-600" />
            <span>상태: 검수 중</span>
          </div>
          <h1 className="mt-2 text-3xl font-semibold tracking-normal text-white">{batch.batchName}</h1>
        </div>
        <div className="flex items-center gap-3">
          {onBackToBatchList ? (
            <button
              type="button"
              className="rounded-md border border-line bg-ink-800 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:bg-ink-700"
              onClick={onBackToBatchList}
            >
              배치 목록으로
            </button>
          ) : null}
          <div className="grid grid-cols-4 gap-3 text-sm">
            <HeaderMetric label="업로드" value={`${uploadedFiles}/${requiredFiles}`} />
            <HeaderMetric label="정산 행" value={`${rowsCount}`} />
            <HeaderMetric label="이슈" value={`${issueCount}`} tone="warn" />
            <HeaderMetric label="출력" value={`${readyExports}/4 준비`} />
          </div>
          <button
            type="button"
            className="rounded-md border border-line bg-ink-800 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:bg-ink-700"
            onClick={onResetState}
          >
            초기 상태로 리셋
          </button>
        </div>
      </div>
    </header>
  );
}
