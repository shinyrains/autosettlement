import { CircleDot } from "lucide-react";
import type { ParseIssue } from "../types/settlement";
import { KpiCard } from "./ShellPrimitives";
import { IssuePanel } from "./IssuePanel";

export function StatusSection({ rows, issues }: { rows: number; issues: ParseIssue[] }) {
  return (
    <section id="step-2" className="grid grid-cols-[1fr_1.35fr] gap-5">
      <div className="rounded-md border border-line bg-ink-850 p-5">
        <div className="flex items-center gap-3">
          <CircleDot className="h-5 w-5 text-mint" />
          <h2 className="text-lg font-semibold tracking-normal">파싱/상태 확인</h2>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <KpiCard label="정규화 행" value={`${rows}`} />
          <KpiCard label="ParseIssue" value={`${issues.length}`} tone="warn" />
          <KpiCard label="회사" value="2" />
          <KpiCard label="출력 대상" value="4 files" />
        </div>
        <div className="mt-6 space-y-3">
          {["업로드 확인", "파일 묶음 검증", "공통 모델 정규화", "검수 대기"].map((label, index) => (
            <div key={label} className="flex items-center gap-3">
              <span className={index < 3 ? "grid h-7 w-7 place-items-center rounded-full bg-signal text-xs font-bold text-ink-950" : "grid h-7 w-7 place-items-center rounded-full border border-line text-xs font-bold text-slate-500"}>
                {index + 1}
              </span>
              <span className={index < 3 ? "text-sm text-white" : "text-sm text-slate-500"}>{label}</span>
            </div>
          ))}
        </div>
      </div>
      <IssuePanel issues={issues} />
    </section>
  );
}
