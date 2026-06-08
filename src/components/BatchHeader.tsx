import { mockBatch, mockIssues, mockSettlementRows } from "../data/mockSettlement";
import { HeaderMetric } from "./ShellPrimitives";

export function BatchHeader({ uploadedFiles, requiredFiles }: { uploadedFiles: number; requiredFiles: number }) {
  return (
    <header className="border-b border-line bg-ink-900/95 px-8 py-5">
      <div className="mx-auto flex max-w-[1660px] items-center justify-between gap-8">
        <div>
          <div className="flex items-center gap-3 text-sm text-slate-400">
            <span>Batch</span>
            <span className="h-1 w-1 rounded-full bg-slate-600" />
            <span>{mockBatch.settlementMonth}</span>
            <span className="h-1 w-1 rounded-full bg-slate-600" />
            <span>상태: 검수 중</span>
          </div>
          <h1 className="mt-2 text-3xl font-semibold tracking-normal text-white">{mockBatch.batchName}</h1>
        </div>
        <div className="grid grid-cols-4 gap-3 text-sm">
          <HeaderMetric label="업로드" value={`${uploadedFiles}/${requiredFiles}`} />
          <HeaderMetric label="정산 행" value={`${mockSettlementRows.length}`} />
          <HeaderMetric label="이슈" value={`${mockIssues.length}`} tone="warn" />
          <HeaderMetric label="출력" value="2/4 준비" />
        </div>
      </div>
    </header>
  );
}
