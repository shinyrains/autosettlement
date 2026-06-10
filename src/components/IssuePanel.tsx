import { AlertTriangle } from "lucide-react";
import {
  companyLabels,
  platformLabels,
} from "../data/mockSettlement";
import type { ParseIssue } from "../types/settlement";

export function IssuePanel({ issues }: { issues: ParseIssue[] }) {
  return (
    <section className="rounded-md border border-line bg-ink-850">
      <div className="flex items-center justify-between border-b border-line px-5 py-4">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-amber" />
          <h2 className="text-lg font-semibold tracking-normal">오류/누락/매칭 실패 패널</h2>
        </div>
        <span className="rounded-md bg-coral/15 px-3 py-1 text-sm font-semibold text-coral">{issues.length}건</span>
      </div>
      <div className="divide-y divide-line">
        {issues.map((issue) => (
          <article key={issue.issueId} className="grid grid-cols-[140px_150px_1fr_130px] gap-4 px-5 py-4 text-sm">
            <span className="font-mono text-slate-400">{issue.issueType}</span>
            <span>{companyLabels[issue.company]} · {platformLabels[issue.platform]}</span>
            <span className="text-slate-300">{issue.message}</span>
            <span className={issue.severity === "error" ? "text-coral" : "text-amber"}>{issue.severity}</span>
          </article>
        ))}
      </div>
    </section>
  );
}
